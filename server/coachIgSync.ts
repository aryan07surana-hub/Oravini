// Growth Lab: pull a connected user's Instagram reels + insights into the Coach Growth Lab state.
// Uses the existing Instagram connect (meta_tokens row). No schema changes, no Meta app changes.
// Flag COACH_IG_SYNC: "off" | "admin" (default: admin + test accounts) | "all" (everyone, after Meta approval).
import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { getUserMetaCredentials } from "./meta";

const STATE_TOOL = "coach-lab-state";
const GRAPH = "https://graph.facebook.com/v21.0";
const COOLDOWN_MS = 5 * 60 * 1000;

export const coachIgMode = () => (process.env.COACH_IG_SYNC || "admin").toLowerCase();

function allowed(u: any): boolean {
  const mode = coachIgMode();
  if (mode === "all") return true;
  if (mode === "off") return false;
  if (u?.role === "admin") return true;
  const email = String(u?.email || "").toLowerCase();
  const list = (process.env.COACH_IG_TEST_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  return list.includes(email) || /^test(\+|@)/.test(email);
}

async function graph(path: string, token: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok || d?.error) {
    const code = Number(d?.error?.code);
    const err: any = new Error(d?.error?.message || "Instagram request failed");
    err.kind = code === 190 ? "reconnect" : [10, 200, 283].includes(code) ? "permission" : [4, 17, 32, 613, 80004].includes(code) ? "rate" : "other";
    throw err;
  }
  return d;
}

const metric = (d: any, name: string): number | null => {
  const m = (d?.data || []).find((x: any) => x.name === name);
  const v = m?.values?.[0]?.value ?? m?.total_value?.value;
  return typeof v === "number" ? v : null;
};

function hookOf(caption: string) {
  const first = String(caption || "").split(/\n+/).map((s) => s.trim()).find(Boolean) || "";
  return first.replace(/\s+/g, " ").slice(0, 140);
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

export function registerCoachIgSync(app: Express) {
  const auth = (req: Request, res: Response, next: Function) => (req.isAuthenticated() ? next() : res.status(401).json({ message: "Unauthorized" }));

  app.get("/api/coach/lab/ig/status", auth, async (req: Request, res: Response) => {
    const u = req.user as any;
    const flag = allowed(u);
    try {
      const creds = flag ? await getUserMetaCredentials(u.id) : null;
      const scope = creds?.scope || "";
      res.json({
        enabled: flag, mode: coachIgMode(),
        connected: !!(creds && creds.igAccountId),
        expired: !!(creds?.expiresAt && creds.expiresAt.getTime() < Date.now()),
        igUsername: creds?.igUsername || null,
        insightsScope: /instagram_manage_insights/.test(scope),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/coach/lab/ig/sync", auth, async (req: Request, res: Response) => {
    const u = req.user as any;
    if (!allowed(u)) return res.status(403).json({ code: "flag_off", message: "Instagram sync is rolling out. Paste your reels for now." });
    try {
      const creds = await getUserMetaCredentials(u.id);
      if (!creds || !creds.igAccountId) return res.status(409).json({ code: "not_connected", message: "Connect Instagram first." });
      if (creds.expiresAt && creds.expiresAt.getTime() < Date.now()) return res.status(401).json({ code: "reconnect", message: "Your Instagram connection expired. Reconnect to sync." });

      const rows = await storage.getAiHistory(u.id, STATE_TOOL, 1);
      const state: any = rows[0]?.output || {};
      const last = state.igSync?.at ? new Date(state.igSync.at).getTime() : 0;
      if (!req.body?.force && Date.now() - last < COOLDOWN_MS) return res.json({ state, skipped: true });

      const media: any[] = [];
      let after = "";
      for (let p = 0; p < 3 && media.length < 60; p++) {
        const d = await graph(`${creds.igAccountId}/media`, creds.token, { fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count", limit: "30", ...(after ? { after } : {}) });
        media.push(...(d.data || []));
        after = d.paging?.cursors?.after;
        if (!d.paging?.next || !after) break;
      }
      const reelsRaw = media.filter((m) => m.media_product_type === "REELS" || m.media_type === "VIDEO");

      let insightsOk = true;
      const reels = await pool(reelsRaw, 4, async (m) => {
        let ins: any = null;
        try { ins = await graph(`${m.id}/insights`, creds.token, { metric: "views,reach,saved,shares,likes,comments,ig_reels_avg_watch_time" }); }
        catch (e: any) {
          if (e.kind === "reconnect") throw e;
          try { ins = await graph(`${m.id}/insights`, creds.token, { metric: "reach,saved,shares,likes,comments" }); }
          catch (e2: any) { if (e2.kind === "reconnect") throw e2; insightsOk = false; }
        }
        return {
          id: `ig_${m.id}`, source: "instagram", url: m.permalink || "",
          hook: hookOf(m.caption), transcript: String(m.caption || "").slice(0, 1800),
          views: (ins && (metric(ins, "views") ?? metric(ins, "reach"))) || 0,
          likes: (ins && metric(ins, "likes")) ?? m.like_count ?? 0,
          comments: (ins && metric(ins, "comments")) ?? m.comments_count ?? 0,
          saves: (ins && metric(ins, "saved")) || 0,
          shares: (ins && metric(ins, "shares")) || 0,
          lengthSec: 0,
          avgWatchSec: ins && metric(ins, "ig_reels_avg_watch_time") != null ? Math.round((metric(ins, "ig_reels_avg_watch_time") as number) / 1000) : undefined,
          postedAt: String(m.timestamp || "").slice(0, 10),
        };
      });

      const manual = (Array.isArray(state.reels) ? state.reels : []).filter((r: any) => r.source !== "instagram" && !String(r.id).startsWith("ig_") && !reels.some((x: any) => x.url && x.url === r.url));
      const next = { ...state, reels: [...reels.filter((r) => r.hook || r.transcript), ...manual], igSync: { at: new Date().toISOString(), count: reels.length, insights: insightsOk, username: creds.igUsername || null } };
      if (JSON.stringify(next).length > 400_000) return res.status(413).json({ message: "Too much data to store." });
      const old = await storage.getAiHistory(u.id, STATE_TOOL, 5);
      await storage.saveAiHistory({ userId: u.id, tool: STATE_TOOL, title: "Coach Growth Lab", inputs: {}, output: next });
      for (const o of old) await storage.deleteAiHistory(o.id, u.id);
      res.json({ state: next, synced: reels.length, insights: insightsOk });
    } catch (e: any) {
      if (e.kind === "reconnect") return res.status(401).json({ code: "reconnect", message: "Your Instagram connection expired. Reconnect to sync." });
      if (e.kind === "permission") return res.status(403).json({ code: "permission", message: "Instagram has not granted reel access yet. Reconnect and accept all permissions." });
      if (e.kind === "rate") return res.status(429).json({ code: "rate", message: "Instagram is busy. Try again in a few minutes." });
      res.status(500).json({ message: e.message || "Sync failed" });
    }
  });
}
