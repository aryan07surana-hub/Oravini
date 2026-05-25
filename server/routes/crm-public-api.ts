import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { eq, desc, sql as sqlExpr } from "drizzle-orm";
import { db, pool } from "../storage";
import {
  crmApiKeys, crmContacts, crmOpportunities, crmActivities, crmTasks, crmTags,
} from "@shared/schema";
import { emitCrmEvent } from "./crm-events";

/**
 * Bootstrap the API key table. Idempotent.
 */
export async function bootstrapCrmPublicApi() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_api_keys (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      key_hash text NOT NULL UNIQUE,
      key_prefix text NOT NULL,
      scopes jsonb NOT NULL DEFAULT '["contacts:write"]'::jsonb,
      default_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      default_source text,
      allowed_origins text DEFAULT '*',
      rate_limit_per_min integer NOT NULL DEFAULT 60,
      owner_id varchar REFERENCES users(id) ON DELETE SET NULL,
      last_used_at timestamp,
      last_used_ip text,
      usage_count integer NOT NULL DEFAULT 0,
      expires_at timestamp,
      revoked_at timestamp,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_crm_api_keys_hash ON crm_api_keys (key_hash);
  `);
}

/* ─── Helpers ───────────────────────────────────────────── */

function generateKey(): { secret: string; hash: string; prefix: string } {
  // ovk_live_<32 hex>
  const random = crypto.randomBytes(24).toString("hex"); // 48 chars
  const secret = `ovk_live_${random}`;
  const hash = crypto.createHash("sha256").update(secret).digest("hex");
  const prefix = secret.slice(0, 12); // "ovk_live_xx"
  return { secret, hash, prefix };
}

function hashSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function corsAllowed(origin: string | undefined, allowedOrigins: string | null): boolean {
  if (!allowedOrigins || allowedOrigins.trim() === "*") return true;
  if (!origin) return true; // server-to-server (no Origin header) is always allowed
  const list = allowedOrigins.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(origin.toLowerCase());
}

// Per-key sliding rate limit. In-memory; resets on restart, fine for v1.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(keyId: string, limit: number): boolean {
  const now = Date.now();
  const b = rateBuckets.get(keyId);
  if (!b || now > b.resetAt) {
    rateBuckets.set(keyId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

type AuthedReq = Request & { apiKey?: typeof crmApiKeys.$inferSelect };

async function authenticate(req: AuthedReq, res: Response, next: NextFunction) {
  try {
    const auth = req.header("authorization") || req.header("Authorization") || "";
    let secret: string | null = null;
    if (auth.startsWith("Bearer ")) secret = auth.slice("Bearer ".length).trim();
    if (!secret) secret = (req.query.api_key as string) || null;
    if (!secret) return res.status(401).json({ ok: false, message: "Missing API key. Set Authorization: Bearer <key>." });

    const hash = hashSecret(secret);
    const [key] = await db.select().from(crmApiKeys).where(eq(crmApiKeys.keyHash, hash));
    if (!key) return res.status(401).json({ ok: false, message: "Invalid API key." });
    if (key.revokedAt) return res.status(401).json({ ok: false, message: "API key has been revoked." });
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return res.status(401).json({ ok: false, message: "API key expired." });
    }

    if (!corsAllowed(req.header("origin"), key.allowedOrigins)) {
      return res.status(403).json({ ok: false, message: "Origin not allowed for this key." });
    }

    if (!rateLimit(key.id, key.rateLimitPerMin)) {
      return res.status(429).json({ ok: false, message: "Rate limit exceeded. Try again in a moment." });
    }

    // Update telemetry async — don't block the request
    const ip = (req.ip || req.socket.remoteAddress || "").toString().slice(0, 64);
    pool.query(
      `UPDATE crm_api_keys
          SET last_used_at = now(), last_used_ip = $1, usage_count = usage_count + 1
        WHERE id = $2`,
      [ip, key.id],
    ).catch(() => {});

    req.apiKey = key;
    next();
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

function requireScope(scope: string) {
  return (req: AuthedReq, res: Response, next: NextFunction) => {
    if (!req.apiKey) return res.status(401).json({ ok: false, message: "Unauthorized" });
    const scopes = req.apiKey.scopes as string[] | undefined;
    if (!Array.isArray(scopes) || !scopes.includes(scope)) {
      return res.status(403).json({ ok: false, message: `Missing scope: ${scope}` });
    }
    next();
  };
}

// CORS preflight + per-request CORS headers
function applyCors(req: Request, res: Response, allowedOrigins: string | null = "*") {
  const origin = req.header("origin");
  if (!origin) return;
  if (corsAllowed(origin, allowedOrigins)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "false");
  }
}

/* ─── The big one: contact upsert ─────────────────────────
   Accepts every field a CRM contact can have, plus optional
   nested opportunity / activities / task / tags. Uses email or
   phone as the dedup key (same shape as the CSV importer).
─────────────────────────────────────────────────────────── */

type IncomingContact = {
  // Identity
  firstName?: string; lastName?: string; name?: string; // "name" auto-splits
  email?: string; phone?: string;
  company?: string; title?: string;
  // Status & scoring
  status?: "lead" | "prospect" | "customer" | "inactive";
  source?: string; lifecycleStage?: string; score?: number;
  // Geography
  city?: string; country?: string; timezone?: string;
  // Social
  instagram?: string; youtube?: string; linkedin?: string; twitter?: string; website?: string;
  // Free-form
  tags?: string[]; customFields?: Record<string, any>; notes?: string;
  doNotContact?: boolean;
  // Dedup behaviour
  dedupBy?: "email" | "phone" | "none";
  // Optional nested writes
  opportunity?: {
    title: string;
    valueCents?: number; value?: number; // dollars accepted
    currency?: string;
    pipelineId?: string; stageId?: string;     // if omitted, default pipeline + first non-terminal stage
    expectedCloseDate?: string;
    description?: string;
  };
  activity?: {
    type?: "note" | "email" | "call" | "sms" | "meeting" | "system";
    title?: string;
    body?: string;
    metadata?: Record<string, any>;
  };
  task?: {
    title: string;
    dueAt?: string;
    priority?: "low" | "normal" | "high" | "urgent";
    description?: string;
  };
  // Anything else — passed through as customFields
  [k: string]: any;
};

function splitName(name?: string): { firstName: string; lastName: string } {
  if (!name) return { firstName: "", lastName: "" };
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
}

const CONTACT_FIELDS = new Set([
  "firstName", "lastName", "name", "email", "phone", "company", "title",
  "status", "source", "lifecycleStage", "score",
  "city", "country", "timezone",
  "instagram", "youtube", "linkedin", "twitter", "website",
  "tags", "customFields", "notes", "doNotContact",
  "dedupBy", "opportunity", "activity", "task",
]);

async function upsertContact(req: AuthedReq, body: IncomingContact) {
  const key = req.apiKey!;
  const dedupBy = body.dedupBy ?? "email";

  // Name handling
  const { firstName: nfn, lastName: nln } = splitName(body.name);
  const firstName = (body.firstName ?? nfn ?? "").trim() || null;
  const lastName  = (body.lastName  ?? nln ?? "").trim() || null;
  const email = body.email?.trim().toLowerCase() || null;
  const phone = body.phone?.trim() || null;

  if (!email && !phone && !firstName && !lastName) {
    return { ok: false as const, status: 400, error: "Provide at least one of: email, phone, firstName, lastName." };
  }

  // Tags: union default tags + incoming
  const incomingTags = Array.isArray(body.tags) ? body.tags.filter(t => typeof t === "string" && t.trim()) : [];
  const tags = Array.from(new Set([...(key.defaultTags as string[] || []), ...incomingTags]));

  // Custom fields: passthrough for unknown top-level keys
  const passthroughCustom: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (CONTACT_FIELDS.has(k)) continue;
    if (v == null || v === "") continue;
    passthroughCustom[k] = v;
  }
  const customFields = { ...(body.customFields || {}), ...passthroughCustom };

  const status = body.status && ["lead", "prospect", "customer", "inactive"].includes(body.status) ? body.status : "lead";
  const source = (body.source || key.defaultSource || "api").toString();
  const score = typeof body.score === "number" ? Math.max(0, Math.min(100, Math.floor(body.score))) : 0;

  // Dedup
  let existingId: string | null = null;
  if (dedupBy === "email" && email) {
    const r = await pool.query(`SELECT id FROM crm_contacts WHERE lower(email) = $1 AND deleted_at IS NULL LIMIT 1`, [email]);
    existingId = r.rows[0]?.id || null;
  } else if (dedupBy === "phone" && phone) {
    const r = await pool.query(`SELECT id FROM crm_contacts WHERE phone = $1 AND deleted_at IS NULL LIMIT 1`, [phone]);
    existingId = r.rows[0]?.id || null;
  }

  let contactId: string;
  let created = false;

  if (existingId) {
    contactId = existingId;
    await pool.query(
      `UPDATE crm_contacts SET
          first_name = COALESCE($1, first_name),
          last_name  = COALESCE($2, last_name),
          phone      = COALESCE($3, phone),
          company    = COALESCE($4, company),
          title      = COALESCE($5, title),
          status     = $6,
          source     = COALESCE(source, $7),
          score      = GREATEST(score, $8),
          notes      = COALESCE($9, notes),
          tags       = (
            SELECT to_jsonb(array(SELECT DISTINCT jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb) || $10::jsonb)))
          ),
          custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $11::jsonb,
          city       = COALESCE($12, city),
          country    = COALESCE($13, country),
          timezone   = COALESCE($14, timezone),
          instagram  = COALESCE($15, instagram),
          youtube    = COALESCE($16, youtube),
          linkedin   = COALESCE($17, linkedin),
          twitter    = COALESCE($18, twitter),
          website    = COALESCE($19, website),
          lifecycle_stage = COALESCE($20, lifecycle_stage),
          do_not_contact = COALESCE($21, do_not_contact),
          updated_at = now()
        WHERE id = $22`,
      [
        firstName, lastName, phone, body.company || null, body.title || null,
        status, source, score, body.notes || null,
        JSON.stringify(tags),
        JSON.stringify(customFields),
        body.city || null, body.country || null, body.timezone || null,
        body.instagram || null, body.youtube || null, body.linkedin || null, body.twitter || null, body.website || null,
        body.lifecycleStage || null, typeof body.doNotContact === "boolean" ? body.doNotContact : null,
        contactId,
      ],
    );
    emitCrmEvent({ kind: "contact.updated", id: contactId });
  } else {
    const ins = await pool.query(
      `INSERT INTO crm_contacts (
          first_name, last_name, email, phone, company, title,
          status, source, score, notes,
          tags, custom_fields,
          city, country, timezone,
          instagram, youtube, linkedin, twitter, website,
          lifecycle_stage, do_not_contact, owner_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        RETURNING id`,
      [
        firstName, lastName, email, phone, body.company || null, body.title || null,
        status, source, score, body.notes || null,
        JSON.stringify(tags), JSON.stringify(customFields),
        body.city || null, body.country || null, body.timezone || null,
        body.instagram || null, body.youtube || null, body.linkedin || null, body.twitter || null, body.website || null,
        body.lifecycleStage || null, !!body.doNotContact, key.ownerId ?? null,
      ],
    );
    contactId = ins.rows[0].id;
    created = true;
    // Source-tracking activity
    await db.insert(crmActivities).values({
      contactId, type: "system",
      title: `Contact created via API key "${key.name}"`,
      metadata: { keyId: key.id, source } as any,
    });
    emitCrmEvent({ kind: "contact.created", id: contactId });

    // Make sure any new tag literals exist in the global tag table
    for (const t of tags) {
      await pool.query(`INSERT INTO crm_tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [t]);
    }
  }

  // Optional nested: opportunity
  let opportunityId: string | null = null;
  if (body.opportunity?.title && (key.scopes as string[]).includes("opportunities:write")) {
    let pipelineId = body.opportunity.pipelineId;
    let stageId = body.opportunity.stageId;
    if (!pipelineId) {
      const r = await pool.query(`SELECT id FROM crm_pipelines ORDER BY is_default DESC, position ASC LIMIT 1`);
      pipelineId = r.rows[0]?.id;
    }
    if (pipelineId && !stageId) {
      const r = await pool.query(
        `SELECT id FROM crm_pipeline_stages
          WHERE pipeline_id = $1 AND is_won = false AND is_lost = false
          ORDER BY position ASC LIMIT 1`,
        [pipelineId],
      );
      stageId = r.rows[0]?.id;
    }
    if (pipelineId && stageId) {
      const valueCents = typeof body.opportunity.valueCents === "number"
        ? body.opportunity.valueCents
        : typeof body.opportunity.value === "number"
          ? Math.round(body.opportunity.value * 100)
          : 0;
      const ins = await pool.query(
        `INSERT INTO crm_opportunities (pipeline_id, stage_id, contact_id, title, description, value_cents, currency, expected_close_date, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [
          pipelineId, stageId, contactId,
          body.opportunity.title, body.opportunity.description || null,
          valueCents, body.opportunity.currency || "USD",
          body.opportunity.expectedCloseDate ? new Date(body.opportunity.expectedCloseDate) : null,
          key.ownerId ?? null,
        ],
      );
      opportunityId = ins.rows[0].id;
      await db.insert(crmActivities).values({
        contactId, opportunityId, type: "system",
        title: `Opportunity created via API: ${body.opportunity.title}`,
      });
      emitCrmEvent({ kind: "opportunity.created", id: opportunityId as string, pipelineId, stageId });
    }
  }

  // Optional nested: activity
  if (body.activity?.title || body.activity?.body) {
    const actType = body.activity?.type && ["note","email","call","sms","meeting","system"].includes(body.activity.type)
      ? body.activity.type : "note";
    const ins = await db.insert(crmActivities).values({
      contactId, opportunityId,
      type: actType as any,
      title: body.activity?.title || `${actType} logged via API`,
      body: body.activity?.body || null,
      metadata: (body.activity?.metadata || {}) as any,
    }).returning();
    emitCrmEvent({ kind: "activity.created", id: ins[0].id, contactId, opportunityId });
  }

  // Optional nested: task
  if (body.task?.title && (key.scopes as string[]).includes("tasks:write")) {
    const ins = await db.insert(crmTasks).values({
      contactId, opportunityId,
      title: body.task.title,
      description: body.task.description || null,
      dueAt: body.task.dueAt ? new Date(body.task.dueAt) : null,
      priority: ["low","normal","high","urgent"].includes(body.task.priority || "") ? body.task.priority : "normal",
    } as any).returning();
    emitCrmEvent({ kind: "task.created", id: ins[0].id });
  }

  return { ok: true as const, status: created ? 201 : 200, contactId, opportunityId, created };
}

/* ─── Public API routes ─────────────────────────────────── */

export function registerCrmPublicApi(app: Express, requireAdmin: any) {
  /* CORS preflight — accept everything; auth happens on the actual call. */
  const handlePreflight = (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", req.header("origin") || "*");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  };
  app.options("/api/v1/crm/*", handlePreflight);

  /* Public endpoints */
  app.post("/api/v1/crm/contacts", authenticate, requireScope("contacts:write"), async (req: AuthedReq, res) => {
    applyCors(req, res, req.apiKey?.allowedOrigins ?? "*");
    try {
      const result = await upsertContact(req, req.body || {});
      if (!result.ok) return res.status(result.status).json({ ok: false, message: result.error });
      return res.status(result.status).json({
        ok: true,
        created: result.created,
        contactId: result.contactId,
        opportunityId: result.opportunityId,
      });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  });

  // Convenience alias — some platforms POST to "/leads" by convention
  app.post("/api/v1/crm/leads", authenticate, requireScope("contacts:write"), async (req: AuthedReq, res) => {
    applyCors(req, res, req.apiKey?.allowedOrigins ?? "*");
    try {
      const result = await upsertContact(req, req.body || {});
      if (!result.ok) return res.status(result.status).json({ ok: false, message: result.error });
      return res.status(result.status).json({ ok: true, created: result.created, contactId: result.contactId, opportunityId: result.opportunityId });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  });

  // Schema introspection — useful when building forms dynamically
  app.get("/api/v1/crm/schema", authenticate, async (req: AuthedReq, res) => {
    applyCors(req, res, req.apiKey?.allowedOrigins ?? "*");
    res.json({
      ok: true,
      key: { name: req.apiKey!.name, scopes: req.apiKey!.scopes, defaultTags: req.apiKey!.defaultTags, defaultSource: req.apiKey!.defaultSource },
      contact: {
        identity:  ["firstName", "lastName", "name", "email", "phone", "company", "title"],
        status:    ["status (lead|prospect|customer|inactive)", "source", "lifecycleStage", "score"],
        location:  ["city", "country", "timezone"],
        social:    ["instagram", "youtube", "linkedin", "twitter", "website"],
        misc:      ["tags (string[])", "customFields (object)", "notes", "doNotContact (boolean)", "dedupBy (email|phone|none)"],
      },
      nested: {
        opportunity: ["title", "value (USD)", "valueCents", "currency", "pipelineId?", "stageId?", "expectedCloseDate", "description"],
        activity:    ["type (note|email|call|sms|meeting|system)", "title", "body", "metadata"],
        task:        ["title", "dueAt", "priority (low|normal|high|urgent)", "description"],
      },
      docs: "https://docs.oravini.com/crm-api",
    });
  });

  /* ─── Admin-only key management UI endpoints ────────────── */

  app.get("/api/crm-suite/api-keys", requireAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(crmApiKeys).orderBy(desc(crmApiKeys.createdAt));
      // Never return the hash. Caller already has the prefix.
      const sanitized = rows.map(r => ({
        id: r.id, name: r.name, prefix: r.keyPrefix,
        scopes: r.scopes, defaultTags: r.defaultTags, defaultSource: r.defaultSource,
        allowedOrigins: r.allowedOrigins, rateLimitPerMin: r.rateLimitPerMin,
        usageCount: r.usageCount, lastUsedAt: r.lastUsedAt, lastUsedIp: r.lastUsedIp,
        revokedAt: r.revokedAt, expiresAt: r.expiresAt, createdAt: r.createdAt,
      }));
      res.json(sanitized);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/crm-suite/api-keys", requireAdmin, async (req, res) => {
    try {
      const { name, scopes, defaultTags, defaultSource, allowedOrigins, rateLimitPerMin, expiresAt } = req.body as {
        name?: string; scopes?: string[]; defaultTags?: string[]; defaultSource?: string | null;
        allowedOrigins?: string; rateLimitPerMin?: number; expiresAt?: string | null;
      };
      if (!name?.trim()) return res.status(400).json({ message: "name required" });
      const safeScopes = Array.isArray(scopes) && scopes.length
        ? scopes.filter(s => /^(contacts|opportunities|activities|tasks):(read|write)$/.test(s))
        : ["contacts:write"];
      const { secret, hash, prefix } = generateKey();
      const userId = (req.user as any)?.id ?? null;

      const ins = await pool.query(
        `INSERT INTO crm_api_keys (name, key_hash, key_prefix, scopes, default_tags, default_source, allowed_origins, rate_limit_per_min, owner_id, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, key_prefix AS prefix, name`,
        [
          name.trim(), hash, prefix,
          JSON.stringify(safeScopes),
          JSON.stringify(defaultTags || []),
          defaultSource?.trim() || null,
          (allowedOrigins?.trim() || "*"),
          Math.max(1, Math.min(1000, parseInt(String(rateLimitPerMin || 60), 10))),
          userId,
          expiresAt ? new Date(expiresAt) : null,
        ],
      );
      // Return the secret EXACTLY ONCE so the admin can copy it
      res.status(201).json({
        ok: true,
        id: ins.rows[0].id,
        secret,           // shown once — never again
        prefix,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/crm-suite/api-keys/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      const allowed = ["name", "scopes", "defaultTags", "defaultSource", "allowedOrigins", "rateLimitPerMin", "expiresAt"];
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      const map: Record<string, string> = {
        name: "name", scopes: "scopes", defaultTags: "default_tags", defaultSource: "default_source",
        allowedOrigins: "allowed_origins", rateLimitPerMin: "rate_limit_per_min", expiresAt: "expires_at",
      };
      for (const k of allowed) {
        if (k in req.body) {
          let v = req.body[k];
          if (k === "scopes" || k === "defaultTags") v = JSON.stringify(Array.isArray(v) ? v : []);
          if (k === "expiresAt" && v) v = new Date(v);
          sets.push(`${map[k]} = $${i++}`);
          vals.push(v);
        }
      }
      if (!sets.length) return res.json({ ok: true });
      vals.push(id);
      await pool.query(`UPDATE crm_api_keys SET ${sets.join(", ")} WHERE id = $${i}`, vals);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/crm-suite/api-keys/:id/revoke", requireAdmin, async (req, res) => {
    try {
      await pool.query(`UPDATE crm_api_keys SET revoked_at = now() WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/api-keys/:id", requireAdmin, async (req, res) => {
    try {
      await pool.query(`DELETE FROM crm_api_keys WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─── Embed JS — drop-in lead form for any landing page ─── */

  // Serves a self-contained <script> that sniffs `data-` attributes off itself
  // (or off a target container) and either creates a styled form or wires up
  // an existing form on the page.
  app.get("/embed/crm-form.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(EMBED_JS);
  });

  // Tiny JSON-only fallback for non-Bearer setups (?api_key=… in querystring)
  // Same handler as the main one, just easier to embed into a no-fetch form.
  app.post("/embed/crm-submit", authenticate, requireScope("contacts:write"), async (req: AuthedReq, res) => {
    applyCors(req, res, req.apiKey?.allowedOrigins ?? "*");
    try {
      const result = await upsertContact(req, req.body || {});
      if (!result.ok) return res.status(result.status).json({ ok: false, message: result.error });
      res.json({ ok: true, created: result.created, contactId: result.contactId });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  });
}

/* ─── The embed script ─────────────────────────────────────
   Vanilla JS, no deps. Two modes:
   1) Auto-render: include <script src="/embed/crm-form.js"
        data-key="ovk_live_..."
        data-target="#oravini-form"
        data-fields="name,email,phone"
        data-tags="brandverse-landing">
      → renders a styled form into #oravini-form
   2) Wire-up: include
      <form data-oravini-form>...</form>
      <script src="/embed/crm-form.js" data-key="ovk_live_..."></script>
      → intercepts existing form submit, posts to API
─────────────────────────────────────────────────────────── */

const EMBED_JS = `
(function () {
  var scriptTag = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  if (!scriptTag) return;

  var origin = (function () {
    try { return new URL(scriptTag.src).origin; } catch (e) { return ''; }
  })();

  var key = scriptTag.getAttribute('data-key') || '';
  if (!key) {
    console.warn('[Oravini CRM] Missing data-key on embed script.');
    return;
  }

  var defaults = {
    target:        scriptTag.getAttribute('data-target') || '',
    fields:        (scriptTag.getAttribute('data-fields') || 'name,email,phone,notes').split(',').map(function(s){return s.trim();}).filter(Boolean),
    tags:          (scriptTag.getAttribute('data-tags') || '').split(',').map(function(s){return s.trim();}).filter(Boolean),
    source:        scriptTag.getAttribute('data-source') || 'embed-form',
    submitText:    scriptTag.getAttribute('data-submit') || 'Send',
    successText:   scriptTag.getAttribute('data-success') || 'Thanks. We\\'ll be in touch shortly.',
    accent:        scriptTag.getAttribute('data-accent') || '#d4b461',
    background:    scriptTag.getAttribute('data-background') || 'transparent',
    textColor:     scriptTag.getAttribute('data-text-color') || '#fff',
    redirect:      scriptTag.getAttribute('data-redirect') || '',
    pipelineDealTitle: scriptTag.getAttribute('data-deal-title') || ''
  };

  function buildPayload(formEl) {
    var data = {};
    Array.prototype.forEach.call(formEl.querySelectorAll('[name]'), function (el) {
      var name = el.getAttribute('name');
      if (!name) return;
      if (el.type === 'checkbox') data[name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) data[name] = el.value; }
      else if (data[name] === undefined) data[name] = el.value;
    });
    if (defaults.tags.length) data.tags = (data.tags ? (Array.isArray(data.tags) ? data.tags : String(data.tags).split(',')) : []).concat(defaults.tags);
    if (!data.source) data.source = defaults.source;
    if (defaults.pipelineDealTitle && !data.opportunity) {
      data.opportunity = { title: defaults.pipelineDealTitle };
    }
    return data;
  }

  function post(payload) {
    return fetch(origin + '/api/v1/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, json: j }; }); });
  }

  function showSuccess(formEl) {
    var d = document.createElement('div');
    d.style.cssText = 'padding:18px 16px;border-radius:10px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.4);color:#22c55e;font-weight:600;font-size:14px;text-align:center;font-family:system-ui,-apple-system,sans-serif;';
    d.textContent = defaults.successText;
    formEl.replaceWith(d);
    if (defaults.redirect) setTimeout(function(){ window.location.href = defaults.redirect; }, 800);
  }

  function showError(msg, container) {
    var existing = container.querySelector('.ovk-error');
    if (existing) existing.remove();
    var d = document.createElement('div');
    d.className = 'ovk-error';
    d.style.cssText = 'padding:10px 14px;border-radius:8px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-size:12.5px;font-weight:500;font-family:system-ui,-apple-system,sans-serif;';
    d.textContent = msg || 'Something went wrong.';
    container.appendChild(d);
  }

  function attach(formEl) {
    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = formEl.querySelector('button[type=submit], input[type=submit]');
      var originalText = btn ? (btn.textContent || btn.value) : '';
      if (btn) {
        if (btn.tagName === 'BUTTON') btn.textContent = 'Sending...'; else btn.value = 'Sending...';
        btn.disabled = true;
      }
      post(buildPayload(formEl)).then(function (res) {
        if (res.ok) showSuccess(formEl);
        else {
          showError((res.json && res.json.message) || 'Submission failed.', formEl);
          if (btn) {
            if (btn.tagName === 'BUTTON') btn.textContent = originalText; else btn.value = originalText;
            btn.disabled = false;
          }
        }
      }).catch(function (err) {
        showError(err && err.message, formEl);
        if (btn) {
          if (btn.tagName === 'BUTTON') btn.textContent = originalText; else btn.value = originalText;
          btn.disabled = false;
        }
      });
    });
  }

  function buildForm() {
    var FIELD_LABELS = {
      name: 'Full name', firstName: 'First name', lastName: 'Last name',
      email: 'Email', phone: 'Phone', company: 'Company', title: 'Title',
      city: 'City', country: 'Country',
      instagram: 'Instagram', youtube: 'YouTube', linkedin: 'LinkedIn', website: 'Website',
      notes: 'Tell us more (optional)'
    };
    var f = document.createElement('form');
    f.setAttribute('data-oravini-form', '1');
    f.style.cssText = 'display:flex;flex-direction:column;gap:10px;background:' + defaults.background + ';color:' + defaults.textColor + ';font-family:system-ui,-apple-system,Inter,sans-serif;';

    defaults.fields.forEach(function (name) {
      var input;
      if (name === 'notes') {
        input = document.createElement('textarea');
        input.rows = 3;
      } else {
        input = document.createElement('input');
        input.type = (name === 'email') ? 'email' : (name === 'phone') ? 'tel' : 'text';
      }
      input.name = name;
      input.placeholder = FIELD_LABELS[name] || name;
      if (name === 'email' || name === 'name' || name === 'firstName') input.required = true;
      input.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid ' + defaults.accent + '33;border-radius:8px;padding:11px 13px;color:' + defaults.textColor + ';font-size:14px;outline:none;font-family:inherit;';
      input.addEventListener('focus', function () { input.style.borderColor = defaults.accent + 'aa'; });
      input.addEventListener('blur',  function () { input.style.borderColor = defaults.accent + '33'; });
      f.appendChild(input);
    });

    var btn = document.createElement('button');
    btn.type = 'submit';
    btn.textContent = defaults.submitText;
    btn.style.cssText = 'background:linear-gradient(135deg,' + defaults.accent + ',#b8962e);color:#000;font-weight:800;font-size:14px;border:none;border-radius:10px;padding:12px 20px;cursor:pointer;font-family:inherit;margin-top:4px;';
    f.appendChild(btn);

    var foot = document.createElement('div');
    foot.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);text-align:center;margin-top:2px;';
    foot.textContent = 'Powered by Oravini CRM';
    f.appendChild(foot);

    return f;
  }

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    // Mode 1: data-target → render styled form
    if (defaults.target) {
      var host = document.querySelector(defaults.target);
      if (!host) {
        console.warn('[Oravini CRM] target not found:', defaults.target);
      } else {
        var f = buildForm();
        host.appendChild(f);
        attach(f);
      }
    }
    // Mode 2: any existing form with data-oravini-form attribute
    Array.prototype.forEach.call(document.querySelectorAll('form[data-oravini-form]'), function (formEl) {
      if (formEl.__oraviniBound) return;
      formEl.__oraviniBound = true;
      attach(formEl);
    });
  });
})();
`;
