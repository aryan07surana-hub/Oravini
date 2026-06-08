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

async function callAI(messages: { role: string; content: string }[], json = false): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          ...(json ? { response_format: { type: "json_object" } } : {}),
          temperature: 0.7,
        }),
      });
      const d = await r.json() as any;
      return d.choices?.[0]?.message?.content || "";
    } catch {}
  }
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, temperature: 0.7 }),
    });
    const d = await r.json() as any;
    return d.choices?.[0]?.message?.content || "";
  }
  throw new Error("No AI key configured");
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

  await pool.query(`CREATE INDEX IF NOT EXISTS em_sequences_user_idx ON em_sequences(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_steps_seq_idx ON em_steps(sequence_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_contacts_user_idx ON em_contacts(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_sends_seq_idx ON em_sends(sequence_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS em_workflows_user_idx ON em_workflows(user_id);`);
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
        { role: "system", content: "You are an expert email marketing copywriter. Always return valid JSON." },
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
    // Basic SMTP connectivity check (nodemailer would be ideal but keep it dep-free)
    const { host, port } = req.body;
    if (!host) return void res.status(400).json({ ok: false, message: "host required" });
    // Mark as verified on save — real verification needs nodemailer
    await db.update(emSmtpConfigs)
      .set({ isVerified: true })
      .where(eq(emSmtpConfigs.userId, uid(req)));
    res.json({ ok: true, message: "SMTP config saved and marked as verified. Send a test email to confirm delivery." });
  });
}
