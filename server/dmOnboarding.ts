/**
 * DM Automation onboarding wizard + reliability surface (server side).
 *
 * Adds three tables (created with CREATE TABLE IF NOT EXISTS — nothing is
 * altered or dropped):
 *   dm_onboarding_progress  one row per user: wizard step, installed template, test window
 *   dm_webhook_events       one row per inbound Instagram DM / comment / story mention
 *   dm_automation_runs      one row per automation that matched an event: sent / failed + Meta error
 *
 * This module never touches Meta app credentials, webhook URLs or OAuth scopes.
 * It only reads meta_tokens (via getUserMetaCredentials) and the existing automation
 * tables, and installs templates into those existing tables.
 */
import type { Express, Request, Response } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, pool } from "./storage";
import { dmTriggers, commentAutoReplies, welcomeDmConfigs, storyReplyConfigs } from "@shared/schema";
import { getUserMetaCredentials, metaGet } from "./meta";
import {
  DM_TEMPLATES, getDmTemplate, composeMessage, validateTemplateValues, evaluateTestEvent,
  explainMetaError, parseMetaErrorCode, computeDmAlerts, tokenStatus, webhookState,
  shouldShowWizard, resumeStep, DM_REQUIRED_SCOPES, WEBHOOK_QUIET_DAYS,
  type DmAutomationKind, type DmEventType, type DmOnboardingProgress, type DmTemplateValues,
} from "@shared/dmOnboarding";

const LOG = "[dm-onboarding]";

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

// ── Tables ───────────────────────────────────────────────────────────────────

let tablesReady: Promise<void> | null = null;

export function ensureDmOnboardingTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS dm_onboarding_progress (
          user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          current_step INTEGER NOT NULL DEFAULT 1,
          completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
          template_id TEXT,
          automation_kind TEXT,
          automation_id TEXT,
          test_started_at TIMESTAMP,
          test_confirmed_at TIMESTAMP,
          dismissed_at TIMESTAMP,
          completed_at TIMESTAMP,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS dm_webhook_events (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          account_id TEXT,
          external_id TEXT,
          event_type TEXT NOT NULL,
          sender_id TEXT,
          sender_username TEXT,
          text_preview TEXT,
          media_id TEXT,
          received_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS dm_webhook_events_user_time_idx ON dm_webhook_events(user_id, received_at DESC)`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS dm_webhook_events_external_idx ON dm_webhook_events(user_id, external_id) WHERE external_id IS NOT NULL`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS dm_automation_runs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          event_id VARCHAR,
          automation_kind TEXT NOT NULL,
          automation_id TEXT,
          automation_name TEXT,
          trigger_event TEXT,
          trigger_text TEXT,
          sender_id TEXT,
          action TEXT,
          status TEXT NOT NULL,
          error_code INTEGER,
          error_subcode INTEGER,
          error_message TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`);
      await pool.query(`CREATE INDEX IF NOT EXISTS dm_automation_runs_user_time_idx ON dm_automation_runs(user_id, created_at DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS dm_automation_runs_event_idx ON dm_automation_runs(event_id)`);
      // Existing automation tables the templates install into. They are defined in
      // shared/schema.ts; create them only if a database never had them pushed.
      await pool.query(`
        CREATE TABLE IF NOT EXISTS comment_auto_replies (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          keyword TEXT,
          post_url TEXT,
          reply_message TEXT NOT NULL,
          also_dm BOOLEAN NOT NULL DEFAULT FALSE,
          dm_message TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          trigger_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS story_reply_configs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reply_message TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
        )`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS welcome_dm_configs (
          user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          is_active BOOLEAN NOT NULL DEFAULT FALSE,
          message TEXT NOT NULL DEFAULT '',
          delay_minutes INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMP DEFAULT NOW()
        )`);
    })().catch(e => {
      tablesReady = null; // retry on next call
      throw e;
    });
  }
  return tablesReady;
}

// ── Recorders (called from metaWebhookHandler; never throw) ──────────────────

export interface RecordEventInput {
  userId: string;
  accountId: string;
  externalId?: string | null;
  eventType: DmEventType;
  senderId?: string | null;
  senderUsername?: string | null;
  text?: string | null;
  mediaId?: string | null;
}

/** Returns the new event id, or null when it was a duplicate delivery / logging failed. */
export async function recordWebhookEvent(e: RecordEventInput): Promise<string | null> {
  try {
    await ensureDmOnboardingTables();
    const r = await pool.query(
      `INSERT INTO dm_webhook_events (user_id, account_id, external_id, event_type, sender_id, sender_username, text_preview, media_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, external_id) WHERE external_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [e.userId, e.accountId, e.externalId ?? null, e.eventType, e.senderId ?? null, e.senderUsername ?? null,
        e.text ? e.text.slice(0, 500) : null, e.mediaId ?? null],
    );
    return r.rows[0]?.id ?? null;
  } catch (err: any) {
    console.warn(`${LOG} could not record webhook event: ${err?.message ?? err}`);
    return null;
  }
}

export interface RecordRunInput {
  userId: string;
  eventId: string | null;
  automationKind: DmAutomationKind;
  automationId?: string | null;
  automationName?: string | null;
  triggerEvent: DmEventType;
  triggerText?: string | null;
  senderId?: string | null;
  action: string;
  status: "sent" | "failed" | "partial";
  errorMessage?: string | null;
}

export async function recordAutomationRun(r: RecordRunInput): Promise<void> {
  try {
    await ensureDmOnboardingTables();
    const { code, subcode } = parseMetaErrorCode(r.errorMessage);
    await pool.query(
      `INSERT INTO dm_automation_runs (user_id, event_id, automation_kind, automation_id, automation_name, trigger_event, trigger_text, sender_id, action, status, error_code, error_subcode, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [r.userId, r.eventId, r.automationKind, r.automationId ?? null, r.automationName ?? null, r.triggerEvent,
        r.triggerText ? r.triggerText.slice(0, 500) : null, r.senderId ?? null, r.action, r.status,
        code, subcode, r.errorMessage ? r.errorMessage.slice(0, 1000) : null],
    );
  } catch (err: any) {
    console.warn(`${LOG} could not record automation run: ${err?.message ?? err}`);
  }
}

/** True when this sender has messaged the user before (excluding the given event). */
export async function hasPriorDmFromSender(userId: string, senderId: string, excludeEventId: string | null): Promise<boolean> {
  try {
    await ensureDmOnboardingTables();
    const r = await pool.query(
      `SELECT 1 FROM dm_webhook_events WHERE user_id = $1 AND sender_id = $2 AND event_type = 'dm' AND ($3::varchar IS NULL OR id <> $3) LIMIT 1`,
      [userId, senderId, excludeEventId],
    );
    return r.rows.length > 0;
  } catch {
    // If we can't tell, treat as a returning sender so we never spam welcomes.
    return true;
  }
}

// ── Progress helpers ─────────────────────────────────────────────────────────

function toIso(d: any): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function rowToProgress(row: any): DmOnboardingProgress {
  return {
    currentStep: row?.current_step ?? 1,
    completedSteps: Array.isArray(row?.completed_steps) ? row.completed_steps : [],
    templateId: row?.template_id ?? null,
    automationKind: row?.automation_kind ?? null,
    automationId: row?.automation_id ?? null,
    testStartedAt: toIso(row?.test_started_at),
    testConfirmedAt: toIso(row?.test_confirmed_at),
    dismissedAt: toIso(row?.dismissed_at),
    completedAt: toIso(row?.completed_at),
  };
}

async function getProgressRow(userId: string): Promise<any | null> {
  await ensureDmOnboardingTables();
  const r = await pool.query(`SELECT * FROM dm_onboarding_progress WHERE user_id = $1`, [userId]);
  return r.rows[0] ?? null;
}

async function upsertProgress(userId: string, patch: Record<string, any>): Promise<any> {
  await ensureDmOnboardingTables();
  const cols = Object.keys(patch);
  const insertCols = ["user_id", ...cols];
  const values = [userId, ...cols.map(c => (c === "completed_steps" || c === "data") ? JSON.stringify(patch[c]) : patch[c])];
  const placeholders = insertCols.map((_, i) => `$${i + 1}`);
  const updates = cols.map(c => `${c} = EXCLUDED.${c}`).concat(["updated_at = NOW()"]);
  const r = await pool.query(
    `INSERT INTO dm_onboarding_progress (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")})
     ON CONFLICT (user_id) DO UPDATE SET ${updates.join(", ")}
     RETURNING *`,
    values,
  );
  return r.rows[0];
}

function addCompleted(row: any, step: number): number[] {
  const cur: number[] = Array.isArray(row?.completed_steps) ? row.completed_steps : [];
  return cur.includes(step) ? cur : [...cur, step].sort();
}

// ── Automation summary across the existing tables ────────────────────────────

interface AutomationSummary {
  kind: DmAutomationKind;
  id: string;
  name: string;
  keyword: string | null;
  matchType: string | null;
  postUrl: string | null;
  message: string;
  publicReply: string | null;
  isActive: boolean;
  triggerCount: number | null;
}

async function loadAutomation(userId: string, kind: DmAutomationKind, id: string): Promise<AutomationSummary | null> {
  switch (kind) {
    case "dm_trigger": {
      const [t] = await db.select().from(dmTriggers).where(and(eq(dmTriggers.id, id), eq(dmTriggers.userId, userId)));
      return t ? { kind, id: t.id, name: t.name, keyword: t.keyword, matchType: t.matchType, postUrl: null, message: t.replyMessage, publicReply: null, isActive: t.isActive, triggerCount: t.triggerCount } : null;
    }
    case "comment_reply": {
      const [c] = await db.select().from(commentAutoReplies).where(and(eq(commentAutoReplies.id, id), eq(commentAutoReplies.userId, userId)));
      return c ? { kind, id: c.id, name: c.name, keyword: c.keyword, matchType: "contains", postUrl: c.postUrl, message: c.dmMessage ?? "", publicReply: c.replyMessage, isActive: c.isActive, triggerCount: c.triggerCount } : null;
    }
    case "welcome_dm": {
      const [w] = await db.select().from(welcomeDmConfigs).where(eq(welcomeDmConfigs.userId, userId));
      return w ? { kind, id: userId, name: "Welcome new DMs", keyword: null, matchType: null, postUrl: null, message: w.message, publicReply: null, isActive: w.isActive, triggerCount: null } : null;
    }
    case "story_reply": {
      const [s] = await db.select().from(storyReplyConfigs).where(and(eq(storyReplyConfigs.id, id), eq(storyReplyConfigs.userId, userId)));
      return s ? { kind, id: s.id, name: "Story mention thank-you", keyword: null, matchType: null, postUrl: null, message: s.replyMessage, publicReply: null, isActive: s.isActive, triggerCount: null } : null;
    }
  }
}

async function countActiveAutomations(userId: string): Promise<{ total: number; byKind: Record<DmAutomationKind, number> }> {
  const byKind: Record<DmAutomationKind, number> = { dm_trigger: 0, comment_reply: 0, welcome_dm: 0, story_reply: 0 };
  const q = async (sqlText: string) => {
    try { const r = await pool.query(sqlText, [userId]); return Number(r.rows[0]?.n ?? 0); } catch { return 0; }
  };
  byKind.dm_trigger = await q(`SELECT COUNT(*)::int AS n FROM dm_triggers WHERE user_id = $1 AND is_active = TRUE`);
  byKind.comment_reply = await q(`SELECT COUNT(*)::int AS n FROM comment_auto_replies WHERE user_id = $1 AND is_active = TRUE`);
  byKind.welcome_dm = await q(`SELECT COUNT(*)::int AS n FROM welcome_dm_configs WHERE user_id = $1 AND is_active = TRUE AND message <> ''`);
  byKind.story_reply = await q(`SELECT COUNT(*)::int AS n FROM story_reply_configs WHERE user_id = $1 AND is_active = TRUE`);
  return { total: byKind.dm_trigger + byKind.comment_reply + byKind.welcome_dm + byKind.story_reply, byKind };
}

// Connection snapshot used by the wizard and health endpoints.
async function connectionSnapshot(userId: string) {
  const creds = await getUserMetaCredentials(userId).catch(() => null);
  const row = await pool.query(`SELECT created_at, updated_at FROM meta_tokens WHERE user_id = $1`, [userId]).then(r => r.rows[0]).catch(() => null);
  return {
    connected: !!creds,
    creds,
    connectedAt: row?.updated_at ? new Date(row.updated_at) : row?.created_at ? new Date(row.created_at) : null,
  };
}

// Live token check: one cheap Graph call, cached per user for 5 minutes.
const liveCheckCache = new Map<string, { at: number; ok: boolean; error: string | null }>();
async function liveTokenCheck(userId: string, igAccountId: string | null, force: boolean): Promise<{ ok: boolean | null; error: string | null }> {
  if (!igAccountId) return { ok: null, error: null };
  const cached = liveCheckCache.get(userId);
  if (!force && cached && Date.now() - cached.at < 5 * 60 * 1000) return { ok: cached.ok, error: cached.error };
  let ok = false; let error: string | null = null;
  try {
    await metaGet(`/${igAccountId}`, { fields: "id" }, userId);
    ok = true;
  } catch (e: any) {
    error = e?.message ?? String(e);
    // Only a token/permission error means the connection is bad; network blips don't.
    const { code } = parseMetaErrorCode(error);
    if (code == null || ![190, 102, 463, 467, 10, 200].includes(code)) {
      return { ok: null, error };
    }
  }
  liveCheckCache.set(userId, { at: Date.now(), ok, error });
  return { ok, error };
}

// ── Template install ─────────────────────────────────────────────────────────

async function installTemplate(userId: string, templateId: string, values: DmTemplateValues, replaceExisting: boolean) {
  const t = getDmTemplate(templateId);
  if (!t) throw Object.assign(new Error("Unknown template"), { status: 400 });
  const problems = validateTemplateValues(t, values);
  if (problems.length) throw Object.assign(new Error(problems.join(". ")), { status: 400, problems });
  const message = composeMessage(values.message, values.link);
  const keyword = (values.keyword ?? "").trim();

  // Installed paused: the wizard's "Go live" step turns it on.
  switch (t.kind) {
    case "dm_trigger": {
      const [row] = await db.insert(dmTriggers).values({
        userId, name: `${t.name}: ${keyword}`, keyword, matchType: "contains", replyMessage: message, isActive: false,
      }).returning();
      return { kind: t.kind, id: row.id };
    }
    case "comment_reply": {
      const [row] = await db.insert(commentAutoReplies).values({
        userId, name: `${t.name}: ${keyword}`, keyword, postUrl: (values.postUrl ?? "").trim() || null,
        replyMessage: (values.publicReply ?? "").trim(), alsoDm: true, dmMessage: message, isActive: false,
      }).returning();
      return { kind: t.kind, id: row.id };
    }
    case "welcome_dm": {
      const [existing] = await db.select().from(welcomeDmConfigs).where(eq(welcomeDmConfigs.userId, userId));
      if (existing && existing.message.trim() && existing.message.trim() !== message && !replaceExisting) {
        throw Object.assign(new Error("You already have a welcome message. Replace it?"), { status: 409, existing: { message: existing.message, isActive: existing.isActive } });
      }
      if (existing) {
        // Keep the previous message in the onboarding row so nothing is lost.
        if (existing.message.trim()) {
          const prog = await getProgressRow(userId);
          const data = { ...(prog?.data ?? {}), previousWelcomeMessage: existing.message, previousWelcomeActive: existing.isActive };
          await upsertProgress(userId, { data });
        }
        // Keep is_active as it was: never silently pause a welcome DM that is already live.
        await db.update(welcomeDmConfigs).set({ message, delayMinutes: 0, updatedAt: new Date() }).where(eq(welcomeDmConfigs.userId, userId));
      } else {
        await db.insert(welcomeDmConfigs).values({ userId, message, delayMinutes: 0, isActive: false });
      }
      return { kind: t.kind, id: userId };
    }
    case "story_reply": {
      const [row] = await db.insert(storyReplyConfigs).values({ userId, replyMessage: message, isActive: false }).returning();
      return { kind: t.kind, id: row.id };
    }
  }
}

async function updateInstalled(userId: string, kind: DmAutomationKind, id: string, values: DmTemplateValues & { isActive?: boolean }, templateId: string | null) {
  const t = getDmTemplate(templateId);
  if (t) {
    const problems = validateTemplateValues(t, values);
    if (problems.length) throw Object.assign(new Error(problems.join(". ")), { status: 400, problems });
  }
  const message = composeMessage(values.message, values.link);
  const keyword = (values.keyword ?? "").trim();
  const active = typeof values.isActive === "boolean" ? { isActive: values.isActive } : {};
  switch (kind) {
    case "dm_trigger":
      await db.update(dmTriggers).set({ keyword, replyMessage: message, ...(t ? { name: `${t.name}: ${keyword}` } : {}), ...active })
        .where(and(eq(dmTriggers.id, id), eq(dmTriggers.userId, userId)));
      break;
    case "comment_reply":
      await db.update(commentAutoReplies).set({
        keyword, dmMessage: message, replyMessage: (values.publicReply ?? "").trim(), alsoDm: true,
        postUrl: (values.postUrl ?? "").trim() || null, ...(t ? { name: `${t.name}: ${keyword}` } : {}), ...active,
      }).where(and(eq(commentAutoReplies.id, id), eq(commentAutoReplies.userId, userId)));
      break;
    case "welcome_dm":
      await db.update(welcomeDmConfigs).set({ message, ...active, updatedAt: new Date() }).where(eq(welcomeDmConfigs.userId, userId));
      break;
    case "story_reply":
      await db.update(storyReplyConfigs).set({ replyMessage: message, ...active })
        .where(and(eq(storyReplyConfigs.id, id), eq(storyReplyConfigs.userId, userId)));
      break;
  }
}

async function setActive(userId: string, kind: DmAutomationKind, id: string, isActive: boolean) {
  switch (kind) {
    case "dm_trigger": await db.update(dmTriggers).set({ isActive }).where(and(eq(dmTriggers.id, id), eq(dmTriggers.userId, userId))); break;
    case "comment_reply": await db.update(commentAutoReplies).set({ isActive }).where(and(eq(commentAutoReplies.id, id), eq(commentAutoReplies.userId, userId))); break;
    case "welcome_dm": await db.update(welcomeDmConfigs).set({ isActive, updatedAt: new Date() }).where(eq(welcomeDmConfigs.userId, userId)); break;
    case "story_reply": await db.update(storyReplyConfigs).set({ isActive }).where(and(eq(storyReplyConfigs.id, id), eq(storyReplyConfigs.userId, userId))); break;
  }
}

// ── Story mention / welcome lookups used by the webhook handler ──────────────

export async function getActiveStoryReply(userId: string) {
  try {
    await ensureDmOnboardingTables();
    const [row] = await db.select().from(storyReplyConfigs)
      .where(and(eq(storyReplyConfigs.userId, userId), eq(storyReplyConfigs.isActive, true)))
      .orderBy(asc(storyReplyConfigs.createdAt)).limit(1);
    return row ?? null;
  } catch { return null; }
}

export async function getActiveWelcomeDm(userId: string) {
  try {
    await ensureDmOnboardingTables();
    const [row] = await db.select().from(welcomeDmConfigs).where(eq(welcomeDmConfigs.userId, userId));
    return row && row.isActive && row.message.trim() ? row : null;
  } catch { return null; }
}

// ── Routes ───────────────────────────────────────────────────────────────────

function fail(res: Response, err: any) {
  const status = err?.status ?? 500;
  if (status >= 500) console.error(`${LOG} ${err?.message ?? err}`);
  return res.status(status).json({ message: err?.message ?? "Something went wrong", problems: err?.problems, existing: err?.existing });
}

export function registerDmOnboardingRoutes(app: Express) {
  ensureDmOnboardingTables().catch(e => console.error(`${LOG} table setup failed:`, e?.message ?? e));

  // Wizard state: progress + what we can derive (connection, live automations).
  app.get("/api/dm/onboarding", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const [row, conn, active] = await Promise.all([getProgressRow(userId), connectionSnapshot(userId), countActiveAutomations(userId)]);
      const progress = rowToProgress(row);
      const automation = progress.automationKind && progress.automationId
        ? await loadAutomation(userId, progress.automationKind, progress.automationId).catch(() => null)
        : null;
      res.json({
        progress,
        connection: {
          connected: conn.connected,
          igUsername: conn.creds?.igUsername ?? null,
          igAccountId: conn.creds?.igAccountId ?? null,
          fbPageName: conn.creds?.fbPageName ?? null,
          expiresAt: toIso(conn.creds?.expiresAt),
        },
        activeAutomations: active.total,
        automation,
        showWizard: shouldShowWizard(progress, conn.connected && !!conn.creds?.igAccountId, active.total),
        resumeStep: resumeStep(progress, conn.connected && !!conn.creds?.igAccountId),
        templates: DM_TEMPLATES,
      });
    } catch (err) { fail(res, err); }
  });

  // Save step / skip / resume.
  app.put("/api/dm/onboarding", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { currentStep, completeStep, dismissed, reopen } = req.body ?? {};
      const row = await getProgressRow(userId);
      const patch: Record<string, any> = {};
      if (Number.isInteger(currentStep) && currentStep >= 1 && currentStep <= 4) patch.current_step = currentStep;
      if (Number.isInteger(completeStep) && completeStep >= 1 && completeStep <= 4) patch.completed_steps = addCompleted(row, completeStep);
      if (dismissed === true) patch.dismissed_at = new Date();
      if (reopen === true) {
        patch.dismissed_at = null;
        // A finished wizard reopens on "Pick a template" so another automation can be added.
        if (row?.completed_at) { patch.completed_at = null; patch.current_step = 2; patch.completed_steps = [1]; patch.test_started_at = null; patch.test_confirmed_at = null; }
      }
      const updated = await upsertProgress(userId, patch);
      res.json({ progress: rowToProgress(updated) });
    } catch (err) { fail(res, err); }
  });

  app.get("/api/dm/onboarding/templates", requireAuth, (_req: Request, res: Response) => {
    res.json(DM_TEMPLATES);
  });

  // One-click install: creates the automation (paused) in the existing table.
  app.post("/api/dm/onboarding/install", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { templateId, values, replaceExisting } = req.body ?? {};
      const row = await getProgressRow(userId);
      const prev = rowToProgress(row);
      // Re-installing the same template while its automation is still paused (not live yet)
      // edits that automation instead of creating a duplicate.
      if (prev.templateId === templateId && prev.automationKind && prev.automationId && !prev.completedAt) {
        const existing = await loadAutomation(userId, prev.automationKind, prev.automationId).catch(() => null);
        if (existing && !existing.isActive) {
          await updateInstalled(userId, prev.automationKind, prev.automationId, values ?? {}, templateId);
          const updated = await upsertProgress(userId, { current_step: 3, completed_steps: addCompleted(row, 2) });
          return res.json({ progress: rowToProgress(updated), automation: await loadAutomation(userId, prev.automationKind, prev.automationId) });
        }
      }
      const installed = await installTemplate(userId, String(templateId ?? ""), values ?? {}, replaceExisting === true);
      const updated = await upsertProgress(userId, {
        template_id: templateId, automation_kind: installed.kind, automation_id: installed.id,
        current_step: 3, completed_steps: addCompleted(row, 2), test_started_at: null, test_confirmed_at: null,
      });
      res.json({ progress: rowToProgress(updated), automation: await loadAutomation(userId, installed.kind, installed.id) });
    } catch (err) { fail(res, err); }
  });

  // Edit keyword / message of the automation the wizard installed.
  app.patch("/api/dm/onboarding/automation", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const p = rowToProgress(await getProgressRow(userId));
      if (!p.automationKind || !p.automationId) return res.status(400).json({ message: "No automation installed yet — pick a template first." });
      await updateInstalled(userId, p.automationKind, p.automationId, req.body?.values ?? {}, p.templateId);
      res.json({ automation: await loadAutomation(userId, p.automationKind, p.automationId) });
    } catch (err) { fail(res, err); }
  });

  // Start (or restart) the live test window.
  app.post("/api/dm/onboarding/test/start", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const updated = await upsertProgress(userId, { test_started_at: new Date(), test_confirmed_at: null, current_step: 3 });
      res.json({ progress: rowToProgress(updated) });
    } catch (err) { fail(res, err); }
  });

  // Events received since the test started, each evaluated against the installed automation.
  app.get("/api/dm/onboarding/test/events", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const row = await getProgressRow(userId);
      const p = rowToProgress(row);
      if (!p.testStartedAt) return res.json({ listening: false, events: [], received: false, matched: false });
      const r = await pool.query(
        `SELECT id, event_type, sender_id, sender_username, text_preview, media_id, received_at
         FROM dm_webhook_events WHERE user_id = $1 AND received_at >= $2 ORDER BY received_at DESC LIMIT 20`,
        [userId, new Date(new Date(p.testStartedAt).getTime() - 5000)],
      );
      const automation = p.automationKind && p.automationId ? await loadAutomation(userId, p.automationKind, p.automationId).catch(() => null) : null;
      const events = r.rows.map((e: any) => {
        const ev = automation
          ? evaluateTestEvent({ kind: automation.kind, keyword: automation.keyword, matchType: automation.matchType }, { eventType: e.event_type, text: e.text_preview })
          : { wouldMatch: false, reason: "No automation installed yet." };
        const postNote = automation?.kind === "comment_reply" && automation.postUrl && ev.wouldMatch
          ? " (it will also check that the comment is on your chosen post)" : "";
        return {
          id: e.id, eventType: e.event_type, senderId: e.sender_id, senderUsername: e.sender_username,
          text: e.text_preview, receivedAt: toIso(e.received_at), wouldMatch: ev.wouldMatch, reason: ev.reason + postNote,
        };
      });
      const matched = events.some(e => e.wouldMatch);
      if (events.length && !p.testConfirmedAt) {
        await upsertProgress(userId, { test_confirmed_at: new Date(), completed_steps: matched ? addCompleted(row, 3) : (row?.completed_steps ?? []) });
      } else if (matched) {
        await upsertProgress(userId, { completed_steps: addCompleted(row, 3) });
      }
      res.json({ listening: true, testStartedAt: p.testStartedAt, events, received: events.length > 0, matched });
    } catch (err) { fail(res, err); }
  });

  // Activate the installed automation and finish the wizard.
  app.post("/api/dm/onboarding/go-live", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const row = await getProgressRow(userId);
      const p = rowToProgress(row);
      if (!p.automationKind || !p.automationId) return res.status(400).json({ message: "Pick a template first." });
      const conn = await connectionSnapshot(userId);
      if (!conn.connected || !conn.creds?.igAccountId) return res.status(400).json({ message: "Connect Instagram before going live." });
      await setActive(userId, p.automationKind, p.automationId, true);
      const updated = await upsertProgress(userId, { current_step: 4, completed_steps: addCompleted({ completed_steps: addCompleted(row, 4) }, 1), completed_at: new Date() });
      res.json({ progress: rowToProgress(updated), automation: await loadAutomation(userId, p.automationKind, p.automationId) });
    } catch (err) { fail(res, err); }
  });

  // ── Reliability surface ────────────────────────────────────────────────────

  app.get("/api/dm/health", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await ensureDmOnboardingTables();
      const now = new Date();
      const [conn, active] = await Promise.all([connectionSnapshot(userId), countActiveAutomations(userId)]);
      const creds = conn.creds;
      const live = creds ? await liveTokenCheck(userId, creds.igAccountId, req.query.refresh === "1") : { ok: null, error: null };

      const evRow = (await pool.query(
        `SELECT MAX(received_at) AS last_at,
                COUNT(*) FILTER (WHERE received_at > NOW() - INTERVAL '24 hours')::int AS n24,
                COUNT(*) FILTER (WHERE received_at > NOW() - INTERVAL '7 days')::int AS n7
         FROM dm_webhook_events WHERE user_id = $1`, [userId])).rows[0] ?? {};
      const lastByType = (await pool.query(
        `SELECT event_type, MAX(received_at) AS last_at FROM dm_webhook_events WHERE user_id = $1 GROUP BY event_type`, [userId])).rows;
      const runRow = (await pool.query(
        `SELECT COUNT(*) FILTER (WHERE status IN ('sent','partial'))::int AS sent,
                COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
         FROM dm_automation_runs WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [userId])).rows[0] ?? {};
      const lastFail = (await pool.query(
        `SELECT error_message, error_code, created_at FROM dm_automation_runs WHERE user_id = $1 AND status IN ('failed','partial') ORDER BY created_at DESC LIMIT 1`, [userId])).rows[0];

      // Page tokens never echo their scopes back; a user-token-only connection means no page was picked.
      const hasPageToken = !!creds?.fbPageId;
      const scopes = creds?.scope ? creds.scope.split(",").map(s => s.trim()).filter(Boolean) : null;
      const facts = {
        now,
        connected: !!creds,
        hasIgAccount: !!creds?.igAccountId,
        hasPageToken,
        tokenExpiresAt: creds?.expiresAt ?? null,
        tokenLiveValid: live.ok,
        scopes,
        activeAutomations: active.total,
        lastEventAt: evRow.last_at ? new Date(evRow.last_at) : null,
        connectedAt: conn.connectedAt,
        sent24h: Number(runRow.sent ?? 0),
        failed24h: Number(runRow.failed ?? 0),
        lastFailure: lastFail ? { message: lastFail.error_message, code: lastFail.error_code, at: new Date(lastFail.created_at) } : null,
      };
      const alerts = computeDmAlerts(facts);
      res.json({
        checkedAt: now.toISOString(),
        connection: {
          connected: !!creds,
          igUsername: creds?.igUsername ?? null,
          igAccountId: creds?.igAccountId ?? null,
          fbPageName: creds?.fbPageName ?? null,
          fbPageId: creds?.fbPageId ?? null,
          connectedAt: toIso(conn.connectedAt),
          tokenExpiresAt: toIso(creds?.expiresAt),
          tokenStatus: tokenStatus(facts),
          liveCheck: live.ok,
          liveCheckError: live.error,
          scopes,
          missingScopes: scopes ? DM_REQUIRED_SCOPES.filter(s => !scopes.includes(s)) : [],
        },
        webhook: {
          state: webhookState(facts),
          quietThresholdDays: WEBHOOK_QUIET_DAYS,
          lastEventAt: toIso(evRow.last_at),
          lastByType: Object.fromEntries(lastByType.map((r: any) => [r.event_type, toIso(r.last_at)])),
          events24h: Number(evRow.n24 ?? 0),
          events7d: Number(evRow.n7 ?? 0),
        },
        automations: active,
        runs: {
          sent24h: facts.sent24h,
          failed24h: facts.failed24h,
          lastFailure: lastFail ? { ...explainMetaError(lastFail.error_message, lastFail.error_code), message: lastFail.error_message, at: toIso(lastFail.created_at) } : null,
        },
        alerts,
      });
    } catch (err) { fail(res, err); }
  });

  // Recent inbound events with what each automation did about them.
  app.get("/api/dm/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await ensureDmOnboardingTables();
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 200);
      const events = (await pool.query(
        `SELECT id, event_type, sender_id, sender_username, text_preview, media_id, received_at
         FROM dm_webhook_events WHERE user_id = $1 ORDER BY received_at DESC LIMIT $2`, [userId, limit])).rows;
      const ids = events.map((e: any) => e.id);
      const runs = ids.length ? (await pool.query(
        `SELECT * FROM dm_automation_runs WHERE user_id = $1 AND event_id = ANY($2::varchar[]) ORDER BY created_at ASC`, [userId, ids])).rows : [];
      const byEvent = new Map<string, any[]>();
      for (const r of runs) {
        const list = byEvent.get(r.event_id) ?? [];
        list.push(r);
        byEvent.set(r.event_id, list);
      }
      res.json({
        entries: events.map((e: any) => ({
          id: e.id,
          eventType: e.event_type,
          senderId: e.sender_id,
          senderUsername: e.sender_username,
          text: e.text_preview,
          receivedAt: toIso(e.received_at),
          runs: (byEvent.get(e.id) ?? []).map((r: any) => ({
            id: r.id,
            automationKind: r.automation_kind,
            automationName: r.automation_name,
            action: r.action,
            status: r.status,
            errorCode: r.error_code,
            errorMessage: r.error_message,
            explanation: r.status === "sent" ? null : explainMetaError(r.error_message, r.error_code, r.error_subcode),
            at: toIso(r.created_at),
          })),
        })),
      });
    } catch (err) { fail(res, err); }
  });
}
