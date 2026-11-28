/**
 * King Astrology webinar funnel — server side.
 *
 *   Public (no auth)
 *     POST /api/king/register               name/email/phone/tier → row + VIP checkout URL
 *     GET  /api/king/registration/:id       { tier, paid } for the confirmation pages
 *     GET  /api/king/invite.ics             calendar file (Apple Calendar / Outlook desktop)
 *     POST /api/king/whop/webhook           Whop payment → paid = true (signature verified)
 *
 *   Admin (king@gmail.com, own session flag — separate from platform auth)
 *     POST /api/king/admin/login            { email, password }
 *     POST /api/king/admin/logout
 *     GET  /api/king/admin/session          { signedIn }
 *     GET  /api/king/admin/registrations    rows + totals (VIP / General / paid)
 *     GET  /api/king/admin/registrations.csv
 *     PATCH /api/king/admin/registrations/:id   { paid } manual payment tick
 *
 * The event itself (instant, Whop plan, WhatsApp links, videos) lives in
 * shared/kingWebinar.ts — this file holds no copies of those values.
 */
import type { Express, Request, Response } from "express";
import { createHash, timingSafeEqual } from "crypto";
import { pool } from "./storage";
import { verifyWhopWebhook } from "./billing/whopWebhook";
import {
  KING_EVENT, KING_PATHS, KING_TITLE, KING_WHOP,
  kingIcsFile, kingWhopCheckoutUrl, isKingTier, type KingTier,
  readWhopEvent, eventIsForKingPlan,
} from "@shared/kingWebinar";

const str = (v: unknown) => String(Array.isArray(v) ? v[0] : v ?? "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Admin credentials ────────────────────────────────────────────────────────
// Overridable by env in production. "king 123" was given with a space; the
// no-space spelling is accepted too so a typo can't lock the owner out.
const ADMIN_EMAIL = (process.env.KING_ADMIN_EMAIL || "king@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORDS = (
  process.env.KING_ADMIN_PASSWORD ? [process.env.KING_ADMIN_PASSWORD] : ["king 123", "king123"]
);

/** Constant-time compare over SHA-256 digests (equal length, no length leak). */
function secretMatches(given: string, allowed: string[]): boolean {
  const g = createHash("sha256").update(given, "utf8").digest();
  let ok = false;
  for (const a of allowed) {
    const h = createHash("sha256").update(a, "utf8").digest();
    if (timingSafeEqual(g, h)) ok = true; // no early return: every candidate is compared
  }
  return ok;
}

function isAdmin(req: Request): boolean {
  return (req.session as any)?.kingAdmin === true;
}

// ── Tiny in-memory rate limiter (per instance; public endpoints only) ────────
const hits = new Map<string, { n: number; resetAt: number }>();
function tooMany(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || now > e.resetAt) {
    hits.set(key, { n: 1, resetAt: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    return false;
  }
  e.n += 1;
  return e.n > limit;
}
const clientIp = (req: Request) => str(req.headers["x-forwarded-for"]).split(",")[0].trim() || req.ip || "unknown";

// ── Schema (idempotent, like the other runMigrations blocks) ─────────────────
export async function ensureKingWebinarSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS king_webinar_registrations (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name               TEXT NOT NULL,
      email              TEXT NOT NULL,
      phone              TEXT,
      tier               TEXT NOT NULL DEFAULT 'general',
      paid               BOOLEAN NOT NULL DEFAULT FALSE,
      paid_at            TIMESTAMPTZ,
      paid_source        TEXT,
      whop_payment_id    TEXT,
      whop_membership_id TEXT,
      amount_cents       INTEGER,
      currency           TEXT,
      utm                JSONB,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // One row per person: re-registering updates instead of duplicating.
  // A plain column index (not an expression index) so `ON CONFLICT (email)`
  // infers it unambiguously. Every write path lowercases the address first.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_king_reg_email
      ON king_webinar_registrations (email)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_king_reg_tier_created
      ON king_webinar_registrations (tier, created_at DESC)
  `);
}

type Row = {
  id: string; name: string; email: string; phone: string | null;
  tier: string; paid: boolean; paid_at: string | null; paid_source: string | null;
  amount_cents: number | null; currency: string | null; created_at: string;
};

export function registerKingWebinar(app: Express): void {
  // ── Register (free General, or VIP → Whop checkout) ───────────────────────
  app.post("/api/king/register", async (req: Request, res: Response) => {
    try {
      if (tooMany(`king:reg:${clientIp(req)}`, 12, 60_000)) {
        return res.status(429).json({ message: "Too many attempts. Please wait a minute and try again." });
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const name = str(body.name).trim().slice(0, 120);
      const email = str(body.email).trim().toLowerCase().slice(0, 254);
      const phone = str(body.phone).trim().slice(0, 32) || null;
      const tier: KingTier = isKingTier(body.tier) ? body.tier : "general";

      if (!name) return res.status(400).json({ message: "Please enter your name." });
      if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address." });

      const utm: Record<string, string> = {};
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
        const v = str(body[k]).trim().slice(0, 200);
        if (v) utm[k] = v;
      }

      // Upsert on email. A General registrant choosing VIP later is upgraded;
      // a VIP never silently drops to General, and `paid` is never reset.
      const { rows } = await pool.query(
        `INSERT INTO king_webinar_registrations (name, email, phone, tier, utm)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           name       = EXCLUDED.name,
           phone      = COALESCE(EXCLUDED.phone, king_webinar_registrations.phone),
           tier       = CASE WHEN EXCLUDED.tier = 'vip' THEN 'vip' ELSE king_webinar_registrations.tier END,
           utm        = COALESCE(king_webinar_registrations.utm, EXCLUDED.utm),
           updated_at = NOW()
         RETURNING id, tier, paid`,
        [name, email, phone, tier, Object.keys(utm).length ? JSON.stringify(utm) : null],
      );
      const row = rows[0] as { id: string; tier: string; paid: boolean };

      res.status(201).json({
        success: true,
        registrationId: row.id,
        tier: row.tier,
        paid: row.paid,
        // Same tab, email prefilled, straight to the $15 payment form.
        checkoutUrl: row.tier === "vip" ? kingWhopCheckoutUrl(email) : null,
        next: row.tier === "vip" ? KING_PATHS.vip : KING_PATHS.general,
      });
    } catch (e: any) {
      console.error("[king] register error:", e?.message || e);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  // ── Registration status (opaque id, safe to read from the browser) ────────
  app.get("/api/king/registration/:id", async (req: Request, res: Response) => {
    try {
      const id = str(req.params.id);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ message: "Bad id" });
      const { rows } = await pool.query(
        `SELECT id, name, tier, paid FROM king_webinar_registrations WHERE id = $1`, [id],
      );
      if (!rows.length) return res.status(404).json({ message: "Not found" });
      const r = rows[0];
      res.json({ registrationId: r.id, name: r.name, tier: r.tier, paid: r.paid });
    } catch (e: any) {
      console.error("[king] status error:", e?.message || e);
      res.status(500).json({ message: "Could not load your registration." });
    }
  });

  // ── Calendar file (Apple Calendar, Outlook desktop) ──────────────────────
  app.get("/api/king/invite.ics", (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    const ics = kingIcsFile({
      title: KING_TITLE,
      details: `${KING_EVENT.dateLine} at ${KING_EVENT.label}.\n\nYour webinar page: ${origin}${KING_PATHS.funnel}`,
      location: `${origin}${KING_PATHS.funnel}`,
    });
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="king-astrology-webinar.ics"');
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(ics);
  });

  // ── Whop webhook ─────────────────────────────────────────────────────────
  app.post("/api/king/whop/webhook", async (req: Request, res: Response) => {
    const secret = process.env.WHOP_WEBHOOK_SECRET || process.env.KING_WHOP_WEBHOOK_SECRET || null;
    const check = verifyWhopWebhook(secret, req.headers as any, (req as any).rawBody);
    if (!check.ok) {
      // Never trust an unverified body: no row is touched. 503 (not 200) while
      // the secret is missing so a misconfiguration is visible in Whop's
      // delivery log instead of silently swallowing real payments.
      const status = check.reason === "missing-secret" ? 503 : 401;
      console.warn(`[king] whop webhook rejected: ${check.reason}`);
      return res.status(status).json({ ok: false, reason: check.reason });
    }
    try {
      const e = readWhopEvent(req.body);
      if (!e.isPaid) return res.json({ ok: true, ignored: `event ${e.event || "unknown"}` });
      if (!eventIsForKingPlan(e)) return res.json({ ok: true, ignored: "different plan" });
      if (!EMAIL_RE.test(e.email)) {
        console.warn(`[king] whop ${e.event}: no usable email in payload`);
        return res.json({ ok: true, ignored: "no email" });
      }

      // Mark paid and promote to VIP. If they paid without registering first
      // (straight from a shared checkout link), create the row so they still
      // show up and still get the VIP page.
      const { rows } = await pool.query(
        `INSERT INTO king_webinar_registrations
           (name, email, tier, paid, paid_at, paid_source, whop_payment_id, whop_membership_id, amount_cents, currency)
         VALUES ($1, $2, 'vip', TRUE, NOW(), 'whop-webhook', $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
           tier               = 'vip',
           paid               = TRUE,
           paid_at            = COALESCE(king_webinar_registrations.paid_at, NOW()),
           paid_source        = 'whop-webhook',
           whop_payment_id    = COALESCE(EXCLUDED.whop_payment_id, king_webinar_registrations.whop_payment_id),
           whop_membership_id = COALESCE(EXCLUDED.whop_membership_id, king_webinar_registrations.whop_membership_id),
           amount_cents       = COALESCE(EXCLUDED.amount_cents, king_webinar_registrations.amount_cents),
           currency           = COALESCE(EXCLUDED.currency, king_webinar_registrations.currency),
           updated_at         = NOW()
         RETURNING id`,
        [e.email.split("@")[0], e.email, e.paymentId || null, e.membershipId || null, e.amountCents, e.currency],
      );
      console.log(`[king] VIP payment confirmed for ${e.email} (${e.event})`);
      res.json({ ok: true, registrationId: rows[0]?.id });
    } catch (err: any) {
      console.error("[king] whop webhook error:", err?.message || err);
      // 500 so Whop retries rather than dropping a real payment.
      res.status(500).json({ ok: false });
    }
  });

  // ── Admin ────────────────────────────────────────────────────────────────
  app.post("/api/king/admin/login", (req: Request, res: Response) => {
    if (tooMany(`king:login:${clientIp(req)}`, 8, 10 * 60_000)) {
      return res.status(429).json({ message: "Too many sign-in attempts. Please wait 10 minutes." });
    }
    const email = str((req.body ?? {}).email).trim().toLowerCase();
    const password = str((req.body ?? {}).password);
    const emailOk = secretMatches(email, [ADMIN_EMAIL]);
    const passOk = secretMatches(password, ADMIN_PASSWORDS);
    if (!emailOk || !passOk) {
      return res.status(401).json({ message: "Wrong email or password." });
    }
    (req.session as any).kingAdmin = true;
    req.session.save(() => res.json({ success: true }));
  });

  app.post("/api/king/admin/logout", (req: Request, res: Response) => {
    if (req.session) (req.session as any).kingAdmin = false;
    res.json({ success: true });
  });

  app.get("/api/king/admin/session", (req: Request, res: Response) => {
    res.json({ signedIn: isAdmin(req), email: isAdmin(req) ? ADMIN_EMAIL : null });
  });

  async function loadRows(): Promise<Row[]> {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, tier, paid, paid_at, paid_source, amount_cents, currency, created_at
         FROM king_webinar_registrations
        ORDER BY created_at DESC`,
    );
    return rows as Row[];
  }

  app.get("/api/king/admin/registrations", async (req: Request, res: Response) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Please sign in." });
    try {
      const rows = await loadRows();
      const vip = rows.filter(r => r.tier === "vip");
      res.json({
        registrations: rows,
        totals: {
          all: rows.length,
          general: rows.filter(r => r.tier === "general").length,
          vip: vip.length,
          vipPaid: vip.filter(r => r.paid).length,
          vipUnpaid: vip.filter(r => !r.paid).length,
          revenueCents: vip.filter(r => r.paid)
            .reduce((sum, r) => sum + (r.amount_cents ?? KING_WHOP.amount * 100), 0),
        },
        event: { utc: new Date(Date.UTC(2026, 11, 5, 18, 0, 0)).toISOString(), label: KING_EVENT.label },
      });
    } catch (e: any) {
      console.error("[king] admin list error:", e?.message || e);
      res.status(500).json({ message: "Could not load registrations." });
    }
  });

  app.get("/api/king/admin/registrations.csv", async (req: Request, res: Response) => {
    if (!isAdmin(req)) return res.status(401).send("Please sign in.");
    try {
      const rows = await loadRows();
      // Quote every field and double inner quotes; a leading =,+,-,@ is prefixed
      // with a quote so a spreadsheet treats it as text, not a formula.
      const cell = (v: unknown) => {
        const s = v === null || v === undefined ? "" : String(v);
        return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
      };
      const header = ["Name", "Email", "Phone", "Tier", "Paid", "Paid at", "Paid via", "Amount", "Registered at"];
      const body = rows.map(r => [
        r.name, r.email, r.phone ?? "", r.tier === "vip" ? "VIP" : "General",
        r.paid ? "Yes" : "No", r.paid_at ?? "", r.paid_source ?? "",
        r.paid ? `${((r.amount_cents ?? KING_WHOP.amount * 100) / 100).toFixed(2)} ${r.currency || KING_WHOP.currency}` : "",
        r.created_at,
      ].map(cell).join(","));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="king-astrology-registrations.csv"');
      res.send([header.map(cell).join(","), ...body].join("\r\n") + "\r\n");
    } catch (e: any) {
      console.error("[king] admin csv error:", e?.message || e);
      res.status(500).send("Could not export registrations.");
    }
  });

  // Manual payment tick — the reliable path while no webhook secret is set,
  // and the way to correct a payment Whop never delivered.
  app.patch("/api/king/admin/registrations/:id", async (req: Request, res: Response) => {
    if (!isAdmin(req)) return res.status(401).json({ message: "Please sign in." });
    try {
      const id = str(req.params.id);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ message: "Bad id" });
      const paid = (req.body ?? {}).paid;
      if (typeof paid !== "boolean") return res.status(400).json({ message: "paid must be true or false" });
      const { rows } = await pool.query(
        `UPDATE king_webinar_registrations
            SET paid = $2,
                paid_at = CASE WHEN $2 THEN COALESCE(paid_at, NOW()) ELSE NULL END,
                paid_source = CASE WHEN $2 THEN 'manual' ELSE NULL END,
                tier = CASE WHEN $2 THEN 'vip' ELSE tier END,
                updated_at = NOW()
          WHERE id = $1
        RETURNING id, tier, paid`,
        [id, paid],
      );
      if (!rows.length) return res.status(404).json({ message: "Not found" });
      res.json({ success: true, ...rows[0] });
    } catch (e: any) {
      console.error("[king] admin patch error:", e?.message || e);
      res.status(500).json({ message: "Could not update." });
    }
  });

  console.log(`[king] webinar funnel ready at ${KING_PATHS.funnel} (VIP ${KING_WHOP.price} → ${KING_WHOP.planId})`);
}
