/**
 * Public page links: per-page random subdomains (<sub>.PUBLIC_PAGES_BASE_DOMAIN),
 * Host-header resolution, and bring-your-own custom domains with DNS verification.
 *
 * Rollout state (owner decision): no wildcard DNS exists yet. Subdomains are generated
 * and stored for every page/funnel, but only advertised as the share link when
 * PUBLIC_PAGES_WILDCARD_ENABLED=true. Host resolution is always on and harmless:
 * unknown hosts fall back to the normal app.
 *
 * All schema changes are additive (ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).
 */
import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { pool } from "./storage";

export type PageTargetType = "landing_page" | "funnel";

export function pagesConfig() {
  const baseDomain = (process.env.PUBLIC_PAGES_BASE_DOMAIN || "oravini.com").toLowerCase().replace(/^\.+|\.+$/g, "");
  const wildcardEnabled = /^(1|true|yes)$/i.test(process.env.PUBLIC_PAGES_WILDCARD_ENABLED || "");
  // Where custom domains should CNAME to (the app's own hostname).
  const appHost = (process.env.CUSTOM_DOMAIN_TARGET || process.env.APP_URL || process.env.SITE_URL || "")
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase() || "app.oravini.com";
  return { baseDomain, wildcardEnabled, appHost };
}

const TABLE: Record<PageTargetType, string> = { landing_page: "marketing_landing_pages", funnel: "funnels" };
const RESERVED = new Set(["www", "app", "api", "admin", "mail", "cdn", "static", "assets", "blog", "help", "docs", "status", "dev", "staging"]);

export async function ensurePageDomainsSchema() {
  await pool.query(`
    ALTER TABLE marketing_landing_pages ADD COLUMN IF NOT EXISTS subdomain VARCHAR(16);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_mlp_subdomain ON marketing_landing_pages(subdomain) WHERE subdomain IS NOT NULL;
    ALTER TABLE funnels ADD COLUMN IF NOT EXISTS subdomain VARCHAR(16);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_funnels_subdomain ON funnels(subdomain) WHERE subdomain IS NOT NULL;

    CREATE TABLE IF NOT EXISTS page_custom_domains (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type VARCHAR(20) NOT NULL,
      target_id VARCHAR NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      verification_token TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      last_error TEXT,
      last_check JSONB,
      last_checked_at TIMESTAMP,
      verified_at TIMESTAMP,
      render_status TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_pcd_target ON page_custom_domains(target_type, target_id);
  `);
}

function randomSubdomain(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const len = 5 + (randomBytes(1)[0] % 3); // 5–7
  const b = randomBytes(len);
  let out = letters[b[0] % letters.length];
  for (let i = 1; i < len; i++) out += chars[b[i] % chars.length];
  return out;
}

/** Assigns a globally unique random subdomain if the row has none. Returns the subdomain. */
export async function ensureSubdomain(type: PageTargetType, id: string): Promise<string | null> {
  const table = TABLE[type];
  const { rows } = await pool.query(`SELECT subdomain FROM ${table} WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  if (rows[0].subdomain) return rows[0].subdomain;
  for (let attempt = 0; attempt < 8; attempt++) {
    const sub = randomSubdomain();
    if (RESERVED.has(sub)) continue;
    const { rows: clash } = await pool.query(
      `SELECT 1 FROM marketing_landing_pages WHERE subdomain = $1 UNION ALL SELECT 1 FROM funnels WHERE subdomain = $1 LIMIT 1`, [sub]);
    if (clash.length) continue;
    try {
      const { rows: upd } = await pool.query(
        `UPDATE ${table} SET subdomain = $1 WHERE id = $2 AND subdomain IS NULL RETURNING subdomain`, [sub, id]);
      if (upd[0]) return upd[0].subdomain;
      const { rows: again } = await pool.query(`SELECT subdomain FROM ${table} WHERE id = $1`, [id]);
      return again[0]?.subdomain ?? null;
    } catch (e: any) {
      if (e.code !== "23505") throw e; // unique violation → retry with a new value
    }
  }
  throw new Error("Could not allocate a unique subdomain");
}

/** Gives every already-published page/active funnel a subdomain (additive backfill, idempotent). */
export async function backfillSubdomains() {
  const { rows: lps } = await pool.query(`SELECT id FROM marketing_landing_pages WHERE published = true AND subdomain IS NULL LIMIT 2000`);
  for (const r of lps) await ensureSubdomain("landing_page", r.id).catch(() => {});
  const { rows: fs } = await pool.query(`SELECT id FROM funnels WHERE status = 'active' AND subdomain IS NULL LIMIT 2000`);
  for (const r of fs) await ensureSubdomain("funnel", r.id).catch(() => {});
  if (lps.length || fs.length) console.log(`[page-domains] backfilled subdomains: ${lps.length} pages, ${fs.length} funnels`);
}

function requestHost(req: Request): string {
  const raw = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
  return raw.replace(/:\d+$/, "").replace(/\.$/, "");
}

function isAppHost(host: string, baseDomain: string): boolean {
  if (!host || host === "localhost" || host === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (host === baseDomain || host === `www.${baseDomain}` || host === `app.${baseDomain}`) return true;
  if (host === "oravini.com" || host.endsWith(".oravini.com") && RESERVED.has(host.split(".")[0])) return true;
  if (host.endsWith(".onrender.com")) return true;
  const { appHost } = pagesConfig();
  return host === appHost;
}

export type HostResolution =
  | { kind: "app" }
  | { kind: "landing"; slug: string }
  | { kind: "funnel"; slug: string }
  | { kind: "pending"; domain: string };

export async function resolveHost(host: string): Promise<HostResolution> {
  const { baseDomain } = pagesConfig();
  if (isAppHost(host, baseDomain)) return { kind: "app" };

  // <sub>.<baseDomain> — single label only
  if (host.endsWith(`.${baseDomain}`)) {
    const sub = host.slice(0, -(baseDomain.length + 1));
    if (!/^[a-z0-9]{3,16}$/.test(sub) || RESERVED.has(sub)) return { kind: "app" };
    const { rows: lp } = await pool.query(`SELECT slug FROM marketing_landing_pages WHERE subdomain = $1 AND published = true`, [sub]);
    if (lp[0]) return { kind: "landing", slug: lp[0].slug };
    const { rows: f } = await pool.query(`SELECT slug FROM funnels WHERE subdomain = $1 AND status = 'active'`, [sub]);
    if (f[0]) return { kind: "funnel", slug: f[0].slug };
    return { kind: "app" }; // unknown subdomain → never break the main app
  }

  // Custom domain (this feature)
  const { rows: d } = await pool.query(`SELECT target_type, target_id, status FROM page_custom_domains WHERE domain = $1`, [host]);
  if (d[0]) {
    if (d[0].status !== "verified") return { kind: "pending", domain: host };
    if (d[0].target_type === "landing_page") {
      const { rows } = await pool.query(`SELECT slug FROM marketing_landing_pages WHERE id = $1 AND published = true`, [d[0].target_id]);
      if (rows[0]) return { kind: "landing", slug: rows[0].slug };
    } else {
      const { rows } = await pool.query(`SELECT slug FROM funnels WHERE id = $1 AND status = 'active'`, [d[0].target_id]);
      if (rows[0]) return { kind: "funnel", slug: rows[0].slug };
    }
    return { kind: "pending", domain: host };
  }
  // Legacy funnel custom domains (existing table, same semantics as /api/public/domain/:domain)
  const { rows: legacy } = await pool.query(
    `SELECT f.slug, f.status FROM funnel_custom_domains fcd JOIN funnels f ON f.id = fcd.funnel_id WHERE fcd.domain = $1`, [host]);
  if (legacy[0]) return legacy[0].status === "active" ? { kind: "funnel", slug: legacy[0].slug } : { kind: "pending", domain: host };
  return { kind: "app" };
}

const DOMAIN_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function validateCustomDomain(input: string): { ok: true; domain: string } | { ok: false; message: string } {
  const domain = String(input || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  const { baseDomain } = pagesConfig();
  if (!DOMAIN_RE.test(domain)) return { ok: false, message: "Enter a valid domain like www.yourbrand.com" };
  if (domain === baseDomain || domain.endsWith(`.${baseDomain}`)) return { ok: false, message: `Use the built-in link for ${baseDomain} addresses` };
  if (domain.endsWith(".onrender.com") || domain === "localhost") return { ok: false, message: "That domain can't be connected" };
  return { ok: true, domain };
}

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(Object.assign(new Error("DNS lookup timed out"), { code: "ETIMEOUT" })), ms))]);

function dnsErrorText(e: any): string {
  switch (e?.code) {
    case "ENOTFOUND": return "Domain not found in DNS (does it exist / is it spelled correctly?)";
    case "ENODATA": return "No record of this type found";
    case "ETIMEOUT": case "ETIMEDOUT": return "DNS lookup timed out — try again in a few minutes";
    case "ESERVFAIL": return "The domain's DNS server failed to answer";
    case "EREFUSED": return "DNS query refused";
    default: return e?.message || "DNS lookup failed";
  }
}

export async function checkDomainDns(domain: string, token: string) {
  const dns = (await import("dns")).promises;
  const { appHost } = pagesConfig();
  const txtName = `_oravini-verify.${domain}`;
  const expectedTxt = `oravini-verify=${token}`;
  const txt = { ok: false, name: txtName, expected: expectedTxt, found: [] as string[], error: null as string | null };
  const cname = { ok: false, name: domain, expected: appHost, found: [] as string[], error: null as string | null };
  try {
    const recs = await withTimeout(dns.resolveTxt(txtName), 5000);
    txt.found = recs.map(r => r.join(""));
    txt.ok = txt.found.includes(expectedTxt);
    if (!txt.ok) txt.error = "TXT record found but the value doesn't match";
  } catch (e: any) { txt.error = dnsErrorText(e); }
  try {
    const recs = await withTimeout(dns.resolveCname(domain), 5000);
    cname.found = recs.map(r => r.toLowerCase().replace(/\.$/, ""));
    cname.ok = cname.found.some(c => c === appHost);
    if (!cname.ok) cname.error = `CNAME points to ${cname.found.join(", ")}`;
  } catch (e: any) {
    cname.error = dnsErrorText(e);
    // Domain exists but has no CNAME → say where it points today (clearer than "not found").
    if (e?.code === "ENODATA" || e?.code === "ENOTFOUND") {
      try {
        const a = await withTimeout(dns.resolve4(domain), 4000);
        if (a.length) cname.error = `No CNAME record — ${domain} currently points to ${a.slice(0, 3).join(", ")} (A record). Replace it with a CNAME to ${appHost}.`;
      } catch {}
    }
  }
  return { txt, cname, ok: txt.ok && cname.ok };
}

/** Attach the domain to the Render service — only when RENDER_API_KEY + RENDER_SERVICE_ID are configured. */
async function attachToRender(domain: string): Promise<string> {
  const key = process.env.RENDER_API_KEY;
  const service = process.env.RENDER_SERVICE_ID;
  if (!key || !service) return "manual";
  try {
    const r = await fetch(`https://api.render.com/v1/services/${encodeURIComponent(service)}/custom-domains`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name: domain }),
    });
    if (r.ok || r.status === 409) return "attached";
    return `error: Render API ${r.status} ${(await r.text().catch(() => "")).slice(0, 160)}`;
  } catch (e: any) {
    return `error: ${e.message}`;
  }
}

async function ownsTarget(userId: string, type: string, id: string): Promise<boolean> {
  if (type !== "landing_page" && type !== "funnel") return false;
  const { rows } = await pool.query(`SELECT 1 FROM ${TABLE[type as PageTargetType]} WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows.length > 0;
}

function publicDomainRow(r: any) {
  const { appHost } = pagesConfig();
  return {
    id: r.id, targetType: r.target_type, targetId: r.target_id, domain: r.domain, status: r.status,
    lastError: r.last_error, lastCheck: r.last_check, lastCheckedAt: r.last_checked_at, verifiedAt: r.verified_at,
    renderStatus: r.render_status,
    dns: {
      cname: { type: "CNAME", name: r.domain, value: appHost },
      txt: { type: "TXT", name: `_oravini-verify.${r.domain}`, value: `oravini-verify=${r.verification_token}` },
    },
    renderAutoAttach: !!(process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID),
  };
}

export function registerPageDomainRoutes(app: Express, requireAuth: any) {
  // Public: which page (if any) should this Host render?
  app.get("/api/public/resolve-host", async (req: Request, res: Response) => {
    try {
      const host = requestHost(req);
      res.set("Cache-Control", "no-store");
      res.json({ host, ...(await resolveHost(host)) });
    } catch (e: any) {
      console.error("[page-domains] resolve-host failed:", e.message);
      res.json({ kind: "app" }); // never break the app on errors
    }
  });

  app.get("/api/public/pages-config", (_req, res) => {
    const { baseDomain, wildcardEnabled } = pagesConfig();
    res.json({ baseDomain, wildcardEnabled });
  });

  // Share info for the builder: default slug link (+ subdomain link only if wildcard is enabled)
  app.get("/api/page-share/:type/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const type = String(req.params.type) as PageTargetType;
      if (!(await ownsTarget(user.id, type, String(req.params.id)))) return res.status(404).json({ message: "Not found" });
      const subdomain = await ensureSubdomain(type, String(req.params.id));
      const { rows } = await pool.query(`SELECT slug FROM ${TABLE[type]} WHERE id = $1`, [req.params.id]);
      const { baseDomain, wildcardEnabled } = pagesConfig();
      const { rows: domains } = await pool.query(`SELECT * FROM page_custom_domains WHERE target_type = $1 AND target_id = $2 ORDER BY created_at`, [type, req.params.id]);
      res.json({
        slugPath: type === "landing_page" ? `/lp/${rows[0].slug}` : `/f/${rows[0].slug}`,
        subdomain,
        subdomainUrl: wildcardEnabled && subdomain ? `https://${subdomain}.${baseDomain}` : null,
        wildcardEnabled,
        baseDomain,
        domains: domains.map(publicDomainRow),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/page-domains", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { targetType, targetId, domain: rawDomain } = req.body || {};
      if (!(await ownsTarget(user.id, targetType, targetId))) return res.status(404).json({ message: "Page not found" });
      const v = validateCustomDomain(rawDomain);
      if (!v.ok) return res.status(400).json({ message: v.message });
      const { rows: taken } = await pool.query(
        `SELECT 1 FROM page_custom_domains WHERE domain = $1 UNION ALL SELECT 1 FROM funnel_custom_domains WHERE domain = $1`, [v.domain]);
      if (taken.length) return res.status(409).json({ message: "That domain is already connected to a page" });
      const token = randomBytes(12).toString("hex");
      const { rows } = await pool.query(
        `INSERT INTO page_custom_domains (user_id, target_type, target_id, domain, verification_token, render_status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [user.id, targetType, targetId, v.domain, token, process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID ? "pending" : "manual"]);
      res.status(201).json(publicDomainRow(rows[0]));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/page-domains/:id/verify", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { rows } = await pool.query(`SELECT * FROM page_custom_domains WHERE id = $1 AND user_id = $2`, [req.params.id, user.id]);
      if (!rows[0]) return res.status(404).json({ message: "Not found" });
      const row = rows[0];
      const check = await checkDomainDns(row.domain, row.verification_token);
      let renderStatus = row.render_status;
      if (check.ok && row.status !== "verified") renderStatus = await attachToRender(row.domain);
      const errors = [check.txt.ok ? null : `TXT: ${check.txt.error}`, check.cname.ok ? null : `CNAME: ${check.cname.error}`].filter(Boolean).join(" · ");
      const { rows: upd } = await pool.query(
        `UPDATE page_custom_domains SET
           status = $1::varchar, last_error = $2::text, last_check = $3::jsonb, last_checked_at = now(),
           verified_at = CASE WHEN $1::varchar = 'verified' THEN COALESCE(verified_at, now()) ELSE verified_at END,
           render_status = $4::text
         WHERE id = $5 RETURNING *`,
        [check.ok ? "verified" : "failed", check.ok ? null : errors, JSON.stringify(check), renderStatus, row.id]);
      res.json(publicDomainRow(upd[0]));
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // Owner-initiated disconnect of a domain they added.
  app.delete("/api/page-domains/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const { rowCount } = await pool.query(`DELETE FROM page_custom_domains WHERE id = $1 AND user_id = $2`, [req.params.id, user.id]);
      if (!rowCount) return res.status(404).json({ message: "Not found" });
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });
}
