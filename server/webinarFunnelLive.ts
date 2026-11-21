/**
 * Webinar Funnel live room (/w/:slug/live) — everything that keeps viewers on-site
 * next to the embedded YouTube Live:
 *
 *   Public (no auth)
 *     GET  /api/public/webinars/:slug/chat?since=<id>   poll (ETag → 304 when nothing changed)
 *     POST /api/public/webinars/:slug/chat              post a message / question (IP rate-limited)
 *     POST /api/public/webinars/:slug/heartbeat         15s attendance heartbeat
 *     POST /api/public/webinars/:slug/cta-click         CTA click tracking
 *     GET  /api/public/webinars/:slug/attendee?r=<id>   registrant's display name (for chat prefill)
 *     GET  /api/public/webinars/:slug/poll?viewerKey=&r= active poll + this viewer's vote (+ results once voted)
 *     POST /api/public/webinars/:slug/poll/:pollId/vote  { optionIndex, viewerKey, registrationId?, email? }
 *
 *   Owner (auth)
 *     GET   /api/webinar-funnels/:id/chat               full chat incl. hidden + live viewer count
 *     POST  /api/webinar-funnels/:id/chat               post as host
 *     PATCH /api/webinar-funnels/:id/chat/:msgId        { hidden?, answered? } (soft hide — never deleted)
 *     GET   /api/webinar-funnels/:id/analytics          show rate, watch time, drop-off, CTA clicks
 *     GET   /api/webinar-funnels/:id/polls              polls with tallies
 *     POST  /api/webinar-funnels/:id/polls              { question, options[2-4] }
 *     POST  /api/webinar-funnels/:id/polls/:pollId/activate | /close
 *     GET   /api/webinar-funnels/:id/revenue            registered → showed → clicked → CRM deals
 *     POST  /api/webinar-funnels/tools/upload-deck            PDF deck upload → { url }
 *
 * Polling, not websockets: at webinar scale (hundreds of viewers) a 4s poll that
 * usually answers 304 from an in-memory version check is cheaper and simpler.
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { pool } from "./storage";
import { saveMedia } from "./mediaStorage";
import { tagCrmContactWithPollAnswer } from "./crmLeadCapture";
import type { WebinarFunnel } from "@shared/schema";

type RequireAuth = (req: Request, res: Response, next: Function) => any;
type GetOwned = (id: string, userId: string) => Promise<WebinarFunnel | undefined>;

const p = (v: unknown) => String(Array.isArray(v) ? v[0] : v ?? "");

const VIEWER_WINDOW_SEC = 35;      // heartbeat every 15s → "watching" if seen in the last 35s
const MAX_CREDIT_PER_BEAT = 20;    // seconds of watch time one heartbeat can add
const CHAT_PAGE = 200;             // max messages returned per poll

// ── Small TTL caches (per instance) keep the 4s poll to ~0 DB work on 304s ───
type FunnelLite = { id: string; userId: string; status: string; scheduledAt: Date; hostName: string | null };
const funnelBySlug = new Map<string, { at: number; row: FunnelLite | null }>();
async function getFunnelBySlug(slugRaw: string): Promise<FunnelLite | null> {
  const slug = slugRaw.toLowerCase();
  const hit = funnelBySlug.get(slug);
  if (hit && Date.now() - hit.at < 5_000) return hit.row;
  const { rows } = await pool.query(
    `SELECT id, user_id, status, scheduled_at, host_name FROM webinar_funnels WHERE slug = $1`, [slug],
  );
  const r = rows[0];
  const row: FunnelLite | null = r && (r.status === "published" || r.status === "ended")
    ? { id: r.id, userId: r.user_id, status: r.status, scheduledAt: r.scheduled_at, hostName: r.host_name }
    : null;
  funnelBySlug.set(slug, { at: Date.now(), row });
  if (funnelBySlug.size > 2000) funnelBySlug.clear();
  return row;
}

type ChatVersion = { maxId: number; hidden: number; answered: number };
const chatVersion = new Map<string, { at: number; v: ChatVersion }>();
async function getChatVersion(webinarId: string): Promise<ChatVersion> {
  const hit = chatVersion.get(webinarId);
  if (hit && Date.now() - hit.at < 2_000) return hit.v;
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(id),0)::int AS max_id,
            COUNT(*) FILTER (WHERE hidden_at IS NOT NULL)::int AS hidden,
            COUNT(*) FILTER (WHERE answered_at IS NOT NULL)::int AS answered
       FROM webinar_chat_messages WHERE webinar_id = $1`, [webinarId],
  );
  const v = { maxId: rows[0].max_id, hidden: rows[0].hidden, answered: rows[0].answered };
  chatVersion.set(webinarId, { at: Date.now(), v });
  return v;
}

const viewerCache = new Map<string, { at: number; n: number }>();
async function getViewerCount(webinarId: string): Promise<number> {
  const hit = viewerCache.get(webinarId);
  if (hit && Date.now() - hit.at < 3_000) return hit.n;
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM webinar_attendance
      WHERE webinar_id = $1 AND last_seen > NOW() - ($2 || ' seconds')::interval`, [webinarId, String(VIEWER_WINDOW_SEC)],
  );
  const n = rows[0].n as number;
  viewerCache.set(webinarId, { at: Date.now(), n });
  return n;
}

const invalidate = (webinarId: string) => { chatVersion.delete(webinarId); };

// ── Chat safety ─────────────────────────────────────────────────────────────
const BLOCKED = [
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "bitch", "asshole", "bastard", "cunt", "dick",
  "pussy", "slut", "whore", "nigger", "nigga", "faggot", "retard", "chutiya", "madarchod", "behenchod", "bhenchod",
  "gandu", "randi", "bhosdike", "lund",
];
const BLOCKED_RE = new RegExp(`\\b(${BLOCKED.join("|")})\\b`, "gi");
export function cleanChatText(s: string) {
  return s
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(BLOCKED_RE, m => m[0] + "*".repeat(Math.max(1, m.length - 1)))
    .trim();
}

// Per-IP limiter: ≥2s between messages and ≤6 messages per 30s.
const chatHits = new Map<string, number[]>();
function chatRateLimited(ip: string): string | null {
  const now = Date.now();
  const hits = (chatHits.get(ip) || []).filter(t => now - t < 30_000);
  if (hits.length && now - hits[hits.length - 1] < 2_000) return "You're sending messages too fast — wait a moment.";
  if (hits.length >= 6) return "Slow down a little — try again in a few seconds.";
  hits.push(now);
  chatHits.set(ip, hits);
  if (chatHits.size > 10_000) chatHits.clear();
  return null;
}
// Heartbeat / click limiter (cheap guard against scripted inflation).
const beatHits = new Map<string, { n: number; reset: number }>();
function beatLimited(key: string, max: number) {
  const now = Date.now();
  const e = beatHits.get(key);
  if (!e || e.reset < now) { beatHits.set(key, { n: 1, reset: now + 60_000 }); if (beatHits.size > 20_000) beatHits.clear(); return false; }
  e.n++;
  return e.n > max;
}

const viewerKeySchema = z.string().trim().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/);

async function resolveRegistration(webinarId: string, registrationId?: string | null, email?: string | null) {
  if (registrationId && /^[0-9a-f-]{36}$/i.test(registrationId)) {
    const { rows } = await pool.query(
      `SELECT id, name, email FROM webinar_funnel_registrations WHERE id = $1 AND webinar_id = $2`, [registrationId, webinarId],
    );
    if (rows[0]) return rows[0] as { id: string; name: string; email: string };
  }
  if (email && /^\S+@\S+\.\S+$/.test(email)) {
    const { rows } = await pool.query(
      `SELECT id, name, email FROM webinar_funnel_registrations WHERE webinar_id = $1 AND email = $2 LIMIT 1`, [webinarId, email.trim().toLowerCase()],
    );
    if (rows[0]) return rows[0] as { id: string; name: string; email: string };
  }
  return null;
}

const toMsg = (r: any) => ({
  id: r.id as number,
  name: r.name as string,
  body: r.body as string,
  isQuestion: !!r.is_question,
  isHost: !!r.is_host,
  answered: !!r.answered_at,
  hidden: !!r.hidden_at,
  createdAt: r.created_at,
});

// ── Polls ───────────────────────────────────────────────────────────────────
type PollRow = { id: string; question: string; options: string[]; active: boolean; createdAt: Date };
const toPoll = (r: any): PollRow => ({
  id: r.id, question: r.question, options: Array.isArray(r.options) ? r.options.map(String) : [], active: !!r.active, createdAt: r.created_at,
});
// Active poll per webinar — cached briefly so hundreds of 4s polls cost ~one query.
const activePollCache = new Map<string, { at: number; poll: PollRow | null }>();
async function getActivePoll(webinarId: string): Promise<PollRow | null> {
  const hit = activePollCache.get(webinarId);
  if (hit && Date.now() - hit.at < 2_000) return hit.poll;
  const { rows } = await pool.query(
    `SELECT id, question, options, active, created_at FROM webinar_funnel_polls
      WHERE webinar_id = $1 AND active = TRUE ORDER BY created_at DESC LIMIT 1`, [webinarId],
  );
  const poll = rows[0] ? toPoll(rows[0]) : null;
  activePollCache.set(webinarId, { at: Date.now(), poll });
  if (activePollCache.size > 2000) activePollCache.clear();
  return poll;
}
const tallyCache = new Map<string, { at: number; counts: number[]; total: number }>();
async function getTally(poll: PollRow, fresh = false) {
  const hit = tallyCache.get(poll.id);
  if (!fresh && hit && Date.now() - hit.at < 2_000) return { counts: hit.counts, total: hit.total };
  const { rows } = await pool.query(
    `SELECT option_index, COUNT(*)::int AS n FROM webinar_funnel_poll_votes WHERE poll_id = $1 GROUP BY option_index`, [poll.id],
  );
  const counts = poll.options.map(() => 0);
  for (const r of rows) if (r.option_index >= 0 && r.option_index < counts.length) counts[r.option_index] = r.n;
  const total = counts.reduce((a, b) => a + b, 0);
  tallyCache.set(poll.id, { at: Date.now(), counts, total });
  if (tallyCache.size > 5000) tallyCache.clear();
  return { counts, total };
}
const invalidatePolls = (webinarId: string) => { activePollCache.delete(webinarId); };
const isUuid = (v?: string | null) => !!v && /^[0-9a-f-]{36}$/i.test(v);

async function findVote(pollId: string, viewerKey?: string | null, registrationId?: string | null): Promise<number | null> {
  const conds: string[] = []; const args: unknown[] = [pollId];
  if (viewerKey) { args.push(viewerKey); conds.push(`viewer_key = $${args.length}`); }
  if (isUuid(registrationId)) { args.push(registrationId); conds.push(`registration_id = $${args.length}`); }
  if (!conds.length) return null;
  const { rows } = await pool.query(
    `SELECT option_index FROM webinar_funnel_poll_votes WHERE poll_id = $1 AND (${conds.join(" OR ")}) LIMIT 1`, args,
  );
  return rows[0] ? (rows[0].option_index as number) : null;
}

export function registerWebinarFunnelLiveRoutes(app: Express, requireAuth: RequireAuth, getOwnedFunnel: GetOwned) {
  // ── Public: poll chat ─────────────────────────────────────────────────────
  app.get("/api/public/webinars/:slug/chat", async (req: Request, res: Response) => {
    try {
      const f = await getFunnelBySlug(p(req.params.slug));
      if (!f) return res.status(404).json({ message: "Webinar not found" });
      const since = Math.max(0, parseInt(p(req.query.since), 10) || 0);
      const [v, viewers] = await Promise.all([getChatVersion(f.id), getViewerCount(f.id)]);
      const etag = `W/"c${since}-${v.maxId}-${v.hidden}-${v.answered}-${viewers}-${f.status}"`;
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "no-cache");
      if (req.headers["if-none-match"] === etag) return res.status(304).end();

      const [msgs, flags] = await Promise.all([
        since >= v.maxId ? Promise.resolve({ rows: [] as any[] }) : pool.query(
          // first load (since=0): latest page; afterwards: everything newer than `since`
          since === 0
            ? `SELECT * FROM (SELECT id, name, body, is_question, is_host, answered_at, hidden_at, created_at
                 FROM webinar_chat_messages WHERE webinar_id = $1 AND hidden_at IS NULL ORDER BY id DESC LIMIT ${CHAT_PAGE}) t ORDER BY id ASC`
            : `SELECT id, name, body, is_question, is_host, answered_at, hidden_at, created_at
                 FROM webinar_chat_messages WHERE webinar_id = $1 AND id > $2 AND hidden_at IS NULL ORDER BY id ASC LIMIT ${CHAT_PAGE}`,
          since === 0 ? [f.id] : [f.id, since],
        ),
        (v.hidden || v.answered) ? pool.query(
          `SELECT id, hidden_at IS NOT NULL AS hidden, answered_at IS NOT NULL AS answered
             FROM webinar_chat_messages WHERE webinar_id = $1 AND (hidden_at IS NOT NULL OR answered_at IS NOT NULL)`, [f.id],
        ) : Promise.resolve({ rows: [] as any[] }),
      ]);
      res.json({
        messages: msgs.rows.map(toMsg),
        hiddenIds: flags.rows.filter((r: any) => r.hidden).map((r: any) => r.id),
        answeredIds: flags.rows.filter((r: any) => r.answered).map((r: any) => r.id),
        lastId: v.maxId,
        viewers,
        status: f.status,
      });
    } catch (e: any) {
      console.error("[webinar-live] chat poll error:", e.message);
      res.status(500).json({ message: "Chat unavailable" });
    }
  });

  // ── Public: post chat / question ──────────────────────────────────────────
  const postBody = z.object({
    name: z.string().trim().max(60).optional().nullable(),
    body: z.string().max(2000),
    isQuestion: z.boolean().optional(),
    registrationId: z.string().max(64).optional().nullable(),
  });
  app.post("/api/public/webinars/:slug/chat", async (req: Request, res: Response) => {
    try {
      const f = await getFunnelBySlug(p(req.params.slug));
      if (!f) return res.status(404).json({ message: "Webinar not found" });
      if (f.status !== "published") return res.status(403).json({ message: "Chat is closed for this webinar." });
      const parsed = postBody.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Invalid message" });
      const text = cleanChatText(parsed.data.body).slice(0, 500);
      if (!text) return res.status(400).json({ message: "Message can't be empty" });
      let name = cleanChatText(parsed.data.name || "").slice(0, 40);
      if (!name) {
        const reg = await resolveRegistration(f.id, parsed.data.registrationId);
        if (reg) name = reg.email.split("@")[0].slice(0, 40);
      }
      if (!name) return res.status(400).json({ message: "Add your name to chat" });
      const limited = chatRateLimited(req.ip || "unknown");
      if (limited) return res.status(429).json({ message: limited });

      const { rows } = await pool.query(
        `INSERT INTO webinar_chat_messages (webinar_id, name, body, is_question, is_host)
         VALUES ($1, $2, $3, $4, FALSE)
         RETURNING id, name, body, is_question, is_host, answered_at, hidden_at, created_at`,
        [f.id, name, text, !!parsed.data.isQuestion],
      );
      invalidate(f.id);
      res.status(201).json(toMsg(rows[0]));
    } catch (e: any) {
      console.error("[webinar-live] chat post error:", e.message);
      res.status(500).json({ message: "Couldn't send message" });
    }
  });

  // ── Public: attendee display name (prefill chat from ?r=<registrationId>) ─
  app.get("/api/public/webinars/:slug/attendee", async (req: Request, res: Response) => {
    const f = await getFunnelBySlug(p(req.params.slug));
    if (!f) return res.status(404).json({ message: "Webinar not found" });
    const reg = await resolveRegistration(f.id, p(req.query.r));
    if (!reg) return res.status(404).json({ message: "Not found" });
    res.json({ registrationId: reg.id, name: reg.name });
  });

  // ── Public: attendance heartbeat ──────────────────────────────────────────
  const beatBody = z.object({
    viewerKey: viewerKeySchema,
    registrationId: z.string().max(64).optional().nullable(),
    email: z.string().max(254).optional().nullable(),
  });
  app.post("/api/public/webinars/:slug/heartbeat", async (req: Request, res: Response) => {
    try {
      const f = await getFunnelBySlug(p(req.params.slug));
      if (!f) return res.status(404).json({ message: "Webinar not found" });
      const parsed = beatBody.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Invalid heartbeat" });
      const live = f.status === "published" && new Date(f.scheduledAt).getTime() <= Date.now();
      const replay = f.status === "ended";
      if (!live && !replay) return res.json({ counted: false, viewers: await getViewerCount(f.id) });
      if (beatLimited(`${req.ip}|${parsed.data.viewerKey}`, 12)) return res.status(429).json({ message: "Too many heartbeats" });

      const reg = await resolveRegistration(f.id, parsed.data.registrationId, parsed.data.email);
      await pool.query(
        `INSERT INTO webinar_attendance (webinar_id, viewer_key, email, registration_id, source)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (webinar_id, viewer_key) DO UPDATE SET
           watch_seconds = webinar_attendance.watch_seconds
             + LEAST(GREATEST(EXTRACT(EPOCH FROM (NOW() - webinar_attendance.last_seen)), 0), ${MAX_CREDIT_PER_BEAT})::int,
           last_seen = NOW(),
           email = COALESCE(webinar_attendance.email, EXCLUDED.email),
           registration_id = COALESCE(webinar_attendance.registration_id, EXCLUDED.registration_id)`,
        [f.id, parsed.data.viewerKey, reg?.email ?? null, reg?.id ?? null, live ? "live" : "replay"],
      );
      viewerCache.delete(f.id);
      res.json({ counted: true, viewers: await getViewerCount(f.id) });
    } catch (e: any) {
      console.error("[webinar-live] heartbeat error:", e.message);
      res.status(500).json({ message: "Heartbeat failed" });
    }
  });

  // ── Public: CTA click ─────────────────────────────────────────────────────
  app.post("/api/public/webinars/:slug/cta-click", async (req: Request, res: Response) => {
    try {
      const f = await getFunnelBySlug(p(req.params.slug));
      if (!f) return res.status(404).json({ message: "Webinar not found" });
      // sendBeacon posts text/plain; accept either a parsed body or a JSON string.
      let body: any = req.body;
      if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
      const parsed = beatBody.partial({ viewerKey: true }).safeParse(body ?? {});
      const data = parsed.success ? parsed.data : {};
      if (beatLimited(`cta|${req.ip}`, 30)) return res.status(429).json({ message: "Too many clicks" });
      const reg = await resolveRegistration(f.id, data.registrationId, data.email);
      await pool.query(
        `INSERT INTO webinar_cta_clicks (webinar_id, viewer_key, email, registration_id) VALUES ($1, $2, $3, $4)`,
        [f.id, data.viewerKey ?? null, reg?.email ?? null, reg?.id ?? null],
      );
      res.status(204).end();
    } catch (e: any) {
      console.error("[webinar-live] cta click error:", e.message);
      res.status(500).json({ message: "Failed" });
    }
  });

  // ── Owner: chat moderation ────────────────────────────────────────────────
  app.get("/api/webinar-funnels/:id/chat", requireAuth, async (req: Request, res: Response) => {
    const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
    if (!f) return res.status(404).json({ message: "Not found" });
    const [{ rows }, viewers] = await Promise.all([
      pool.query(
        `SELECT * FROM (SELECT id, name, body, is_question, is_host, answered_at, hidden_at, created_at
           FROM webinar_chat_messages WHERE webinar_id = $1 ORDER BY id DESC LIMIT 500) t ORDER BY id ASC`, [f.id],
      ),
      getViewerCount(f.id),
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ messages: rows.map(toMsg), viewers });
  });

  app.post("/api/webinar-funnels/:id/chat", requireAuth, async (req: Request, res: Response) => {
    const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
    if (!f) return res.status(404).json({ message: "Not found" });
    const text = cleanChatText(String(req.body?.body ?? "")).slice(0, 1000);
    if (!text) return res.status(400).json({ message: "Message can't be empty" });
    const { rows } = await pool.query(
      `INSERT INTO webinar_chat_messages (webinar_id, name, body, is_question, is_host)
       VALUES ($1, $2, $3, FALSE, TRUE)
       RETURNING id, name, body, is_question, is_host, answered_at, hidden_at, created_at`,
      [f.id, (f.hostName || "Host").slice(0, 40), text],
    );
    invalidate(f.id);
    res.status(201).json(toMsg(rows[0]));
  });

  app.patch("/api/webinar-funnels/:id/chat/:msgId", requireAuth, async (req: Request, res: Response) => {
    const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
    if (!f) return res.status(404).json({ message: "Not found" });
    const msgId = parseInt(p(req.params.msgId), 10);
    if (!msgId) return res.status(400).json({ message: "Invalid message" });
    const sets: string[] = [];
    if (typeof req.body?.hidden === "boolean") sets.push(`hidden_at = ${req.body.hidden ? "NOW()" : "NULL"}`);
    if (typeof req.body?.answered === "boolean") sets.push(`answered_at = ${req.body.answered ? "NOW()" : "NULL"}`);
    if (!sets.length) return res.status(400).json({ message: "Nothing to update" });
    const { rows } = await pool.query(
      `UPDATE webinar_chat_messages SET ${sets.join(", ")} WHERE id = $1 AND webinar_id = $2
       RETURNING id, name, body, is_question, is_host, answered_at, hidden_at, created_at`, [msgId, f.id],
    );
    if (!rows[0]) return res.status(404).json({ message: "Message not found" });
    invalidate(f.id);
    res.json(toMsg(rows[0]));
  });

  // ── Owner: analytics ──────────────────────────────────────────────────────
  app.get("/api/webinar-funnels/:id/analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
      if (!f) return res.status(404).json({ message: "Not found" });
      const durationSec = Math.max(5, f.durationMinutes || 60) * 60;
      const [regs, att, cta, clickers, list, chat, viewers] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM webinar_funnel_registrations WHERE webinar_id = $1`, [f.id]),
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE watch_seconds >= 15)::int                         AS attendees,
             COUNT(*) FILTER (WHERE watch_seconds >= 15 AND source = 'live')::int     AS live_attendees,
             COUNT(*) FILTER (WHERE watch_seconds >= 15 AND source = 'replay')::int   AS replay_viewers,
             COUNT(DISTINCT registration_id) FILTER (WHERE watch_seconds >= 15)::int  AS registered_attendees,
             COALESCE(SUM(watch_seconds), 0)::bigint                                  AS total_seconds,
             COALESCE(AVG(watch_seconds) FILTER (WHERE watch_seconds >= 15), 0)::float AS avg_seconds,
             COUNT(*) FILTER (WHERE watch_seconds >= $2 * 0.25)::int AS p25,
             COUNT(*) FILTER (WHERE watch_seconds >= $2 * 0.50)::int AS p50,
             COUNT(*) FILTER (WHERE watch_seconds >= $2 * 0.75)::int AS p75,
             COUNT(*) FILTER (WHERE watch_seconds >= $2 * 0.95)::int AS p100
           FROM webinar_attendance WHERE webinar_id = $1`, [f.id, durationSec],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS clicks,
                  COUNT(DISTINCT COALESCE(registration_id, viewer_key))::int AS unique_clickers
             FROM webinar_cta_clicks WHERE webinar_id = $1`, [f.id],
        ),
        pool.query(
          `SELECT r.name, r.email, COUNT(*)::int AS clicks, MAX(c.created_at) AS last_click
             FROM webinar_cta_clicks c JOIN webinar_funnel_registrations r ON r.id = c.registration_id
            WHERE c.webinar_id = $1 GROUP BY r.id, r.name, r.email ORDER BY last_click DESC LIMIT 100`, [f.id],
        ),
        pool.query(
          `SELECT a.viewer_key, a.watch_seconds, a.join_at, a.last_seen, a.source, r.name, COALESCE(r.email, a.email) AS email,
                  EXISTS (SELECT 1 FROM webinar_cta_clicks c WHERE c.webinar_id = a.webinar_id
                          AND (c.viewer_key = a.viewer_key OR (a.registration_id IS NOT NULL AND c.registration_id = a.registration_id))) AS clicked
             FROM webinar_attendance a LEFT JOIN webinar_funnel_registrations r ON r.id = a.registration_id
            WHERE a.webinar_id = $1 AND a.watch_seconds >= 15
            ORDER BY a.watch_seconds DESC LIMIT 100`, [f.id],
        ),
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE NOT is_host)::int AS messages,
                  COUNT(*) FILTER (WHERE is_question)::int AS questions,
                  COUNT(*) FILTER (WHERE is_question AND answered_at IS NOT NULL)::int AS answered
             FROM webinar_chat_messages WHERE webinar_id = $1 AND hidden_at IS NULL`, [f.id],
        ),
        getViewerCount(f.id),
      ]);
      const a = att.rows[0];
      const registrants = regs.rows[0].n as number;
      res.setHeader("Cache-Control", "no-store");
      res.json({
        durationMinutes: durationSec / 60,
        viewersNow: viewers,
        registrants,
        attendees: a.attendees,
        liveAttendees: a.live_attendees,
        replayViewers: a.replay_viewers,
        registeredAttendees: a.registered_attendees,
        // Registrants who showed up ÷ registrants (anonymous viewers can't inflate it past 100%)
        showRate: registrants ? Math.min(1, a.registered_attendees / registrants) : null,
        totalWatchSeconds: Number(a.total_seconds),
        avgWatchSeconds: Math.round(a.avg_seconds),
        dropoff: [
          { mark: 25, viewers: a.p25 },
          { mark: 50, viewers: a.p50 },
          { mark: 75, viewers: a.p75 },
          { mark: 100, viewers: a.p100 },
        ],
        cta: { clicks: cta.rows[0].clicks, uniqueClickers: cta.rows[0].unique_clickers, registered: clickers.rows },
        chat: chat.rows[0],
        attendeesList: list.rows.map((r: any) => ({
          name: r.name || null, email: r.email || null, watchSeconds: r.watch_seconds, joinAt: r.join_at,
          lastSeen: r.last_seen, source: r.source, clickedCta: !!r.clicked,
        })),
      });
    } catch (e: any) {
      console.error("[webinar-live] analytics error:", e.message);
      res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  // ── Public: active poll ───────────────────────────────────────────────────
  app.get("/api/public/webinars/:slug/poll", async (req: Request, res: Response) => {
    try {
      const f = await getFunnelBySlug(p(req.params.slug));
      if (!f) return res.status(404).json({ message: "Webinar not found" });
      if (beatLimited(`pollget|${req.ip}`, 120)) return res.status(429).json({ message: "Too many requests" });
      res.setHeader("Cache-Control", "no-store");
      const poll = await getActivePoll(f.id);
      if (!poll) return res.json({ poll: null });
      const vk = viewerKeySchema.safeParse(p(req.query.viewerKey));
      const voted = await findVote(poll.id, vk.success ? vk.data : null, p(req.query.r) || null);
      res.json({
        poll: { id: poll.id, question: poll.question, options: poll.options },
        voted,
        results: voted === null ? null : await getTally(poll),
      });
    } catch (e: any) {
      console.error("[webinar-live] poll get error:", e.message);
      res.status(500).json({ message: "Poll unavailable" });
    }
  });

  // ── Public: vote (one per registration / viewer key) ──────────────────────
  const voteBody = z.object({
    optionIndex: z.number().int().min(0).max(3),
    viewerKey: viewerKeySchema,
    registrationId: z.string().max(64).optional().nullable(),
    email: z.string().max(254).optional().nullable(),
  });
  app.post("/api/public/webinars/:slug/poll/:pollId/vote", async (req: Request, res: Response) => {
    try {
      const f = await getFunnelBySlug(p(req.params.slug));
      if (!f) return res.status(404).json({ message: "Webinar not found" });
      const parsed = voteBody.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "Invalid vote" });
      if (beatLimited(`vote|${req.ip}`, 30)) return res.status(429).json({ message: "Too many votes" });
      const poll = await getActivePoll(f.id);
      if (!poll || poll.id !== p(req.params.pollId)) return res.status(409).json({ message: "This poll has closed." });
      const { optionIndex, viewerKey } = parsed.data;
      if (optionIndex >= poll.options.length) return res.status(400).json({ message: "Invalid option" });

      const reg = await resolveRegistration(f.id, parsed.data.registrationId, parsed.data.email);
      const ins = await pool.query(
        `INSERT INTO webinar_funnel_poll_votes (poll_id, option_index, registration_id, email, viewer_key)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [poll.id, optionIndex, reg?.id ?? null, reg?.email ?? null, viewerKey],
      );
      const counted = (ins.rowCount ?? 0) > 0;
      const voted = counted ? optionIndex : ((await findVote(poll.id, viewerKey, reg?.id)) ?? optionIndex);

      // Best-effort CRM tag — never blocks or fails the vote.
      if (counted && reg?.email) {
        tagCrmContactWithPollAnswer({
          userId: f.userId, email: reg.email, question: poll.question, optionLabel: poll.options[optionIndex],
          context: { webinarId: f.id, pollId: poll.id },
        }).catch(err => console.error("[webinar-live] poll CRM tag failed:", err?.message || err));
      }
      res.json({ voted, alreadyVoted: !counted, results: await getTally(poll, true) });
    } catch (e: any) {
      console.error("[webinar-live] vote error:", e.message);
      res.status(500).json({ message: "Couldn't record your vote" });
    }
  });

  // ── Owner: polls ──────────────────────────────────────────────────────────
  app.get("/api/webinar-funnels/:id/polls", requireAuth, async (req: Request, res: Response) => {
    try {
      const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
      if (!f) return res.status(404).json({ message: "Not found" });
      const [{ rows: polls }, { rows: votes }] = await Promise.all([
        pool.query(`SELECT id, question, options, active, created_at FROM webinar_funnel_polls WHERE webinar_id = $1 ORDER BY created_at DESC`, [f.id]),
        pool.query(
          `SELECT v.poll_id, v.option_index, COUNT(*)::int AS n FROM webinar_funnel_poll_votes v
             JOIN webinar_funnel_polls pl ON pl.id = v.poll_id WHERE pl.webinar_id = $1 GROUP BY v.poll_id, v.option_index`, [f.id],
        ),
      ]);
      res.setHeader("Cache-Control", "no-store");
      res.json(polls.map(r => {
        const poll = toPoll(r);
        const counts = poll.options.map(() => 0);
        for (const v of votes) if (v.poll_id === poll.id && v.option_index < counts.length) counts[v.option_index] = v.n;
        return { ...poll, counts, total: counts.reduce((a, b) => a + b, 0) };
      }));
    } catch (e: any) {
      console.error("[webinar-live] polls list error:", e.message);
      res.status(500).json({ message: "Failed to load polls" });
    }
  });

  const pollBody = z.object({
    question: z.string().trim().min(1).max(200),
    options: z.array(z.string().trim().min(1).max(80)).min(2).max(4),
  });
  app.post("/api/webinar-funnels/:id/polls", requireAuth, async (req: Request, res: Response) => {
    try {
      const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
      if (!f) return res.status(404).json({ message: "Not found" });
      const parsed = pollBody.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ message: "A poll needs a question and 2–4 options." });
      const { rows } = await pool.query(
        `INSERT INTO webinar_funnel_polls (webinar_id, question, options) VALUES ($1, $2, $3::jsonb)
         RETURNING id, question, options, active, created_at`,
        [f.id, cleanChatText(parsed.data.question), JSON.stringify(parsed.data.options.map(o => cleanChatText(o)))],
      );
      const poll = toPoll(rows[0]);
      res.status(201).json({ ...poll, counts: poll.options.map(() => 0), total: 0 });
    } catch (e: any) {
      console.error("[webinar-live] poll create error:", e.message);
      res.status(500).json({ message: "Couldn't create poll" });
    }
  });

  app.post("/api/webinar-funnels/:id/polls/:pollId/activate", requireAuth, async (req: Request, res: Response) => {
    const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
    if (!f) return res.status(404).json({ message: "Not found" });
    const pollId = p(req.params.pollId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rowCount } = await client.query(`SELECT 1 FROM webinar_funnel_polls WHERE id = $1 AND webinar_id = $2`, [pollId, f.id]);
      if (!rowCount) { await client.query("ROLLBACK"); return res.status(404).json({ message: "Poll not found" }); }
      await client.query(`UPDATE webinar_funnel_polls SET active = (id = $1) WHERE webinar_id = $2`, [pollId, f.id]);
      await client.query("COMMIT");
      invalidatePolls(f.id);
      res.json({ ok: true });
    } catch (e: any) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("[webinar-live] poll activate error:", e.message);
      res.status(500).json({ message: "Couldn't activate poll" });
    } finally {
      client.release();
    }
  });

  app.post("/api/webinar-funnels/:id/polls/:pollId/close", requireAuth, async (req: Request, res: Response) => {
    try {
      const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
      if (!f) return res.status(404).json({ message: "Not found" });
      const { rowCount } = await pool.query(
        `UPDATE webinar_funnel_polls SET active = FALSE WHERE id = $1 AND webinar_id = $2`, [p(req.params.pollId), f.id],
      );
      if (!rowCount) return res.status(404).json({ message: "Poll not found" });
      invalidatePolls(f.id);
      res.json({ ok: true });
    } catch (e: any) {
      console.error("[webinar-live] poll close error:", e.message);
      res.status(500).json({ message: "Couldn't close poll" });
    }
  });

  // ── Owner: revenue (registered → showed → clicked → CRM deals) ────────────
  app.get("/api/webinar-funnels/:id/revenue", requireAuth, async (req: Request, res: Response) => {
    try {
      const f = await getOwnedFunnel(p(req.params.id), (req.user as any).id);
      if (!f) return res.status(404).json({ message: "Not found" });
      const [regs, att, cta] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM webinar_funnel_registrations WHERE webinar_id = $1`, [f.id]),
        pool.query(
          `SELECT COUNT(*) FILTER (WHERE watch_seconds >= 15)::int AS attended,
                  COUNT(DISTINCT registration_id) FILTER (WHERE watch_seconds >= 15)::int AS registered_attended
             FROM webinar_attendance WHERE webinar_id = $1`, [f.id],
        ),
        pool.query(
          `SELECT COUNT(*)::int AS clicks, COUNT(DISTINCT COALESCE(registration_id, viewer_key))::int AS unique_clickers
             FROM webinar_cta_clicks WHERE webinar_id = $1`, [f.id],
        ),
      ]);

      // CRM deals attributed to this webinar. Best-effort: if the CRM tables aren't there yet, report zeros.
      type StageAgg = { stageId: string; name: string; position: number; isWon: boolean; isLost: boolean; count: number; valueCents: number };
      const stages = new Map<string, StageAgg>();
      const currencyCount = new Map<string, number>();
      let dealCount = 0, totalValueCents = 0, wonValueCents = 0, wonCount = 0;
      try {
        const { rows } = await pool.query(
          `SELECT s.id AS stage_id, s.name, s.position, s.is_won, s.is_lost, o.status, o.currency,
                  COUNT(*)::int AS n, COALESCE(SUM(o.value_cents), 0)::bigint AS value_cents
             FROM crm_opportunities o JOIN crm_pipeline_stages s ON s.id = o.stage_id
            WHERE o.owner_id = $1 AND (o.custom_fields->>'webinarId' = $2 OR o.tags @> $3::jsonb)
            GROUP BY s.id, s.name, s.position, s.is_won, s.is_lost, o.status, o.currency`,
          [f.userId, f.id, JSON.stringify([`webinar:${f.slug}`])],
        );
        for (const r of rows) {
          const n = r.n as number, v = Number(r.value_cents);
          const won = !!r.is_won || r.status === "won";
          const st = stages.get(r.stage_id) || { stageId: r.stage_id, name: r.name, position: r.position, isWon: !!r.is_won, isLost: !!r.is_lost, count: 0, valueCents: 0 };
          st.count += n; st.valueCents += v;
          stages.set(r.stage_id, st);
          dealCount += n; totalValueCents += v;
          if (won) { wonValueCents += v; wonCount += n; }
          currencyCount.set(r.currency || "USD", (currencyCount.get(r.currency || "USD") || 0) + n);
        }
      } catch (e: any) {
        console.warn("[webinar-live] revenue: CRM deal query skipped:", e.message);
      }
      const currency = [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";

      const registrations = regs.rows[0].n as number;
      const a = att.rows[0];
      res.setHeader("Cache-Control", "no-store");
      res.json({
        webinar: { id: f.id, title: f.title, slug: f.slug, status: f.status, scheduledAt: f.scheduledAt },
        registrations,
        attended: a.attended,
        registeredAttended: a.registered_attended,
        showRate: registrations ? Math.min(1, a.registered_attended / registrations) : null,
        ctaClicks: cta.rows[0].clicks,
        uniqueClickers: cta.rows[0].unique_clickers,
        deals: {
          count: dealCount,
          wonCount,
          currency,
          mixedCurrencies: currencyCount.size > 1,
          totalValueCents,
          wonValueCents,
          byStage: [...stages.values()].sort((x, y) => x.position - y.position),
        },
      });
    } catch (e: any) {
      console.error("[webinar-live] revenue error:", e.message);
      res.status(500).json({ message: "Failed to load revenue" });
    }
  });

  // ── Owner: can this video be embedded? (YouTube oEmbed: 401 = embedding off, 404 = private/missing) ──
  app.get("/api/webinar-funnels/tools/check-video", requireAuth, async (req: Request, res: Response) => {
    const id = p(req.query.id);
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return res.status(400).json({ message: "Invalid video id" });
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6_000);
      const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (r.ok) {
        const d: any = await r.json().catch(() => ({}));
        return res.json({ ok: true, title: d.title || null, author: d.author_name || null });
      }
      if (r.status === 401 || r.status === 403) return res.json({ ok: false, reason: "embedding_disabled" });
      if (r.status === 404 || r.status === 400) return res.json({ ok: false, reason: "not_found" });
      return res.json({ ok: null, reason: "unknown" });
    } catch {
      return res.json({ ok: null, reason: "unreachable" });
    }
  });

  // ── Owner: PDF deck upload ────────────────────────────────────────────────
  const deckUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "application/pdf" || path.extname(file.originalname).toLowerCase() === ".pdf") cb(null, true);
      else cb(new Error("Only PDF files are allowed"));
    },
  });
  app.post("/api/webinar-funnels/tools/upload-deck", requireAuth, (req: Request, res: Response) => {
    deckUpload.single("deck")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "PDF must be under 25 MB" : err.message });
      if (!req.file) return res.status(400).json({ message: "No PDF uploaded" });
      if (req.file.buffer.subarray(0, 5).toString() !== "%PDF-") return res.status(400).json({ message: "That file isn't a valid PDF" });
      try {
        const url = await saveMedia(req.file.buffer, `webinar-deck-${Date.now()}.pdf`);
        res.json({ url });
      } catch (e: any) {
        console.error("[webinar-live] deck upload error:", e.message);
        res.status(500).json({ message: "Upload failed" });
      }
    });
  });
}
