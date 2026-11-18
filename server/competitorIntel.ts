// Competitor Study intelligence layer.
//
//  - Metered Apify runner: every real Apify call is counted, logged and recorded
//    in competitor_apify_usage (additive table) with an estimated cost.
//  - Scrape cache: Instagram post/reel scrapes and profile scrapes are cached per
//    handle in competitor_scrape_cache so repeat analyses / overlapping watchlist
//    scans do not re-hit Apify.
//  - Reel transcripts: competitor reels are transcribed through the existing Groq
//    whisper-large-v3 path and cached permanently per reel.
//  - Transcript pattern mining, niche percentile bands, weekly auto-brief.
//
// No new paid providers: Apify (existing), Groq Whisper (existing), and the
// existing aiService chain (Groq first, OpenRouter fallback).

import { pool } from "./storage";
import { aiChatJson } from "./aiService";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SCRAPE_CACHE_TTL_MS = DAY_MS;

// ── Tables (additive only) ───────────────────────────────────────────────────

export async function ensureCompetitorIntelTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competitor_scrape_cache (
      handle VARCHAR NOT NULL,
      kind VARCHAR NOT NULL,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      item_count INTEGER NOT NULL DEFAULT 0,
      fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
      PRIMARY KEY (handle, kind)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competitor_reel_transcripts (
      short_code VARCHAR PRIMARY KEY,
      handle VARCHAR,
      post_url TEXT,
      status VARCHAR NOT NULL DEFAULT 'done',
      transcript TEXT,
      segments JSONB,
      language VARCHAR,
      duration_sec REAL,
      error TEXT,
      attempts INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_crt_handle ON competitor_reel_transcripts(handle)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competitor_apify_usage (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      context VARCHAR NOT NULL,
      run_id VARCHAR,
      actor VARCHAR NOT NULL,
      handle VARCHAR,
      item_count INTEGER NOT NULL DEFAULT 0,
      est_cost_usd REAL NOT NULL DEFAULT 0,
      ok BOOLEAN NOT NULL DEFAULT true,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cau_context ON competitor_apify_usage(context, created_at DESC)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competitor_weekly_briefs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      posts JSONB NOT NULL DEFAULT '[]'::jsonb,
      winners JSONB NOT NULL DEFAULT '[]'::jsonb,
      summary TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, week_start)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cwb_user ON competitor_weekly_briefs(user_id, week_start DESC)`);
  // Trend charts: posting cadence captured at scan time (older rows fall back to
  // recent_posts timestamps).
  await pool.query(`ALTER TABLE competitor_snapshots ADD COLUMN IF NOT EXISTS posts_per_week REAL`);
  // getLeaderboard / getRecentSnapshotsForUser select watchlist.niche, which no prior
  // migration created — the leaderboard 500'd on databases built from the repo.
  await pool.query(`ALTER TABLE competitor_watchlist ADD COLUMN IF NOT EXISTS niche TEXT`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_wl_time ON competitor_snapshots(watchlist_id, scanned_at DESC)`);
}

// ── Handles ──────────────────────────────────────────────────────────────────

export function normalizeHandle(h: string | null | undefined): string {
  return String(h || "").trim().replace(/^@+/, "").toLowerCase();
}

// ── Metered Apify runner ─────────────────────────────────────────────────────

export type ApifyActor = "apify~instagram-scraper" | "apify~instagram-profile-scraper";

export interface ApifyMeter {
  context: string;
  runId: string;
  calls: number;
  failedCalls: number;
  items: number;
  cacheHits: number;
  estCostUsd: number;
  events: Array<{ actor: ApifyActor; handle: string | null; items: number; ok: boolean; cached: boolean }>;
}

export function newApifyMeter(context: string): ApifyMeter {
  return {
    context,
    runId: `${context}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    calls: 0, failedCalls: 0, items: 0, cacheHits: 0, estCostUsd: 0, events: [],
  };
}

// Apify pay-per-result list prices (approx., overridable). Only used for the
// "est. spend" logs — never for billing users.
function estCost(actor: ApifyActor, items: number): number {
  const perK = actor === "apify~instagram-profile-scraper"
    ? Number(process.env.APIFY_EST_COST_PER_1K_PROFILES || 2.6)
    : Number(process.env.APIFY_EST_COST_PER_1K_POSTS || 2.3);
  return +((Math.max(items, 1) / 1000) * perK).toFixed(4);
}

export function meterSummary(m: ApifyMeter): string {
  return `[apify] ${m.context} run=${m.runId} calls=${m.calls} failed=${m.failedCalls} cacheHits=${m.cacheHits} items=${m.items} est=$${m.estCostUsd.toFixed(4)}`;
}

function apifyToken(actor: ApifyActor): string | undefined {
  return actor === "apify~instagram-profile-scraper"
    ? (process.env.APIFY_INSTAGRAM_TOKEN || process.env.APIFY_IG_SCRAPER_TOKEN || process.env.APIFY_TOKEN)
    : (process.env.APIFY_REEL_TOKEN || process.env.APIFY_IG_SCRAPER_TOKEN || process.env.APIFY_INSTAGRAM_TOKEN || process.env.APIFY_TOKEN);
}

async function recordUsage(meter: ApifyMeter, actor: ApifyActor, handle: string | null, items: number, ok: boolean, error?: string) {
  try {
    await pool.query(
      `INSERT INTO competitor_apify_usage (context, run_id, actor, handle, item_count, est_cost_usd, ok, error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [meter.context, meter.runId, actor, handle, items, ok ? estCost(actor, items) : 0, ok, error ? error.slice(0, 300) : null],
    );
  } catch { /* usage logging must never break a scrape */ }
}

export async function runApifyActor(
  actor: ApifyActor,
  payload: Record<string, any>,
  opts: { meter: ApifyMeter; handle?: string | null; timeoutMs?: number },
): Promise<any[]> {
  const token = apifyToken(actor);
  if (!token) throw new Error("Apify is not configured (set APIFY_TOKEN or APIFY_INSTAGRAM_TOKEN).");
  const timeoutMs = opts.timeoutMs ?? 90000;
  const handle = opts.handle ? normalizeHandle(opts.handle) : null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  opts.meter.calls++;
  try {
    const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}&timeout=${Math.ceil(timeoutMs / 1000)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const raw = await resp.text().catch(() => "");
      let detail = raw;
      try { const j = JSON.parse(raw); detail = j?.error?.message || j?.message || raw; } catch { /* keep raw */ }
      if (resp.status === 401 || resp.status === 403) throw new Error("Apify authentication failed. Check your APIFY token.");
      if (resp.status === 429) throw new Error("Apify rate limit hit. Please retry in a minute.");
      throw new Error(`Apify request failed (${resp.status}): ${String(detail).slice(0, 200)}`);
    }
    const json = await resp.json();
    const items = Array.isArray(json) ? json : [];
    opts.meter.items += items.length;
    const cost = estCost(actor, items.length);
    opts.meter.estCostUsd += cost;
    opts.meter.events.push({ actor, handle, items: items.length, ok: true, cached: false });
    await recordUsage(opts.meter, actor, handle, items.length, true);
    console.log(`[apify] call ${actor} handle=${handle ?? "-"} items=${items.length} est=$${cost.toFixed(4)} ctx=${opts.meter.context}`);
    return items;
  } catch (err: any) {
    opts.meter.failedCalls++;
    opts.meter.events.push({ actor, handle, items: 0, ok: false, cached: false });
    const msg = err?.name === "AbortError" ? "Apify request timed out while fetching Instagram data. Please retry." : String(err?.message || err);
    await recordUsage(opts.meter, actor, handle, 0, false, msg);
    console.warn(`[apify] call ${actor} handle=${handle ?? "-"} FAILED ctx=${opts.meter.context}: ${msg}`);
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }
}

// ── Scrape cache ─────────────────────────────────────────────────────────────

type CacheKind = "ig_posts" | "ig_profile";

async function readCache(handle: string, kind: CacheKind, maxAgeMs: number): Promise<{ items: any[]; fetchedAt: Date } | null> {
  const { rows } = await pool.query(
    `SELECT items, fetched_at FROM competitor_scrape_cache WHERE handle=$1 AND kind=$2 AND fetched_at > NOW() - ($3::text || ' milliseconds')::interval`,
    [handle, kind, String(Math.max(0, Math.floor(maxAgeMs)))],
  );
  if (!rows.length) return null;
  const items = Array.isArray(rows[0].items) ? rows[0].items : [];
  if (!items.length) return null;
  return { items, fetchedAt: new Date(rows[0].fetched_at) };
}

async function writeCache(handle: string, kind: CacheKind, items: any[]): Promise<void> {
  if (!items.length) return; // never cache a failed / empty scrape
  await pool.query(
    `INSERT INTO competitor_scrape_cache (handle, kind, items, item_count, fetched_at)
     VALUES ($1,$2,$3::jsonb,$4,NOW())
     ON CONFLICT (handle, kind) DO UPDATE SET items=EXCLUDED.items, item_count=EXCLUDED.item_count, fetched_at=NOW()`,
    [handle, kind, JSON.stringify(items), items.length],
  );
}

// In-flight de-duplication: two concurrent requests for the same handle share one
// Apify call instead of racing each other to the API.
const inflight = new Map<string, Promise<any[]>>();

export class ScrapeError extends Error {
  constructor(message: string, public handle: string, public reason: "failed" | "empty") { super(message); }
}

export interface ScrapeResult { items: any[]; cached: boolean; fetchedAt: Date }

/**
 * Posts + reels for one profile in ONE Apify call (instagram-scraper, resultsType
 * "posts" — the profile grid includes reels with view counts and videoUrl).
 * Cached per handle for 24h. Throws ScrapeError on failure or empty result.
 */
export async function scrapeProfilePosts(
  profileUrl: string,
  rawHandle: string,
  opts: { meter: ApifyMeter; limit?: number; maxAgeMs?: number },
): Promise<ScrapeResult> {
  const handle = normalizeHandle(rawHandle);
  const maxAgeMs = opts.maxAgeMs ?? SCRAPE_CACHE_TTL_MS;
  const cached = await readCache(handle, "ig_posts", maxAgeMs).catch(() => null);
  if (cached) {
    opts.meter.cacheHits++;
    opts.meter.events.push({ actor: "apify~instagram-scraper", handle, items: cached.items.length, ok: true, cached: true });
    console.log(`[apify] cache hit ig_posts handle=${handle} items=${cached.items.length} age=${Math.round((Date.now() - cached.fetchedAt.getTime()) / 60000)}m ctx=${opts.meter.context}`);
    return { items: cached.items, cached: true, fetchedAt: cached.fetchedAt };
  }
  const key = `ig_posts:${handle}`;
  let p = inflight.get(key);
  if (!p) {
    p = runApifyActor("apify~instagram-scraper", {
      directUrls: [profileUrl], resultsType: "posts", resultsLimit: opts.limit ?? 30, addParentData: false,
    }, { meter: opts.meter, handle }).finally(() => inflight.delete(key));
    inflight.set(key, p);
  } else {
    opts.meter.cacheHits++;
  }
  let items: any[];
  try {
    items = await p;
  } catch (err: any) {
    throw new ScrapeError(`Couldn't scrape @${handle}: ${err.message}`, handle, "failed");
  }
  // Apify returns error rows (e.g. {error: "not_found"}) for private / missing profiles.
  items = items.filter((it: any) => it && !it.error && (it.shortCode || it.url || it.id));
  if (!items.length) throw new ScrapeError(`@${handle} returned no posts — the account may be private, empty, or misspelled.`, handle, "empty");
  await writeCache(handle, "ig_posts", items).catch(() => {});
  return { items, cached: false, fetchedAt: new Date() };
}

/**
 * Profile metadata (followers, bio, latestPosts) via instagram-profile-scraper.
 * Used by every watchlist scan path. Cached per handle; callers choose freshness
 * (cron uses ~90 min so one cycle hits Apify once per unique handle).
 */
export async function fetchProfile(
  rawHandle: string,
  opts: { meter: ApifyMeter; maxAgeMs: number },
): Promise<{ profile: any; cached: boolean; fetchedAt: Date }> {
  const handle = normalizeHandle(rawHandle);
  const cached = await readCache(handle, "ig_profile", opts.maxAgeMs).catch(() => null);
  if (cached) {
    opts.meter.cacheHits++;
    opts.meter.events.push({ actor: "apify~instagram-profile-scraper", handle, items: 1, ok: true, cached: true });
    return { profile: cached.items[0], cached: true, fetchedAt: cached.fetchedAt };
  }
  const key = `ig_profile:${handle}`;
  let p = inflight.get(key);
  if (!p) {
    p = runApifyActor("apify~instagram-profile-scraper", { usernames: [handle], proxy: { useApifyProxy: true } }, { meter: opts.meter, handle, timeoutMs: 75000 })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  } else {
    opts.meter.cacheHits++;
  }
  const items = (await p).filter((it: any) => it && !it.error);
  if (!items.length) throw new ScrapeError(`No profile data returned for @${handle}`, handle, "empty");
  await writeCache(handle, "ig_profile", items.slice(0, 1)).catch(() => {});
  return { profile: items[0], cached: false, fetchedAt: new Date() };
}

/** Cheap "is this profile unchanged since the last snapshot?" check (no Apify). */
export function profileFingerprint(profile: any): string {
  const latest = Array.isArray(profile?.latestPosts) ? profile.latestPosts[0] : null;
  return [profile?.postsCount ?? "", profile?.followersCount ?? "", latest?.shortCode ?? latest?.url ?? ""].join("|");
}

/** posts/week from a list of post timestamps (same method as the deep analysis). */
export function postsPerWeekFromTimestamps(timestamps: Array<string | number | Date | null | undefined>): number | null {
  const dates = timestamps
    .map(t => (t ? new Date(t as any) : null))
    .filter((d): d is Date => !!d && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (dates.length < 2) return null;
  const weeks = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (7 * DAY_MS);
  if (weeks <= 0) return null;
  return +(dates.length / weeks).toFixed(2);
}

// ── Reel transcripts (Groq whisper-large-v3, cached permanently) ─────────────

export interface ReelForTranscript {
  shortCode: string;
  videoUrl: string | null;
  url: string | null;
  views: number;
  caption: string;
  durationSec: number | null;
}

export interface TranscriptRow {
  short_code: string;
  status: "done" | "failed" | "no_speech";
  transcript: string | null;
  segments: Array<{ start: number; end: number; text: string }> | null;
  duration_sec: number | null;
  language: string | null;
}

export function reelsFromScrape(items: any[], limit = 20): ReelForTranscript[] {
  return items
    .filter((p: any) => (p.type === "Video" || p.productType === "clips" || p.videoUrl) && (p.shortCode || p.id))
    .map((p: any) => ({
      shortCode: String(p.shortCode || p.id),
      videoUrl: p.videoUrl || null,
      url: p.url || (p.shortCode ? `https://www.instagram.com/reel/${p.shortCode}/` : null),
      views: p.videoPlayCount ?? p.videoViewCount ?? p.playsCount ?? 0,
      caption: String(p.caption || ""),
      durationSec: typeof p.videoDuration === "number" ? p.videoDuration : null,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export async function getTranscripts(shortCodes: string[]): Promise<Map<string, TranscriptRow & { updated_at: Date; attempts: number }>> {
  const out = new Map<string, any>();
  if (!shortCodes.length) return out;
  const { rows } = await pool.query(`SELECT * FROM competitor_reel_transcripts WHERE short_code = ANY($1::varchar[])`, [shortCodes]);
  for (const r of rows) out.set(r.short_code, r);
  return out;
}

const MAX_WHISPER_BYTES = 25 * 1024 * 1024;

async function transcribeVideoUrl(videoUrl: string): Promise<{ text: string; segments: any[]; duration: number | null; language: string | null }> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY not configured");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 25000);
  let buf: Buffer;
  try {
    const vr = await fetch(videoUrl, { signal: ctl.signal });
    if (!vr.ok) throw new Error(`video download failed (${vr.status}) — CDN link may have expired`);
    const len = Number(vr.headers.get("content-length") || 0);
    if (len > MAX_WHISPER_BYTES) throw new Error("video larger than 25MB Whisper limit");
    buf = Buffer.from(await vr.arrayBuffer());
  } finally { clearTimeout(t); }
  if (buf.length > MAX_WHISPER_BYTES) throw new Error("video larger than 25MB Whisper limit");

  // Same endpoint/model as the existing transcription routes.
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: "video/mp4" }), "reel.mp4");
  form.append("model", "whisper-large-v3");
  form.append("response_format", "verbose_json");
  const wr = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
  });
  if (!wr.ok) throw new Error(`Whisper error ${wr.status}: ${(await wr.text().catch(() => "")).slice(0, 200)}`);
  const data: any = await wr.json();
  const segments = (Array.isArray(data.segments) ? data.segments : []).map((s: any) => ({
    start: +Number(s.start || 0).toFixed(2), end: +Number(s.end || 0).toFixed(2), text: String(s.text || "").trim(),
  }));
  return { text: String(data.text || "").trim(), segments, duration: typeof data.duration === "number" ? data.duration : null, language: data.language || null };
}

async function transcribeAndStore(reel: ReelForTranscript, handle: string): Promise<void> {
  try {
    if (!reel.videoUrl) throw new Error("no videoUrl in scrape");
    const r = await transcribeVideoUrl(reel.videoUrl);
    const words = r.text.split(/\s+/).filter(Boolean).length;
    const status = words < 3 ? "no_speech" : "done";
    await pool.query(
      `INSERT INTO competitor_reel_transcripts (short_code, handle, post_url, status, transcript, segments, language, duration_sec, error, attempts, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,NULL,1,NOW())
       ON CONFLICT (short_code) DO UPDATE SET status=EXCLUDED.status, transcript=EXCLUDED.transcript, segments=EXCLUDED.segments,
         language=EXCLUDED.language, duration_sec=EXCLUDED.duration_sec, error=NULL,
         attempts=competitor_reel_transcripts.attempts+1, updated_at=NOW()`,
      [reel.shortCode, handle, reel.url, status, r.text, JSON.stringify(r.segments), r.language, r.duration ?? reel.durationSec],
    );
  } catch (err: any) {
    await pool.query(
      `INSERT INTO competitor_reel_transcripts (short_code, handle, post_url, status, error, attempts, updated_at)
       VALUES ($1,$2,$3,'failed',$4,1,NOW())
       ON CONFLICT (short_code) DO UPDATE SET error=EXCLUDED.error, attempts=competitor_reel_transcripts.attempts+1, updated_at=NOW()
       WHERE competitor_reel_transcripts.status = 'failed'`,
      [reel.shortCode, handle, reel.url, String(err?.message || err).slice(0, 300)],
    ).catch(() => {});
  }
}

/**
 * Ensure transcripts exist for the given reels. Cached rows (done / no_speech) are
 * reused forever; failed rows are retried after 24h. Work that doesn't finish by
 * `deadlineMs` keeps running in the background so the next analysis has it.
 */
export async function ensureTranscripts(
  reels: ReelForTranscript[],
  handle: string,
  opts: { deadlineMs?: number; concurrency?: number } = {},
): Promise<Map<string, any>> {
  const codes = reels.map(r => r.shortCode);
  const existing = await getTranscripts(codes);
  const todo = reels.filter(r => {
    const row = existing.get(r.shortCode);
    if (!row) return true;
    if (row.status === "failed") return Date.now() - new Date(row.updated_at).getTime() > DAY_MS && row.attempts < 5;
    return false;
  });
  if (todo.length && process.env.GROQ_API_KEY) {
    const concurrency = opts.concurrency ?? 4;
    const queue = [...todo];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const r = queue.shift()!;
        await transcribeAndStore(r, normalizeHandle(handle));
      }
    });
    const all = Promise.all(workers);
    const deadline = new Promise<void>(res => setTimeout(res, opts.deadlineMs ?? 40000));
    await Promise.race([all, deadline]);
  }
  return getTranscripts(codes);
}

// ── Transcript pattern mining ────────────────────────────────────────────────

const CTA_RE = /\b(follow( me| for)?|comment|save (this|it)|share (this|it|with)|link in (my )?bio|dm me|send me|subscribe|click|tap|grab|download|join|sign up|book a call|check out)\b/i;

export function classifyOpening(line: string): string {
  const l = line.trim().toLowerCase();
  if (!l) return "no-speech";
  if (/\?\s*$/.test(l) || /^(what|why|how|did you|do you|have you|are you|is it|can you|would you|ever)\b/.test(l)) return "question";
  if (/^(stop|don't|do not|never|quit|you're doing|you are doing|unpopular|nobody|no one)/.test(l)) return "contrarian";
  if (/\b\d[\d,.%]*\b/.test(l)) return "number/stat";
  if (/^(i |i'm|i've|when i|my |last (week|year|month)|yesterday|so i)/.test(l)) return "story";
  if (/^(here's|here are|these|this is how|the (\d+|three|five|top))/.test(l)) return "list/promise";
  if (/^(if you|you |your )/.test(l)) return "direct-address";
  return "statement";
}

function firstLine(t: { transcript: string | null; segments: any[] | null }): { text: string; endSec: number | null } {
  const seg = Array.isArray(t.segments) && t.segments.length ? t.segments[0] : null;
  if (seg) return { text: String(seg.text || ""), endSec: typeof seg.end === "number" ? seg.end : null };
  const s = String(t.transcript || "").split(/(?<=[.!?])\s+/)[0] || "";
  return { text: s, endSec: null };
}

function median(nums: number[]): number | null {
  const a = nums.filter(n => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : +((a[m - 1] + a[m]) / 2).toFixed(2);
}

export interface TranscriptInsights {
  reelsConsidered: number;
  transcribed: number;
  noSpeech: number;
  failed: number;
  pending: number;
  stats: { medianHookSec: number | null; medianWpm: number | null; ctaRate: number | null; medianDurationSec: number | null; wordsInFirst3sMedian: number | null };
  openingTypes: Array<{ type: string; count: number; avgViews: number }>;
  ctaPhrases: Array<{ phrase: string; count: number }>;
  patterns: Array<{ pattern: string; evidence: string; howToUse: string }>;
  hookFormula: string | null;
  ctaFormula: string | null;
  structure: string | null;
  summary: string | null;
  examples: Array<{ url: string | null; views: number; openingType: string; hookLine: string; hookSec: number | null; ctaPhrase: string | null }>;
  aiUsed: boolean;
}

export async function mineTranscriptPatterns(
  reels: ReelForTranscript[],
  transcripts: Map<string, any>,
  handle: string,
): Promise<TranscriptInsights> {
  type Row = { reel: ReelForTranscript; t: any; hookLine: string; hookSec: number | null; words: number; wpm: number | null; first3: number; cta: string | null; opening: string };
  const rows: Row[] = [];
  let noSpeech = 0, failed = 0, pending = 0;
  for (const reel of reels) {
    const t = transcripts.get(reel.shortCode);
    if (!t) { pending++; continue; }
    if (t.status === "no_speech") { noSpeech++; continue; }
    if (t.status !== "done") { failed++; continue; }
    const fl = firstLine(t);
    const text = String(t.transcript || "");
    const words = text.split(/\s+/).filter(Boolean).length;
    const dur = Number(t.duration_sec || reel.durationSec || 0);
    const segs: any[] = Array.isArray(t.segments) ? t.segments : [];
    const first3 = segs.filter(s => s.start < 3).map(s => {
      // proportion of words inside the first 3s
      const w = String(s.text || "").split(/\s+/).filter(Boolean).length;
      const span = Math.max(0.01, s.end - s.start);
      return s.end <= 3 ? w : Math.round(w * Math.max(0, 3 - s.start) / span);
    }).reduce((a, b) => a + b, 0);
    const tail = segs.length ? segs.filter(s => s.start >= dur * 0.7).map(s => s.text).join(" ") : text.slice(-Math.floor(text.length * 0.3));
    const ctaSentence = tail.split(/(?<=[.!?])\s+/).find(s => CTA_RE.test(s)) || null;
    rows.push({
      reel, t, hookLine: fl.text, hookSec: fl.endSec, words,
      wpm: dur > 0 ? Math.round((words / dur) * 60) : null, first3,
      cta: ctaSentence ? ctaSentence.trim().slice(0, 140) : null,
      opening: classifyOpening(fl.text),
    });
  }

  const base: TranscriptInsights = {
    reelsConsidered: reels.length, transcribed: rows.length, noSpeech, failed, pending,
    stats: {
      medianHookSec: median(rows.map(r => r.hookSec ?? NaN)),
      medianWpm: median(rows.map(r => r.wpm ?? NaN)),
      ctaRate: rows.length ? +((rows.filter(r => r.cta).length / rows.length) * 100).toFixed(0) : null,
      medianDurationSec: median(rows.map(r => Number(r.t.duration_sec || r.reel.durationSec || NaN))),
      wordsInFirst3sMedian: median(rows.map(r => r.first3)),
    },
    openingTypes: [], ctaPhrases: [], patterns: [], hookFormula: null, ctaFormula: null, structure: null, summary: null,
    examples: [], aiUsed: false,
  };
  if (!rows.length) return base;

  // AI labelling (Groq → OpenRouter). Falls back to the heuristic labels above.
  try {
    const compact = rows.map((r, i) => ({
      i, views: r.reel.views, durationSec: r.t.duration_sec ?? r.reel.durationSec, firstLineEndsAtSec: r.hookSec,
      opening: r.hookLine.slice(0, 220), ending: String(r.t.transcript || "").slice(-200),
    }));
    const raw = await aiChatJson(
      "You analyse spoken Instagram reel transcripts and extract hook, CTA and structure patterns. Use ONLY the transcripts given. Return ONLY valid JSON.",
      `Transcripts of @${normalizeHandle(handle)}'s top reels (sorted by views). For each reel label the opening and CTA, then find patterns ACROSS reels.

${JSON.stringify(compact)}

Return JSON:
{
  "perReel": [{ "i": 0, "openingType": "question|contrarian|number/stat|story|list/promise|direct-address|statement", "hookLine": "the spoken hook (verbatim, trimmed)", "ctaPhrase": "verbatim spoken CTA or null", "structure": "e.g. Hook → problem → 3 tips → CTA" }],
  "patterns": [{ "pattern": "short name", "evidence": "how many reels / which numbers show it", "howToUse": "one concrete instruction" }],
  "hookFormula": "fill-in-the-blank hook template derived from the top reels",
  "ctaFormula": "fill-in-the-blank CTA template, or null if they rarely use spoken CTAs",
  "structure": "the most common spoken structure",
  "summary": "2 sentences on what their spoken delivery does differently"
}`,
      { maxTokens: 2500, temperature: 0.3, feature: "competitor-transcripts" },
    );
    const parsed = JSON.parse(raw);
    for (const pr of Array.isArray(parsed.perReel) ? parsed.perReel : []) {
      const r = rows[Number(pr.i)];
      if (!r) continue;
      if (typeof pr.openingType === "string" && pr.openingType) r.opening = pr.openingType;
      if (typeof pr.hookLine === "string" && pr.hookLine) r.hookLine = pr.hookLine;
      if (pr.ctaPhrase && typeof pr.ctaPhrase === "string") r.cta = pr.ctaPhrase.slice(0, 140);
    }
    base.patterns = (Array.isArray(parsed.patterns) ? parsed.patterns : []).slice(0, 6);
    base.hookFormula = parsed.hookFormula || null;
    base.ctaFormula = parsed.ctaFormula || null;
    base.structure = parsed.structure || null;
    base.summary = parsed.summary || null;
    base.aiUsed = true;
  } catch (e: any) {
    console.warn(`[competitor/transcripts] AI pattern mining failed, using heuristics: ${e.message}`);
  }

  // Distributions are always computed server-side from the per-reel labels.
  const byType = new Map<string, { count: number; views: number }>();
  for (const r of rows) {
    const e = byType.get(r.opening) ?? { count: 0, views: 0 };
    e.count++; e.views += r.reel.views;
    byType.set(r.opening, e);
  }
  base.openingTypes = [...byType.entries()]
    .map(([type, e]) => ({ type, count: e.count, avgViews: Math.round(e.views / e.count) }))
    .sort((a, b) => b.count - a.count);
  const ctaCounts = new Map<string, number>();
  for (const r of rows) if (r.cta) {
    const k = r.cta.toLowerCase().replace(/[^\w\s']/g, "").trim().slice(0, 80);
    if (k) ctaCounts.set(k, (ctaCounts.get(k) ?? 0) + 1);
  }
  base.ctaPhrases = [...ctaCounts.entries()].map(([phrase, count]) => ({ phrase, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  base.stats.ctaRate = +((rows.filter(r => r.cta).length / rows.length) * 100).toFixed(0);
  base.examples = rows.slice(0, 6).map(r => ({
    url: r.reel.url, views: r.reel.views, openingType: r.opening, hookLine: r.hookLine.slice(0, 200), hookSec: r.hookSec, ctaPhrase: r.cta,
  }));
  return base;
}

// ── Niche benchmarks (percentile bands within the user's watchlist) ──────────

/** Median of an ascending array (mean of the two middle values for even n). */
export function medianOf(sortedAsc: number[]): number | null {
  if (!sortedAsc.length) return null;
  const m = Math.floor(sortedAsc.length / 2);
  return sortedAsc.length % 2 ? sortedAsc[m] : (sortedAsc[m - 1] + sortedAsc[m]) / 2;
}

/**
 * Threshold to be in the top `share` of n accounts: the k-th highest value with
 * k = floor(n * share). Null when the set is too small for that band to contain
 * even one account (e.g. "top 10%" needs n >= 10). This keeps labels literal —
 * with 4 accounts only the single best one is "Top 25%".
 */
export function topShareThreshold(sortedAsc: number[], share: number): number | null {
  const k = Math.floor(sortedAsc.length * share);
  if (k < 1) return null;
  return sortedAsc[sortedAsc.length - k];
}

export type BandLabel = "top10" | "top25" | "aboveMedian" | "belowMedian";

export function computeBenchmarks<T extends Record<string, any>>(rows: T[], metrics: string[]) {
  const bands: Record<string, { n: number; p50: number | null; p75: number | null; p90: number | null }> = {};
  const perRow: Record<string, Record<string, BandLabel | null>> = {};
  for (const m of metrics) {
    const vals = rows.map(r => Number(r[m])).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    bands[m] = { n: vals.length, p50: medianOf(vals), p75: topShareThreshold(vals, 0.25), p90: topShareThreshold(vals, 0.10) };
  }
  for (const r of rows) {
    const key = String(r.id);
    perRow[key] = {};
    for (const m of metrics) {
      const raw = r[m];
      const v = Number(raw);
      const b = bands[m];
      if (raw == null || !Number.isFinite(v) || b.n < 2 || b.p50 == null) { perRow[key][m] = null; continue; }
      perRow[key][m] = b.p90 != null && v >= b.p90 ? "top10"
        : b.p75 != null && v >= b.p75 ? "top25"
        : v > b.p50 ? "aboveMedian" : "belowMedian";
    }
  }
  return { bands, perRow };
}

// ── Weekly auto-brief ────────────────────────────────────────────────────────

export function weekStartUTC(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = x.getUTCDay(); // 0 Sun
  x.setUTCDate(x.getUTCDate() - ((dow + 6) % 7)); // back to Monday
  return x.toISOString().slice(0, 10);
}

/**
 * Watchlist "winners": posts that beat their own account's average views the most
 * (outlier multiple), from detected posts in the last 7 days, falling back to the
 * latest snapshot's recent posts (last 14 days) when the feed is thin. DB only.
 */
export async function getWatchlistWinners(userId: string, limit = 8) {
  const { rows: detected } = await pool.query(`
    SELECT d.handle, d.post_url, d.caption, d.views, d.likes, d.comments, d.post_type, d.posted_at, d.ai_analysis,
           (SELECT s.avg_views FROM competitor_snapshots s WHERE s.watchlist_id = d.watchlist_id ORDER BY s.scanned_at DESC LIMIT 1) AS acct_avg_views
    FROM competitor_detected_posts d
    JOIN competitor_watchlist w ON w.id = d.watchlist_id AND w.is_active = true
    WHERE d.user_id = $1 AND COALESCE(d.posted_at, d.detected_at) > NOW() - INTERVAL '7 days'
  `, [userId]);
  const seen = new Set<string>();
  const cands: any[] = [];
  const push = (c: any) => { if (!c.postUrl || seen.has(c.postUrl)) return; seen.add(c.postUrl); cands.push(c); };
  for (const r of detected) {
    const base = Number(r.acct_avg_views) || 0;
    const metric = Number(r.views) || Number(r.likes) || 0;
    push({
      handle: r.handle, postUrl: r.post_url, caption: String(r.caption || "").slice(0, 300), views: Number(r.views) || 0,
      likes: Number(r.likes) || 0, type: r.post_type, postedAt: r.posted_at, hook: r.ai_analysis?.hook ?? null,
      multiple: base > 0 ? +(metric / base).toFixed(2) : null, source: "feed",
    });
  }
  if (cands.length < limit) {
    const { rows: snaps } = await pool.query(`
      SELECT DISTINCT ON (s.watchlist_id) s.watchlist_id, w.handle, s.avg_views, s.avg_likes, s.recent_posts
      FROM competitor_snapshots s JOIN competitor_watchlist w ON w.id = s.watchlist_id AND w.is_active = true
      WHERE s.user_id = $1 ORDER BY s.watchlist_id, s.scanned_at DESC
    `, [userId]);
    const cutoff = Date.now() - 14 * DAY_MS;
    for (const s of snaps) {
      for (const p of Array.isArray(s.recent_posts) ? s.recent_posts : []) {
        if (p.timestamp && new Date(p.timestamp).getTime() < cutoff) continue;
        const base = Number(p.views ? s.avg_views : s.avg_likes) || 0;
        const metric = Number(p.views) || Number(p.likes) || 0;
        push({
          handle: s.handle, postUrl: p.url, caption: String(p.caption || "").slice(0, 300), views: Number(p.views) || 0,
          likes: Number(p.likes) || 0, type: p.type, postedAt: p.timestamp, hook: null,
          multiple: base > 0 ? +(metric / base).toFixed(2) : null, source: "snapshot",
        });
      }
    }
  }
  return cands
    .sort((a, b) => (b.multiple ?? 0) - (a.multiple ?? 0) || (b.views || b.likes) - (a.views || a.likes))
    .slice(0, limit);
}

export async function generateWeeklyBrief(userId: string, opts: { force?: boolean } = {}) {
  const week = weekStartUTC();
  if (!opts.force) {
    const { rows } = await pool.query(`SELECT id, user_id, week_start::text AS week_start, posts, winners, summary, created_at FROM competitor_weekly_briefs WHERE user_id=$1 AND week_start=$2`, [userId, week]);
    if (rows.length) return { brief: rows[0], created: false };
  }
  const winners = await getWatchlistWinners(userId, 8);
  if (!winners.length) return { brief: null, created: false, reason: "no_winners" as const };

  const { rows: prof } = await pool.query(`SELECT niche, goal, content_style FROM coach_profiles WHERE user_id=$1 LIMIT 1`, [userId]).catch(() => ({ rows: [] as any[] }));
  const niche = prof[0]?.niche || "their niche";

  const raw = await aiChatJson(
    "You are a content strategist. You turn a creator's competitor watchlist winners into a short weekly plan. Use only the data provided; cite which winner each idea comes from. Return ONLY valid JSON.",
    `Creator niche: ${niche}
This week's winners from their watchlist (multiple = views vs that account's own average):
${JSON.stringify(winners.map((w, i) => ({ i, handle: w.handle, type: w.type, views: w.views, likes: w.likes, multiple: w.multiple, caption: w.caption.slice(0, 220), hook: w.hook })), null, 1)}

Pick the 3 posts this creator should make THIS week. Each must be an original take (not a copy) on a proven winner.
Return JSON:
{
  "summary": "1 sentence on what is winning in their watchlist this week",
  "posts": [
    { "title": "working title", "format": "reel|carousel|post", "hook": "copy-paste first line", "outline": ["beat 1", "beat 2", "beat 3"], "cta": "closing CTA", "why": "why this will work now — cite the winner's numbers", "basedOn": [0] }
  ]
}`,
    { maxTokens: 1800, temperature: 0.6, feature: "competitor-weekly-brief" },
  );
  const parsed = JSON.parse(raw);
  const posts = (Array.isArray(parsed.posts) ? parsed.posts : []).slice(0, 3).map((p: any) => ({
    title: String(p.title || "Untitled"),
    format: ["reel", "carousel", "post"].includes(p.format) ? p.format : "reel",
    hook: String(p.hook || ""),
    outline: Array.isArray(p.outline) ? p.outline.map(String).slice(0, 6) : [],
    cta: p.cta ? String(p.cta) : null,
    why: String(p.why || ""),
    basedOn: (Array.isArray(p.basedOn) ? p.basedOn : []).map((i: any) => winners[Number(i)]).filter(Boolean)
      .map((w: any) => ({ handle: w.handle, postUrl: w.postUrl, views: w.views, likes: w.likes, multiple: w.multiple })),
  }));
  if (!posts.length) throw new Error("AI returned no brief posts");
  const { rows } = await pool.query(`
    INSERT INTO competitor_weekly_briefs (user_id, week_start, posts, winners, summary)
    VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)
    ON CONFLICT (user_id, week_start) DO UPDATE SET posts=EXCLUDED.posts, winners=EXCLUDED.winners, summary=EXCLUDED.summary, created_at=NOW()
    RETURNING id, user_id, week_start::text AS week_start, posts, winners, summary, created_at`,
    [userId, week, JSON.stringify(posts), JSON.stringify(winners), parsed.summary ? String(parsed.summary) : null],
  );
  return { brief: rows[0], created: true };
}

export async function listWeeklyBriefs(userId: string, limit = 8) {
  const { rows } = await pool.query(`SELECT id, user_id, week_start::text AS week_start, posts, winners, summary, created_at FROM competitor_weekly_briefs WHERE user_id=$1 ORDER BY week_start DESC LIMIT $2`, [userId, limit]);
  return rows;
}

// ── Watchlist scan economics ─────────────────────────────────────────────────

/**
 * Handles whose post count hasn't moved across all snapshots in the last 48h
 * (and we have at least 24h of history). These get scanned on a slower cadence.
 * Pure DB check — costs no Apify calls.
 */
export async function getDormantHandles(handles: string[]): Promise<Set<string>> {
  if (!handles.length) return new Set();
  const { rows } = await pool.query(`
    SELECT lower(regexp_replace(w.handle, '^@+', '')) AS h
    FROM competitor_snapshots s JOIN competitor_watchlist w ON w.id = s.watchlist_id
    WHERE s.scanned_at > NOW() - INTERVAL '48 hours' AND s.post_count IS NOT NULL
      AND lower(regexp_replace(w.handle, '^@+', '')) = ANY($1::text[])
    GROUP BY 1
    HAVING COUNT(DISTINCT s.post_count) = 1 AND MIN(s.scanned_at) < NOW() - INTERVAL '24 hours'
  `, [handles]);
  return new Set(rows.map((r: any) => r.h));
}

/** Snapshot is redundant if nothing moved and we already have one from the last 12h. */
export function isUnchangedSnapshot(lastSnap: any, next: { postCount: number | null; followerCount: number | null }): boolean {
  if (!lastSnap) return false;
  const age = Date.now() - new Date(lastSnap.scannedAt ?? lastSnap.scanned_at).getTime();
  return age < 12 * 60 * 60 * 1000
    && (lastSnap.postCount ?? lastSnap.post_count) === next.postCount
    && (lastSnap.followerCount ?? lastSnap.follower_count) === next.followerCount;
}
