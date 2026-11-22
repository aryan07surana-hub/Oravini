import type { Express, Request, Response, NextFunction } from "express";
import { authorizationUrl, hashValue, IG_UNIFIED_HOME, newState, openToken, readUnifiedConfig, sealToken, UnifiedError, UnifiedGraph, verifyUnifiedSignedRequest, IG_UNIFIED_APP_ID } from "./instagramUnifiedCore";

type Query = (sql: string, values?: any[]) => Promise<{ rows: any[]; rowCount: number | null }>;
type Dependencies = { query: Query; fetcher?: typeof fetch; env?: NodeJS.ProcessEnv };
export async function ensureInstagramUnifiedSchema(query: Query) {
  await query(`CREATE TABLE IF NOT EXISTS instagram_unified_connections (
    user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    app_id TEXT NOT NULL, config_id TEXT NOT NULL, client_business_id TEXT NOT NULL,
    external_subject_id TEXT NOT NULL, encrypted_token TEXT NOT NULL,
    accounts JSONB NOT NULL DEFAULT '[]', selected_account_id TEXT,
    expires_at TIMESTAMPTZ, connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_started_at TIMESTAMPTZ, last_synced_at TIMESTAMPTZ, last_error TEXT, grant_version TEXT NOT NULL DEFAULT 'initial'
  );
  CREATE TABLE IF NOT EXISTS instagram_unified_oauth_states (
    state_hash TEXT PRIMARY KEY, user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS instagram_unified_state_expiry ON instagram_unified_oauth_states(expires_at);
  CREATE TABLE IF NOT EXISTS instagram_unified_media (
    user_id VARCHAR NOT NULL REFERENCES instagram_unified_connections(user_id) ON DELETE CASCADE,
    account_id TEXT NOT NULL, media_id TEXT NOT NULL, media JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(user_id,account_id,media_id)
  );
  CREATE TABLE IF NOT EXISTS instagram_unified_metric_snapshots (
    id BIGSERIAL PRIMARY KEY, user_id VARCHAR NOT NULL, account_id TEXT NOT NULL, media_id TEXT NOT NULL,
    metrics JSONB NOT NULL, source TEXT NOT NULL DEFAULT 'manual_sync', captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY(user_id,account_id,media_id) REFERENCES instagram_unified_media(user_id,account_id,media_id) ON DELETE CASCADE
  );
  ALTER TABLE instagram_unified_connections ADD COLUMN IF NOT EXISTS grant_version TEXT NOT NULL DEFAULT 'initial';
  ALTER TABLE instagram_unified_connections ADD COLUMN IF NOT EXISTS login_subject_id TEXT;
  CREATE TABLE IF NOT EXISTS instagram_unified_deletion_receipts (code_hash TEXT PRIMARY KEY, completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
}
export async function registerInstagramUnifiedRoutes(app: Express, deps: Dependencies) {
  const { query } = deps, env = deps.env ?? process.env;
  let schemaReady = false;
  try { await ensureInstagramUnifiedSchema(query); schemaReady = true; }
  catch { console.error("[instagram-unified] Database setup unavailable; new integration disabled."); }
  const prefix = "/api/instagram/unified";
  const owner = (req: Request) => String((req.user as any).id);
  const authenticated = (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", "no-store");
    if (!req.isAuthenticated()) return res.status(401).json({ error: "login_required" });
    if (!schemaReady) return res.status(503).json({ error: "setup_pending" });
    next();
  };
  const sameOrigin = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get("origin");
    const expected = new URL(env.INSTAGRAM_UNIFIED_REDIRECT_URI || "https://oravini.com/api/instagram/unified/callback").origin;
    if (!origin || origin !== expected) return res.status(403).json({ error: "origin_invalid" });
    next();
  };
  const fail = (res: Response, error: unknown) => {
    const known = error instanceof UnifiedError;
    return res.status(known ? error.httpStatus : 500).json({ error: known ? error.code : "connection_unavailable" });
  };
  for (const kind of ["deauthorize", "data-deletion"]) app.post(`${prefix}/${kind}`, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      if (!schemaReady) throw new UnifiedError("setup_pending", 503);
      if (env.INSTAGRAM_UNIFIED_APP_ID && env.INSTAGRAM_UNIFIED_APP_ID !== IG_UNIFIED_APP_ID) throw new UnifiedError("not_configured", 503);
      const { userId } = verifyUnifiedSignedRequest(req.body?.signed_request, env.INSTAGRAM_UNIFIED_APP_SECRET || "");
      // The token /me ID is a system user. Store the separately signed login ID when supplied.
      // Never match an unverified username, business ID or another app's user ID.
      const code = newState();
      await query(`WITH removed AS (
        DELETE FROM instagram_unified_connections WHERE app_id=$1 AND (external_subject_id=$2 OR login_subject_id=$2) RETURNING user_id
        ), states AS (DELETE FROM instagram_unified_oauth_states WHERE user_id IN(SELECT user_id FROM removed))
        INSERT INTO instagram_unified_deletion_receipts(code_hash) VALUES($3)`, [IG_UNIFIED_APP_ID, userId, hashValue(code)]);
      const origin = new URL(env.INSTAGRAM_UNIFIED_REDIRECT_URI || "https://oravini.com/api/instagram/unified/callback").origin;
      res.json({ url: `${origin}${prefix}/deletion-status/${code}`, confirmation_code: code });
    } catch (error) { fail(res, error); }
  });
  app.get(`${prefix}/deletion-status/:code`, async (req, res) => {
    res.setHeader("Cache-Control", "no-store"); res.setHeader("Referrer-Policy", "no-referrer");
    try {
      if (!schemaReady) throw new UnifiedError("setup_pending", 503);
      if (!/^[a-f0-9]{64}$/.test(req.params.code)) return res.status(404).type("text").send("Deletion confirmation not found.");
      const result = await query("SELECT completed_at FROM instagram_unified_deletion_receipts WHERE code_hash=$1", [hashValue(req.params.code)]);
      if (!result.rows.length) return res.status(404).type("text").send("Deletion confirmation not found.");
      res.type("html").send('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oravini deletion status</title><main style="font:16px/1.6 system-ui;max-width:42rem;margin:4rem auto;padding:1rem"><h1>Instagram data removal complete</h1><p>Oravini processed this signed request. Any new-app insights connections matching the Meta identifier supplied, and their cached media and metric snapshots, were removed from the active database.</p><p>This does not delete Instagram posts, other Oravini data or a separate messaging connection. If an account still appears connected, contact support.oravini@gmail.com so we can verify and remove it.</p><a href="/data-deletion">Deletion instructions and retention details</a></main></html>');
    } catch (error) { fail(res, error); }
  });
  app.get(`${prefix}/status`, authenticated, async (req, res) => {
    try {
      let configured = true;
      try { readUnifiedConfig(env); } catch { configured = false; }
      const { rows } = await query("SELECT accounts,selected_account_id,expires_at,last_synced_at,last_error FROM instagram_unified_connections WHERE user_id=$1", [owner(req)]);
      const row = rows[0];
      const expired = !!row?.expires_at && new Date(row.expires_at).getTime() <= Date.now();
      res.json({ configured, connected: !!row && !expired && row.last_error !== "reconnect_required", accounts: row?.accounts ?? [], selectedAccountId: row?.selected_account_id ?? null, expiresAt: row?.expires_at ?? null, lastSyncedAt: row?.last_synced_at ?? null, reconnectRequired: expired || row?.last_error === "reconnect_required" });
    } catch (error) { fail(res, error); }
  });
  app.post(`${prefix}/connect`, authenticated, sameOrigin, async (req, res) => {
    try {
      const config = readUnifiedConfig(env), state = newState();
      if (!req.sessionID) throw new UnifiedError("session_required", 401);
      await query("DELETE FROM instagram_unified_oauth_states WHERE user_id=$1 OR expires_at<NOW()", [owner(req)]);
      await query("INSERT INTO instagram_unified_oauth_states(state_hash,user_id,session_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')", [hashValue(state), owner(req), hashValue(req.sessionID)]);
      res.json({ authorizationUrl: authorizationUrl(config, state) });
    } catch (error) { fail(res, error); }
  });
  app.get(`${prefix}/callback`, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    const finish = (result: string) => res.redirect(`${IG_UNIFIED_HOME}?result=${result}`);
    if (!schemaReady || !req.isAuthenticated() || !req.sessionID) return finish("login_required");
    try {
      const state = typeof req.query.state === "string" ? req.query.state : "";
      if (!/^[a-f\d]{64}$/.test(state)) throw new UnifiedError("state_invalid");
      const consumed = await query("DELETE FROM instagram_unified_oauth_states WHERE state_hash=$1 AND user_id=$2 AND session_hash=$3 AND expires_at>NOW() RETURNING user_id", [hashValue(state), owner(req), hashValue(req.sessionID)]);
      if (consumed.rows.length !== 1) throw new UnifiedError("state_invalid");
      if (req.query.error) return finish("cancelled");
      const code = typeof req.query.code === "string" ? req.query.code : "";
      if (!code || code.length > 8192) throw new UnifiedError("code_invalid");
      const config = readUnifiedConfig(env), graph = new UnifiedGraph(config, deps.fetcher);
      const { token, expiresAt } = await graph.exchange(code);
      const found = await graph.discover(token);
      const encrypted = sealToken(token, config.encryptionKey);
      const ids = found.accounts.map(x => x.id);
      const loginSubject = req.query.signed_request ? verifyUnifiedSignedRequest(req.query.signed_request, config.secret).userId : null;
      // Reconnect replaces only this app's grant. Remove cached data for accounts no longer shared.
      await query(`WITH saved AS (
        INSERT INTO instagram_unified_connections(user_id,app_id,config_id,client_business_id,external_subject_id,encrypted_token,accounts,expires_at,grant_version,login_subject_id)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$10,$11)
        ON CONFLICT(user_id) DO UPDATE SET app_id=EXCLUDED.app_id,config_id=EXCLUDED.config_id,
          client_business_id=EXCLUDED.client_business_id,external_subject_id=EXCLUDED.external_subject_id,
          encrypted_token=EXCLUDED.encrypted_token,accounts=EXCLUDED.accounts,expires_at=EXCLUDED.expires_at,
          selected_account_id=CASE WHEN instagram_unified_connections.selected_account_id=ANY($9::text[]) THEN instagram_unified_connections.selected_account_id ELSE NULL END,
          last_error=NULL,connected_at=NOW(),grant_version=EXCLUDED.grant_version,login_subject_id=EXCLUDED.login_subject_id RETURNING user_id
        ) DELETE FROM instagram_unified_media WHERE user_id IN(SELECT user_id FROM saved) AND NOT(account_id=ANY($9::text[]))`,
        [owner(req), config.appId, config.configId, found.businessId, found.subjectId, encrypted, JSON.stringify(found.accounts), expiresAt, ids, newState(), loginSubject]);
      return finish(found.accounts.length ? "choose_account" : "no_accounts");
    } catch (error) {
      const allowed = error instanceof UnifiedError ? error.code : "connection_unavailable";
      // Only fixed application codes, never Meta error text, codes, tokens or secrets.
      return finish(allowed);
    }
  });
  app.post(`${prefix}/account`, authenticated, sameOrigin, async (req, res) => {
    try {
      const id = req.body?.accountId;
      if (typeof id !== "string" || !/^\d+$/.test(id)) throw new UnifiedError("account_invalid");
      const result = await query("UPDATE instagram_unified_connections SET selected_account_id=$2,last_synced_at=NULL,grant_version=$4 WHERE user_id=$1 AND accounts @> $3::jsonb RETURNING selected_account_id", [owner(req), id, JSON.stringify([{ id }]), newState()]);
      if (result.rows.length !== 1) throw new UnifiedError("account_not_shared", 403);
      res.json({ selectedAccountId: id });
    } catch (error) { fail(res, error); }
  });
  app.get(`${prefix}/media`, authenticated, async (req, res) => {
    try {
      const result = await query("SELECT m.media,m.updated_at FROM instagram_unified_media m JOIN instagram_unified_connections c ON c.user_id=m.user_id AND c.selected_account_id=m.account_id WHERE m.user_id=$1 AND (c.expires_at IS NULL OR c.expires_at>NOW()) AND c.last_error IS DISTINCT FROM 'reconnect_required' ORDER BY m.media->>'timestamp' DESC NULLS LAST,m.media_id DESC LIMIT 3", [owner(req)]);
      res.json({ media: result.rows.map(row => row.media) });
    } catch (error) { fail(res, error); }
  });
  app.post(`${prefix}/sync`, authenticated, sameOrigin, async (req, res) => {
    const userId = owner(req);
    let grantVersion: string | undefined;
    try {
      const config = readUnifiedConfig(env);
      const rows = (await query("SELECT * FROM instagram_unified_connections WHERE user_id=$1", [userId])).rows;
      const row = rows[0];
      grantVersion = row?.grant_version;
      if (!row?.selected_account_id || !row.accounts?.some((x: any) => x.id === row.selected_account_id)) throw new UnifiedError("choose_account", 409);
      if (row.app_id !== config.appId || row.config_id !== config.configId) throw new UnifiedError("reconnect_required", 401);
      if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) throw new UnifiedError("reconnect_required", 401);
      const gate = await query("UPDATE instagram_unified_connections SET last_sync_started_at=NOW() WHERE user_id=$1 AND grant_version=$2 AND (last_sync_started_at IS NULL OR last_sync_started_at<NOW()-INTERVAL '15 minutes') RETURNING user_id", [userId, grantVersion]);
      if (!gate.rows.length) { res.setHeader("Retry-After", "900"); throw new UnifiedError("refresh_cooldown", 429); }
      const media = await new UnifiedGraph(config, deps.fetcher).recentMedia(openToken(row.encrypted_token, config.encryptionKey), row.selected_account_id);
      for (const post of media) {
        await query(`WITH saved AS (
          INSERT INTO instagram_unified_media(user_id,account_id,media_id,media) SELECT user_id,$2,$3,$4::jsonb FROM instagram_unified_connections WHERE user_id=$1 AND grant_version=$6 AND selected_account_id=$2
          ON CONFLICT(user_id,account_id,media_id) DO UPDATE SET media=EXCLUDED.media,updated_at=NOW() RETURNING user_id
          ) INSERT INTO instagram_unified_metric_snapshots(user_id,account_id,media_id,metrics) SELECT user_id,$2,$3,$5::jsonb FROM saved`,
          [userId, row.selected_account_id, post.id, JSON.stringify(post), JSON.stringify(post.metrics), row.grant_version]);
      }
      await query("UPDATE instagram_unified_connections SET last_synced_at=NOW(),last_error=NULL WHERE user_id=$1 AND grant_version=$2 AND selected_account_id=$3", [userId, row.grant_version, row.selected_account_id]);
      res.json({ media, syncedAt: new Date().toISOString() });
    } catch (error) {
      if (error instanceof UnifiedError && error.code === "reconnect_required") await query("UPDATE instagram_unified_connections SET last_error='reconnect_required' WHERE user_id=$1 AND grant_version=$2", [userId, grantVersion]).catch(() => {});
      fail(res, error);
    }
  });
  app.post(`${prefix}/remove`, authenticated, sameOrigin, async (req, res) => {
    try {
      // Local data removal only. Do not revoke or mutate the separate messaging app.
      await query("DELETE FROM instagram_unified_connections WHERE user_id=$1", [owner(req)]);
      await query("DELETE FROM instagram_unified_oauth_states WHERE user_id=$1", [owner(req)]);
      res.json({ removed: true });
    } catch (error) { fail(res, error); }
  });
}
