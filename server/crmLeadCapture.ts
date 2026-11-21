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

export async function captureLeadToCrm(input: CaptureLeadInput): Promise<{ contactId: string; created: boolean } | null> {
  const email = (input.email || "").trim().toLowerCase();
  if (!input.userId || !email || !/^\S+@\S+\.\S+$/.test(email)) return null;

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
    // Serialise concurrent captures for the same owner+email so we never create duplicates.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`crm-lead:${ownerId}:${email}`]);
    const { rows: existing } = await client.query(
      `SELECT id FROM crm_contacts
        WHERE owner_id = $1 AND lower(email) = $2 AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1`,
      [ownerId, email],
    );

    if (existing[0]) {
      contactId = existing[0].id;
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
      const { rows } = await client.query(
        `INSERT INTO crm_contacts
           (owner_id, first_name, last_name, email, phone, status, source, lifecycle_stage, tags, custom_fields)
         VALUES ($1, $2, $3, $4, $5, 'lead', $6, 'lead', $7::jsonb, $8::jsonb)
         RETURNING id`,
        [ownerId, first, last, email, phone, input.source, JSON.stringify(tags),
          JSON.stringify({ ...customFieldsPatch, firstCapture: capture })],
      );
      contactId = rows[0].id;
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

/** `poll:<label>` — control chars stripped, whitespace collapsed, capped at 40 chars total. */
export function pollAnswerTag(optionLabel: string): string {
  const clean = String(optionLabel || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `poll:${clean}`.slice(0, 40).trim();
}

export interface PollAnswerInput {
  /** Owner of the webinar funnel — the CRM the contact lives in. */
  userId: string | null | undefined;
  email: string | null | undefined;
  question: string;
  optionLabel: string;
  context?: Record<string, unknown>;
}

/**
 * Tag the owner's existing CRM contact (same owner + lower(email) lookup as
 * captureLeadToCrm) with `poll:<answer>`, record customFields.pollAnswers[question]
 * and add a timeline entry. No contact → no-op (we never create one from a vote).
 */
export async function tagCrmContactWithPollAnswer(input: PollAnswerInput): Promise<string | null> {
  const email = (input.email || "").trim().toLowerCase();
  if (!input.userId || !email || !/^\S+@\S+\.\S+$/.test(email)) return null;
  const ownerId = input.userId;
  const question = String(input.question || "").trim().slice(0, 200);
  const label = String(input.optionLabel || "").trim().slice(0, 120);
  if (!question || !label) return null;
  const tag = pollAnswerTag(label);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`crm-lead:${ownerId}:${email}`]);
    const { rows } = await client.query(
      `SELECT id FROM crm_contacts
        WHERE owner_id = $1 AND lower(email) = $2 AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1`,
      [ownerId, email],
    );
    if (!rows[0]) { await client.query("ROLLBACK"); return null; }
    const contactId = rows[0].id as string;
    await client.query(
      `UPDATE crm_contacts SET
          tags = CASE WHEN COALESCE(tags, '[]'::jsonb) @> $1::jsonb THEN tags
                      ELSE COALESCE(tags, '[]'::jsonb) || $1::jsonb END,
          custom_fields = jsonb_set(
            COALESCE(custom_fields, '{}'::jsonb), '{pollAnswers}',
            COALESCE(custom_fields->'pollAnswers', '{}'::jsonb) || $2::jsonb, true),
          updated_at = now()
        WHERE id = $3`,
      [JSON.stringify([tag]), JSON.stringify({ [question]: label }), contactId],
    );
    const { rows: act } = await client.query(
      `INSERT INTO crm_activities (contact_id, user_id, type, title, body, metadata)
       VALUES ($1, $2, 'tag', $3, $4, $5::jsonb) RETURNING id`,
      [contactId, ownerId, `Answered webinar poll: ${label}`.slice(0, 200), question,
        JSON.stringify({ source: "webinar_poll", question, answer: label, tag, ...(input.context || {}) })],
    );
    await client.query(`INSERT INTO crm_tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [tag]);
    await client.query("COMMIT");
    emitCrmEvent({ kind: "contact.updated", id: contactId });
    emitCrmEvent({ kind: "activity.created", id: act[0].id, contactId });
    return contactId;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
