import type { Express, Request, Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, pool } from "../storage";
import {
  emSequences, emSteps, emContacts, emSends, emWorkflows, emSmtpConfigs,
} from "@shared/schema";
import { randomUUID } from "crypto";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(req: Request): string {
  return (req as any).user?.id;
}

function requirePlan(req: Request, res: Response): boolean {
  const plan = (req as any).user?.plan;
  if (!["growth", "pro", "elite"].includes(plan)) {
    res.status(403).json({ ok: false, message: "Email Marketing requires Growth plan or higher" });
    return false;
  }
  return true;
}

async function skillsPrefix(userId: string, base: string): Promise<string> {
  try {
    const { buildSkillsPrompt } = await import("../skillsEngine");
    const block = await buildSkillsPrompt(userId, { category: "email" });
    return block ? `${block}\n\n${base}` : base;
  } catch { return base; }
}

async function callAI(messages: { role: string; content: string }[], json = false): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("No AI key configured");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const d = await r.json() as any;
  return d.choices?.[0]?.message?.content || "";
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let __booted = false;
let __booting: Promise<void> | null = null;

export async function bootstrapEmailMarketing() {
  if (__booted) return;
  if (!__booting) __booting = doBootstrap().then(
    () => { __booted = true; },
    (e) => { __booting = null; console.error("[email-marketing] bootstrap failed:", e); throw e; },
  );
  await __booting;
}

async function doBootstrap() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_sequences (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'nurture',
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      from_name TEXT,
      from_email TEXT,
      reply_to TEXT,
      tags TEXT[],
      ai_generated BOOLEAN NOT NULL DEFAULT false,
      total_enrolled INTEGER NOT NULL DEFAULT 0,
      total_sent INTEGER NOT NULL DEFAULT 0,
      total_opened INTEGER NOT NULL DEFAULT 0,
      total_clicked INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_steps (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      sequence_id TEXT NOT NULL REFERENCES em_sequences(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL DEFAULT 1,
      delay_days INTEGER NOT NULL DEFAULT 0,
      delay_hours INTEGER NOT NULL DEFAULT 0,
      subject TEXT NOT NULL,
      preview_text TEXT,
      body_html TEXT NOT NULL,
      body_text TEXT,
      send_time_optimized BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_contacts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      tags TEXT[],
      custom_fields JSONB,
      subscribed BOOLEAN NOT NULL DEFAULT true,
      unsubscribed_at TIMESTAMPTZ,
      source TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_sends (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      step_id TEXT NOT NULL REFERENCES em_steps(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES em_contacts(id) ON DELETE CASCADE,
      sequence_id TEXT NOT NULL REFERENCES em_sequences(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      tracking_id TEXT UNIQUE,
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ,
      bounced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_workflows (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      nodes JSONB NOT NULL DEFAULT '[]',
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      trigger_value TEXT,
      enrolled_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_smtp_configs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      provider TEXT NOT NULL DEFAULT 'custom',
      host TEXT,
      port INTEGER DEFAULT 587,
      secure BOOLEAN DEFAULT false,
      username TEXT,
      password TEXT,
      from_name TEXT,
      from_email TEXT,
      reply_to TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT false,
      daily_send_limit INTEGER NOT NULL DEFAULT 500,
      warming_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_oauth_tokens (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'gmail',
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      email TEXT,
      display_name TEXT,
      warmup_start_date TIMESTAMPTZ DEFAULT NOW(),
      today_sent INTEGER NOT NULL DEFAULT 0,
      last_send_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, provider)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_enrollments (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sequence_id TEXT NOT NULL REFERENCES em_sequences(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES em_contacts(id) ON DELETE CASCADE,
      current_step INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      next_send_at TIMESTAMPTZ DEFAULT NOW(),
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      UNIQUE(sequence_id, contact_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_chat_history (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE em_contacts ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT;`);
  await pool.query(`UPDATE em_contacts SET unsubscribe_token = gen_random_uuid()::text WHERE unsubscribe_token IS NULL;`);
  await pool.query(`ALTER TABLE em_smtp_configs ADD COLUMN IF NOT EXISTS warmup_start_date TIMESTAMPTZ DEFAULT NOW();`);
  await pool.query(`ALTER TABLE em_smtp_configs ADD COLUMN IF NOT EXISTS today_sent INTEGER NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE em_smtp_configs ADD COLUMN IF NOT EXISTS last_send_date DATE;`);
  await pool.query(`ALTER TABLE em_sequences ADD COLUMN IF NOT EXISTS total_enrolled INTEGER NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE em_contacts ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'unknown';`);
  await pool.query(`ALTER TABLE em_contacts ADD COLUMN IF NOT EXISTS validation_checked_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE em_sends ADD COLUMN IF NOT EXISTS bounce_type TEXT;`);
  await pool.query(`ALTER TABLE em_sends ADD COLUMN IF NOT EXISTS complaint BOOLEAN DEFAULT false;`);

  // Suppression list — global per user, email blocked from all sends
  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_suppressions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT 'manual',
      source TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, email)
    );
  `);

  // Broadcast campaigns — one-time blasts to a segment
  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_broadcasts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      preview_text TEXT,
      body_html TEXT NOT NULL,
      from_name TEXT,
      from_email TEXT,
      reply_to TEXT,
      segment_type TEXT NOT NULL DEFAULT 'all',
      segment_tags TEXT[],
      status TEXT NOT NULL DEFAULT 'draft',
      recipient_count INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      opened_count INTEGER NOT NULL DEFAULT 0,
      clicked_count INTEGER NOT NULL DEFAULT 0,
      scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Per-contact send record for broadcasts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS em_broadcast_sends (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      broadcast_id TEXT NOT NULL REFERENCES em_broadcasts(id) ON DELETE CASCADE,
      contact_id TEXT NOT NULL REFERENCES em_contacts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tracking_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ,
      bounced_at TIMESTAMPTZ,
      UNIQUE(broadcast_id, contact_id)
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS em_sequences_user_idx ON em_sequences(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_steps_seq_idx ON em_steps(sequence_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_contacts_user_idx ON em_contacts(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_sends_seq_idx ON em_sends(sequence_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_workflows_user_idx ON em_workflows(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_enrollments_due_idx ON em_enrollments(next_send_at) WHERE status = 'active';`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_oauth_user_idx ON em_oauth_tokens(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_suppressions_user_email_idx ON em_suppressions(user_id, email);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_broadcasts_user_idx ON em_broadcasts(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_broadcast_sends_status_idx ON em_broadcast_sends(status) WHERE status = 'pending';`);
}

// ── Route Registration ────────────────────────────────────────────────────────

export function registerEmailMarketingRoutes(app: Express, requireAuth: any) {

  // Bootstrap middleware on first hit
  app.use("/api/em", requireAuth, async (req: Request, res: Response, next: any) => {
    try { await bootstrapEmailMarketing(); next(); }
    catch (e: any) { res.status(500).json({ ok: false, message: "Email Marketing init failed" }); }
  });

  // ── SEQUENCES ──────────────────────────────────────────────────────────────

  app.get("/api/em/sequences", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const rows = await db.select().from(emSequences)
      .where(eq(emSequences.userId, uid(req)))
      .orderBy(desc(emSequences.createdAt));
    res.json(rows);
  });

  app.post("/api/em/sequences", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { name, type, description, fromName, fromEmail, replyTo, tags } = req.body;
    if (!name) return void res.status(400).json({ ok: false, message: "name required" });
    const [row] = await db.insert(emSequences).values({
      userId: uid(req), name, type: type || "nurture", description, fromName, fromEmail, replyTo,
      tags: tags || [], aiGenerated: false,
    }).returning();
    res.json(row);
  });

  app.get("/api/em/sequences/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const [seq] = await db.select().from(emSequences)
      .where(and(eq(emSequences.id, req.params.id), eq(emSequences.userId, uid(req))));
    if (!seq) return void res.status(404).json({ ok: false, message: "Not found" });
    const steps = await db.select().from(emSteps)
      .where(eq(emSteps.sequenceId, seq.id))
      .orderBy(emSteps.stepNumber);
    res.json({ ...seq, steps });
  });

  app.patch("/api/em/sequences/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { name, type, description, status, fromName, fromEmail, replyTo, tags } = req.body;
    const [row] = await db.update(emSequences)
      .set({ name, type, description, status, fromName, fromEmail, replyTo, tags, updatedAt: new Date() })
      .where(and(eq(emSequences.id, req.params.id), eq(emSequences.userId, uid(req))))
      .returning();
    res.json(row);
  });

  app.delete("/api/em/sequences/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await db.delete(emSequences)
      .where(and(eq(emSequences.id, req.params.id), eq(emSequences.userId, uid(req))));
    res.json({ ok: true });
  });

  // ── STEPS ──────────────────────────────────────────────────────────────────

  app.post("/api/em/sequences/:id/steps", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { stepNumber, delayDays, delayHours, subject, previewText, bodyHtml, bodyText } = req.body;
    const [row] = await db.insert(emSteps).values({
      sequenceId: req.params.id, userId: uid(req),
      stepNumber: stepNumber || 1, delayDays: delayDays || 0, delayHours: delayHours || 0,
      subject, previewText, bodyHtml, bodyText, sendTimeOptimized: true,
    }).returning();
    res.json(row);
  });

  app.patch("/api/em/sequences/:id/steps/:stepId", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { stepNumber, delayDays, delayHours, subject, previewText, bodyHtml, bodyText, sendTimeOptimized } = req.body;
    const [row] = await db.update(emSteps)
      .set({ stepNumber, delayDays, delayHours, subject, previewText, bodyHtml, bodyText, sendTimeOptimized })
      .where(and(eq(emSteps.id, req.params.stepId), eq(emSteps.userId, uid(req))))
      .returning();
    res.json(row);
  });

  app.delete("/api/em/sequences/:id/steps/:stepId", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await db.delete(emSteps)
      .where(and(eq(emSteps.id, req.params.stepId), eq(emSteps.userId, uid(req))));
    res.json({ ok: true });
  });

  // ── AI GENERATION ──────────────────────────────────────────────────────────

  app.post("/api/em/ai/generate-sequence", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { type, offer, audience, goal, emailCount = 5, niche } = req.body;
    if (!offer) return void res.status(400).json({ ok: false, message: "offer required" });

    const typeLabels: Record<string, string> = {
      nurture: "Nurture / Educational Drip",
      upsell: "Upsell / Cross-sell",
      winback: "Win-back / Re-engagement",
      welcome: "Welcome / Onboarding",
      launch: "Product Launch",
      promo: "Promotional / Sales",
      post_purchase: "Post-Purchase Follow-up",
      feedback: "Feedback / Survey",
      referral: "Referral Program",
      webinar: "Webinar Invite",
      abandonment: "Lead Abandonment Recovery",
      milestone: "Milestone / Anniversary",
    };

    const prompt = `You are a world-class email marketing expert who has written sequences for 7-figure online coaches and creators.

Generate a complete ${emailCount}-email ${typeLabels[type] || type} sequence.

Business: ${offer}
Niche/Industry: ${niche || "online coaching / creator economy"}
Target audience: ${audience || "engaged followers and potential customers"}
Goal: ${goal || "build trust and drive conversions"}

Write emails that feel genuinely personal and conversational — NOT salesy corporate marketing speak. Use storytelling, vulnerability, and specific CTAs.

Return ONLY valid JSON in this exact format:
{
  "name": "sequence name (compelling, 3-6 words)",
  "description": "one sentence describing what this sequence does",
  "emails": [
    {
      "stepNumber": 1,
      "delayDays": 0,
      "delayHours": 0,
      "subject": "subject line (under 60 chars, curiosity-driven)",
      "previewText": "preview text (under 90 chars)",
      "bodyHtml": "<full HTML email — minimum 300 words — use <p>, <h2>, <strong>, <a> tags — include a clear CTA button>",
      "bodyText": "plain text version"
    }
  ]
}

Space the emails: day 0, day 2, day 4, day 7, day 10 etc. Make each email build on the previous. Include specific, actionable CTAs in every email.`;

    try {
      const raw = await callAI([
        { role: "system", content: await skillsPrefix(uid(req), "You are an expert email marketing copywriter. Always return valid JSON.") },
        { role: "user", content: prompt },
      ], true);

      let parsed: any;
      try { parsed = JSON.parse(raw); }
      catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("Could not parse AI response");
        parsed = JSON.parse(m[0]);
      }

      // Create sequence in DB
      const [seq] = await db.insert(emSequences).values({
        userId: uid(req), name: parsed.name, type, description: parsed.description,
        status: "draft", aiGenerated: true,
      }).returning();

      // Create steps
      const steps = [];
      for (const email of parsed.emails) {
        const [step] = await db.insert(emSteps).values({
          sequenceId: seq.id, userId: uid(req),
          stepNumber: email.stepNumber, delayDays: email.delayDays || 0, delayHours: email.delayHours || 0,
          subject: email.subject, previewText: email.previewText,
          bodyHtml: email.bodyHtml, bodyText: email.bodyText,
        }).returning();
        steps.push(step);
      }

      res.json({ ...seq, steps });
    } catch (e: any) {
      console.error("[em] generate-sequence error:", e);
      res.status(500).json({ ok: false, message: e?.message || "AI generation failed" });
    }
  });

  app.post("/api/em/ai/generate-email", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { sequenceContext, stepNumber, totalSteps, offer, goal, previousSubjects } = req.body;

    const prompt = `Write email ${stepNumber} of ${totalSteps} in a sequence.
Context: ${sequenceContext}
Offer: ${offer}
Goal of this email: ${goal}
Previous subjects used: ${previousSubjects?.join(", ") || "none"}

Return JSON: { "subject": "", "previewText": "", "bodyHtml": "", "bodyText": "" }`;

    try {
      const raw = await callAI([
        { role: "system", content: "Expert email copywriter. Return valid JSON." },
        { role: "user", content: prompt },
      ], true);
      res.json(JSON.parse(raw));
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e?.message || "Failed" });
    }
  });

  app.post("/api/em/ai/improve-subject", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { subject, context } = req.body;

    const prompt = `Generate 5 improved subject line variants for this email subject: "${subject}"
Context: ${context || "email marketing sequence"}

Rules: under 60 chars, curiosity/benefit-driven, avoid spam words, mix emotional/logical angles.

Return JSON: { "variants": ["variant1", "variant2", "variant3", "variant4", "variant5"] }`;

    try {
      const raw = await callAI([
        { role: "system", content: "Expert email subject line optimizer. Return valid JSON." },
        { role: "user", content: prompt },
      ], true);
      res.json(JSON.parse(raw));
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e?.message || "Failed" });
    }
  });

  app.post("/api/em/ai/rewrite-email", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { bodyHtml, tone, goal } = req.body;

    const prompt = `Rewrite this email to be more ${tone || "personal and conversational"}.
Goal: ${goal || "drive engagement and clicks"}
Original: ${bodyHtml?.replace(/<[^>]*>/g, " ").slice(0, 1000)}

Return JSON: { "bodyHtml": "<improved HTML>", "bodyText": "plain text version" }`;

    try {
      const raw = await callAI([
        { role: "system", content: "Expert email copywriter. Return valid JSON." },
        { role: "user", content: prompt },
      ], true);
      res.json(JSON.parse(raw));
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e?.message || "Failed" });
    }
  });

  // ── CONTACTS ───────────────────────────────────────────────────────────────

  app.get("/api/em/contacts", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const rows = await db.select().from(emContacts)
      .where(eq(emContacts.userId, uid(req)))
      .orderBy(desc(emContacts.createdAt));
    res.json(rows);
  });

  app.post("/api/em/contacts", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { email, firstName, lastName, phone, tags, source, customFields } = req.body;
    if (!email) return void res.status(400).json({ ok: false, message: "email required" });
    const [row] = await db.insert(emContacts).values({
      userId: uid(req), email, firstName, lastName, phone,
      tags: tags || [], source, customFields,
    }).returning();
    res.json(row);
  });

  app.post("/api/em/contacts/bulk", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { contacts } = req.body as { contacts: Array<{ email: string; firstName?: string; lastName?: string; tags?: string[] }> };
    if (!contacts?.length) return void res.status(400).json({ ok: false, message: "contacts required" });

    const inserted = [];
    for (const c of contacts.slice(0, 5000)) {
      if (!c.email) continue;
      try {
        const [row] = await db.insert(emContacts).values({
          userId: uid(req), email: c.email, firstName: c.firstName, lastName: c.lastName,
          tags: c.tags || [], source: "import",
        }).returning();
        inserted.push(row);
      } catch { /* skip duplicates */ }
    }
    res.json({ ok: true, imported: inserted.length });
  });

  app.patch("/api/em/contacts/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { firstName, lastName, phone, tags, subscribed, customFields } = req.body;
    const [row] = await db.update(emContacts)
      .set({ firstName, lastName, phone, tags, subscribed, customFields,
        ...(subscribed === false ? { unsubscribedAt: new Date() } : {}) })
      .where(and(eq(emContacts.id, req.params.id), eq(emContacts.userId, uid(req))))
      .returning();
    res.json(row);
  });

  app.delete("/api/em/contacts/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await db.delete(emContacts)
      .where(and(eq(emContacts.id, req.params.id), eq(emContacts.userId, uid(req))));
    res.json({ ok: true });
  });

  // ── WORKFLOWS ──────────────────────────────────────────────────────────────

  app.get("/api/em/workflows", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const rows = await db.select().from(emWorkflows)
      .where(eq(emWorkflows.userId, uid(req)))
      .orderBy(desc(emWorkflows.createdAt));
    res.json(rows);
  });

  app.post("/api/em/workflows", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { name, description, nodes, triggerType, triggerValue } = req.body;
    if (!name) return void res.status(400).json({ ok: false, message: "name required" });
    const [row] = await db.insert(emWorkflows).values({
      userId: uid(req), name, description, nodes: nodes || [], triggerType: triggerType || "manual", triggerValue,
    }).returning();
    res.json(row);
  });

  app.patch("/api/em/workflows/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { name, description, status, nodes, triggerType, triggerValue } = req.body;
    const [row] = await db.update(emWorkflows)
      .set({ name, description, status, nodes, triggerType, triggerValue, updatedAt: new Date() })
      .where(and(eq(emWorkflows.id, req.params.id), eq(emWorkflows.userId, uid(req))))
      .returning();
    res.json(row);
  });

  app.delete("/api/em/workflows/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await db.delete(emWorkflows)
      .where(and(eq(emWorkflows.id, req.params.id), eq(emWorkflows.userId, uid(req))));
    res.json({ ok: true });
  });

  // ── AI WORKFLOW GENERATION ────────────────────────────────────────────────

  app.post("/api/em/ai/generate-workflow", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { goal, trigger, offer } = req.body;

    const prompt = `Design an email automation workflow for: "${goal}"
Trigger: ${trigger}
Offer/Context: ${offer}

Create a clear step-by-step workflow. Return JSON:
{
  "name": "workflow name",
  "description": "what it does",
  "nodes": [
    { "id": "1", "type": "trigger", "label": "trigger description", "triggerType": "contact_added|tag_applied|form_submitted|purchase|manual" },
    { "id": "2", "type": "action", "label": "action description", "actionType": "send_email|wait|add_tag|remove_tag|notify", "config": { "delayDays": 0, "subject": "", "emailPreset": "" } },
    { "id": "3", "type": "condition", "label": "condition description", "conditionType": "opened_email|clicked_link|has_tag", "yesNextId": "4", "noNextId": "5" }
  ]
}`;

    try {
      const raw = await callAI([
        { role: "system", content: "Expert marketing automation designer. Return valid JSON." },
        { role: "user", content: prompt },
      ], true);
      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e?.message || "Failed" });
    }
  });

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  app.get("/api/em/analytics", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);

    const [{ totalSequences }] = await pool.query(
      `SELECT COUNT(*)::int AS "totalSequences" FROM em_sequences WHERE user_id = $1`, [userId]
    ).then(r => r.rows);

    const [{ totalContacts }] = await pool.query(
      `SELECT COUNT(*)::int AS "totalContacts" FROM em_contacts WHERE user_id = $1 AND subscribed = true`, [userId]
    ).then(r => r.rows);

    const [{ totalSent }] = await pool.query(
      `SELECT COUNT(*)::int AS "totalSent" FROM em_sends WHERE user_id = $1 AND status != 'pending'`, [userId]
    ).then(r => r.rows);

    const [{ totalOpened }] = await pool.query(
      `SELECT COUNT(*)::int AS "totalOpened" FROM em_sends WHERE user_id = $1 AND opened_at IS NOT NULL`, [userId]
    ).then(r => r.rows);

    const [{ totalClicked }] = await pool.query(
      `SELECT COUNT(*)::int AS "totalClicked" FROM em_sends WHERE user_id = $1 AND clicked_at IS NOT NULL`, [userId]
    ).then(r => r.rows);

    const [{ activeWorkflows }] = await pool.query(
      `SELECT COUNT(*)::int AS "activeWorkflows" FROM em_workflows WHERE user_id = $1 AND status = 'active'`, [userId]
    ).then(r => r.rows);

    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0.0";
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0.0";

    // Per-sequence stats
    const seqStats = await pool.query(`
      SELECT s.id, s.name, s.type, s.status, s.total_sent, s.total_opened, s.total_clicked,
        (SELECT COUNT(*) FROM em_steps WHERE sequence_id = s.id)::int as step_count
      FROM em_sequences s WHERE s.user_id = $1
      ORDER BY s.created_at DESC LIMIT 10
    `, [userId]).then(r => r.rows);

    res.json({
      totalSequences, totalContacts, totalSent, totalOpened, totalClicked,
      openRate, clickRate, activeWorkflows, sequences: seqStats,
    });
  });

  // ── TRACKING ──────────────────────────────────────────────────────────────

  // Pixel open tracking (public, no auth)
  app.get("/api/em/track/open/:trackingId", async (req: Request, res: Response) => {
    try {
      await pool.query(
        `UPDATE em_sends SET opened_at = NOW(), status = 'opened' WHERE tracking_id = $1 AND opened_at IS NULL`,
        [req.params.trackingId],
      );
    } catch {}
    // 1x1 transparent GIF
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.set("Content-Type", "image/gif").set("Cache-Control", "no-store").send(gif);
  });

  // Link click tracking (public, no auth)
  app.get("/api/em/track/click/:trackingId", async (req: Request, res: Response) => {
    const { url } = req.query;
    try {
      await pool.query(
        `UPDATE em_sends SET clicked_at = NOW(), status = 'clicked' WHERE tracking_id = $1`,
        [req.params.trackingId],
      );
    } catch {}
    if (url) res.redirect(decodeURIComponent(url as string));
    else res.json({ ok: true });
  });

  // ── SMTP CONFIG ───────────────────────────────────────────────────────────

  app.get("/api/em/smtp", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const [row] = await db.select({
      id: emSmtpConfigs.id, provider: emSmtpConfigs.provider, host: emSmtpConfigs.host,
      port: emSmtpConfigs.port, secure: emSmtpConfigs.secure, username: emSmtpConfigs.username,
      fromName: emSmtpConfigs.fromName, fromEmail: emSmtpConfigs.fromEmail, replyTo: emSmtpConfigs.replyTo,
      isVerified: emSmtpConfigs.isVerified, dailySendLimit: emSmtpConfigs.dailySendLimit,
      warmingEnabled: emSmtpConfigs.warmingEnabled,
    }).from(emSmtpConfigs).where(eq(emSmtpConfigs.userId, uid(req)));
    res.json(row || null);
  });

  app.post("/api/em/smtp", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { provider, host, port, secure, username, password, fromName, fromEmail, replyTo, dailySendLimit, warmingEnabled } = req.body;
    const existing = await db.select({ id: emSmtpConfigs.id }).from(emSmtpConfigs)
      .where(eq(emSmtpConfigs.userId, uid(req)));

    if (existing.length > 0) {
      const [row] = await db.update(emSmtpConfigs)
        .set({ provider, host, port, secure, fromName, fromEmail, replyTo, dailySendLimit, warmingEnabled,
          ...(password ? { username, password } : { username }),
          isVerified: false,
        })
        .where(eq(emSmtpConfigs.userId, uid(req))).returning();
      return void res.json(row);
    }

    const [row] = await db.insert(emSmtpConfigs).values({
      userId: uid(req), provider, host, port, secure, username, password,
      fromName, fromEmail, replyTo, dailySendLimit: dailySendLimit || 500,
      warmingEnabled: warmingEnabled || false,
    }).returning();
    res.json(row);
  });

  app.post("/api/em/smtp/test", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { host, port } = req.body;
    if (!host) return void res.status(400).json({ ok: false, message: "host required" });
    try {
      const nodemailer = await import("nodemailer");
      const [cfg] = await db.select().from(emSmtpConfigs).where(eq(emSmtpConfigs.userId, uid(req)));
      if (!cfg?.username || !cfg?.password) throw new Error("Username/password not saved yet");
      const transporter = nodemailer.default.createTransport({
        host: cfg.host || host, port: cfg.port || port || 587,
        secure: cfg.secure || false,
        auth: { user: cfg.username, pass: cfg.password },
        connectionTimeout: 8000, greetingTimeout: 5000,
      });
      await transporter.verify();
      await db.update(emSmtpConfigs).set({ isVerified: true }).where(eq(emSmtpConfigs.userId, uid(req)));
      res.json({ ok: true, message: "SMTP connected — ready to send" });
    } catch (e: any) {
      res.status(400).json({ ok: false, message: `SMTP connection failed: ${e.message}` });
    }
  });

  // ── GMAIL OAUTH ────────────────────────────────────────────────────────────

  function getAppBase(): string {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
    return `http://localhost:${process.env.PORT || "5000"}`;
  }

  async function getGmailOAuth2Client() {
    const { google } = await import("googleapis");
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${getAppBase()}/api/em/oauth/gmail/callback`,
    );
  }

  app.get("/api/em/oauth/status", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);
    const [gmail] = await pool.query(
      `SELECT email, display_name FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`,
      [userId],
    ).then(r => r.rows);
    const [outlook] = await pool.query(
      `SELECT email, display_name FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'outlook'`,
      [userId],
    ).then(r => r.rows);
    res.json({
      gmail: gmail ? { connected: true, email: gmail.email } : { connected: false },
      outlook: outlook ? { connected: true, email: outlook.email } : { connected: false },
    });
  });

  app.get("/api/em/oauth/gmail/connect", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return void res.status(500).json({ message: "Google credentials not configured" });
    }
    const client = await getGmailOAuth2Client();
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      prompt: "consent",
      state: uid(req),
    });
    res.redirect(url);
  });

  app.get("/api/em/oauth/gmail/callback", async (req: Request, res: Response) => {
    const base = getAppBase();
    try {
      const { code, state: userId, error } = req.query as { code?: string; state?: string; error?: string };
      if (error) return res.redirect(`${base}/email-marketing?gmail_error=${encodeURIComponent(error)}`);
      if (!code || !userId) return res.redirect(`${base}/email-marketing?gmail_error=missing_code`);

      const client = await getGmailOAuth2Client();
      const { tokens } = await client.getToken(code as string);
      if (!tokens.access_token) throw new Error("No access token");

      client.setCredentials(tokens);
      const { google } = await import("googleapis");
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const info = await oauth2.userinfo.get();
      const email = info.data.email ?? null;
      const name = info.data.name ?? null;

      await pool.query(`
        INSERT INTO em_oauth_tokens (user_id, provider, access_token, refresh_token, token_expires_at, email, display_name, warmup_start_date)
        VALUES ($1, 'gmail', $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (user_id, provider) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = COALESCE(EXCLUDED.refresh_token, em_oauth_tokens.refresh_token),
          token_expires_at = EXCLUDED.token_expires_at,
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          updated_at = NOW()
      `, [userId, tokens.access_token, tokens.refresh_token ?? null,
          tokens.expiry_date ? new Date(tokens.expiry_date) : null, email, name]);

      return res.redirect(`${base}/email-marketing?gmail_connected=1`);
    } catch (e: any) {
      console.error("[em/gmail] callback error:", e.message);
      return res.redirect(`${base}/email-marketing?gmail_error=${encodeURIComponent(e.message)}`);
    }
  });

  app.delete("/api/em/oauth/gmail/disconnect", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await pool.query(
      `DELETE FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`,
      [uid(req)],
    );
    res.json({ ok: true });
  });

  // Outlook stubs (OAuth flow same pattern — add MICROSOFT_CLIENT_ID/SECRET when ready)
  app.get("/api/em/oauth/outlook/connect", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    res.json({ ok: false, message: "Outlook OAuth coming soon. Use SMTP with Outlook for now." });
  });

  app.delete("/api/em/oauth/outlook/disconnect", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await pool.query(`DELETE FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'outlook'`, [uid(req)]);
    res.json({ ok: true });
  });

  // ── SEQUENCE LAUNCH ────────────────────────────────────────────────────────

  app.post("/api/em/sequences/:id/launch", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);
    const { segment = "all", tagName, contactIds, fromName, replyTo } = req.body;

    // Verify sequence exists and belongs to user
    const [seq] = await db.select().from(emSequences)
      .where(and(eq(emSequences.id, req.params.id), eq(emSequences.userId, userId)));
    if (!seq) return void res.status(404).json({ ok: false, message: "Sequence not found" });

    // Check sending account configured
    const [gmailToken] = await pool.query(
      `SELECT email FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`, [userId]
    ).then(r => r.rows);
    const [smtpCfg] = await db.select().from(emSmtpConfigs).where(and(eq(emSmtpConfigs.userId, userId), eq(emSmtpConfigs.isVerified, true)));

    if (!gmailToken && !smtpCfg) {
      return void res.status(400).json({ ok: false, message: "Connect Gmail or configure SMTP before launching" });
    }

    // Resolve contacts
    let contacts: any[] = [];
    if (segment === "ids" && contactIds?.length) {
      contacts = await pool.query(
        `SELECT * FROM em_contacts WHERE user_id = $1 AND id = ANY($2) AND subscribed = true`,
        [userId, contactIds]
      ).then(r => r.rows);
    } else if (segment === "tag" && tagName) {
      contacts = await pool.query(
        `SELECT * FROM em_contacts WHERE user_id = $1 AND $2 = ANY(tags) AND subscribed = true`,
        [userId, tagName]
      ).then(r => r.rows);
    } else {
      contacts = await pool.query(
        `SELECT * FROM em_contacts WHERE user_id = $1 AND subscribed = true`,
        [userId]
      ).then(r => r.rows);
    }

    if (!contacts.length) {
      return void res.status(400).json({ ok: false, message: "No subscribed contacts found for this segment" });
    }

    // Activate sequence
    await db.update(emSequences)
      .set({ status: "active", ...(fromName ? { fromName } : {}), ...(replyTo ? { replyTo } : {}), updatedAt: new Date() })
      .where(eq(emSequences.id, seq.id));

    // Enroll contacts (skip already enrolled)
    let enrolled = 0;
    let skipped = 0;
    for (const contact of contacts) {
      try {
        await pool.query(`
          INSERT INTO em_enrollments (user_id, sequence_id, contact_id, current_step, status, next_send_at)
          VALUES ($1, $2, $3, 0, 'active', NOW())
          ON CONFLICT (sequence_id, contact_id) DO NOTHING
        `, [userId, seq.id, contact.id]);
        enrolled++;
      } catch { skipped++; }
    }

    // Update total_enrolled on sequence
    await db.update(emSequences)
      .set({ totalEnrolled: seq.totalEnrolled + enrolled, updatedAt: new Date() })
      .where(eq(emSequences.id, seq.id));

    res.json({ ok: true, enrolled, skipped, total: contacts.length });
  });

  app.get("/api/em/sequences/:id/enrollments", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const rows = await pool.query(`
      SELECT e.id, e.current_step, e.status, e.next_send_at, e.enrolled_at, e.completed_at,
             c.email, c.first_name, c.last_name
      FROM em_enrollments e
      JOIN em_contacts c ON c.id = e.contact_id
      WHERE e.sequence_id = $1 AND e.user_id = $2
      ORDER BY e.enrolled_at DESC
      LIMIT 100
    `, [req.params.id, uid(req)]).then(r => r.rows);
    res.json(rows);
  });

  app.post("/api/em/sequences/:id/pause", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await pool.query(
      `UPDATE em_enrollments SET status = 'paused' WHERE sequence_id = $1 AND user_id = $2 AND status = 'active'`,
      [req.params.id, uid(req)]
    );
    await db.update(emSequences).set({ status: "paused", updatedAt: new Date() })
      .where(and(eq(emSequences.id, req.params.id), eq(emSequences.userId, uid(req))));
    res.json({ ok: true });
  });

  // ── UNSUBSCRIBE (public, no auth) ──────────────────────────────────────────

  app.get("/api/em/unsubscribe/:token", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `UPDATE em_contacts SET subscribed = false, unsubscribed_at = NOW() WHERE unsubscribe_token = $1 RETURNING email`,
        [req.params.token],
      );
      if (result.rows.length > 0) {
        await pool.query(
          `UPDATE em_enrollments SET status = 'unsubscribed' WHERE contact_id IN (SELECT id FROM em_contacts WHERE unsubscribe_token = $1)`,
          [req.params.token],
        );
      }
      res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px;background:#fff;color:#333;"><h2>You've been unsubscribed</h2><p>You won't receive any more emails from this sender.<br>If this was a mistake, please reply to one of our emails.</p></body></html>`);
    } catch {
      res.status(500).send("Error processing unsubscribe");
    }
  });

  // ── AI WORKFLOW GENERATE ─────────────────────────────────────────────────
  // (chat kept as existing)

  // ── AI CHAT ────────────────────────────────────────────────────────────────

  app.post("/api/em/chat", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { message } = req.body;
    if (!message) return void res.status(400).json({ ok: false, message: "message required" });

    const systemPrompt = `You are an expert email marketing assistant for Oravini, an AI-powered marketing platform.
You help users write better emails, improve their sequences, and optimize deliverability.
Your expertise covers: subject line optimization, copywriting, email design, list management, A/B testing, deliverability, warmup, and marketing automation.
When asked to generate content, be specific and actionable. Keep responses concise (under 200 words unless writing copy).
If the user asks to create something (sequence, email, etc.), guide them to use the AI generation features.`;

    try {
      const userId = uid(req);
      const history = await pool.query(
        `SELECT role, content FROM em_chat_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [userId]
      ).then(r => r.rows.reverse()).catch(() => []);

      const messages = [
        { role: "system", content: await skillsPrefix(userId, systemPrompt) },
        ...history.map((h: any) => ({ role: h.role, content: h.content })),
        { role: "user", content: message },
      ];

      const reply = await callAI(messages);

      // Save to history
      await pool.query(
        `INSERT INTO em_chat_history (user_id, role, content) VALUES ($1, 'user', $2), ($1, 'assistant', $3)
         ON CONFLICT DO NOTHING`,
        [userId, message, reply]
      ).catch(() => {});

      // Check if AI decided to take an action (simple heuristic)
      const lower = message.toLowerCase();
      const action = lower.includes("generate") || lower.includes("create") || lower.includes("write") ? "generate_content" : null;

      await pool.query(
        `INSERT INTO em_chat_history (user_id, role, content, metadata) VALUES ($1, 'assistant', $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, reply, action ? JSON.stringify({ action }) : null]
      ).catch(() => {});

      res.json({ id: randomUUID(), role: "assistant", content: reply, metadata: action ? { action } : null });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  app.get("/api/em/chat/history", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const rows = await pool.query(
      `SELECT id, role, content, metadata, created_at FROM em_chat_history WHERE user_id = $1 ORDER BY created_at ASC LIMIT 100`,
      [uid(req)]
    ).then(r => r.rows).catch(() => []);
    res.json(rows);
  });

  app.delete("/api/em/chat/history", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await pool.query(`DELETE FROM em_chat_history WHERE user_id = $1`, [uid(req)]).catch(() => {});
    res.json({ ok: true });
  });

  // ── WEBHOOKS: SendGrid + Mailgun bounce/complaint ────────────────────────────

  async function handleBounce(userEmail: string, bouncedEmail: string, reason: string) {
    // Find which user owns this sending address and suppress the bounced contact
    const senders = await pool.query(
      `SELECT user_id FROM em_oauth_tokens WHERE email = $1
       UNION
       SELECT user_id FROM em_smtp_configs WHERE from_email = $1`,
      [userEmail]
    ).then(r => r.rows);

    for (const { user_id } of senders) {
      await pool.query(
        `INSERT INTO em_suppressions (user_id, email, reason, source)
         VALUES ($1, $2, $3, 'webhook')
         ON CONFLICT (user_id, email) DO NOTHING`,
        [user_id, bouncedEmail, reason]
      );
      await pool.query(
        `UPDATE em_contacts SET subscribed = false, unsubscribed_at = NOW()
         WHERE user_id = $1 AND LOWER(email) = LOWER($2)`,
        [user_id, bouncedEmail]
      );
    }
  }

  // SendGrid event webhook — configure in SendGrid dashboard → Settings → Mail Settings → Event Webhook
  // URL: https://oravini.com/api/em/webhooks/sendgrid
  app.post("/api/em/webhooks/sendgrid", async (req: Request, res: Response) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      for (const ev of events) {
        const email = ev.email?.toLowerCase();
        if (!email) continue;
        if (ev.event === "bounce" || ev.event === "dropped") {
          await handleBounce(ev.sg_message_id || "", email, ev.event === "bounce" ? "hard_bounce" : "dropped");
          // Also mark em_sends record
          await pool.query(
            `UPDATE em_sends SET status = 'bounced', bounced_at = NOW(), bounce_type = $1
             WHERE tracking_id = $2`,
            [ev.type || "hard", ev.sg_message_id || ""]
          );
        } else if (ev.event === "spamreport") {
          await pool.query(
            `INSERT INTO em_suppressions (user_id, email, reason, source)
             SELECT user_id, $1, 'spam_complaint', 'sendgrid'
             FROM em_oauth_tokens WHERE email = $2
             ON CONFLICT (user_id, email) DO NOTHING`,
            [email, ev["smtp-id"] || ""]
          );
          await pool.query(
            `UPDATE em_contacts SET subscribed = false, unsubscribed_at = NOW()
             WHERE LOWER(email) = $1`,
            [email]
          );
          await pool.query(
            `UPDATE em_sends SET complaint = true WHERE tracking_id = $1`,
            [ev.sg_message_id || ""]
          );
        }
      }
      res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("[sendgrid-webhook]", e.message);
      res.status(200).json({ ok: true }); // always 200 to SendGrid
    }
  });

  // Mailgun event webhook — configure in Mailgun dashboard → Sending → Webhooks
  // URL: https://oravini.com/api/em/webhooks/mailgun
  app.post("/api/em/webhooks/mailgun", async (req: Request, res: Response) => {
    try {
      const ev = req.body?.["event-data"] || req.body;
      const email = (ev.recipient || ev.email || "").toLowerCase();
      const event = ev.event;
      if (!email) return res.status(200).json({ ok: true });

      if (event === "failed" || event === "bounced") {
        const severity = ev.severity || "permanent";
        if (severity === "permanent") {
          await pool.query(
            `UPDATE em_contacts SET subscribed = false, unsubscribed_at = NOW()
             WHERE LOWER(email) = $1`,
            [email]
          );
          await pool.query(
            `INSERT INTO em_suppressions (user_id, email, reason, source)
             SELECT user_id, $1, 'hard_bounce', 'mailgun'
             FROM em_contacts WHERE LOWER(email) = $1 LIMIT 1
             ON CONFLICT (user_id, email) DO NOTHING`,
            [email]
          );
        }
      } else if (event === "complained") {
        await pool.query(
          `UPDATE em_contacts SET subscribed = false, unsubscribed_at = NOW()
           WHERE LOWER(email) = $1`,
          [email]
        );
        await pool.query(
          `INSERT INTO em_suppressions (user_id, email, reason, source)
           SELECT user_id, $1, 'spam_complaint', 'mailgun'
           FROM em_contacts WHERE LOWER(email) = $1 LIMIT 1
           ON CONFLICT (user_id, email) DO NOTHING`,
          [email]
        );
      }
      res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("[mailgun-webhook]", e.message);
      res.status(200).json({ ok: true });
    }
  });

  // ── SUPPRESSION LIST ─────────────────────────────────────────────────────────

  app.get("/api/em/suppressions", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const rows = await pool.query(
      `SELECT id, email, reason, source, created_at FROM em_suppressions WHERE user_id = $1 ORDER BY created_at DESC`,
      [uid(req)]
    ).then(r => r.rows);
    res.json(rows);
  });

  app.post("/api/em/suppressions", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);
    const { email, reason = "manual" } = req.body;
    if (!email) return res.status(400).json({ ok: false, message: "email required" });
    await pool.query(
      `INSERT INTO em_suppressions (user_id, email, reason, source)
       VALUES ($1, LOWER($2), $3, 'manual')
       ON CONFLICT (user_id, email) DO NOTHING`,
      [userId, email, reason]
    );
    await pool.query(
      `UPDATE em_contacts SET subscribed = false, unsubscribed_at = NOW()
       WHERE user_id = $1 AND LOWER(email) = LOWER($2)`,
      [userId, email]
    );
    res.json({ ok: true });
  });

  app.delete("/api/em/suppressions/:email", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await pool.query(
      `DELETE FROM em_suppressions WHERE user_id = $1 AND email = LOWER($2)`,
      [uid(req), req.params.email]
    );
    res.json({ ok: true });
  });

  // ── LIST VALIDATION ──────────────────────────────────────────────────────────

  async function validateEmailMx(email: string): Promise<"valid" | "invalid" | "risky"> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "invalid";
    const domain = email.split("@")[1];
    try {
      const dns = await import("dns/promises");
      const mx = await dns.resolveMx(domain).catch(() => []);
      if (!mx || mx.length === 0) return "invalid";
      // Disposable/risky domains
      const risky = ["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email","yopmail.com","sharklasers.com","trashmail.com"];
      if (risky.includes(domain.toLowerCase())) return "risky";
      return "valid";
    } catch {
      return "risky";
    }
  }

  app.post("/api/em/contacts/validate", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, message: "email required" });
    const status = await validateEmailMx(email);
    res.json({ ok: true, email, status });
  });

  app.post("/api/em/contacts/bulk-validate", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);
    const contacts = await pool.query(
      `SELECT id, email FROM em_contacts WHERE user_id = $1 AND (validation_status = 'unknown' OR validation_status IS NULL) LIMIT 200`,
      [userId]
    ).then(r => r.rows);

    let valid = 0, invalid = 0, risky = 0;
    for (const c of contacts) {
      const status = await validateEmailMx(c.email);
      await pool.query(
        `UPDATE em_contacts SET validation_status = $1, validation_checked_at = NOW() WHERE id = $2`,
        [status, c.id]
      );
      if (status === "valid") valid++;
      else if (status === "invalid") { invalid++; }
      else risky++;
      await new Promise(r => setTimeout(r, 100)); // avoid DNS flood
    }
    res.json({ ok: true, checked: contacts.length, valid, invalid, risky });
  });

  // ── DOMAIN CHECK: SPF / DKIM ─────────────────────────────────────────────────

  app.get("/api/em/domain/check", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const domain = req.query.domain as string;
    if (!domain) return res.status(400).json({ ok: false, message: "domain required" });

    try {
      const dns = await import("dns/promises");
      const results: any = { domain, spf: null, dkim: null, dmarc: null };

      // SPF
      try {
        const txt = await dns.resolveTxt(domain);
        const spfRecord = txt.flat().find(r => r.startsWith("v=spf1"));
        results.spf = spfRecord
          ? { found: true, record: spfRecord, valid: spfRecord.includes("~all") || spfRecord.includes("-all") }
          : { found: false };
      } catch { results.spf = { found: false }; }

      // DMARC
      try {
        const txt = await dns.resolveTxt(`_dmarc.${domain}`);
        const dmarcRecord = txt.flat().find(r => r.startsWith("v=DMARC1"));
        results.dmarc = dmarcRecord
          ? { found: true, record: dmarcRecord }
          : { found: false };
      } catch { results.dmarc = { found: false }; }

      // DKIM — check common selectors
      const selectors = ["default", "google", "mail", "dkim", "k1", "selector1", "selector2"];
      results.dkim = { found: false, selector: null };
      for (const sel of selectors) {
        try {
          const txt = await dns.resolveTxt(`${sel}._domainkey.${domain}`);
          if (txt.flat().some(r => r.includes("v=DKIM1"))) {
            results.dkim = { found: true, selector: sel };
            break;
          }
        } catch { /* try next */ }
      }

      res.json({ ok: true, ...results });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // ── BROADCASTS ───────────────────────────────────────────────────────────────

  app.get("/api/em/broadcasts", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const rows = await pool.query(
      `SELECT * FROM em_broadcasts WHERE user_id = $1 ORDER BY created_at DESC`,
      [uid(req)]
    ).then(r => r.rows);
    res.json(rows);
  });

  app.post("/api/em/broadcasts", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);
    const { name, subject, preview_text, body_html, from_name, from_email, reply_to, segment_type = "all", segment_tags } = req.body;
    if (!name || !subject || !body_html) return res.status(400).json({ ok: false, message: "name, subject, body_html required" });
    const result = await pool.query(
      `INSERT INTO em_broadcasts (user_id, name, subject, preview_text, body_html, from_name, from_email, reply_to, segment_type, segment_tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [userId, name, subject, preview_text || null, body_html, from_name || null, from_email || null, reply_to || null, segment_type, segment_tags || null]
    );
    res.json(result.rows[0]);
  });

  app.patch("/api/em/broadcasts/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);
    const { name, subject, preview_text, body_html, from_name, from_email, reply_to, segment_type, segment_tags, scheduled_at } = req.body;
    const result = await pool.query(
      `UPDATE em_broadcasts SET
         name = COALESCE($1, name), subject = COALESCE($2, subject),
         preview_text = COALESCE($3, preview_text), body_html = COALESCE($4, body_html),
         from_name = COALESCE($5, from_name), from_email = COALESCE($6, from_email),
         reply_to = COALESCE($7, reply_to), segment_type = COALESCE($8, segment_type),
         segment_tags = COALESCE($9, segment_tags), scheduled_at = COALESCE($10, scheduled_at),
         updated_at = NOW()
       WHERE id = $11 AND user_id = $12 RETURNING *`,
      [name, subject, preview_text, body_html, from_name, from_email, reply_to, segment_type, segment_tags, scheduled_at, req.params.id, userId]
    );
    if (!result.rows[0]) return res.status(404).json({ ok: false, message: "Not found" });
    res.json(result.rows[0]);
  });

  app.delete("/api/em/broadcasts/:id", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    await pool.query(`DELETE FROM em_broadcasts WHERE id = $1 AND user_id = $2`, [req.params.id, uid(req)]);
    res.json({ ok: true });
  });

  app.post("/api/em/broadcasts/:id/launch", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const userId = uid(req);
    const [broadcast] = await pool.query(
      `SELECT * FROM em_broadcasts WHERE id = $1 AND user_id = $2`, [req.params.id, userId]
    ).then(r => r.rows);
    if (!broadcast) return res.status(404).json({ ok: false, message: "Broadcast not found" });
    if (broadcast.status !== "draft") return res.status(400).json({ ok: false, message: "Already sent or sending" });

    // Check sender configured
    const [gmailToken] = await pool.query(
      `SELECT email FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`, [userId]
    ).then(r => r.rows);
    const [smtpCfg] = await pool.query(
      `SELECT * FROM em_smtp_configs WHERE user_id = $1 AND is_verified = true`, [userId]
    ).then(r => r.rows);
    if (!gmailToken && !smtpCfg) {
      return res.status(400).json({ ok: false, message: "Connect Gmail or configure SMTP first" });
    }

    // Build recipient list (excluding suppressions)
    let contacts: any[];
    if (broadcast.segment_type === "tag" && broadcast.segment_tags?.length) {
      contacts = await pool.query(
        `SELECT c.* FROM em_contacts c
         WHERE c.user_id = $1 AND c.subscribed = true
           AND c.tags && $2
           AND NOT EXISTS (SELECT 1 FROM em_suppressions s WHERE s.user_id = $1 AND LOWER(s.email) = LOWER(c.email))`,
        [userId, broadcast.segment_tags]
      ).then(r => r.rows);
    } else {
      contacts = await pool.query(
        `SELECT c.* FROM em_contacts c
         WHERE c.user_id = $1 AND c.subscribed = true
           AND NOT EXISTS (SELECT 1 FROM em_suppressions s WHERE s.user_id = $1 AND LOWER(s.email) = LOWER(c.email))`,
        [userId]
      ).then(r => r.rows);
    }

    if (contacts.length === 0) {
      return res.status(400).json({ ok: false, message: "No eligible contacts in segment" });
    }

    // Queue all sends
    for (const c of contacts) {
      const trackingId = randomUUID();
      await pool.query(
        `INSERT INTO em_broadcast_sends (broadcast_id, contact_id, user_id, tracking_id, status)
         VALUES ($1, $2, $3, $4, 'pending')
         ON CONFLICT (broadcast_id, contact_id) DO NOTHING`,
        [broadcast.id, c.id, userId, trackingId]
      );
    }

    await pool.query(
      `UPDATE em_broadcasts SET status = 'sending', recipient_count = $1, updated_at = NOW() WHERE id = $2`,
      [contacts.length, broadcast.id]
    );

    res.json({ ok: true, recipientCount: contacts.length });
  });

  app.get("/api/em/broadcasts/:id/stats", async (req: Request, res: Response) => {
    if (!requirePlan(req, res)) return;
    const [broadcast] = await pool.query(
      `SELECT * FROM em_broadcasts WHERE id = $1 AND user_id = $2`, [req.params.id, uid(req)]
    ).then(r => r.rows);
    if (!broadcast) return res.status(404).json({ ok: false });
    const stats = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'sent') AS sent,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened,
         COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked
       FROM em_broadcast_sends WHERE broadcast_id = $1`,
      [broadcast.id]
    ).then(r => r.rows[0]);
    res.json({ ...broadcast, ...stats });
  });

  // Track opens/clicks for broadcasts (reuse tracking_id)
  app.get("/api/em/broadcast/track/open/:trackingId", async (req: Request, res: Response) => {
    await pool.query(
      `UPDATE em_broadcast_sends SET opened_at = NOW() WHERE tracking_id = $1 AND opened_at IS NULL`,
      [req.params.trackingId]
    ).catch(() => {});
    // Return 1x1 transparent GIF
    const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store" }).send(gif);
  });

  app.get("/api/em/broadcast/track/click/:trackingId", async (req: Request, res: Response) => {
    const url = req.query.url as string;
    await pool.query(
      `UPDATE em_broadcast_sends SET clicked_at = NOW() WHERE tracking_id = $1 AND clicked_at IS NULL`,
      [req.params.trackingId]
    ).catch(() => {});
    if (url) return res.redirect(decodeURIComponent(url));
    res.redirect("/");
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL SENDING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

function getWarmupDailyLimit(warmupStartDate: Date, configuredLimit: number): number {
  const days = Math.floor((Date.now() - warmupStartDate.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 3)  return 50;
  if (days < 7)  return 100;
  if (days < 14) return 200;
  if (days < 21) return 350;
  if (days < 28) return 500;
  return Math.min(configuredLimit || 500, 2000);
}

function buildEmailHtml(opts: {
  bodyHtml: string;
  previewText?: string;
  fromName: string;
  contactFirstName: string;
  trackingId: string;
  unsubscribeUrl: string;
  appBase: string;
}): string {
  // Personalize
  const personalized = opts.bodyHtml
    .replace(/\{\{first_name\}\}/gi, opts.contactFirstName || "there")
    .replace(/\{\{name\}\}/gi, opts.contactFirstName || "there")
    .replace(/\{\{firstname\}\}/gi, opts.contactFirstName || "there");

  // Wrap links in click tracker
  const tracked = personalized.replace(
    /<a(\s[^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (_m, before, url, after) => {
      const trackUrl = `${opts.appBase}/api/em/track/click/${opts.trackingId}?url=${encodeURIComponent(url)}`;
      return `<a${before}href="${trackUrl}"${after}>`;
    }
  );

  const openPixel = `<img src="${opts.appBase}/api/em/track/open/${opts.trackingId}.gif" width="1" height="1" style="display:none;border:0" alt="" />`;

  // Preview text hack — renders in email preview pane but not in body
  const preview = opts.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fff;opacity:0;">${opts.previewText}${"&zwnj;&nbsp;".repeat(40)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title></title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preview}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
  <tr>
    <td align="center" style="padding:40px 16px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
        <!-- From line -->
        <tr>
          <td style="padding-bottom:20px;border-bottom:1px solid #eeeeee;">
            <span style="font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#aaaaaa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${opts.fromName}</span>
          </td>
        </tr>
        <!-- Body content -->
        <tr>
          <td style="padding-top:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.75;color:#1a1a1a;">
            ${tracked}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding-top:40px;padding-bottom:32px;border-top:1px solid #eeeeee;margin-top:40px;">
            <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#aaaaaa;margin:0;">
              You're receiving this email because you subscribed to updates from ${opts.fromName}.<br>
              <a href="${opts.unsubscribeUrl}" style="color:#aaaaaa;text-decoration:underline;">Unsubscribe</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${opts.unsubscribeUrl}" style="color:#aaaaaa;text-decoration:underline;">Manage preferences</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
${openPixel}
</body>
</html>`;
}

function buildEmailText(opts: {
  bodyHtml: string;
  fromName: string;
  contactFirstName: string;
  unsubscribeUrl: string;
}): string {
  const text = opts.bodyHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\{\{first_name\}\}/gi, opts.contactFirstName || "there")
    .replace(/\{\{name\}\}/gi, opts.contactFirstName || "there")
    .trim();

  return `${text}\n\n---\nYou're receiving this because you subscribed to updates from ${opts.fromName}.\nUnsubscribe: ${opts.unsubscribeUrl}`;
}

async function getOrRefreshGmailToken(userId: string): Promise<{ accessToken: string; email: string; displayName: string } | null> {
  const [token] = await pool.query(
    `SELECT * FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`, [userId]
  ).then(r => r.rows);
  if (!token) return null;

  // Refresh if expired or will expire in 5 minutes
  const expiresAt = token.token_expires_at ? new Date(token.token_expires_at) : null;
  if (expiresAt && expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const { google } = await import("googleapis");
      const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );
      oauth2.setCredentials({ refresh_token: token.refresh_token });
      const { credentials } = await oauth2.refreshAccessToken();
      await pool.query(
        `UPDATE em_oauth_tokens SET access_token = $1, token_expires_at = $2, updated_at = NOW() WHERE user_id = $3 AND provider = 'gmail'`,
        [credentials.access_token, credentials.expiry_date ? new Date(credentials.expiry_date) : null, userId]
      );
      return { accessToken: credentials.access_token!, email: token.email, displayName: token.display_name };
    } catch { return null; }
  }

  return { accessToken: token.access_token, email: token.email, displayName: token.display_name };
}

async function canSendToday(userId: string): Promise<{ canSend: boolean; limit: number; sent: number; provider: string }> {
  // Check Gmail token first
  const [gmailToken] = await pool.query(
    `SELECT today_sent, last_send_date, warmup_start_date FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`, [userId]
  ).then(r => r.rows);

  if (gmailToken) {
    const today = new Date().toISOString().split("T")[0];
    const todaySent = gmailToken.last_send_date?.toISOString?.()?.split("T")[0] === today ? (gmailToken.today_sent || 0) : 0;
    const limit = getWarmupDailyLimit(new Date(gmailToken.warmup_start_date || Date.now()), 500);
    return { canSend: todaySent < limit, limit, sent: todaySent, provider: "gmail" };
  }

  // Fall back to SMTP config
  const [smtp] = await pool.query(
    `SELECT today_sent, last_send_date, warmup_start_date, daily_send_limit, warming_enabled FROM em_smtp_configs WHERE user_id = $1 AND is_verified = true`, [userId]
  ).then(r => r.rows);

  if (smtp) {
    const today = new Date().toISOString().split("T")[0];
    const todaySent = smtp.last_send_date?.toISOString?.()?.split("T")[0] === today ? (smtp.today_sent || 0) : 0;
    const limit = smtp.warming_enabled
      ? getWarmupDailyLimit(new Date(smtp.warmup_start_date || Date.now()), smtp.daily_send_limit || 500)
      : (smtp.daily_send_limit || 500);
    return { canSend: todaySent < limit, limit, sent: todaySent, provider: "smtp" };
  }

  return { canSend: false, limit: 0, sent: 0, provider: "none" };
}

async function incrementSendCount(userId: string, provider: "gmail" | "smtp") {
  const today = new Date().toISOString().split("T")[0];
  if (provider === "gmail") {
    await pool.query(`
      UPDATE em_oauth_tokens
      SET today_sent = CASE WHEN last_send_date::date = CURRENT_DATE THEN today_sent + 1 ELSE 1 END,
          last_send_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE user_id = $1 AND provider = 'gmail'
    `, [userId]);
  } else {
    await pool.query(`
      UPDATE em_smtp_configs
      SET today_sent = CASE WHEN last_send_date::date = CURRENT_DATE THEN today_sent + 1 ELSE 1 END,
          last_send_date = CURRENT_DATE
      WHERE user_id = $1
    `, [userId]);
  }
}

export async function processEmSendQueue() {
  try {
    const appBase = process.env.APP_URL?.replace(/\/$/, "") || `http://localhost:${process.env.PORT || "5000"}`;

    // Get due enrollments
    const due = await pool.query(`
      SELECT e.id AS enrollment_id, e.user_id, e.sequence_id, e.contact_id, e.current_step,
             s.name AS seq_name, s.from_name, s.reply_to, s.status AS seq_status,
             c.email AS contact_email, c.first_name, c.unsubscribe_token,
             st.id AS step_id, st.subject, st.preview_text, st.body_html, st.body_text,
             st.delay_days, st.delay_hours, st.step_number,
             (SELECT COUNT(*) FROM em_steps WHERE sequence_id = e.sequence_id)::int AS total_steps
      FROM em_enrollments e
      JOIN em_sequences s ON s.id = e.sequence_id
      JOIN em_contacts c ON c.id = e.contact_id
      JOIN em_steps st ON st.sequence_id = e.sequence_id AND st.step_number = e.current_step + 1
      WHERE e.status = 'active'
        AND e.next_send_at <= NOW()
        AND s.status = 'active'
        AND c.subscribed = true
        AND NOT EXISTS (
          SELECT 1 FROM em_suppressions sup
          WHERE sup.user_id = e.user_id AND LOWER(sup.email) = LOWER(c.email)
        )
      ORDER BY e.next_send_at ASC
      LIMIT 50
    `).then(r => r.rows);

    if (!due.length) return;

    // Group by user to respect per-user limits
    const byUser: Record<string, typeof due> = {};
    for (const row of due) {
      if (!byUser[row.user_id]) byUser[row.user_id] = [];
      byUser[row.user_id].push(row);
    }

    for (const [userId, enrollments] of Object.entries(byUser)) {
      const sendStatus = await canSendToday(userId);
      let sent = sendStatus.sent;

      for (const e of enrollments) {
        if (sent >= sendStatus.limit) {
          console.log(`[em] Daily limit reached for user ${userId}: ${sent}/${sendStatus.limit}`);
          break;
        }

        try {
          // Build tracking ID
          const trackingId = randomUUID();
          const unsubToken = e.unsubscribe_token || randomUUID();
          if (!e.unsubscribe_token) {
            await pool.query(`UPDATE em_contacts SET unsubscribe_token = $1 WHERE id = $2`, [unsubToken, e.contact_id]);
          }

          const unsubscribeUrl = `${appBase}/api/em/unsubscribe/${unsubToken}`;
          const fromName = e.from_name || "The Team";

          const html = buildEmailHtml({
            bodyHtml: e.body_html,
            previewText: e.preview_text,
            fromName,
            contactFirstName: e.first_name || "",
            trackingId,
            unsubscribeUrl,
            appBase,
          });

          const text = buildEmailText({
            bodyHtml: e.body_html,
            fromName,
            contactFirstName: e.first_name || "",
            unsubscribeUrl,
          });

          const subject = (e.subject || "")
            .replace(/\{\{first_name\}\}/gi, e.first_name || "there")
            .replace(/\{\{name\}\}/gi, e.first_name || "there");

          // Send via Gmail OAuth or SMTP
          let sendOk = false;
          let sendError = "";

          if (sendStatus.provider === "gmail") {
            const token = await getOrRefreshGmailToken(userId);
            if (token) {
              try {
                const nodemailer = await import("nodemailer");
                const transporter = nodemailer.default.createTransport({
                  service: "gmail",
                  auth: {
                    type: "OAuth2",
                    user: token.email,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    refreshToken: (await pool.query(
                      `SELECT refresh_token FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`, [userId]
                    ).then(r => r.rows[0]?.refresh_token)),
                    accessToken: token.accessToken,
                  },
                } as any);

                const replyToAddr = e.reply_to || token.email;
                const fromLabel = e.from_name || token.displayName || token.email;

                await transporter.sendMail({
                  from: `"${fromLabel}" <${token.email}>`,
                  to: e.contact_email,
                  subject,
                  html,
                  text,
                  replyTo: replyToAddr,
                  headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                  },
                });
                sendOk = true;
              } catch (err: any) { sendError = err.message; }
            }
          } else if (sendStatus.provider === "smtp") {
            const [smtp] = await pool.query(
              `SELECT * FROM em_smtp_configs WHERE user_id = $1`, [userId]
            ).then(r => r.rows);
            if (smtp?.username && smtp?.password) {
              try {
                const nodemailer = await import("nodemailer");
                const transporter = nodemailer.default.createTransport({
                  host: smtp.host, port: smtp.port || 587,
                  secure: smtp.secure || false,
                  auth: { user: smtp.username, pass: smtp.password },
                });
                await transporter.sendMail({
                  from: smtp.from_name ? `"${smtp.from_name}" <${smtp.from_email || smtp.username}>` : (smtp.from_email || smtp.username),
                  to: e.contact_email,
                  subject,
                  html,
                  text,
                  replyTo: smtp.reply_to || smtp.from_email || smtp.username,
                  headers: {
                    "List-Unsubscribe": `<${unsubscribeUrl}>`,
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                  },
                });
                sendOk = true;
              } catch (err: any) { sendError = err.message; }
            }
          }

          if (!sendOk) {
            console.error(`[em] Send failed for enrollment ${e.enrollment_id}: ${sendError}`);
            await pool.query(
              `UPDATE em_enrollments SET status = 'failed', completed_at = NOW() WHERE id = $1`,
              [e.enrollment_id]
            );
            continue;
          }

          // Log the send
          await pool.query(`
            INSERT INTO em_sends (user_id, step_id, contact_id, sequence_id, status, tracking_id, sent_at)
            VALUES ($1, $2, $3, $4, 'sent', $5, NOW())
          `, [userId, e.step_id, e.contact_id, e.sequence_id, trackingId]);

          // Update sequence stats
          await pool.query(`UPDATE em_sequences SET total_sent = total_sent + 1 WHERE id = $1`, [e.sequence_id]);

          // Advance enrollment
          const isLast = e.current_step + 1 >= e.total_steps;

          // Determine next step and its delay
          if (isLast) {
            await pool.query(
              `UPDATE em_enrollments SET current_step = $1, status = 'completed', completed_at = NOW(), next_send_at = NULL WHERE id = $2`,
              [e.current_step + 1, e.enrollment_id]
            );
          } else {
            // Get next step delay
            const [nextStep] = await pool.query(`
              SELECT delay_days, delay_hours FROM em_steps
              WHERE sequence_id = $1 AND step_number = $2
            `, [e.sequence_id, e.current_step + 2]).then(r => r.rows);

            const delayMs = ((nextStep?.delay_days || 0) * 24 * 60 * 60 * 1000) +
                            ((nextStep?.delay_hours || 1) * 60 * 60 * 1000);

            // Optimize send time: push to next 9am-11am UTC window
            let nextSendAt = new Date(Date.now() + delayMs);
            const h = nextSendAt.getUTCHours();
            if (h < 9 || h >= 17) {
              // Schedule for 9am UTC next day
              nextSendAt.setUTCHours(9, 0, 0, 0);
              if (h >= 17) nextSendAt.setUTCDate(nextSendAt.getUTCDate() + 1);
            }

            await pool.query(
              `UPDATE em_enrollments SET current_step = $1, next_send_at = $2 WHERE id = $3`,
              [e.current_step + 1, nextSendAt, e.enrollment_id]
            );
          }

          await incrementSendCount(userId, sendStatus.provider as "gmail" | "smtp");
          sent++;

          console.log(`[em] Sent step ${e.current_step + 1} to ${e.contact_email} (sequence: ${e.seq_name})`);

          // Small delay between sends to avoid rate limits
          await new Promise(r => setTimeout(r, 300));

        } catch (err: any) {
          console.error(`[em] Error processing enrollment ${e.enrollment_id}: ${err.message}`);
        }
      }
    }
  } catch (e: any) {
    console.error(`[em] processEmSendQueue error: ${e.message}`);
  }
}

export async function processBroadcastQueue() {
  try {
    const appBase = process.env.APP_URL?.replace(/\/$/, "") || `http://localhost:${process.env.PORT || "5000"}`;

    const pending = await pool.query(`
      SELECT bs.id AS send_id, bs.broadcast_id, bs.contact_id, bs.user_id, bs.tracking_id,
             b.subject, b.preview_text, b.body_html, b.from_name, b.from_email, b.reply_to,
             c.email AS contact_email, c.first_name, c.unsubscribe_token
      FROM em_broadcast_sends bs
      JOIN em_broadcasts b ON b.id = bs.broadcast_id
      JOIN em_contacts c ON c.id = bs.contact_id
      WHERE bs.status = 'pending'
        AND b.status = 'sending'
        AND c.subscribed = true
        AND NOT EXISTS (
          SELECT 1 FROM em_suppressions sup
          WHERE sup.user_id = bs.user_id AND LOWER(sup.email) = LOWER(c.email)
        )
      ORDER BY bs.id ASC
      LIMIT 100
    `).then(r => r.rows);

    if (!pending.length) return;

    const byUser: Record<string, typeof pending> = {};
    for (const row of pending) {
      if (!byUser[row.user_id]) byUser[row.user_id] = [];
      byUser[row.user_id].push(row);
    }

    for (const [userId, sends] of Object.entries(byUser)) {
      const sendStatus = await canSendToday(userId);
      let sent = sendStatus.sent;

      for (const s of sends) {
        if (sent >= sendStatus.limit) break;

        try {
          const unsubToken = s.unsubscribe_token || randomUUID();
          if (!s.unsubscribe_token) {
            await pool.query(`UPDATE em_contacts SET unsubscribe_token = $1 WHERE id = $2`, [unsubToken, s.contact_id]);
          }
          const unsubscribeUrl = `${appBase}/api/em/unsubscribe/${unsubToken}`;
          const fromName = s.from_name || "The Team";

          const html = buildEmailHtml({
            bodyHtml: s.body_html,
            previewText: s.preview_text,
            fromName,
            contactFirstName: s.first_name || "",
            trackingId: s.tracking_id,
            unsubscribeUrl,
            appBase,
          }).replace(
            /\/api\/em\/track\/(open|click)\//g,
            "/api/em/broadcast/track/$1/"
          );

          const text = buildEmailText({
            bodyHtml: s.body_html,
            fromName,
            contactFirstName: s.first_name || "",
            unsubscribeUrl,
          });

          const subject = (s.subject || "")
            .replace(/\{\{first_name\}\}/gi, s.first_name || "there")
            .replace(/\{\{name\}\}/gi, s.first_name || "there");

          let sendOk = false;

          if (sendStatus.provider === "gmail") {
            const token = await getOrRefreshGmailToken(userId);
            if (token) {
              const nodemailer = await import("nodemailer");
              const transporter = nodemailer.default.createTransport({
                service: "gmail",
                auth: {
                  type: "OAuth2",
                  user: token.email,
                  clientId: process.env.GOOGLE_CLIENT_ID,
                  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                  refreshToken: (await pool.query(
                    `SELECT refresh_token FROM em_oauth_tokens WHERE user_id = $1 AND provider = 'gmail'`, [userId]
                  ).then(r => r.rows[0]?.refresh_token)),
                  accessToken: token.accessToken,
                },
              } as any);
              await transporter.sendMail({
                from: `"${s.from_name || token.displayName || token.email}" <${token.email}>`,
                to: s.contact_email,
                subject,
                html,
                text,
                replyTo: s.reply_to || token.email,
                headers: {
                  "List-Unsubscribe": `<${unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              });
              sendOk = true;
            }
          } else if (sendStatus.provider === "smtp") {
            const [smtp] = await pool.query(
              `SELECT * FROM em_smtp_configs WHERE user_id = $1`, [userId]
            ).then(r => r.rows);
            if (smtp?.username && smtp?.password) {
              const nodemailer = await import("nodemailer");
              const transporter = nodemailer.default.createTransport({
                host: smtp.host, port: smtp.port || 587,
                secure: smtp.secure || false,
                auth: { user: smtp.username, pass: smtp.password },
              });
              await transporter.sendMail({
                from: smtp.from_name ? `"${smtp.from_name}" <${smtp.from_email || smtp.username}>` : (smtp.from_email || smtp.username),
                to: s.contact_email,
                subject,
                html,
                text,
                replyTo: smtp.reply_to || smtp.from_email || smtp.username,
                headers: {
                  "List-Unsubscribe": `<${unsubscribeUrl}>`,
                  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
              });
              sendOk = true;
            }
          }

          await pool.query(
            `UPDATE em_broadcast_sends SET status = $1, sent_at = $2 WHERE id = $3`,
            [sendOk ? "sent" : "failed", sendOk ? new Date() : null, s.send_id]
          );

          if (sendOk) {
            await pool.query(
              `UPDATE em_broadcasts SET sent_count = sent_count + 1 WHERE id = $1`,
              [s.broadcast_id]
            );
            await incrementSendCount(userId, sendStatus.provider as "gmail" | "smtp");
            sent++;
          }

          await new Promise(r => setTimeout(r, 300));
        } catch (err: any) {
          console.error(`[broadcast] send error for ${s.contact_email}: ${err.message}`);
          await pool.query(`UPDATE em_broadcast_sends SET status = 'failed' WHERE id = $1`, [s.send_id]);
        }
      }

      // Mark broadcast complete if all sends done
      const [remaining] = await pool.query(
        `SELECT COUNT(*) FROM em_broadcast_sends WHERE broadcast_id IN (
           SELECT DISTINCT broadcast_id FROM em_broadcast_sends WHERE user_id = $1
         ) AND status = 'pending'`,
        [userId]
      ).then(r => r.rows);
      if (Number(remaining?.count) === 0) {
        await pool.query(
          `UPDATE em_broadcasts SET status = 'sent', sent_at = NOW()
           WHERE user_id = $1 AND status = 'sending'`,
          [userId]
        );
      }
    }
  } catch (e: any) {
    console.error(`[broadcast] processBroadcastQueue error: ${e.message}`);
  }
}
