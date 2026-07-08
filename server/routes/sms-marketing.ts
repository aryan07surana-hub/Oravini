import type { Express, Request, Response } from "express";
import { pool } from "../storage";
import { randomUUID } from "crypto";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(req: Request): string {
  return (req as any).user?.id;
}

function twilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Twilio credentials not configured");
  const twilio = require("twilio");
  return twilio(accountSid, authToken);
}

async function skillsPrefix(userId: string, base: string): Promise<string> {
  try {
    const { buildSkillsPrompt } = await import("../skillsEngine");
    const block = await buildSkillsPrompt(userId, { category: "sms" });
    return block ? `${block}\n\n${base}` : base;
  } catch { return base; }
}

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("No AI key configured");
  const model = "llama-3.3-70b-versatile";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });
  const d = await r.json() as any;
  return d.choices?.[0]?.message?.content || "";
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

let __booted = false;
let __booting: Promise<void> | null = null;

export async function bootstrapSmsMarketing() {
  if (__booted) return;
  if (!__booting) __booting = doBootstrap().then(
    () => { __booted = true; },
    (e) => { __booting = null; console.error("[sms-marketing] bootstrap failed:", e); throw e; },
  );
  await __booting;
}

async function doBootstrap() {
  // Provisioned Twilio phone numbers per user
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_phone_numbers (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone_number TEXT NOT NULL UNIQUE,
      friendly_name TEXT,
      twilio_sid TEXT NOT NULL,
      country_code TEXT NOT NULL DEFAULT 'US',
      capabilities JSONB NOT NULL DEFAULT '{"sms": true, "voice": false}',
      monthly_cost NUMERIC(10,4) NOT NULL DEFAULT 1.00,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // SMS Contacts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_contacts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      tags TEXT[] DEFAULT '{}',
      custom_fields JSONB DEFAULT '{}',
      opted_in BOOLEAN NOT NULL DEFAULT true,
      opted_in_at TIMESTAMPTZ DEFAULT NOW(),
      opted_out_at TIMESTAMPTZ,
      source TEXT DEFAULT 'manual',
      last_messaged_at TIMESTAMPTZ,
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, phone)
    );
  `);

  // SMS Conversations (per contact, per phone number)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_conversations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_number TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      contact_id TEXT REFERENCES sms_contacts(id) ON DELETE SET NULL,
      last_message TEXT,
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      unread_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, from_number, contact_phone)
    );
  `);

  // Individual messages in a conversation
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_messages (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      conversation_id TEXT NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      direction TEXT NOT NULL DEFAULT 'outbound',
      body TEXT NOT NULL,
      twilio_sid TEXT,
      status TEXT NOT NULL DEFAULT 'queued',
      error_code TEXT,
      sent_at TIMESTAMPTZ DEFAULT NOW(),
      delivered_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ
    );
  `);

  // SMS Campaigns (one-time broadcasts)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_campaigns (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      from_number TEXT NOT NULL,
      segment TEXT NOT NULL DEFAULT 'all',
      tags TEXT[] DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      recipients_count INTEGER NOT NULL DEFAULT 0,
      delivered_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      opt_out_count INTEGER NOT NULL DEFAULT 0,
      ai_generated BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // SMS Automations (drip sequences)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_automations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      from_number TEXT NOT NULL,
      trigger_type TEXT NOT NULL DEFAULT 'keyword',
      trigger_value TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      enrolled_count INTEGER NOT NULL DEFAULT 0,
      ai_generated BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Automation steps
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_automation_steps (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      automation_id TEXT NOT NULL REFERENCES sms_automations(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL DEFAULT 1,
      message TEXT NOT NULL,
      delay_minutes INTEGER NOT NULL DEFAULT 0,
      delay_unit TEXT NOT NULL DEFAULT 'minutes',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Automation enrollments
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_automation_enrollments (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      automation_id TEXT NOT NULL REFERENCES sms_automations(id) ON DELETE CASCADE,
      contact_phone TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      current_step INTEGER NOT NULL DEFAULT 0,
      completed BOOLEAN NOT NULL DEFAULT false,
      opted_out BOOLEAN NOT NULL DEFAULT false,
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      next_send_at TIMESTAMPTZ,
      UNIQUE(automation_id, contact_phone)
    );
  `);

  // Keywords (auto-reply triggers)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_keywords (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_number TEXT NOT NULL,
      keyword TEXT NOT NULL,
      reply TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'reply',
      automation_id TEXT REFERENCES sms_automations(id) ON DELETE SET NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      match_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, from_number, keyword)
    );
  `);

  // Opt-out registry
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_optouts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      opted_out_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, phone)
    );
  `);

  // Delivery status log
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_delivery_log (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      message_id TEXT REFERENCES sms_messages(id) ON DELETE SET NULL,
      twilio_sid TEXT,
      status TEXT NOT NULL,
      error_code TEXT,
      error_message TEXT,
      logged_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Link shortener + click tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_short_links (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      original_url TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

// ── Route Registration ────────────────────────────────────────────────────────

export function registerSmsMarketingRoutes(app: Express, requireAuth: any) {

  app.use("/api/sms", requireAuth, async (_req: Request, res: Response, next: any) => {
    try { await bootstrapSmsMarketing(); next(); }
    catch (e: any) { res.status(500).json({ ok: false, message: "SMS Marketing init failed" }); }
  });

  // ── PHONE NUMBERS ──────────────────────────────────────────────────────────

  // Search available numbers
  app.get("/api/sms/numbers/search", async (req: Request, res: Response) => {
    try {
      const client = twilioClient();
      const areaCode = (req.query.areaCode as string) || "";
      const contains = (req.query.contains as string) || "";
      const country = (req.query.country as string) || "US";

      const params: any = { limit: 20, smsEnabled: true };
      if (areaCode) params.areaCode = areaCode;
      if (contains) params.contains = contains;

      const numbers = await client.availablePhoneNumbers(country).local.list(params);
      res.json(numbers.map((n: any) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality,
        region: n.region,
        isoCountry: n.isoCountry,
        capabilities: n.capabilities,
        monthlyCost: 1.00,
      })));
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // Search toll-free numbers
  app.get("/api/sms/numbers/search-tollfree", async (req: Request, res: Response) => {
    try {
      const client = twilioClient();
      const numbers = await client.availablePhoneNumbers("US").tollFree.list({ limit: 10, smsEnabled: true });
      res.json(numbers.map((n: any) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        isoCountry: n.isoCountry,
        capabilities: n.capabilities,
        monthlyCost: 2.00,
        type: "toll-free",
      })));
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // Buy / provision a number
  app.post("/api/sms/numbers/provision", async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) return void res.status(400).json({ ok: false, message: "phoneNumber required" });

      const userId = uid(req);
      const client = twilioClient();
      const appUrl = process.env.APP_URL || "http://localhost:3001";

      const purchased = await client.incomingPhoneNumbers.create({
        phoneNumber,
        smsUrl: `${appUrl}/api/sms/webhook/inbound`,
        smsMethod: "POST",
        statusCallback: `${appUrl}/api/sms/webhook/status`,
        statusCallbackMethod: "POST",
      });

      const result = await pool.query(
        `INSERT INTO sms_phone_numbers (id, user_id, phone_number, friendly_name, twilio_sid, country_code, capabilities, monthly_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (phone_number) DO UPDATE SET user_id = $2, twilio_sid = $5, status = 'active'
         RETURNING *`,
        [randomUUID(), userId, purchased.phoneNumber, purchased.friendlyName, purchased.sid,
         purchased.countryCode || "US", JSON.stringify(purchased.capabilities), 1.00]
      );

      res.json({ ok: true, number: result.rows[0] });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // List owned numbers
  app.get("/api/sms/numbers", async (req: Request, res: Response) => {
    const r = await pool.query(
      `SELECT * FROM sms_phone_numbers WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC`,
      [uid(req)]
    );
    res.json(r.rows);
  });

  // Release (delete) a number
  app.delete("/api/sms/numbers/:id", async (req: Request, res: Response) => {
    try {
      const r = await pool.query(
        `SELECT * FROM sms_phone_numbers WHERE id = $1 AND user_id = $2`,
        [req.params.id, uid(req)]
      );
      if (!r.rows[0]) return void res.status(404).json({ ok: false, message: "Number not found" });

      const client = twilioClient();
      await client.incomingPhoneNumbers(r.rows[0].twilio_sid).remove();
      await pool.query(
        `UPDATE sms_phone_numbers SET status = 'released' WHERE id = $1`,
        [req.params.id]
      );
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // ── CONTACTS ───────────────────────────────────────────────────────────────

  app.get("/api/sms/contacts", async (req: Request, res: Response) => {
    const { tag, search, page = "1", limit = "50" } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = `WHERE user_id = $1`;
    const params: any[] = [uid(req)];
    let i = 2;
    if (tag) { where += ` AND $${i} = ANY(tags)`; params.push(tag); i++; }
    if (search) { where += ` AND (phone ILIKE $${i} OR first_name ILIKE $${i} OR last_name ILIKE $${i} OR email ILIKE $${i})`; params.push(`%${search}%`); i++; }
    const r = await pool.query(
      `SELECT * FROM sms_contacts ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
      [...params, parseInt(limit), offset]
    );
    const count = await pool.query(`SELECT COUNT(*) FROM sms_contacts ${where}`, params);
    res.json({ contacts: r.rows, total: parseInt(count.rows[0].count) });
  });

  app.post("/api/sms/contacts", async (req: Request, res: Response) => {
    const { phone, firstName, lastName, email, tags, customFields, source } = req.body;
    if (!phone) return void res.status(400).json({ ok: false, message: "phone required" });
    const r = await pool.query(
      `INSERT INTO sms_contacts (id, user_id, phone, first_name, last_name, email, tags, custom_fields, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, phone) DO UPDATE SET first_name = $4, last_name = $5, email = $6, tags = $7
       RETURNING *`,
      [randomUUID(), uid(req), phone, firstName || null, lastName || null, email || null,
       tags || [], JSON.stringify(customFields || {}), source || "manual"]
    );
    res.json(r.rows[0]);
  });

  app.patch("/api/sms/contacts/:id", async (req: Request, res: Response) => {
    const { firstName, lastName, email, tags, customFields, optedIn } = req.body;
    const r = await pool.query(
      `UPDATE sms_contacts SET first_name = COALESCE($3, first_name), last_name = COALESCE($4, last_name),
       email = COALESCE($5, email), tags = COALESCE($6, tags), custom_fields = COALESCE($7, custom_fields),
       opted_in = COALESCE($8, opted_in)
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, uid(req), firstName, lastName, email, tags, customFields ? JSON.stringify(customFields) : null, optedIn]
    );
    if (!r.rows[0]) return void res.status(404).json({ ok: false, message: "Not found" });
    res.json(r.rows[0]);
  });

  app.delete("/api/sms/contacts/:id", async (req: Request, res: Response) => {
    await pool.query(`DELETE FROM sms_contacts WHERE id = $1 AND user_id = $2`, [req.params.id, uid(req)]);
    res.json({ ok: true });
  });

  // Bulk import contacts from CSV data
  app.post("/api/sms/contacts/import", async (req: Request, res: Response) => {
    const { contacts } = req.body as { contacts: any[] };
    if (!Array.isArray(contacts) || !contacts.length) {
      return void res.status(400).json({ ok: false, message: "contacts array required" });
    }
    let imported = 0; let skipped = 0;
    for (const c of contacts) {
      if (!c.phone) { skipped++; continue; }
      try {
        await pool.query(
          `INSERT INTO sms_contacts (id, user_id, phone, first_name, last_name, email, tags, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'import')
           ON CONFLICT (user_id, phone) DO NOTHING`,
          [randomUUID(), uid(req), c.phone, c.firstName || c.first_name || null,
           c.lastName || c.last_name || null, c.email || null, c.tags || []]
        );
        imported++;
      } catch { skipped++; }
    }
    res.json({ ok: true, imported, skipped });
  });

  // ── CAMPAIGNS (Broadcasts) ─────────────────────────────────────────────────

  app.get("/api/sms/campaigns", async (req: Request, res: Response) => {
    const r = await pool.query(
      `SELECT * FROM sms_campaigns WHERE user_id = $1 ORDER BY created_at DESC`,
      [uid(req)]
    );
    res.json(r.rows);
  });

  app.post("/api/sms/campaigns", async (req: Request, res: Response) => {
    const { name, message, fromNumber, segment, tags, scheduledAt } = req.body;
    if (!name || !message || !fromNumber) {
      return void res.status(400).json({ ok: false, message: "name, message, fromNumber required" });
    }
    const r = await pool.query(
      `INSERT INTO sms_campaigns (id, user_id, name, message, from_number, segment, tags, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [randomUUID(), uid(req), name, message, fromNumber, segment || "all", tags || [], scheduledAt || null]
    );
    res.json(r.rows[0]);
  });

  app.patch("/api/sms/campaigns/:id", async (req: Request, res: Response) => {
    const { name, message, fromNumber, segment, tags, scheduledAt, status } = req.body;
    const r = await pool.query(
      `UPDATE sms_campaigns SET name = COALESCE($3, name), message = COALESCE($4, message),
       from_number = COALESCE($5, from_number), segment = COALESCE($6, segment),
       tags = COALESCE($7, tags), scheduled_at = COALESCE($8, scheduled_at), status = COALESCE($9, status)
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, uid(req), name, message, fromNumber, segment, tags, scheduledAt, status]
    );
    if (!r.rows[0]) return void res.status(404).json({ ok: false, message: "Not found" });
    res.json(r.rows[0]);
  });

  app.delete("/api/sms/campaigns/:id", async (req: Request, res: Response) => {
    await pool.query(
      `DELETE FROM sms_campaigns WHERE id = $1 AND user_id = $2 AND status = 'draft'`,
      [req.params.id, uid(req)]
    );
    res.json({ ok: true });
  });

  // Send campaign now
  app.post("/api/sms/campaigns/:id/send", async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const campaign = (await pool.query(
        `SELECT * FROM sms_campaigns WHERE id = $1 AND user_id = $2`,
        [req.params.id, userId]
      )).rows[0];
      if (!campaign) return void res.status(404).json({ ok: false, message: "Campaign not found" });
      if (campaign.status === "sent") return void res.status(400).json({ ok: false, message: "Already sent" });

      // Get contacts based on segment
      let contactQuery = `SELECT phone FROM sms_contacts WHERE user_id = $1 AND opted_in = true`;
      const contactParams: any[] = [userId];
      if (campaign.segment === "tagged" && campaign.tags?.length) {
        contactQuery += ` AND tags && $2`;
        contactParams.push(campaign.tags);
      }

      // Exclude opted-out
      contactQuery += ` AND phone NOT IN (SELECT phone FROM sms_optouts WHERE user_id = $1)`;
      const contacts = (await pool.query(contactQuery, contactParams)).rows;

      if (!contacts.length) {
        return void res.status(400).json({ ok: false, message: "No eligible contacts" });
      }

      const client = twilioClient();
      let sent = 0; let failed = 0;

      for (const contact of contacts) {
        try {
          const msg = await client.messages.create({
            body: campaign.message,
            from: campaign.from_number,
            to: contact.phone,
          });

          // Log the message
          const conv = await getOrCreateConversation(userId, campaign.from_number, contact.phone);
          await pool.query(
            `INSERT INTO sms_messages (id, conversation_id, user_id, direction, body, twilio_sid, status)
             VALUES ($1, $2, $3, 'outbound', $4, $5, 'queued')`,
            [randomUUID(), conv.id, userId, campaign.message, msg.sid]
          );
          sent++;
        } catch { failed++; }
      }

      await pool.query(
        `UPDATE sms_campaigns SET status = 'sent', sent_at = NOW(), recipients_count = $3, delivered_count = $4, failed_count = $5
         WHERE id = $1 AND user_id = $2`,
        [req.params.id, userId, contacts.length, sent, failed]
      );

      res.json({ ok: true, sent, failed, total: contacts.length });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // ── AUTOMATIONS ────────────────────────────────────────────────────────────

  app.get("/api/sms/automations", async (req: Request, res: Response) => {
    const r = await pool.query(
      `SELECT a.*,
        (SELECT COUNT(*) FROM sms_automation_steps WHERE automation_id = a.id) as step_count
       FROM sms_automations a WHERE a.user_id = $1 ORDER BY a.created_at DESC`,
      [uid(req)]
    );
    res.json(r.rows);
  });

  app.post("/api/sms/automations", async (req: Request, res: Response) => {
    const { name, description, fromNumber, triggerType, triggerValue } = req.body;
    if (!name || !fromNumber) return void res.status(400).json({ ok: false, message: "name and fromNumber required" });
    const r = await pool.query(
      `INSERT INTO sms_automations (id, user_id, name, description, from_number, trigger_type, trigger_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [randomUUID(), uid(req), name, description || null, fromNumber, triggerType || "keyword", triggerValue || null]
    );
    res.json(r.rows[0]);
  });

  app.get("/api/sms/automations/:id", async (req: Request, res: Response) => {
    const a = (await pool.query(
      `SELECT * FROM sms_automations WHERE id = $1 AND user_id = $2`,
      [req.params.id, uid(req)]
    )).rows[0];
    if (!a) return void res.status(404).json({ ok: false, message: "Not found" });
    const steps = (await pool.query(
      `SELECT * FROM sms_automation_steps WHERE automation_id = $1 ORDER BY step_number`,
      [req.params.id]
    )).rows;
    res.json({ ...a, steps });
  });

  app.patch("/api/sms/automations/:id", async (req: Request, res: Response) => {
    const { name, description, fromNumber, triggerType, triggerValue, status } = req.body;
    const r = await pool.query(
      `UPDATE sms_automations SET name = COALESCE($3, name), description = COALESCE($4, description),
       from_number = COALESCE($5, from_number), trigger_type = COALESCE($6, trigger_type),
       trigger_value = COALESCE($7, trigger_value), status = COALESCE($8, status), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, uid(req), name, description, fromNumber, triggerType, triggerValue, status]
    );
    if (!r.rows[0]) return void res.status(404).json({ ok: false, message: "Not found" });
    res.json(r.rows[0]);
  });

  app.delete("/api/sms/automations/:id", async (req: Request, res: Response) => {
    await pool.query(`DELETE FROM sms_automations WHERE id = $1 AND user_id = $2`, [req.params.id, uid(req)]);
    res.json({ ok: true });
  });

  // Automation steps
  app.post("/api/sms/automations/:id/steps", async (req: Request, res: Response) => {
    const { message, delayMinutes, delayUnit, stepNumber } = req.body;
    if (!message) return void res.status(400).json({ ok: false, message: "message required" });
    const countR = await pool.query(
      `SELECT COUNT(*) FROM sms_automation_steps WHERE automation_id = $1`, [req.params.id]
    );
    const nextStep = (stepNumber || 0) || parseInt(countR.rows[0].count) + 1;
    const r = await pool.query(
      `INSERT INTO sms_automation_steps (id, automation_id, step_number, message, delay_minutes, delay_unit)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [randomUUID(), req.params.id, nextStep, message, delayMinutes || 0, delayUnit || "minutes"]
    );
    res.json(r.rows[0]);
  });

  app.patch("/api/sms/automations/steps/:stepId", async (req: Request, res: Response) => {
    const { message, delayMinutes, delayUnit, stepNumber } = req.body;
    const r = await pool.query(
      `UPDATE sms_automation_steps SET message = COALESCE($2, message), delay_minutes = COALESCE($3, delay_minutes),
       delay_unit = COALESCE($4, delay_unit), step_number = COALESCE($5, step_number)
       WHERE id = $1 RETURNING *`,
      [req.params.stepId, message, delayMinutes, delayUnit, stepNumber]
    );
    res.json(r.rows[0]);
  });

  app.delete("/api/sms/automations/steps/:stepId", async (req: Request, res: Response) => {
    await pool.query(`DELETE FROM sms_automation_steps WHERE id = $1`, [req.params.stepId]);
    res.json({ ok: true });
  });

  // Bulk-create steps (for AI-generated sequences)
  app.post("/api/sms/automations/:id/steps/bulk", async (req: Request, res: Response) => {
    try {
      const { steps, activate } = req.body as {
        steps: { message: string; delayMinutes: number; delayUnit: string }[];
        activate?: boolean;
      };
      if (!Array.isArray(steps) || steps.length === 0)
        return void res.status(400).json({ message: "steps array required" });

      await pool.query("DELETE FROM sms_automation_steps WHERE automation_id = $1", [req.params.id]);
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.query(
          `INSERT INTO sms_automation_steps (id, automation_id, step_number, message, delay_minutes, delay_unit)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), req.params.id, i + 1, s.message, s.delayMinutes || 0, s.delayUnit || "days"]
        );
      }
      if (activate) {
        await pool.query("UPDATE sms_automations SET status = 'active' WHERE id = $1", [req.params.id]);
      }
      const r = await pool.query(
        "SELECT * FROM sms_automation_steps WHERE automation_id = $1 ORDER BY step_number",
        [req.params.id]
      );
      res.json({ ok: true, steps: r.rows });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Sequence analytics — enrollment + step completion stats
  app.get("/api/sms/automations/:id/stats", async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const auto = await pool.query(
        "SELECT * FROM sms_automations WHERE id = $1 AND user_id = $2",
        [req.params.id, userId]
      );
      if (!auto.rows[0]) return void res.status(404).json({ message: "Not found" });

      const steps = await pool.query(
        "SELECT s.id, s.step_number, s.message, s.delay_minutes, s.delay_unit, COUNT(e.id)::int AS sent FROM sms_automation_steps s LEFT JOIN sms_automation_enrollments e ON e.automation_id = s.automation_id AND e.current_step >= s.step_number WHERE s.automation_id = $1 GROUP BY s.id ORDER BY s.step_number",
        [req.params.id]
      ).catch(() => ({ rows: [] }));

      const enrolled = await pool.query(
        "SELECT COUNT(*)::int AS total, SUM(CASE WHEN completed THEN 1 ELSE 0 END)::int AS completed FROM sms_automation_enrollments WHERE automation_id = $1",
        [req.params.id]
      ).catch(() => ({ rows: [{ total: 0, completed: 0 }] }));

      res.json({
        automation: auto.rows[0],
        steps: steps.rows,
        enrolled: enrolled.rows[0]?.total ?? 0,
        completed: enrolled.rows[0]?.completed ?? 0,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── KEYWORDS ───────────────────────────────────────────────────────────────

  app.get("/api/sms/keywords", async (req: Request, res: Response) => {
    const r = await pool.query(
      `SELECT * FROM sms_keywords WHERE user_id = $1 ORDER BY created_at DESC`,
      [uid(req)]
    );
    res.json(r.rows);
  });

  app.post("/api/sms/keywords", async (req: Request, res: Response) => {
    const { fromNumber, keyword, reply, action, automationId } = req.body;
    if (!fromNumber || !keyword || !reply) {
      return void res.status(400).json({ ok: false, message: "fromNumber, keyword, reply required" });
    }
    const r = await pool.query(
      `INSERT INTO sms_keywords (id, user_id, from_number, keyword, reply, action, automation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, from_number, keyword) DO UPDATE SET reply = $5, action = $6, automation_id = $7
       RETURNING *`,
      [randomUUID(), uid(req), fromNumber, keyword.toUpperCase().trim(), reply, action || "reply", automationId || null]
    );
    res.json(r.rows[0]);
  });

  app.patch("/api/sms/keywords/:id", async (req: Request, res: Response) => {
    const { reply, action, automationId, active } = req.body;
    const r = await pool.query(
      `UPDATE sms_keywords SET reply = COALESCE($3, reply), action = COALESCE($4, action),
       automation_id = COALESCE($5, automation_id), active = COALESCE($6, active)
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, uid(req), reply, action, automationId, active]
    );
    res.json(r.rows[0]);
  });

  app.delete("/api/sms/keywords/:id", async (req: Request, res: Response) => {
    await pool.query(`DELETE FROM sms_keywords WHERE id = $1 AND user_id = $2`, [req.params.id, uid(req)]);
    res.json({ ok: true });
  });

  // ── INBOX / CONVERSATIONS ──────────────────────────────────────────────────

  app.get("/api/sms/inbox", async (req: Request, res: Response) => {
    const { status } = req.query;
    let where = `WHERE c.user_id = $1`;
    const params: any[] = [uid(req)];
    if (status) { where += ` AND c.status = $2`; params.push(status); }
    const r = await pool.query(
      `SELECT c.*,
        co.first_name, co.last_name, co.opted_in
       FROM sms_conversations c
       LEFT JOIN sms_contacts co ON co.user_id = c.user_id AND co.phone = c.contact_phone
       ${where} ORDER BY c.last_message_at DESC LIMIT 100`,
      params
    );
    res.json(r.rows);
  });

  app.get("/api/sms/inbox/:conversationId/messages", async (req: Request, res: Response) => {
    const conv = (await pool.query(
      `SELECT * FROM sms_conversations WHERE id = $1 AND user_id = $2`,
      [req.params.conversationId, uid(req)]
    )).rows[0];
    if (!conv) return void res.status(404).json({ ok: false, message: "Not found" });

    // Mark as read
    await pool.query(
      `UPDATE sms_conversations SET unread_count = 0 WHERE id = $1`,
      [req.params.conversationId]
    );

    const messages = (await pool.query(
      `SELECT * FROM sms_messages WHERE conversation_id = $1 ORDER BY sent_at ASC`,
      [req.params.conversationId]
    )).rows;

    res.json({ conversation: conv, messages });
  });

  // Send a message from inbox
  app.post("/api/sms/inbox/:conversationId/send", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message) return void res.status(400).json({ ok: false, message: "message required" });
      const userId = uid(req);

      const conv = (await pool.query(
        `SELECT * FROM sms_conversations WHERE id = $1 AND user_id = $2`,
        [req.params.conversationId, userId]
      )).rows[0];
      if (!conv) return void res.status(404).json({ ok: false, message: "Conversation not found" });

      const client = twilioClient();
      const msg = await client.messages.create({
        body: message,
        from: conv.from_number,
        to: conv.contact_phone,
      });

      const [newMsg] = (await pool.query(
        `INSERT INTO sms_messages (id, conversation_id, user_id, direction, body, twilio_sid, status)
         VALUES ($1, $2, $3, 'outbound', $4, $5, 'queued') RETURNING *`,
        [randomUUID(), conv.id, userId, message, msg.sid]
      )).rows;

      await pool.query(
        `UPDATE sms_conversations SET last_message = $2, last_message_at = NOW() WHERE id = $1`,
        [conv.id, message]
      );

      res.json(newMsg);
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // Send a new message to any contact
  app.post("/api/sms/send", async (req: Request, res: Response) => {
    try {
      const { to, from, message } = req.body;
      if (!to || !from || !message) {
        return void res.status(400).json({ ok: false, message: "to, from, message required" });
      }
      const userId = uid(req);

      // Check opt-out
      const optout = (await pool.query(
        `SELECT 1 FROM sms_optouts WHERE user_id = $1 AND phone = $2`, [userId, to]
      )).rows[0];
      if (optout) return void res.status(400).json({ ok: false, message: "Contact has opted out" });

      const client = twilioClient();
      const msg = await client.messages.create({ body: message, from, to });

      const conv = await getOrCreateConversation(userId, from, to);
      const [newMsg] = (await pool.query(
        `INSERT INTO sms_messages (id, conversation_id, user_id, direction, body, twilio_sid, status)
         VALUES ($1, $2, $3, 'outbound', $4, $5, 'queued') RETURNING *`,
        [randomUUID(), conv.id, userId, message, msg.sid]
      )).rows;

      await pool.query(
        `UPDATE sms_conversations SET last_message = $2, last_message_at = NOW() WHERE id = $1`,
        [conv.id, message]
      );

      res.json({ ok: true, message: newMsg, twilioSid: msg.sid });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // ── WEBHOOKS (no auth — Twilio calls these) ────────────────────────────────

  // Inbound SMS from Twilio
  app.post("/api/sms/webhook/inbound", async (req: Request, res: Response) => {
    try {
      const { From, To, Body, MessageSid } = req.body;
      if (!From || !To || !Body) return void res.status(200).send("<Response/>");

      const bodyUpper = Body.trim().toUpperCase();

      // Find which user owns this "To" number
      const numRow = (await pool.query(
        `SELECT * FROM sms_phone_numbers WHERE phone_number = $1 AND status = 'active'`, [To]
      )).rows[0];

      if (!numRow) return void res.status(200).send("<Response/>");
      const userId = numRow.user_id;

      // Handle STOP (global opt-out compliance)
      if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(bodyUpper)) {
        await pool.query(
          `INSERT INTO sms_optouts (id, user_id, phone) VALUES ($1, $2, $3) ON CONFLICT (user_id, phone) DO NOTHING`,
          [randomUUID(), userId, From]
        );
        await pool.query(
          `UPDATE sms_contacts SET opted_in = false, opted_out_at = NOW() WHERE user_id = $1 AND phone = $2`,
          [userId, From]
        );
        // Twilio reply required by law
        res.set("Content-Type", "text/xml");
        return void res.status(200).send(
          `<Response><Message>You have been unsubscribed. Reply START to resubscribe.</Message></Response>`
        );
      }

      // Handle START (re-subscribe)
      if (["START", "YES", "UNSTOP"].includes(bodyUpper)) {
        await pool.query(`DELETE FROM sms_optouts WHERE user_id = $1 AND phone = $2`, [userId, From]);
        await pool.query(
          `UPDATE sms_contacts SET opted_in = true, opted_out_at = NULL WHERE user_id = $1 AND phone = $2`,
          [userId, From]
        );
        res.set("Content-Type", "text/xml");
        return void res.status(200).send(
          `<Response><Message>You have been resubscribed. Reply STOP to unsubscribe.</Message></Response>`
        );
      }

      // Handle HELP
      if (bodyUpper === "HELP") {
        res.set("Content-Type", "text/xml");
        return void res.status(200).send(
          `<Response><Message>For help, reply STOP to unsubscribe or contact support.</Message></Response>`
        );
      }

      // Check keyword matches
      const keyword = (await pool.query(
        `SELECT * FROM sms_keywords WHERE user_id = $1 AND from_number = $2 AND keyword = $3 AND active = true`,
        [userId, To, bodyUpper]
      )).rows[0];

      // Store inbound message
      const conv = await getOrCreateConversation(userId, To, From);
      await pool.query(
        `INSERT INTO sms_messages (id, conversation_id, user_id, direction, body, twilio_sid, status)
         VALUES ($1, $2, $3, 'inbound', $4, $5, 'delivered')`,
        [randomUUID(), conv.id, userId, Body, MessageSid]
      );
      await pool.query(
        `UPDATE sms_conversations SET last_message = $2, last_message_at = NOW(), unread_count = unread_count + 1 WHERE id = $1`,
        [conv.id, Body]
      );

      // Auto-enroll in automation if keyword matched
      if (keyword) {
        await pool.query(
          `UPDATE sms_keywords SET match_count = match_count + 1 WHERE id = $1`, [keyword.id]
        );

        if (keyword.action === "subscribe" && keyword.automation_id) {
          await pool.query(
            `INSERT INTO sms_automation_enrollments (id, automation_id, contact_phone, user_id, next_send_at)
             VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (automation_id, contact_phone) DO NOTHING`,
            [randomUUID(), keyword.automation_id, From, userId]
          );
        }

        if (keyword.reply) {
          const client = twilioClient();
          const replyMsg = await client.messages.create({ body: keyword.reply, from: To, to: From });
          await pool.query(
            `INSERT INTO sms_messages (id, conversation_id, user_id, direction, body, twilio_sid, status)
             VALUES ($1, $2, $3, 'outbound', $4, $5, 'queued')`,
            [randomUUID(), conv.id, userId, keyword.reply, replyMsg.sid]
          );
          await pool.query(
            `UPDATE sms_conversations SET last_message = $2, last_message_at = NOW() WHERE id = $1`,
            [conv.id, keyword.reply]
          );
        }
      }

      res.set("Content-Type", "text/xml");
      res.status(200).send("<Response/>");
    } catch (e: any) {
      console.error("[sms-webhook-inbound]", e.message);
      res.status(200).send("<Response/>");
    }
  });

  // Delivery status callback from Twilio
  app.post("/api/sms/webhook/status", async (req: Request, res: Response) => {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
      await pool.query(
        `UPDATE sms_messages SET status = $2, delivered_at = CASE WHEN $2 = 'delivered' THEN NOW() ELSE delivered_at END
         WHERE twilio_sid = $1`,
        [MessageSid, MessageStatus]
      );
      await pool.query(
        `INSERT INTO sms_delivery_log (id, twilio_sid, status, error_code, error_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), MessageSid, MessageStatus, ErrorCode || null, ErrorMessage || null]
      );
      res.status(200).send("OK");
    } catch (e: any) {
      console.error("[sms-webhook-status]", e.message);
      res.status(200).send("OK");
    }
  });

  // ── ANALYTICS ─────────────────────────────────────────────────────────────

  app.get("/api/sms/analytics", async (req: Request, res: Response) => {
    const userId = uid(req);
    const [contacts, campaigns, sent, delivered, failed, optouts, conversations] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM sms_contacts WHERE user_id = $1`, [userId]),
      pool.query(`SELECT COUNT(*) FROM sms_campaigns WHERE user_id = $1 AND status = 'sent'`, [userId]),
      pool.query(`SELECT COUNT(*) FROM sms_messages WHERE user_id = $1 AND direction = 'outbound'`, [userId]),
      pool.query(`SELECT COUNT(*) FROM sms_messages WHERE user_id = $1 AND status = 'delivered'`, [userId]),
      pool.query(`SELECT COUNT(*) FROM sms_messages WHERE user_id = $1 AND status = 'failed'`, [userId]),
      pool.query(`SELECT COUNT(*) FROM sms_optouts WHERE user_id = $1`, [userId]),
      pool.query(`SELECT COUNT(*) FROM sms_conversations WHERE user_id = $1`, [userId]),
    ]);

    const sentCount = parseInt(sent.rows[0].count);
    const deliveredCount = parseInt(delivered.rows[0].count);

    // Recent campaign performance
    const recentCampaigns = (await pool.query(
      `SELECT name, recipients_count, delivered_count, failed_count, opt_out_count, sent_at
       FROM sms_campaigns WHERE user_id = $1 AND status = 'sent'
       ORDER BY sent_at DESC LIMIT 5`,
      [userId]
    )).rows;

    // Messages over last 30 days
    const dailyStats = (await pool.query(
      `SELECT DATE(sent_at) as date, COUNT(*) as count, direction
       FROM sms_messages WHERE user_id = $1 AND sent_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(sent_at), direction ORDER BY date`,
      [userId]
    )).rows;

    res.json({
      overview: {
        totalContacts: parseInt(contacts.rows[0].count),
        totalCampaignsSent: parseInt(campaigns.rows[0].count),
        totalMessagesSent: sentCount,
        totalDelivered: deliveredCount,
        totalFailed: parseInt(failed.rows[0].count),
        totalOptOuts: parseInt(optouts.rows[0].count),
        totalConversations: parseInt(conversations.rows[0].count),
        deliveryRate: sentCount > 0 ? ((deliveredCount / sentCount) * 100).toFixed(1) : "0",
        optOutRate: sentCount > 0 ? ((parseInt(optouts.rows[0].count) / sentCount) * 100).toFixed(2) : "0",
      },
      recentCampaigns,
      dailyStats,
    });
  });

  // ── LINK SHORTENER ─────────────────────────────────────────────────────────

  app.post("/api/sms/links/shorten", requireAuth, async (req: Request, res: Response) => {
    try {
      await bootstrapSmsMarketing();
      const userId = (req as any).user?.id;
      const { url } = req.body as { url: string };
      if (!url || !/^https?:\/\//.test(url)) {
        return res.status(400).json({ message: "Valid URL required (must start with http:// or https://)" });
      }
      const code = Math.random().toString(36).slice(2, 9);
      await pool.query(
        "INSERT INTO sms_short_links (user_id, code, original_url) VALUES ($1, $2, $3)",
        [userId, code, url]
      );
      const host = req.get("host") || "oravini.com";
      const protocol = req.get("x-forwarded-proto") || "https";
      res.json({ shortUrl: `${protocol}://${host}/s/${code}`, code });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/sms/links", requireAuth, async (req: Request, res: Response) => {
    try {
      await bootstrapSmsMarketing();
      const userId = (req as any).user?.id;
      const r = await pool.query(
        "SELECT id, code, original_url, clicks, created_at FROM sms_short_links WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
        [userId]
      );
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ── AI FEATURES ────────────────────────────────────────────────────────────

  // AI copywriter — generate SMS message
  app.post("/api/sms/ai/write", async (req: Request, res: Response) => {
    try {
      const { goal, tone, audience, cta, maxChars } = req.body;
      if (!goal) return void res.status(400).json({ ok: false, message: "goal required" });
      const max = maxChars || 160;
      const smsUserId = uid(req);
      const text = await callAI([
        {
          role: "system",
          content: await skillsPrefix(smsUserId, `You are an expert SMS marketing copywriter. Write compelling, concise SMS messages.
Rules: under ${max} characters, no emoji unless requested, clear CTA, conversational tone.
Always output ONLY the SMS text, nothing else.`),
        },
        {
          role: "user",
          content: `Write an SMS for: ${goal}. Tone: ${tone || "friendly"}. Audience: ${audience || "general"}. CTA: ${cta || "none specified"}.`,
        },
      ]);
      const trimmed = text.trim().replace(/^["']|["']$/g, "");
      res.json({ message: trimmed, charCount: trimmed.length, segments: Math.ceil(trimmed.length / 160) });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // AI compliance check
  app.post("/api/sms/ai/compliance-check", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message) return void res.status(400).json({ ok: false, message: "message required" });
      const result = await callAI([
        {
          role: "system",
          content: `You are a TCPA/SMS compliance expert. Analyze SMS messages for legal/compliance issues.
Return JSON: { "passed": boolean, "issues": string[], "suggestions": string[], "riskLevel": "low"|"medium"|"high" }`,
        },
        {
          role: "user",
          content: `Check this SMS for TCPA compliance issues: "${message}"`,
        },
      ]);
      try {
        const parsed = JSON.parse(result);
        res.json(parsed);
      } catch {
        res.json({ passed: true, issues: [], suggestions: [], riskLevel: "low" });
      }
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // AI reply suggestions for inbox
  app.post("/api/sms/ai/suggest-replies", async (req: Request, res: Response) => {
    try {
      const { inboundMessage, context, businessType } = req.body;
      if (!inboundMessage) return void res.status(400).json({ ok: false, message: "inboundMessage required" });
      const text = await callAI([
        {
          role: "system",
          content: `You are helping a business respond to SMS messages. Generate 3 short, professional reply options.
Return JSON array: [{"label": "short label", "text": "full reply text"}, ...]
Each reply under 160 chars. Vary tone: direct, friendly, detailed.`,
        },
        {
          role: "user",
          content: `Customer said: "${inboundMessage}". Business context: ${context || "general"}. Type: ${businessType || "general"}.`,
        },
      ]);
      try {
        const replies = JSON.parse(text);
        res.json({ replies });
      } catch {
        res.json({ replies: [{ label: "Follow up", text: "Thanks for your message! We'll get back to you shortly." }] });
      }
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // AI automation builder — generate a full drip sequence from a description
  app.post("/api/sms/ai/build-automation", async (req: Request, res: Response) => {
    try {
      const { goal, duration, audience, stepCount } = req.body;
      if (!goal) return void res.status(400).json({ ok: false, message: "goal required" });
      const text = await callAI([
        {
          role: "system",
          content: `You are an SMS marketing automation expert. Create drip sequence steps.
Return JSON: { "name": string, "description": string, "steps": [{"stepNumber": number, "message": string, "delayMinutes": number, "delayUnit": "minutes"|"hours"|"days", "note": string}] }
Each message under 160 chars. Make them natural and high-converting.`,
        },
        {
          role: "user",
          content: `Build a ${stepCount || 5}-step SMS automation for: ${goal}. Duration: ${duration || "2 weeks"}. Audience: ${audience || "new leads"}.`,
        },
      ]);
      try {
        const automation = JSON.parse(text);
        res.json(automation);
      } catch {
        res.status(500).json({ ok: false, message: "Failed to parse AI response" });
      }
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // AI segment builder — natural language to contact filter
  app.post("/api/sms/ai/build-segment", async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      if (!description) return void res.status(400).json({ ok: false, message: "description required" });
      const userId = uid(req);

      // Get available tags
      const tags = (await pool.query(
        `SELECT DISTINCT unnest(tags) as tag FROM sms_contacts WHERE user_id = $1`, [userId]
      )).rows.map((r: any) => r.tag);

      const text = await callAI([
        {
          role: "system",
          content: `You are an SMS marketing segmentation expert. Convert natural language descriptions into contact filters.
Available tags: ${tags.join(", ") || "none"}.
Return JSON: { "label": string, "filters": { "tags": string[], "optedIn": boolean, "source": string|null }, "estimatedDescription": string }`,
        },
        {
          role: "user",
          content: `Build a segment filter for: "${description}"`,
        },
      ]);
      try {
        res.json(JSON.parse(text));
      } catch {
        res.json({ label: description, filters: { tags: [], optedIn: true, source: null }, estimatedDescription: description });
      }
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });

  // AI chatbot — platform guide
  app.post("/api/sms/ai/chat", async (req: Request, res: Response) => {
    try {
      const { messages, context } = req.body;
      if (!Array.isArray(messages) || !messages.length) {
        return void res.status(400).json({ ok: false, message: "messages required" });
      }

      const userId = uid(req);
      const [numbersRow, contactsRow, campaignsRow, automationsRow] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM sms_phone_numbers WHERE user_id = $1 AND status = 'active'`, [userId]),
        pool.query(`SELECT COUNT(*) FROM sms_contacts WHERE user_id = $1`, [userId]),
        pool.query(`SELECT COUNT(*) FROM sms_campaigns WHERE user_id = $1`, [userId]),
        pool.query(`SELECT COUNT(*) FROM sms_automations WHERE user_id = $1`, [userId]),
      ]);

      const accountContext = `
User's current SMS Marketing status:
- Phone numbers provisioned: ${numbersRow.rows[0].count}
- Contacts in list: ${contactsRow.rows[0].count}
- Campaigns created: ${campaignsRow.rows[0].count}
- Automations built: ${automationsRow.rows[0].count}
- Current page/context: ${context || "general"}
      `.trim();

      const systemPrompt = `You are the SMS Marketing assistant built into this platform. You help users get the most out of their SMS marketing tools.

${accountContext}

Platform features you can explain:
PHONE NUMBERS: Users search by area code and buy a dedicated US number (~$1/mo). This is their sender identity — all campaigns, automations, and inbox conversations flow through it. They must provision a number before doing anything else.

CONTACTS: Users add contacts manually, import via CSV (columns: phone, first_name, last_name, email), or contacts are auto-added when someone texts a keyword. Each contact has an opt-in status. STOP automatically opts them out.

CAMPAIGNS: One-time broadcast blasts. User picks their number, writes message (160 chars = 1 SMS segment), picks segment (all contacts or by tag), sends immediately or schedules. After sending they see delivered/failed counts.

AUTOMATIONS: Drip sequences triggered by a keyword (e.g. someone texts JOIN) or manual enrollment. Each step has a message + delay (minutes/hours/days). Example: Step 1 sends immediately, Step 2 waits 1 day, Step 3 waits 3 days. Use AI Build to generate a full sequence from a goal description.

KEYWORDS: When someone texts a word to the user's number, a keyword rule fires. STOP/START/HELP are automatic (legal requirement). Custom keywords can send an auto-reply and/or enroll the contact in an automation. Example: keyword JOIN → reply "Welcome! You're in." → enroll in Welcome automation.

INBOX: Two-way conversations. Every inbound SMS appears here. Users can reply directly. AI Replies button suggests 3 response options based on what the contact said.

ANALYTICS: Delivery rate, opt-out rate, campaign stats, message volume over time.

AI TOOLS:
- Copywriter: Describe goal → generates compliant 160-char SMS
- Compliance Check: Paste a message → flags TCPA issues (missing opt-out info, promotional without consent, etc.)
- Segment Builder: Describe audience in plain English → filters contacts

TCPA COMPLIANCE BASICS:
- Always include opt-out info: "Reply STOP to unsubscribe"
- Only text people who opted in
- STOP must always unsubscribe (handled automatically)
- Promotional messages need prior express written consent
- The platform handles STOP/START/HELP automatically

GETTING STARTED (recommended order):
1. Go to Phone Numbers → search area code → buy number
2. Go to Contacts → import CSV or add manually
3. Go to Keywords → set up JOIN keyword to grow list
4. Go to Campaigns → send first broadcast
5. Go to Automations → build a welcome drip

Be concise, practical, and specific to what the user is trying to do. If they haven't provisioned a number yet, always mention that as the first step. Use plain language, no jargon unless explaining a specific term.`;

      const reply = await callAI([
        { role: "system", content: await skillsPrefix(userId, systemPrompt) },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ]);

      res.json({ reply: reply.trim() });
    } catch (e: any) {
      res.status(500).json({ ok: false, message: e.message });
    }
  });
}

// ── Shared helper ─────────────────────────────────────────────────────────────

async function getOrCreateConversation(userId: string, fromNumber: string, contactPhone: string) {
  const existing = (await pool.query(
    `SELECT * FROM sms_conversations WHERE user_id = $1 AND from_number = $2 AND contact_phone = $3`,
    [userId, fromNumber, contactPhone]
  )).rows[0];
  if (existing) return existing;

  const contact = (await pool.query(
    `SELECT id FROM sms_contacts WHERE user_id = $1 AND phone = $2`, [userId, contactPhone]
  )).rows[0];

  const r = await pool.query(
    `INSERT INTO sms_conversations (id, user_id, from_number, contact_phone, contact_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [randomUUID(), userId, fromNumber, contactPhone, contact?.id || null]
  );
  return r.rows[0];
}
