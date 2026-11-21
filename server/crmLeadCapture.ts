/**
 * Shared lead → CRM bridge.
 *
 * Every public lead-capture point (funnel opt-ins, marketing landing pages,
 * webinar registrations) calls captureLeadToCrm() so the lead lands in the
 * OWNER's CRM (crm_contacts.owner_id = the user who owns the funnel/page/webinar)
 * with a timeline entry in crm_activities.
 *
 * Behaviour mirrors the crm-suite / crm-public-api upsert style:
 *  - upsert by lower(email), scoped to owner_id, ignoring soft-deleted rows
 *  - never overwrites existing name/phone/source (COALESCE), tags are merged
 *  - custom_fields gets the latest capture context + UTM params merged in
 *  - purely additive: no deletes, no schema changes
 */
import { pool } from "./storage";
import { emitCrmEvent } from "./routes/crm-events";

export type UtmParams = { utm_source?: string; utm_medium?: string; utm_campaign?: string };

export interface CaptureLeadInput {
  /** Owner of the funnel / landing page / webinar. Contact is attached to this user. */
  userId: string | null | undefined;
  email: string | null | undefined;
  name?: string | null;
  phone?: string | null;
  /** crm_contacts.source, e.g. "funnel" | "landing" | "webinar" */
  source: string;
  tags?: string[];
  /** Title of the crm_activities timeline entry */
  activityTitle: string;
  activityBody?: string | null;
  /** Extra capture context stored in custom_fields.lastCapture + activity metadata */
  context?: Record<string, unknown>;
  utm?: UtmParams;
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/** Pull utm_source / utm_medium / utm_campaign from an untrusted request body. */
export function pickUtm(body: any): UtmParams {
  const out: UtmParams = {};
  if (!body || typeof body !== "object") return out;
  const nested = body.utm && typeof body.utm === "object" ? body.utm : {};
  for (const k of UTM_KEYS) {
    const raw = body[k] ?? nested[k];
    if (typeof raw === "string" && raw.trim()) out[k] = raw.trim().slice(0, 200);
  }
  return out;
}

function splitName(name: string | null | undefined): { first: string | null; last: string | null } {
  const clean = (name || "").trim().replace(/\s+/g, " ");
  if (!clean) return { first: null, last: null };
  const [first, ...rest] = clean.split(" ");
  return { first: first || null, last: rest.join(" ") || null };
}

type Queryable = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };

/** Take the per owner+email advisory lock (must be inside a transaction) and find the live contact. */
async function lockAndFindContact(client: Queryable, ownerId: string, email: string): Promise<string | null> {
  // Serialise concurrent captures for the same owner+email so we never create duplicates.
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`crm-lead:${ownerId}:${email}`]);
  const { rows } = await client.query(
    `SELECT id FROM crm_contacts
      WHERE owner_id = $1 AND lower(email) = $2 AND deleted_at IS NULL
      ORDER BY created_at ASC LIMIT 1`,
    [ownerId, email],
  );
  return rows[0]?.id ?? null;
}

async function insertContact(
  client: Queryable,
  v: { ownerId: string; first: string | null; last: string | null; email: string; phone: string | null; source: string; tags: string[]; customFields: Record<string, unknown> },
): Promise<string> {
  const { rows } = await client.query(
    `INSERT INTO crm_contacts
       (owner_id, first_name, last_name, email, phone, status, source, lifecycle_stage, tags, custom_fields)
     VALUES ($1, $2, $3, $4, $5, 'lead', $6, 'lead', $7::jsonb, $8::jsonb)
     RETURNING id`,
    [v.ownerId, v.first, v.last, v.email, v.phone, v.source, JSON.stringify(v.tags), JSON.stringify(v.customFields)],
  );
  return rows[0].id;
}

function normaliseEmail(raw: string | null | undefined): string | null {
  const email = (raw || "").trim().toLowerCase();
  return email && /^\S+@\S+\.\S+$/.test(email) ? email : null;
}

/**
 * Resolve the owner's CRM contact id for an email, creating the contact if it is
 * missing (same lock / lookup / insert path captureLeadToCrm uses). Does not
 * modify an existing contact and does not log an activity.
 */
export async function getOrCreateCrmContactId(input: {
  userId: string | null | undefined;
  email: string | null | undefined;
  name?: string | null;
  phone?: string | null;
  source?: string;
  tags?: string[];
}): Promise<{ contactId: string; created: boolean } | null> {
  const email = normaliseEmail(input.email);
  if (!input.userId || !email) return null;
  const ownerId = input.userId;
  const source = input.source || "webinar";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let contactId = await lockAndFindContact(client, ownerId, email);
    let created = false;
    if (!contactId) {
      const { first, last } = splitName(input.name);
      const tags = Array.from(new Set((input.tags || []).map(t => String(t).trim()).filter(Boolean)));
      const capture = { source, capturedAt: new Date().toISOString() };
      contactId = await insertContact(client, {
        ownerId, first, last, email, phone: (input.phone || "").trim() || null, source, tags,
        customFields: { lastCapture: capture, firstCapture: capture },
      });
      for (const t of tags) {
        await client.query(`INSERT INTO crm_tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [t]);
      }
      created = true;
    }
    await client.query("COMMIT");
    if (created) emitCrmEvent({ kind: "contact.created", id: contactId });
    return { contactId, created };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function captureLeadToCrm(input: CaptureLeadInput): Promise<{ contactId: string; created: boolean } | null> {
  const email = normaliseEmail(input.email);
  if (!input.userId || !email) return null;

  const ownerId = input.userId;
  const { first, last } = splitName(input.name);
  const phone = (input.phone || "").trim() || null;
  const utm = input.utm || {};
  const tags = Array.from(new Set((input.tags || []).map(t => String(t).trim()).filter(Boolean)));
  const capturedAt = new Date().toISOString();
  const capture = { source: input.source, ...(input.context || {}), utm, capturedAt };

  // Latest non-empty UTM values are also flattened onto custom_fields for easy filtering.
  const customFieldsPatch: Record<string, unknown> = { ...utm, lastCapture: capture };

  const client = await pool.connect();
  let contactId: string;
  let created = false;
  try {
    await client.query("BEGIN");
    const existingId = await lockAndFindContact(client, ownerId, email);

    if (existingId) {
      contactId = existingId;
      await client.query(
        `UPDATE crm_contacts SET
            first_name    = COALESCE(first_name, $1),
            last_name     = COALESCE(last_name, $2),
            phone         = COALESCE(phone, $3),
            source        = COALESCE(source, $4),
            tags          = (SELECT to_jsonb(array(SELECT DISTINCT jsonb_array_elements_text(COALESCE(tags, '[]'::jsonb) || $5::jsonb)))),
            custom_fields = COALESCE(custom_fields, '{}'::jsonb) || $6::jsonb,
            updated_at    = now()
          WHERE id = $7`,
        [first, last, phone, input.source, JSON.stringify(tags), JSON.stringify(customFieldsPatch), contactId],
      );
    } else {
      contactId = await insertContact(client, {
        ownerId, first, last, email, phone, source: input.source, tags,
        customFields: { ...customFieldsPatch, firstCapture: capture },
      });
      created = true;
    }

    const { rows: act } = await client.query(
      `INSERT INTO crm_activities (contact_id, user_id, type, title, body, metadata)
       VALUES ($1, $2, 'system', $3, $4, $5::jsonb) RETURNING id`,
      [contactId, ownerId, input.activityTitle, input.activityBody ?? null, JSON.stringify(capture)],
    );

    for (const t of tags) {
      await client.query(`INSERT INTO crm_tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [t]);
    }
    await client.query("COMMIT");

    emitCrmEvent({ kind: created ? "contact.created" : "contact.updated", id: contactId });
    emitCrmEvent({ kind: "activity.created", id: act[0].id, contactId });
    return { contactId, created };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Fire-and-forget wrapper: never throws, never blocks the HTTP response. */
export function captureLeadToCrmInBackground(input: CaptureLeadInput): void {
  captureLeadToCrm(input).catch(err => {
    console.error(`[crm-lead-capture] ${input.source} capture failed for owner ${input.userId}:`, err?.message || err);
  });
}
