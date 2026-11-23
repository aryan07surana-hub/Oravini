import type { Express, Request, Response, NextFunction } from "express";
import { newState, openToken, readUnifiedConfig, UnifiedError } from "./instagramUnifiedCore";
import { allowedMediaUrl, inspectAsset, PublishingGraph, validateDraft, type PublishDraft } from "./instagramPublishingCore";
type Query = (text: string, values?: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
export async function ensurePublishingSchema(query: Query) {
  await query(`CREATE TABLE IF NOT EXISTS instagram_publish_jobs (
    id TEXT PRIMARY KEY, user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL, grant_version TEXT NOT NULL, draft JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', scheduled_at TIMESTAMPTZ NOT NULL,
    next_attempt_at TIMESTAMPTZ NOT NULL, container_id TEXT, children JSONB NOT NULL DEFAULT '[]',
    published_media_id TEXT, error TEXT, lease_until TIMESTAMPTZ, polls INTEGER NOT NULL DEFAULT 0,
    idempotency_key TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id,idempotency_key));
    CREATE INDEX IF NOT EXISTS instagram_publish_due ON instagram_publish_jobs(next_attempt_at) WHERE status IN ('scheduled','preparing');`);
}
export function publishingEnabled(env = process.env) { return env.INSTAGRAM_PUBLISH_ENABLED === "true"; }
export async function registerInstagramPublishingRoutes(app: Express, deps: { query: Query; env?: NodeJS.ProcessEnv; fetcher?: typeof fetch }) {
  const env = deps.env || process.env, query = deps.query;
  // No schema or timer changes until explicitly enabled after review/deployment approval.
  let ready = false;
  if (publishingEnabled(env)) { try { await ensurePublishingSchema(query); ready = true; } catch { console.error("[instagram-publish] setup pending"); } }
  const auth = (req: Request, res: Response, next: NextFunction) => { res.setHeader("Cache-Control", "no-store"); if (!req.isAuthenticated()) return res.status(401).json({ error: "login_required" }); next(); };
  const write = (req: Request, res: Response, next: NextFunction) => { if (!ready) return res.status(503).json({ error: "publishing_disabled" }); if (req.get("origin") !== new URL(env.INSTAGRAM_UNIFIED_REDIRECT_URI || "https://oravini.com/api/instagram/unified/callback").origin) return res.status(403).json({ error: "origin_invalid" }); next(); };
  const fail = (res: Response, e: unknown) => res.status(e instanceof UnifiedError ? e.httpStatus : 500).json({ error: e instanceof UnifiedError ? e.code : "publishing_unavailable" });
  const user = (req: Request) => String((req.user as any).id);
  app.get("/api/instagram/publishing/jobs", auth, async (req, res) => { try { const jobs = ready ? (await query("SELECT id,account_id,draft,status,scheduled_at,published_media_id,error,created_at FROM instagram_publish_jobs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100", [user(req)])).rows : []; res.json({ enabled: ready, jobs, mediaHosts: (env.INSTAGRAM_PUBLISH_MEDIA_HOSTS || "").split(",").filter(Boolean) }); } catch (e) { fail(res, e); } });
  app.post("/api/instagram/publishing/jobs", auth, write, async (req, res) => {
    try {
      const draft = validateDraft(req.body), key = req.get("idempotency-key");
      if (!key || !/^[a-zA-Z0-9-]{16,100}$/.test(key)) throw new UnifiedError("idempotency_key_required");
      const previous = (await query("SELECT id,status,draft FROM instagram_publish_jobs WHERE user_id=$1 AND idempotency_key=$2", [user(req), key])).rows[0];
      if (previous) { if (JSON.stringify({ ...previous.draft, assets: previous.draft.assets.map(({sha256, ...a}: any) => a) }) !== JSON.stringify(draft)) throw new UnifiedError("idempotency_conflict", 409); return res.json(previous); }
      const c = (await query("SELECT * FROM instagram_unified_connections WHERE user_id=$1", [user(req)])).rows[0];
      const config = readUnifiedConfig(env);
      if (!c || c.config_id !== env.INSTAGRAM_PUBLISH_CONFIG_ID || c.app_id !== config.appId || !c.accounts?.some((a: any) => a.id === draft.accountId) || c.last_error === "reconnect_required" || (c.expires_at && Date.parse(c.expires_at) <= Date.parse(draft.scheduledAt))) throw new UnifiedError("publishing_reconnect_required", 409);
      for (const asset of draft.assets) { allowedMediaUrl(asset.url, env); asset.sha256 = await inspectAsset(asset, env, deps.fetcher); }
      const graph = new PublishingGraph(config, openToken(c.encrypted_token, config.encryptionKey), deps.fetcher);
      await requirePublishPermission(graph);
      const result = await query(`INSERT INTO instagram_publish_jobs(id,user_id,account_id,grant_version,draft,scheduled_at,next_attempt_at,idempotency_key) VALUES($1,$2,$3,$4,$5::jsonb,$6,$6,$7) ON CONFLICT(user_id,idempotency_key) DO NOTHING RETURNING id,status`, [newState(), user(req), draft.accountId, c.grant_version, JSON.stringify(draft), draft.scheduledAt, key]);
      if (!result.rows[0]) throw new UnifiedError("idempotency_conflict", 409);
      res.status(201).json(result.rows[0]);
    } catch (e) { fail(res, e); }
  });
  app.post("/api/instagram/publishing/jobs/:id/cancel", auth, write, async (req, res) => { try { const r = await query("UPDATE instagram_publish_jobs SET status='cancelled',updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status='scheduled' AND lease_until IS NULL RETURNING id,status", [req.params.id, user(req)]); if (!r.rows.length) throw new UnifiedError("job_not_cancellable", 409); res.json(r.rows[0]); } catch (e) { fail(res, e); } });
}
async function requirePublishPermission(graph: PublishingGraph) { const p = await graph.request("me/permissions"); if (!p.data?.some((v: any) => v.permission === "instagram_content_publish" && v.status === "granted")) throw new UnifiedError("publishing_permission_missing", 403); }
export async function runPublishingTick(deps: { query: Query; env?: NodeJS.ProcessEnv; fetcher?: typeof fetch }) {
  const env = deps.env || process.env, q = deps.query;
  if (!publishingEnabled(env)) return;
  // A process loss after a write is ambiguous. Never automatically replay a possibly accepted publish.
  await q("UPDATE instagram_publish_jobs SET status='needs_attention',error='interrupted_check_instagram',lease_until=NULL,updated_at=NOW() WHERE status IN ('preparing','publishing') AND lease_until<NOW()");
  const r = await q(`WITH due AS (SELECT id FROM instagram_publish_jobs WHERE status IN ('scheduled','preparing') AND next_attempt_at<=NOW() AND (lease_until IS NULL OR lease_until<NOW()) ORDER BY next_attempt_at FOR UPDATE SKIP LOCKED LIMIT 1)
    UPDATE instagram_publish_jobs j SET status='preparing',lease_until=NOW()+INTERVAL '10 minutes',updated_at=NOW() FROM due WHERE j.id=due.id RETURNING j.*`);
  const job = r.rows[0]; if (!job) return;
  try {
    const c = (await q("SELECT * FROM instagram_unified_connections WHERE user_id=$1", [job.user_id])).rows[0], config = readUnifiedConfig(env);
    if (!c || c.grant_version !== job.grant_version || c.app_id !== config.appId || c.config_id !== env.INSTAGRAM_PUBLISH_CONFIG_ID || !c.accounts?.some((a: any) => a.id === job.account_id) || c.last_error === "reconnect_required" || (c.expires_at && new Date(c.expires_at).getTime() <= Date.now())) throw new UnifiedError("publishing_reconnect_required");
    if (Date.now() - new Date(job.scheduled_at).getTime() > 30 * 60000) throw new UnifiedError("missed_schedule_confirm_again");
    const draft = job.draft as PublishDraft;
    const graph = new PublishingGraph(config, openToken(c.encrypted_token, config.encryptionKey), deps.fetcher);
    await requirePublishPermission(graph);
    if (!job.container_id && !(job.children?.length)) {
      for (const asset of draft.assets) await inspectAsset(asset, env, deps.fetcher);
      const limit = await graph.request(`${job.account_id}/content_publishing_limit`, { fields: "quota_usage,config" });
      const quota = limit.data?.[0];
      if (typeof quota?.quota_usage !== "number" || typeof quota?.config?.quota_total !== "number") throw new UnifiedError("publishing_limit_unknown");
      if (quota.quota_usage >= quota.config.quota_total) throw new UnifiedError("publishing_limit_reached");
      const children: string[] = [];
      for (const asset of draft.assets) {
        children.push(await graph.create(job.account_id, asset, draft.caption, draft.type === "CAROUSEL"));
        await q("UPDATE instagram_publish_jobs SET children=$2::jsonb WHERE id=$1", [job.id, JSON.stringify(children)]);
      }
      // Carousel video children must finish before the parent is created.
      if (draft.type === "CAROUSEL") { job.children = children; job.container_id = null; }
      else job.container_id = children[0];
      await q("UPDATE instagram_publish_jobs SET container_id=$2,children=$3::jsonb WHERE id=$1", [job.id, job.container_id, JSON.stringify(children)]);
    }
    if (!job.container_id && draft.type === "CAROUSEL") {
      const statuses = await Promise.all((job.children as string[]).map(id => graph.status(id)));
      if (statuses.some(x => ["ERROR", "EXPIRED"].includes(x))) throw new UnifiedError("media_processing_failed");
      if (statuses.some(x => x !== "FINISHED")) return await pending(q, job);
      job.container_id = await graph.carousel(job.account_id, job.children, draft.caption);
      await q("UPDATE instagram_publish_jobs SET container_id=$2 WHERE id=$1", [job.id, job.container_id]);
    }
    const status = await graph.status(job.container_id);
    if (status === "PUBLISHED") throw new UnifiedError("published_check_instagram");
    if (["ERROR", "EXPIRED"].includes(status)) throw new UnifiedError("media_processing_failed");
    if (status !== "FINISHED") return await pending(q, job);
    const current = (await q("SELECT grant_version FROM instagram_unified_connections WHERE user_id=$1 AND grant_version=$2 AND config_id=$3 AND (expires_at IS NULL OR expires_at>NOW()) AND last_error IS DISTINCT FROM 'reconnect_required'", [job.user_id, job.grant_version, env.INSTAGRAM_PUBLISH_CONFIG_ID])).rows[0];
    if (!current) throw new UnifiedError("publishing_reconnect_required");
    // Durable pre-write fence. Any lost response leads to manual reconciliation, not a duplicate.
    await q("UPDATE instagram_publish_jobs SET status='publishing' WHERE id=$1", [job.id]);
    const id = await graph.publish(job.account_id, job.container_id);
    await q("UPDATE instagram_publish_jobs SET status='published',published_media_id=$2,error=NULL,lease_until=NULL,updated_at=NOW() WHERE id=$1", [job.id, id]);
  } catch (e) {
    const code = e instanceof UnifiedError ? e.code : "publishing_unavailable";
    await q("UPDATE instagram_publish_jobs SET status='needs_attention',error=$2,lease_until=NULL,updated_at=NOW() WHERE id=$1", [job.id, code]);
  }
}
async function pending(q: Query, job: any) {
  if (job.polls >= 4) throw new UnifiedError("processing_timeout_check_instagram");
  await q("UPDATE instagram_publish_jobs SET status='preparing',polls=polls+1,next_attempt_at=NOW()+INTERVAL '1 minute',lease_until=NULL,updated_at=NOW() WHERE id=$1", [job.id]);
}
export function startPublishingWorker(deps: Parameters<typeof runPublishingTick>[0]) {
  if (!publishingEnabled(deps.env)) return;
  let busy = false;
  const timer = setInterval(async () => { if (busy) return; busy = true; try { await runPublishingTick(deps); } catch { console.error("[instagram-publish] worker unavailable"); } finally { busy = false; } }, 60000);
  timer.unref(); return timer;
    }
