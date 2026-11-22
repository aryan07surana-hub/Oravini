/**
 * Webinar funnel → CRM pipeline automation.
 *
 *   registration  → opportunity ("deal") in the default pipeline, stage "New Lead"
 *   first attend  → move to "Qualified"           + activity "Attended webinar"
 *   CTA click     → move to "Proposal"            + urgent "Hot lead" task
 *                   + activity + email alert to the webinar owner
 *
 * Rules:
 *  - Pipeline: crm_pipelines.is_default first, else lowest position; none → skip.
 *  - Stages are matched by exact name; a missing "New Lead" falls back to the
 *    first stage by position; a missing "Qualified"/"Proposal" leaves the deal as-is.
 *  - Moves are forward-only (target position > current position) and never touch
 *    a deal sitting in a won/lost stage.
 *  - One open opportunity per contact per webinar (customFields.webinarId).
 *
 * Every exported *InBackground function is fire-and-forget: it never throws and
 * never blocks the public endpoint that calls it.
 */
import nodemailer from "nodemailer";
import { WEBINAR_OUTBOUND_DISABLED, noteWebinarOutboundDisabled } from "./webinarOutboundDisabled";
import { pool } from "./storage";
import { emitCrmEvent } from "./routes/crm-events";
import { getOrCreateCrmContactId } from "./crmLeadCapture";

type Queryable = { query: (text: string, params?: any[]) => Promise<{ rows: any[] }> };

const STAGE_NEW = "New Lead";
const STAGE_ATTENDED = "Qualified";
const STAGE_CTA = "Proposal";

type FunnelInfo = { id: string; userId: string; slug: string; title: string };
type RegInfo = { id: string; name: string; email: string; phone: string | null };

const log = (msg: string, err: any) => console.error(`[webinar-crm] ${msg}:`, err?.message || err);

// ── Lookups ────────────────────────────────────────────────────────────────
async function loadFunnel(webinarId: string): Promise<FunnelInfo | null> {
  const { rows } = await pool.query(`SELECT id, user_id, slug, title FROM webinar_funnels WHERE id = $1`, [webinarId]);
  const r = rows[0];
  return r && r.user_id ? { id: r.id, userId: r.user_id, slug: r.slug, title: r.title } : null;
}

async function loadRegistration(webinarId: string, registrationId: string): Promise<RegInfo | null> {
  const { rows } = await pool.query(
    `SELECT id, name, email, phone FROM webinar_funnel_registrations WHERE id = $1 AND webinar_id = $2`,
    [registrationId, webinarId],
  );
  return (rows[0] as RegInfo) ?? null;
}

async function defaultPipelineId(db: Queryable): Promise<string | null> {
  const { rows } = await db.query(`SELECT id FROM crm_pipelines ORDER BY is_default DESC, position ASC LIMIT 1`);
  return rows[0]?.id ?? null;
}

async function stageByName(db: Queryable, pipelineId: string, name: string) {
  const { rows } = await db.query(
    `SELECT id, name, position FROM crm_pipeline_stages WHERE pipeline_id = $1 AND name = $2 ORDER BY position ASC LIMIT 1`,
    [pipelineId, name],
  );
  return rows[0] as { id: string; name: string; position: number } | undefined;
}

async function insertActivity(
  db: Queryable,
  a: { contactId: string; opportunityId: string | null; userId: string; type: "system" | "stage_change" | "task"; title: string; body?: string | null; metadata: Record<string, unknown> },
): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO crm_activities (contact_id, opportunity_id, user_id, type, title, body, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING id`,
    [a.contactId, a.opportunityId, a.userId, a.type, a.title, a.body ?? null, JSON.stringify(a.metadata)],
  );
  return rows[0].id;
}

/** Run fn in a transaction holding an advisory lock on key. */
async function withLock<T>(key: string, fn: (db: Queryable) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ── Opportunity: find-or-create ────────────────────────────────────────────
type EnsureResult = { opportunityId: string; pipelineId: string; stageId: string; created: boolean } | null;

/** Must run inside withLock(oppLockKey(...)). */
async function ensureOpportunityTx(db: Queryable, funnel: FunnelInfo, contactId: string, name: string): Promise<EnsureResult> {
  const { rows: existing } = await db.query(
    `SELECT id, pipeline_id, stage_id FROM crm_opportunities
      WHERE contact_id = $1 AND status = 'open' AND custom_fields->>'webinarId' = $2
      ORDER BY created_at ASC LIMIT 1`,
    [contactId, funnel.id],
  );
  if (existing[0]) {
    return { opportunityId: existing[0].id, pipelineId: existing[0].pipeline_id, stageId: existing[0].stage_id, created: false };
  }

  const pipelineId = await defaultPipelineId(db);
  if (!pipelineId) return null;
  let stage = await stageByName(db, pipelineId, STAGE_NEW);
  if (!stage) {
    const { rows } = await db.query(
      `SELECT id, name, position FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY position ASC LIMIT 1`, [pipelineId],
    );
    stage = rows[0];
  }
  if (!stage) return null;

  const { rows } = await db.query(
    `INSERT INTO crm_opportunities (pipeline_id, stage_id, contact_id, owner_id, title, status, tags, custom_fields)
     VALUES ($1, $2, $3, $4, $5, 'open', $6::jsonb, $7::jsonb) RETURNING id`,
    [
      pipelineId, stage.id, contactId, funnel.userId,
      `Webinar: ${funnel.title} — ${name}`,
      JSON.stringify(["webinar", `webinar:${funnel.slug}`]),
      JSON.stringify({ webinarId: funnel.id, webinarSlug: funnel.slug }),
    ],
  );
  return { opportunityId: rows[0].id, pipelineId, stageId: stage.id, created: true };
}

const oppLockKey = (contactId: string, webinarId: string) => `crm-webinar-opp:${contactId}:${webinarId}`;

/**
 * Forward-only stage move. Returns the stage moved to, or null when skipped
 * (target missing, not ahead of current, or current stage is won/lost).
 */
async function moveForwardTx(db: Queryable, opportunityId: string, targetName: string) {
  const { rows } = await db.query(
    `SELECT o.id, o.pipeline_id, o.stage_id, o.status, s.position, s.is_won, s.is_lost, s.name AS stage_name
       FROM crm_opportunities o JOIN crm_pipeline_stages s ON s.id = o.stage_id
      WHERE o.id = $1 FOR UPDATE OF o`,
    [opportunityId],
  );
  const cur = rows[0];
  if (!cur || cur.status !== "open" || cur.is_won || cur.is_lost) return null;
  const target = await stageByName(db, cur.pipeline_id, targetName);
  if (!target || target.position <= cur.position) return null;
  await db.query(`UPDATE crm_opportunities SET stage_id = $1, updated_at = now() WHERE id = $2`, [target.id, opportunityId]);
  return { from: { id: cur.stage_id as string, name: cur.stage_name as string }, to: target, pipelineId: cur.pipeline_id as string };
}

// ── 1. Registration ────────────────────────────────────────────────────────
export async function onWebinarRegistered(input: {
  funnel: { id: string; userId: string; slug: string; title: string };
  registrationId: string | null | undefined;
  name: string;
  email: string;
  phone?: string | null;
  reRegistration?: boolean;
}): Promise<void> {
  const funnel: FunnelInfo = { id: input.funnel.id, userId: input.funnel.userId, slug: input.funnel.slug, title: input.funnel.title };
  if (!funnel.userId) return;
  const contact = await getOrCreateCrmContactId({
    userId: funnel.userId, email: input.email, name: input.name, phone: input.phone,
    source: "webinar", tags: ["webinar-registrant", `webinar:${funnel.slug}`],
  });
  if (!contact) return;

  const res = await withLock(oppLockKey(contact.contactId, funnel.id), async (db) => {
    const opp = await ensureOpportunityTx(db, funnel, contact.contactId, input.name);
    if (!opp) return null;
    const activityId = await insertActivity(db, {
      contactId: contact.contactId, opportunityId: opp.opportunityId, userId: funnel.userId, type: "system",
      title: opp.created ? `Deal created: registered for "${funnel.title}"` : `Registered again for "${funnel.title}"`,
      body: opp.created ? `Added to the pipeline from webinar registration.` : `Existing open deal reused.`,
      metadata: { event: "webinar_registered", webinarId: funnel.id, webinarSlug: funnel.slug, registrationId: input.registrationId ?? null },
    });
    return { opp, activityId };
  });
  if (!res) return;
  if (res.opp.created) {
    emitCrmEvent({ kind: "opportunity.created", id: res.opp.opportunityId, pipelineId: res.opp.pipelineId, stageId: res.opp.stageId });
  }
  emitCrmEvent({ kind: "activity.created", id: res.activityId, contactId: contact.contactId, opportunityId: res.opp.opportunityId });
}

export function onWebinarRegisteredInBackground(input: Parameters<typeof onWebinarRegistered>[0]): void {
  onWebinarRegistered(input).catch(err => log(`registration pipeline failed for webinar ${input.funnel.id}`, err));
}

// ── Shared: resolve funnel + registration + contact + opportunity ─────────
async function resolveForRegistration(webinarId: string, registrationId: string) {
  const funnel = await loadFunnel(webinarId);
  if (!funnel) return null;
  const reg = await loadRegistration(webinarId, registrationId);
  if (!reg) return null;
  const contact = await getOrCreateCrmContactId({
    userId: funnel.userId, email: reg.email, name: reg.name, phone: reg.phone,
    source: "webinar", tags: ["webinar-registrant", `webinar:${funnel.slug}`],
  });
  if (!contact) return null;
  return { funnel, reg, contactId: contact.contactId };
}

/** True if an activity with this event already exists for this registration (call inside the lock). */
async function alreadyLogged(db: Queryable, contactId: string, event: string, webinarId: string, registrationId: string) {
  const { rows } = await db.query(
    `SELECT 1 FROM crm_activities
      WHERE contact_id = $1 AND metadata->>'event' = $2 AND metadata->>'webinarId' = $3 AND metadata->>'registrationId' = $4
      LIMIT 1`,
    [contactId, event, webinarId, registrationId],
  );
  return rows.length > 0;
}

// Per-process dedupe so heartbeats / repeat clicks don't hit the DB every time.
const seen = new Map<string, Set<string>>();
function firstTimeInProcess(kind: string, key: string): boolean {
  let set = seen.get(kind);
  if (!set) { set = new Set(); seen.set(kind, set); }
  if (set.has(key)) return false;
  if (set.size > 50_000) set.clear();
  set.add(key);
  return true;
}
function forget(kind: string, key: string) { seen.get(kind)?.delete(key); }

// ── 2. First attendance ────────────────────────────────────────────────────
export async function onWebinarAttended(webinarId: string, registrationId: string): Promise<void> {
  const ctx = await resolveForRegistration(webinarId, registrationId);
  if (!ctx) return;
  const { funnel, reg, contactId } = ctx;

  const out = await withLock(oppLockKey(contactId, funnel.id), async (db) => {
    if (await alreadyLogged(db, contactId, "webinar_attended", funnel.id, reg.id)) return null;
    const opp = await ensureOpportunityTx(db, funnel, contactId, reg.name);
    const move = opp ? await moveForwardTx(db, opp.opportunityId, STAGE_ATTENDED) : null;
    const activityId = await insertActivity(db, {
      contactId, opportunityId: opp?.opportunityId ?? null, userId: funnel.userId,
      type: move ? "stage_change" : "system",
      title: "Attended webinar",
      body: move ? `Joined "${funnel.title}" — moved ${move.from.name} → ${move.to.name}.` : `Joined "${funnel.title}".`,
      metadata: {
        event: "webinar_attended", webinarId: funnel.id, webinarSlug: funnel.slug, registrationId: reg.id,
        ...(move ? { fromStageId: move.from.id, toStageId: move.to.id } : {}),
      },
    });
    return { opp, move, activityId };
  });
  if (!out) return;
  if (out.opp?.created) emitCrmEvent({ kind: "opportunity.created", id: out.opp.opportunityId, pipelineId: out.opp.pipelineId, stageId: out.opp.stageId });
  if (out.move && out.opp) emitCrmEvent({ kind: "opportunity.updated", id: out.opp.opportunityId, pipelineId: out.move.pipelineId, stageId: out.move.to.id });
  emitCrmEvent({ kind: "activity.created", id: out.activityId, contactId, opportunityId: out.opp?.opportunityId ?? null });
}

/** Call on every heartbeat with a registration; only the first per process reaches the DB. */
export function onWebinarAttendedInBackground(webinarId: string, registrationId: string | null | undefined): void {
  if (!registrationId) return;
  const key = `${webinarId}:${registrationId}`;
  if (!firstTimeInProcess("attend", key)) return;
  onWebinarAttended(webinarId, registrationId).catch(err => {
    forget("attend", key); // allow a retry on the next heartbeat
    log(`attendance pipeline failed for webinar ${webinarId}`, err);
  });
}

// ── 3. CTA click: hot-lead alarm ───────────────────────────────────────────
export async function onWebinarCtaClicked(webinarId: string, registrationId: string): Promise<void> {
  const ctx = await resolveForRegistration(webinarId, registrationId);
  if (!ctx) return;
  const { funnel, reg, contactId } = ctx;

  const out = await withLock(oppLockKey(contactId, funnel.id), async (db) => {
    // One alarm per registrant per webinar — repeat clicks don't re-alert.
    if (await alreadyLogged(db, contactId, "webinar_cta_click", funnel.id, reg.id)) return null;
    const opp = await ensureOpportunityTx(db, funnel, contactId, reg.name);
    const move = opp ? await moveForwardTx(db, opp.opportunityId, STAGE_CTA) : null;

    const { rows: taskRows } = await db.query(
      `INSERT INTO crm_tasks (contact_id, opportunity_id, assignee_id, title, description, status, priority, due_at)
       VALUES ($1, $2, $3, $4, $5, 'open', 'urgent', now()) RETURNING id`,
      [
        contactId, opp?.opportunityId ?? null, funnel.userId,
        `Hot lead: ${reg.name} clicked the CTA on "${funnel.title}"`,
        [
          `${reg.name} (${reg.email}${reg.phone ? `, ${reg.phone}` : ""}) clicked the offer CTA during "${funnel.title}".`,
          `Follow up while they're hot.`,
          `Webinar admin: /tools/webinars`,
        ].join("\n"),
      ],
    );

    const activityId = await insertActivity(db, {
      contactId, opportunityId: opp?.opportunityId ?? null, userId: funnel.userId,
      type: move ? "stage_change" : "system",
      title: "Clicked webinar CTA",
      body: move
        ? `Clicked the offer on "${funnel.title}" — moved ${move.from.name} → ${move.to.name}. Urgent follow-up task created.`
        : `Clicked the offer on "${funnel.title}". Urgent follow-up task created.`,
      metadata: {
        event: "webinar_cta_click", webinarId: funnel.id, webinarSlug: funnel.slug, registrationId: reg.id, taskId: taskRows[0].id,
        ...(move ? { fromStageId: move.from.id, toStageId: move.to.id } : {}),
      },
    });
    return { opp, move, taskId: taskRows[0].id as string, activityId };
  });
  if (!out) return;

  if (out.opp?.created) emitCrmEvent({ kind: "opportunity.created", id: out.opp.opportunityId, pipelineId: out.opp.pipelineId, stageId: out.opp.stageId });
  if (out.move && out.opp) emitCrmEvent({ kind: "opportunity.updated", id: out.opp.opportunityId, pipelineId: out.move.pipelineId, stageId: out.move.to.id });
  emitCrmEvent({ kind: "task.created", id: out.taskId });
  emitCrmEvent({ kind: "activity.created", id: out.activityId, contactId, opportunityId: out.opp?.opportunityId ?? null });

  // Hot-lead EMAIL only is disabled. The opportunity, stage move, activity and
  // urgent CRM task above have already been written and are unaffected.
  if (WEBINAR_OUTBOUND_DISABLED) {
    noteWebinarOutboundDisabled("CRM hot-lead alert email");
    return;
  }
  await sendHotLeadEmail(funnel, reg).catch(err => log(`hot-lead email failed for webinar ${funnel.id}`, err));
}

export function onWebinarCtaClickedInBackground(webinarId: string, registrationId: string | null | undefined): void {
  if (!registrationId) return;
  const key = `${webinarId}:${registrationId}`;
  if (!firstTimeInProcess("cta", key)) return;
  onWebinarCtaClicked(webinarId, registrationId).catch(err => {
    forget("cta", key);
    log(`CTA pipeline failed for webinar ${webinarId}`, err);
  });
}

// ── Owner email alert ──────────────────────────────────────────────────────
let cachedTransport: nodemailer.Transporter | null | undefined;
function getTransport(): nodemailer.Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;
  if (process.env.PLATFORM_SMTP_HOST && process.env.PLATFORM_SMTP_USER) {
    const port = Number(process.env.PLATFORM_SMTP_PORT || 587);
    cachedTransport = nodemailer.createTransport({
      host: process.env.PLATFORM_SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.PLATFORM_SMTP_USER, pass: process.env.PLATFORM_SMTP_PASS },
    });
  } else {
    cachedTransport = null;
  }
  return cachedTransport;
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sendHotLeadEmail(funnel: FunnelInfo, reg: RegInfo): Promise<void> {
  const { rows } = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [funnel.userId]);
  const to = (rows[0]?.email || "").trim();
  if (!to) return;
  const transport = getTransport();
  if (!transport) {
    console.warn(`[webinar-crm] PLATFORM_SMTP_* not configured — skipped hot-lead email for webinar ${funnel.id}`);
    return;
  }
  const crmUrl = "https://oravini.com/crm";
  const lines = [
    `${reg.name} just clicked the offer CTA on your webinar "${funnel.title}".`,
    ``,
    `Name:  ${reg.name}`,
    `Email: ${reg.email}`,
    ...(reg.phone ? [`Phone: ${reg.phone}`] : []),
    `Webinar: ${funnel.title}`,
    ``,
    `An urgent follow-up task is waiting in your CRM: ${crmUrl}`,
  ];
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.5">
      <p><strong>${esc(reg.name)}</strong> just clicked the offer CTA on your webinar <strong>"${esc(funnel.title)}"</strong>.</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:2px 12px 2px 0;color:#666">Name</td><td>${esc(reg.name)}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;color:#666">Email</td><td><a href="mailto:${esc(reg.email)}">${esc(reg.email)}</a></td></tr>
        ${reg.phone ? `<tr><td style="padding:2px 12px 2px 0;color:#666">Phone</td><td>${esc(reg.phone)}</td></tr>` : ""}
        <tr><td style="padding:2px 12px 2px 0;color:#666">Webinar</td><td>${esc(funnel.title)}</td></tr>
      </table>
      <p><a href="${crmUrl}" style="display:inline-block;background:#d4b461;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Open CRM</a></p>
      <p style="color:#666;font-size:13px">An urgent follow-up task has been added for you.</p>
    </div>`;
  await transport.sendMail({
    from: process.env.PLATFORM_SMTP_FROM || "webinars@oravini.com",
    to,
    subject: `Hot lead: ${reg.name} clicked your webinar CTA`,
    text: lines.join("\n"),
    html,
  });
}
