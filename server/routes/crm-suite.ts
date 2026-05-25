import type { Express, Request, Response } from "express";
import { sql, eq, and, or, ilike, desc, asc, isNull, isNotNull, inArray } from "drizzle-orm";
import { db, pool } from "../storage";
import {
  crmContacts, crmPipelines, crmPipelineStages, crmOpportunities,
  crmActivities, crmTasks, crmTags, crmSmartLists,
  insertCrmContactSchema, insertCrmPipelineSchema, insertCrmPipelineStageSchema,
  insertCrmOpportunitySchema, insertCrmActivitySchema, insertCrmTaskSchema, insertCrmTagSchema,
  insertCrmSmartListSchema,
} from "@shared/schema";
import { emitCrmEvent } from "./crm-events";

const p = (param: string | string[] | undefined): string => {
  const s = Array.isArray(param) ? param[0] : param;
  if (!s) throw new Error("Missing id");
  return s;
};

/**
 * Bootstrap CRM tables. Idempotent — safe to run on every boot.
 * Avoids the need for a manual `drizzle-kit push` for users.
 */
export async function bootstrapCrmSuite() {
  // Enums
  await pool.query(`DO $$ BEGIN
    CREATE TYPE crm_contact_status AS ENUM ('lead','prospect','customer','inactive');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`);
  await pool.query(`DO $$ BEGIN
    CREATE TYPE crm_activity_type AS ENUM ('note','email','call','sms','meeting','task','stage_change','tag','system');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`);
  await pool.query(`DO $$ BEGIN
    CREATE TYPE crm_task_status AS ENUM ('open','done','snoozed');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`);
  await pool.query(`DO $$ BEGIN
    CREATE TYPE crm_opportunity_status AS ENUM ('open','won','lost','abandoned');
  EXCEPTION WHEN duplicate_object THEN null; END $$;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_contacts (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id varchar REFERENCES users(id) ON DELETE SET NULL,
      first_name text, last_name text, email text, phone text, company text, title text,
      source text DEFAULT 'manual',
      status crm_contact_status NOT NULL DEFAULT 'lead',
      lifecycle_stage text DEFAULT 'subscriber',
      city text, country text, timezone text,
      instagram text, youtube text, linkedin text, twitter text, website text,
      score integer NOT NULL DEFAULT 0,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
      notes text,
      user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      last_contacted_at timestamp,
      do_not_contact boolean NOT NULL DEFAULT false,
      archived_at timestamp,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts (lower(email));
    CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts (status);
    CREATE INDEX IF NOT EXISTS idx_crm_contacts_owner ON crm_contacts (owner_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_pipelines (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      color text DEFAULT '#d4b461',
      is_default boolean NOT NULL DEFAULT false,
      position integer NOT NULL DEFAULT 0,
      created_at timestamp DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      pipeline_id varchar NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
      name text NOT NULL,
      color text DEFAULT '#d4b461',
      position integer NOT NULL DEFAULT 0,
      probability integer NOT NULL DEFAULT 0,
      is_won boolean NOT NULL DEFAULT false,
      is_lost boolean NOT NULL DEFAULT false,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline ON crm_pipeline_stages (pipeline_id, position);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_opportunities (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      pipeline_id varchar NOT NULL REFERENCES crm_pipelines(id) ON DELETE CASCADE,
      stage_id varchar NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE RESTRICT,
      contact_id varchar REFERENCES crm_contacts(id) ON DELETE SET NULL,
      owner_id varchar REFERENCES users(id) ON DELETE SET NULL,
      title text NOT NULL,
      description text,
      value_cents integer NOT NULL DEFAULT 0,
      currency text NOT NULL DEFAULT 'USD',
      status crm_opportunity_status NOT NULL DEFAULT 'open',
      expected_close_date timestamp,
      closed_at timestamp,
      position integer NOT NULL DEFAULT 0,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_crm_opps_pipeline ON crm_opportunities (pipeline_id, stage_id, position);
    CREATE INDEX IF NOT EXISTS idx_crm_opps_contact ON crm_opportunities (contact_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_activities (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id varchar REFERENCES crm_contacts(id) ON DELETE CASCADE,
      opportunity_id varchar REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      user_id varchar REFERENCES users(id) ON DELETE SET NULL,
      type crm_activity_type NOT NULL,
      title text NOT NULL,
      body text,
      metadata jsonb DEFAULT '{}'::jsonb,
      occurred_at timestamp DEFAULT now(),
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities (contact_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_crm_activities_opp ON crm_activities (opportunity_id, occurred_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_tasks (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      contact_id varchar REFERENCES crm_contacts(id) ON DELETE CASCADE,
      opportunity_id varchar REFERENCES crm_opportunities(id) ON DELETE CASCADE,
      assignee_id varchar REFERENCES users(id) ON DELETE SET NULL,
      title text NOT NULL,
      description text,
      status crm_task_status NOT NULL DEFAULT 'open',
      priority text NOT NULL DEFAULT 'normal',
      due_at timestamp,
      completed_at timestamp,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON crm_tasks (status, due_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_tags (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      color text DEFAULT '#d4b461',
      description text,
      created_at timestamp DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_smart_lists (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      description text,
      filters jsonb NOT NULL DEFAULT '{}'::jsonb,
      owner_id varchar REFERENCES users(id) ON DELETE SET NULL,
      pinned boolean NOT NULL DEFAULT false,
      position integer NOT NULL DEFAULT 0,
      created_at timestamp DEFAULT now()
    );
  `);

  // Soft-delete column for Undo on contacts (idempotent ALTER)
  await pool.query(`ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS deleted_at timestamp;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_crm_contacts_deleted ON crm_contacts (deleted_at);`);

  // Seed: a default sales pipeline if none exists
  const { rows: pipelineRows } = await pool.query(`SELECT id FROM crm_pipelines LIMIT 1`);
  if (pipelineRows.length === 0) {
    const { rows: pipeline } = await pool.query(
      `INSERT INTO crm_pipelines (name, description, color, is_default, position)
       VALUES ('Sales Pipeline', 'Default pipeline for new leads and deals', '#d4b461', true, 0)
       RETURNING id`,
    );
    const pid = pipeline[0].id;
    const stages = [
      { name: "New Lead",    color: "#94a3b8", probability: 5,  pos: 0 },
      { name: "Contacted",   color: "#60a5fa", probability: 15, pos: 1 },
      { name: "Qualified",   color: "#a78bfa", probability: 35, pos: 2 },
      { name: "Proposal",    color: "#f59e0b", probability: 60, pos: 3 },
      { name: "Negotiation", color: "#f97316", probability: 80, pos: 4 },
      { name: "Won",         color: "#22c55e", probability: 100, pos: 5, isWon: true },
      { name: "Lost",        color: "#ef4444", probability: 0,  pos: 6, isLost: true },
    ];
    for (const s of stages) {
      await pool.query(
        `INSERT INTO crm_pipeline_stages (pipeline_id, name, color, position, probability, is_won, is_lost)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [pid, s.name, s.color, s.pos, s.probability, !!(s as any).isWon, !!(s as any).isLost],
      );
    }
  }

  // Seed: a couple of starter tags
  await pool.query(`
    INSERT INTO crm_tags (name, color, description) VALUES
      ('hot-lead', '#ef4444', 'High intent, ready to close'),
      ('vip', '#d4b461', 'High-value contact'),
      ('cold', '#60a5fa', 'Needs nurturing'),
      ('client', '#22c55e', 'Active customer')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Seed: starter smart lists (only if none exist)
  const { rows: smartCount } = await pool.query(`SELECT COUNT(*)::int AS n FROM crm_smart_lists`);
  if (smartCount[0].n === 0) {
    const lists: { name: string; description: string; filters: Record<string, any>; pinned: boolean; position: number }[] = [
      { name: "All contacts", description: "Everyone in the CRM", filters: {}, pinned: true, position: 0 },
      { name: "Hot leads", description: "Score ≥ 50, status = lead", filters: { status: "lead", scoreMin: 50 }, pinned: true, position: 1 },
      { name: "Customers", description: "Status = customer", filters: { status: "customer" }, pinned: true, position: 2 },
      { name: "Stale (no contact 30d+)", description: "Need re-engagement", filters: { lastContactedDays: 30 }, pinned: false, position: 3 },
      { name: "Tagged: hot-lead", description: "Tag-based list", filters: { tag: "hot-lead" }, pinned: false, position: 4 },
    ];
    for (const l of lists) {
      await pool.query(
        `INSERT INTO crm_smart_lists (name, description, filters, pinned, position) VALUES ($1,$2,$3,$4,$5)`,
        [l.name, l.description, JSON.stringify(l.filters), l.pinned, l.position],
      );
    }
  }
}

function logActivity(
  data: {
    contactId?: string | null;
    opportunityId?: string | null;
    userId?: string | null;
    type: typeof crmActivities.$inferInsert.type;
    title: string;
    body?: string | null;
    metadata?: Record<string, any>;
  },
) {
  return db.insert(crmActivities).values({
    contactId: data.contactId ?? null,
    opportunityId: data.opportunityId ?? null,
    userId: data.userId ?? null,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    metadata: (data.metadata ?? {}) as any,
  }).returning();
}

export function registerCrmSuiteRoutes(app: Express, requireAuth: any) {
  /* ─────────────────────────────────────────────────────────
     PIPELINES
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/pipelines", requireAuth, async (_req, res) => {
    try {
      const pipelines = await db.select().from(crmPipelines).orderBy(asc(crmPipelines.position));
      const stages = await db.select().from(crmPipelineStages).orderBy(asc(crmPipelineStages.position));
      const stagesByPipe = new Map<string, any[]>();
      for (const s of stages) {
        if (!stagesByPipe.has(s.pipelineId)) stagesByPipe.set(s.pipelineId, []);
        stagesByPipe.get(s.pipelineId)!.push(s);
      }
      res.json(pipelines.map(p => ({ ...p, stages: stagesByPipe.get(p.id) ?? [] })));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/crm-suite/pipelines", requireAuth, async (req, res) => {
    try {
      const parsed = insertCrmPipelineSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const [row] = await db.insert(crmPipelines).values(parsed.data).returning();
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/crm-suite/pipelines/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.update(crmPipelines).set(req.body).where(eq(crmPipelines.id, p(req.params.id))).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/pipelines/:id", requireAuth, async (req, res) => {
    try {
      await db.delete(crmPipelines).where(eq(crmPipelines.id, p(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     STAGES
  ───────────────────────────────────────────────────────── */
  app.post("/api/crm-suite/pipelines/:id/stages", requireAuth, async (req, res) => {
    try {
      const parsed = insertCrmPipelineStageSchema.safeParse({ ...req.body, pipelineId: p(req.params.id) });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const [row] = await db.insert(crmPipelineStages).values(parsed.data).returning();
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/crm-suite/stages/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.update(crmPipelineStages).set(req.body).where(eq(crmPipelineStages.id, p(req.params.id))).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/stages/:id", requireAuth, async (req, res) => {
    try {
      // Refuse if any opportunity sits in this stage
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(crmOpportunities).where(eq(crmOpportunities.stageId, p(req.params.id)));
      if (count > 0) return res.status(400).json({ message: `Move the ${count} opportunity in this stage first.` });
      await db.delete(crmPipelineStages).where(eq(crmPipelineStages.id, p(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Reorder stages within a pipeline
  app.post("/api/crm-suite/pipelines/:id/stages/reorder", requireAuth, async (req, res) => {
    try {
      const { stageIds } = req.body as { stageIds: string[] };
      if (!Array.isArray(stageIds)) return res.status(400).json({ message: "stageIds[] required" });
      for (let i = 0; i < stageIds.length; i++) {
        await db.update(crmPipelineStages).set({ position: i }).where(eq(crmPipelineStages.id, stageIds[i]));
      }
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     CONTACTS
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/contacts", requireAuth, async (req, res) => {
    try {
      const q = (req.query.q as string)?.toLowerCase()?.trim();
      const status = req.query.status as string | undefined;
      const tag = req.query.tag as string | undefined;
      const archived = req.query.archived === "true";
      const source = req.query.source as string | undefined;
      const scoreMin = req.query.scoreMin ? parseInt(req.query.scoreMin as string, 10) : undefined;
      const scoreMax = req.query.scoreMax ? parseInt(req.query.scoreMax as string, 10) : undefined;
      const lastContactedDays = req.query.lastContactedDays ? parseInt(req.query.lastContactedDays as string, 10) : undefined;
      const doNotContact = req.query.doNotContact === "true";
      const includeDeleted = req.query.includeDeleted === "true";
      const limit = Math.min(parseInt((req.query.limit as string) || "200"), 1000);

      const conditions: any[] = [];
      // Always exclude soft-deleted unless explicitly asked
      if (!includeDeleted) conditions.push(sql`(${crmContacts.id} IN (SELECT id FROM crm_contacts WHERE deleted_at IS NULL))`);
      if (!archived) conditions.push(isNull(crmContacts.archivedAt));
      if (status) conditions.push(eq(crmContacts.status, status as any));
      if (source) conditions.push(eq(crmContacts.source, source));
      if (typeof scoreMin === "number") conditions.push(sql`${crmContacts.score} >= ${scoreMin}`);
      if (typeof scoreMax === "number") conditions.push(sql`${crmContacts.score} <= ${scoreMax}`);
      if (lastContactedDays && lastContactedDays > 0) {
        conditions.push(or(
          isNull(crmContacts.lastContactedAt),
          sql`${crmContacts.lastContactedAt} < NOW() - (${lastContactedDays} || ' days')::interval`,
        ));
      }
      if (doNotContact) conditions.push(eq(crmContacts.doNotContact, true));
      if (q) {
        conditions.push(or(
          ilike(crmContacts.firstName, `%${q}%`),
          ilike(crmContacts.lastName, `%${q}%`),
          ilike(crmContacts.email, `%${q}%`),
          ilike(crmContacts.phone, `%${q}%`),
          ilike(crmContacts.company, `%${q}%`),
        ));
      }
      let query = db.select().from(crmContacts).orderBy(desc(crmContacts.updatedAt)).limit(limit);
      if (conditions.length) query = (query as any).where(and(...conditions));
      let rows = await query;
      if (tag) rows = rows.filter(r => Array.isArray(r.tags) && r.tags.includes(tag));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/crm-suite/contacts/:id", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, id));
      if (!contact) return res.status(404).json({ message: "Contact not found" });
      const [activities, opportunities, tasks] = await Promise.all([
        db.select().from(crmActivities).where(eq(crmActivities.contactId, id)).orderBy(desc(crmActivities.occurredAt)).limit(100),
        db.select().from(crmOpportunities).where(eq(crmOpportunities.contactId, id)).orderBy(desc(crmOpportunities.updatedAt)),
        db.select().from(crmTasks).where(eq(crmTasks.contactId, id)).orderBy(asc(crmTasks.dueAt)),
      ]);
      res.json({ contact, activities, opportunities, tasks });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/crm-suite/contacts", requireAuth, async (req, res) => {
    try {
      const parsed = insertCrmContactSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const userId = (req.user as any)?.id;
      const [row] = await db.insert(crmContacts).values({
        ...parsed.data,
        ownerId: parsed.data.ownerId ?? userId ?? null,
      }).returning();
      await logActivity({
        contactId: row.id, userId,
        type: "system",
        title: "Contact created",
        body: parsed.data.source ? `Source: ${parsed.data.source}` : undefined,
      });
      emitCrmEvent({ kind: "contact.created", id: row.id });
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/crm-suite/contacts/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const id = p(req.params.id);
      const [prev] = await db.select().from(crmContacts).where(eq(crmContacts.id, id));
      if (!prev) return res.status(404).json({ message: "Not found" });
      const [row] = await db.update(crmContacts)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(crmContacts.id, id))
        .returning();
      // Log status change
      if (req.body.status && req.body.status !== prev.status) {
        await logActivity({
          contactId: id, userId, type: "system",
          title: `Status changed: ${prev.status} → ${req.body.status}`,
        });
      }
      emitCrmEvent({ kind: "contact.updated", id });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/contacts/:id", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      // Soft delete — mark deleted_at for Undo. Hard-delete after 24h via cron-equivalent on next access.
      await db.update(crmContacts).set({ archivedAt: new Date(), updatedAt: new Date() } as any)
        .where(eq(crmContacts.id, id));
      await pool.query(`UPDATE crm_contacts SET deleted_at = now() WHERE id = $1`, [id]);
      emitCrmEvent({ kind: "contact.deleted", id });
      res.json({ ok: true, undoable: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Restore a soft-deleted contact (used by the Undo toast)
  app.post("/api/crm-suite/contacts/:id/restore", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      await pool.query(`UPDATE crm_contacts SET deleted_at = NULL, archived_at = NULL, updated_at = now() WHERE id = $1`, [id]);
      emitCrmEvent({ kind: "contact.updated", id });
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Permanent delete (admin power-tool)
  app.delete("/api/crm-suite/contacts/:id/permanent", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      await db.delete(crmContacts).where(eq(crmContacts.id, id));
      emitCrmEvent({ kind: "contact.deleted", id });
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Bulk import landing leads + DM leads + clients into the CRM contact table
  app.post("/api/crm-suite/contacts/import-from-platform", requireAuth, async (_req, res) => {
    try {
      const result = { landingLeads: 0, users: 0, dmLeads: 0, skipped: 0 };
      // Landing leads
      const { rows: leads } = await pool.query(`SELECT * FROM landing_leads`);
      for (const l of leads) {
        if (!l.email) { result.skipped++; continue; }
        const [existing] = await db.select().from(crmContacts).where(eq(crmContacts.email, l.email));
        if (existing) { result.skipped++; continue; }
        const [first, ...rest] = (l.name || "").split(" ");
        await db.insert(crmContacts).values({
          firstName: first || null,
          lastName: rest.join(" ") || null,
          email: l.email,
          source: l.source || "landing",
          status: "lead",
          instagram: l.instagram_url || null,
          customFields: {
            niche: l.niche, platform: l.platform, biggestChallenge: l.biggest_challenge,
            postFrequency: l.post_frequency, monetizationGoal: l.monetization_goal,
          } as any,
        });
        result.landingLeads++;
      }
      // Users (clients)
      const { rows: clientRows } = await pool.query(`SELECT * FROM users WHERE role = 'client'`);
      for (const u of clientRows) {
        if (!u.email) { result.skipped++; continue; }
        const [existing] = await db.select().from(crmContacts).where(eq(crmContacts.email, u.email));
        const [first, ...rest] = (u.name || "").split(" ");
        if (existing) {
          await db.update(crmContacts).set({
            userId: u.id, status: "customer", phone: u.phone || existing.phone,
          }).where(eq(crmContacts.id, existing.id));
        } else {
          await db.insert(crmContacts).values({
            firstName: first || null,
            lastName: rest.join(" ") || null,
            email: u.email,
            phone: u.phone || null,
            source: "platform",
            status: "customer",
            userId: u.id,
            customFields: { plan: u.plan } as any,
          });
        }
        result.users++;
      }
      // DM leads (best-effort — table may differ)
      try {
        const { rows: dms } = await pool.query(`SELECT username, full_name, ig_user_id FROM dm_leads LIMIT 1000`);
        for (const d of dms) {
          if (!d.ig_user_id && !d.username) continue;
          const fakeEmail = `${d.username || d.ig_user_id}@instagram.local`;
          const [existing] = await db.select().from(crmContacts).where(eq(crmContacts.email, fakeEmail));
          if (existing) continue;
          await db.insert(crmContacts).values({
            firstName: d.full_name || d.username || null,
            email: fakeEmail,
            instagram: d.username ? `https://instagram.com/${d.username}` : null,
            source: "dm",
            status: "lead",
          });
          result.dmLeads++;
        }
      } catch { /* table missing or shape mismatch — non-fatal */ }
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     OPPORTUNITIES
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/opportunities", requireAuth, async (req, res) => {
    try {
      const pipelineId = req.query.pipelineId as string | undefined;
      const stageId = req.query.stageId as string | undefined;
      const contactId = req.query.contactId as string | undefined;
      const status = (req.query.status as string | undefined) || "open";

      const conds: any[] = [];
      if (pipelineId) conds.push(eq(crmOpportunities.pipelineId, pipelineId));
      if (stageId) conds.push(eq(crmOpportunities.stageId, stageId));
      if (contactId) conds.push(eq(crmOpportunities.contactId, contactId));
      if (status !== "all") conds.push(eq(crmOpportunities.status, status as any));

      let q = db.select().from(crmOpportunities).orderBy(asc(crmOpportunities.position));
      if (conds.length) q = (q as any).where(and(...conds));
      const rows = await q;
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/crm-suite/opportunities", requireAuth, async (req, res) => {
    try {
      const parsed = insertCrmOpportunitySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const userId = (req.user as any)?.id;
      const [row] = await db.insert(crmOpportunities).values({
        ...parsed.data,
        ownerId: parsed.data.ownerId ?? userId ?? null,
      }).returning();
      await logActivity({
        opportunityId: row.id, contactId: row.contactId, userId,
        type: "system", title: `Opportunity created: ${row.title}`,
      });
      emitCrmEvent({ kind: "opportunity.created", id: row.id, pipelineId: row.pipelineId, stageId: row.stageId });
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/crm-suite/opportunities/:id", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const userId = (req.user as any)?.id;
      const [prev] = await db.select().from(crmOpportunities).where(eq(crmOpportunities.id, id));
      if (!prev) return res.status(404).json({ message: "Not found" });
      const update: any = { ...req.body, updatedAt: new Date() };
      // Auto-close when status flips to won/lost/abandoned
      if (req.body.status && req.body.status !== "open" && !prev.closedAt) update.closedAt = new Date();
      if (req.body.status === "open" && prev.closedAt) update.closedAt = null;
      const [row] = await db.update(crmOpportunities).set(update).where(eq(crmOpportunities.id, id)).returning();
      if (req.body.stageId && req.body.stageId !== prev.stageId) {
        const [newStage] = await db.select().from(crmPipelineStages).where(eq(crmPipelineStages.id, req.body.stageId));
        await logActivity({
          opportunityId: id, contactId: row.contactId, userId,
          type: "stage_change",
          title: `Stage moved → ${newStage?.name || req.body.stageId}`,
        });
      }
      if (req.body.status && req.body.status !== prev.status) {
        await logActivity({
          opportunityId: id, contactId: row.contactId, userId,
          type: "system",
          title: `Status: ${prev.status} → ${req.body.status}`,
        });
      }
      emitCrmEvent({ kind: "opportunity.updated", id, pipelineId: row.pipelineId, stageId: row.stageId });
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/opportunities/:id", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      await db.delete(crmOpportunities).where(eq(crmOpportunities.id, id));
      emitCrmEvent({ kind: "opportunity.deleted", id });
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Drag & drop reorder within a stage
  app.post("/api/crm-suite/opportunities/reorder", requireAuth, async (req, res) => {
    try {
      const { stageId, opportunityIds } = req.body as { stageId: string; opportunityIds: string[] };
      if (!stageId || !Array.isArray(opportunityIds)) return res.status(400).json({ message: "stageId + opportunityIds[] required" });
      for (let i = 0; i < opportunityIds.length; i++) {
        await db.update(crmOpportunities)
          .set({ stageId, position: i, updatedAt: new Date() })
          .where(eq(crmOpportunities.id, opportunityIds[i]));
      }
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     ACTIVITIES (notes / calls / emails / sms)
  ───────────────────────────────────────────────────────── */
  app.post("/api/crm-suite/activities", requireAuth, async (req, res) => {
    try {
      const parsed = insertCrmActivitySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const userId = (req.user as any)?.id;
      const [row] = await db.insert(crmActivities).values({
        ...parsed.data,
        userId: parsed.data.userId ?? userId ?? null,
      }).returning();
      // Bump contact lastContactedAt for outbound channels
      if (parsed.data.contactId && ["email", "sms", "call", "meeting"].includes(parsed.data.type)) {
        await db.update(crmContacts)
          .set({ lastContactedAt: new Date(), updatedAt: new Date() })
          .where(eq(crmContacts.id, parsed.data.contactId));
      }
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/activities/:id", requireAuth, async (req, res) => {
    try {
      await db.delete(crmActivities).where(eq(crmActivities.id, p(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     TASKS
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/tasks", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const conds: any[] = [];
      if (status) conds.push(eq(crmTasks.status, status as any));
      let q = db.select().from(crmTasks).orderBy(asc(crmTasks.dueAt));
      if (conds.length) q = (q as any).where(and(...conds));
      const rows = await q;
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/crm-suite/tasks", requireAuth, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.dueAt && typeof body.dueAt === "string") body.dueAt = new Date(body.dueAt);
      const parsed = insertCrmTaskSchema.safeParse(body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const userId = (req.user as any)?.id;
      const [row] = await db.insert(crmTasks).values({
        ...parsed.data,
        assigneeId: parsed.data.assigneeId ?? userId ?? null,
      }).returning();
      await logActivity({
        contactId: row.contactId, opportunityId: row.opportunityId, userId,
        type: "task", title: `Task created: ${row.title}`,
        metadata: { taskId: row.id, dueAt: row.dueAt } as any,
      });
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/crm-suite/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = p(req.params.id);
      const body: any = { ...req.body, updatedAt: new Date() };
      if (body.dueAt && typeof body.dueAt === "string") body.dueAt = new Date(body.dueAt);
      if (body.status === "done") body.completedAt = new Date();
      if (body.status === "open") body.completedAt = null;
      const [row] = await db.update(crmTasks).set(body).where(eq(crmTasks.id, id)).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/tasks/:id", requireAuth, async (req, res) => {
    try {
      await db.delete(crmTasks).where(eq(crmTasks.id, p(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     TAGS
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/tags", requireAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(crmTags).orderBy(asc(crmTags.name));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/crm-suite/tags", requireAuth, async (req, res) => {
    try {
      const parsed = insertCrmTagSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const [row] = await db.insert(crmTags).values(parsed.data).onConflictDoNothing().returning();
      res.status(201).json(row || { ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/tags/:id", requireAuth, async (req, res) => {
    try {
      await db.delete(crmTags).where(eq(crmTags.id, p(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     SMART LISTS — saved filter sets
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/smart-lists", requireAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(crmSmartLists).orderBy(asc(crmSmartLists.position), asc(crmSmartLists.name));
      // Decorate with live counts
      const decorated = await Promise.all(rows.map(async (l) => {
        try {
          const f = (l.filters as any) || {};
          const conds: string[] = ["deleted_at IS NULL", "archived_at IS NULL"];
          const params: any[] = [];
          if (f.status) { params.push(f.status); conds.push(`status = $${params.length}`); }
          if (f.source) { params.push(f.source); conds.push(`source = $${params.length}`); }
          if (typeof f.scoreMin === "number") { params.push(f.scoreMin); conds.push(`score >= $${params.length}`); }
          if (typeof f.scoreMax === "number") { params.push(f.scoreMax); conds.push(`score <= $${params.length}`); }
          if (f.tag) { params.push(f.tag); conds.push(`tags ? $${params.length}`); }
          if (f.lastContactedDays) {
            params.push(f.lastContactedDays);
            conds.push(`(last_contacted_at IS NULL OR last_contacted_at < NOW() - ($${params.length} || ' days')::interval)`);
          }
          if (f.doNotContact) conds.push(`do_not_contact = true`);
          const sqlQuery = `SELECT COUNT(*)::int AS n FROM crm_contacts WHERE ${conds.join(" AND ")}`;
          const r = await pool.query(sqlQuery, params);
          return { ...l, count: r.rows[0]?.n || 0 };
        } catch {
          return { ...l, count: 0 };
        }
      }));
      res.json(decorated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/crm-suite/smart-lists", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as any)?.id;
      const parsed = insertCrmSmartListSchema.safeParse({ ...req.body, ownerId: req.body.ownerId ?? userId ?? null });
      if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
      const [row] = await db.insert(crmSmartLists).values(parsed.data).returning();
      res.status(201).json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/crm-suite/smart-lists/:id", requireAuth, async (req, res) => {
    try {
      const [row] = await db.update(crmSmartLists).set(req.body).where(eq(crmSmartLists.id, p(req.params.id))).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/crm-suite/smart-lists/:id", requireAuth, async (req, res) => {
    try {
      await db.delete(crmSmartLists).where(eq(crmSmartLists.id, p(req.params.id)));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  /* ─────────────────────────────────────────────────────────
     BULK ACTIONS — operate on a set of contact IDs
  ───────────────────────────────────────────────────────── */
  app.post("/api/crm-suite/contacts/bulk", requireAuth, async (req, res) => {
    try {
      const { ids, action, payload } = req.body as {
        ids: string[]; action: string; payload?: any;
      };
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids[] required" });
      if (ids.length > 1000) return res.status(400).json({ message: "Max 1000 per batch" });

      const userId = (req.user as any)?.id;

      switch (action) {
        case "delete": {
          await pool.query(
            `UPDATE crm_contacts SET deleted_at = now(), archived_at = now() WHERE id = ANY($1)`,
            [ids],
          );
          for (const id of ids) emitCrmEvent({ kind: "contact.deleted", id });
          return res.json({ ok: true, affected: ids.length, undoable: true });
        }
        case "restore": {
          await pool.query(
            `UPDATE crm_contacts SET deleted_at = NULL, archived_at = NULL, updated_at = now() WHERE id = ANY($1)`,
            [ids],
          );
          for (const id of ids) emitCrmEvent({ kind: "contact.updated", id });
          return res.json({ ok: true, affected: ids.length });
        }
        case "set-status": {
          const status = String(payload?.status || "");
          if (!["lead", "prospect", "customer", "inactive"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
          }
          await pool.query(
            `UPDATE crm_contacts SET status = $1, updated_at = now() WHERE id = ANY($2)`,
            [status, ids],
          );
          for (const id of ids) {
            await db.insert(crmActivities).values({
              contactId: id, userId: userId ?? null, type: "system",
              title: `Bulk status change → ${status}`,
            });
            emitCrmEvent({ kind: "contact.updated", id });
          }
          return res.json({ ok: true, affected: ids.length });
        }
        case "add-tag": {
          const tag = String(payload?.tag || "").trim();
          if (!tag) return res.status(400).json({ message: "tag required" });
          // Append tag if not present
          await pool.query(
            `UPDATE crm_contacts
                SET tags = (
                  CASE WHEN tags ? $1 THEN tags
                       ELSE COALESCE(tags, '[]'::jsonb) || to_jsonb($1::text)
                  END),
                    updated_at = now()
              WHERE id = ANY($2)`,
            [tag, ids],
          );
          // Make sure the tag exists in the global tag table
          await pool.query(`INSERT INTO crm_tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [tag]);
          for (const id of ids) emitCrmEvent({ kind: "contact.updated", id });
          return res.json({ ok: true, affected: ids.length });
        }
        case "remove-tag": {
          const tag = String(payload?.tag || "").trim();
          if (!tag) return res.status(400).json({ message: "tag required" });
          await pool.query(
            `UPDATE crm_contacts
                SET tags = COALESCE(tags, '[]'::jsonb) - $1,
                    updated_at = now()
              WHERE id = ANY($2)`,
            [tag, ids],
          );
          for (const id of ids) emitCrmEvent({ kind: "contact.updated", id });
          return res.json({ ok: true, affected: ids.length });
        }
        case "set-owner": {
          const ownerId = payload?.ownerId || null;
          await pool.query(
            `UPDATE crm_contacts SET owner_id = $1, updated_at = now() WHERE id = ANY($2)`,
            [ownerId, ids],
          );
          for (const id of ids) emitCrmEvent({ kind: "contact.updated", id });
          return res.json({ ok: true, affected: ids.length });
        }
        case "archive": {
          await pool.query(
            `UPDATE crm_contacts SET archived_at = now(), updated_at = now() WHERE id = ANY($1)`,
            [ids],
          );
          for (const id of ids) emitCrmEvent({ kind: "contact.updated", id });
          return res.json({ ok: true, affected: ids.length });
        }
        default:
          return res.status(400).json({ message: `Unknown action: ${action}` });
      }
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  /* ─────────────────────────────────────────────────────────
     CSV — export + import
  ───────────────────────────────────────────────────────── */
  function csvEscape(v: any): string {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  app.get("/api/crm-suite/contacts/export.csv", requireAuth, async (req, res) => {
    try {
      // Reuse same filter logic as the list endpoint via inline build
      const q = (req.query.q as string)?.toLowerCase()?.trim();
      const status = req.query.status as string | undefined;
      const tag = req.query.tag as string | undefined;
      const source = req.query.source as string | undefined;
      const scoreMin = req.query.scoreMin ? parseInt(req.query.scoreMin as string, 10) : undefined;
      const scoreMax = req.query.scoreMax ? parseInt(req.query.scoreMax as string, 10) : undefined;
      const lastContactedDays = req.query.lastContactedDays ? parseInt(req.query.lastContactedDays as string, 10) : undefined;
      const doNotContact = req.query.doNotContact === "true";

      const conditions: any[] = [
        sql`(${crmContacts.id} IN (SELECT id FROM crm_contacts WHERE deleted_at IS NULL))`,
        isNull(crmContacts.archivedAt),
      ];
      if (status) conditions.push(eq(crmContacts.status, status as any));
      if (source) conditions.push(eq(crmContacts.source, source));
      if (typeof scoreMin === "number") conditions.push(sql`${crmContacts.score} >= ${scoreMin}`);
      if (typeof scoreMax === "number") conditions.push(sql`${crmContacts.score} <= ${scoreMax}`);
      if (lastContactedDays && lastContactedDays > 0) {
        conditions.push(or(
          isNull(crmContacts.lastContactedAt),
          sql`${crmContacts.lastContactedAt} < NOW() - (${lastContactedDays} || ' days')::interval`,
        ));
      }
      if (doNotContact) conditions.push(eq(crmContacts.doNotContact, true));
      if (q) {
        conditions.push(or(
          ilike(crmContacts.firstName, `%${q}%`),
          ilike(crmContacts.lastName, `%${q}%`),
          ilike(crmContacts.email, `%${q}%`),
          ilike(crmContacts.phone, `%${q}%`),
          ilike(crmContacts.company, `%${q}%`),
        ));
      }
      let rows = await db.select().from(crmContacts).where(and(...conditions)).orderBy(desc(crmContacts.updatedAt)).limit(50000);
      if (tag) rows = rows.filter(r => Array.isArray(r.tags) && r.tags.includes(tag));

      const header = [
        "id", "firstName", "lastName", "email", "phone", "company", "title",
        "status", "source", "lifecycleStage", "score", "tags", "city", "country",
        "instagram", "youtube", "linkedin", "twitter", "website",
        "doNotContact", "lastContactedAt", "createdAt", "updatedAt", "notes",
      ];
      const lines = [header.join(",")];
      for (const r of rows) {
        lines.push([
          r.id, r.firstName, r.lastName, r.email, r.phone, r.company, r.title,
          r.status, r.source, r.lifecycleStage, r.score, (r.tags || []).join("|"),
          r.city, r.country,
          r.instagram, r.youtube, r.linkedin, r.twitter, r.website,
          r.doNotContact ? "true" : "false",
          r.lastContactedAt ? new Date(r.lastContactedAt).toISOString() : "",
          r.createdAt ? new Date(r.createdAt).toISOString() : "",
          r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
          r.notes,
        ].map(csvEscape).join(","));
      }
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="oravini-contacts-${new Date().toISOString().slice(0,10)}.csv"`);
      res.send(lines.join("\n"));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // CSV import — accepts JSON { rows: [{...}], dedupBy: 'email' | 'phone' | 'none' }
  app.post("/api/crm-suite/contacts/import-csv", requireAuth, async (req, res) => {
    try {
      const { rows, dedupBy = "email" } = req.body as { rows: any[]; dedupBy?: "email" | "phone" | "none" };
      if (!Array.isArray(rows)) return res.status(400).json({ message: "rows[] required" });
      if (rows.length > 5000) return res.status(400).json({ message: "Max 5000 rows per import" });

      let inserted = 0, updated = 0, skipped = 0;
      const userId = (req.user as any)?.id;

      for (const raw of rows) {
        // Normalize incoming keys (case-insensitive friendly)
        const r = Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [String(k).trim().toLowerCase().replace(/[\s_-]+/g, ""), v]),
        ) as Record<string, any>;
        const firstName = (r.firstname ?? r.first ?? r.givenname ?? "").toString().trim() || null;
        const lastName  = (r.lastname  ?? r.last  ?? r.familyname ?? r.surname ?? "").toString().trim() || null;
        const email     = (r.email ?? r.emailaddress ?? "").toString().trim().toLowerCase() || null;
        const phone     = (r.phone ?? r.phonenumber ?? r.mobile ?? "").toString().trim() || null;
        const company   = (r.company ?? r.organization ?? "").toString().trim() || null;
        const title     = (r.title ?? r.jobtitle ?? "").toString().trim() || null;
        const tagsCsv   = (r.tags ?? "").toString();
        const tags      = tagsCsv ? tagsCsv.split(/[|,]/).map((s: string) => s.trim()).filter(Boolean) : [];
        const source    = (r.source ?? "csv-import").toString();
        const status    = ["lead", "prospect", "customer", "inactive"].includes(String(r.status || "").toLowerCase())
          ? String(r.status).toLowerCase() as any : "lead";
        const score     = parseInt(r.score, 10) || 0;
        const notes     = (r.notes ?? "").toString() || null;

        if (!email && !phone && !firstName && !lastName) { skipped++; continue; }

        // Dedup
        let existing: any = null;
        if (dedupBy === "email" && email) {
          const q = await pool.query(`SELECT id FROM crm_contacts WHERE lower(email) = $1 LIMIT 1`, [email]);
          existing = q.rows[0];
        } else if (dedupBy === "phone" && phone) {
          const q = await pool.query(`SELECT id FROM crm_contacts WHERE phone = $1 LIMIT 1`, [phone]);
          existing = q.rows[0];
        }

        if (existing) {
          await pool.query(
            `UPDATE crm_contacts SET
                first_name = COALESCE($1, first_name),
                last_name  = COALESCE($2, last_name),
                phone      = COALESCE($3, phone),
                company    = COALESCE($4, company),
                title      = COALESCE($5, title),
                status     = $6,
                score      = GREATEST(score, $7),
                notes      = COALESCE($8, notes),
                tags       = COALESCE(tags, '[]'::jsonb) || $9::jsonb,
                updated_at = now()
              WHERE id = $10`,
            [firstName, lastName, phone, company, title, status, score, notes, JSON.stringify(tags), existing.id],
          );
          emitCrmEvent({ kind: "contact.updated", id: existing.id });
          updated++;
        } else {
          const ins = await pool.query(
            `INSERT INTO crm_contacts
              (first_name, last_name, email, phone, company, title, status, source, score, tags, notes, owner_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING id`,
            [firstName, lastName, email, phone, company, title, status, source, score, JSON.stringify(tags), notes, userId ?? null],
          );
          if (ins.rows[0]?.id) {
            await db.insert(crmActivities).values({
              contactId: ins.rows[0].id, userId: userId ?? null, type: "system",
              title: "Contact created (CSV import)",
            });
            emitCrmEvent({ kind: "contact.created", id: ins.rows[0].id });
          }
          inserted++;
        }
      }
      res.json({ ok: true, inserted, updated, skipped });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /* ─────────────────────────────────────────────────────────
     DUPLICATES + MERGE
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/contacts/duplicates", requireAuth, async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT key, COUNT(*)::int AS n,
          (array_agg(id ORDER BY updated_at DESC))::text[] AS ids,
          (array_agg(json_build_object(
            'id', id,
            'firstName', first_name,
            'lastName', last_name,
            'email', email,
            'phone', phone,
            'company', company,
            'status', status,
            'createdAt', created_at,
            'updatedAt', updated_at
          ) ORDER BY updated_at DESC))::jsonb AS contacts
        FROM (
          SELECT id, first_name, last_name, email, phone, company, status, created_at, updated_at,
                 LOWER(email) AS key
          FROM crm_contacts
          WHERE deleted_at IS NULL AND archived_at IS NULL AND email IS NOT NULL AND email <> ''
        ) t
        GROUP BY key
        HAVING COUNT(*) > 1
        ORDER BY n DESC
        LIMIT 200
      `);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Merge: keepId absorbs all other ids — activities/opps/tasks reassigned, others soft-deleted.
  app.post("/api/crm-suite/contacts/merge", requireAuth, async (req, res) => {
    try {
      const { keepId, mergeIds, fields } = req.body as { keepId: string; mergeIds: string[]; fields?: Record<string, any> };
      if (!keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
        return res.status(400).json({ message: "keepId + mergeIds[] required" });
      }
      if (mergeIds.includes(keepId)) {
        return res.status(400).json({ message: "keepId cannot be in mergeIds" });
      }

      // Optional: write merged field selections onto the keeper
      if (fields && typeof fields === "object" && Object.keys(fields).length) {
        const safe: Record<string, any> = {};
        for (const k of [
          "firstName", "lastName", "email", "phone", "company", "title",
          "status", "source", "score", "city", "country", "instagram",
          "youtube", "linkedin", "twitter", "website", "notes",
        ]) {
          if (k in fields) safe[k] = fields[k];
        }
        if (Object.keys(safe).length) {
          await db.update(crmContacts).set({ ...safe, updatedAt: new Date() } as any).where(eq(crmContacts.id, keepId));
        }
      }

      // Re-parent activities, opportunities, tasks
      await pool.query(`UPDATE crm_activities    SET contact_id = $1 WHERE contact_id = ANY($2)`, [keepId, mergeIds]);
      await pool.query(`UPDATE crm_opportunities SET contact_id = $1 WHERE contact_id = ANY($2)`, [keepId, mergeIds]);
      await pool.query(`UPDATE crm_tasks         SET contact_id = $1 WHERE contact_id = ANY($2)`, [keepId, mergeIds]);

      // Union tags onto the keeper
      await pool.query(`
        UPDATE crm_contacts c
           SET tags = (
              SELECT to_jsonb(array(
                SELECT DISTINCT jsonb_array_elements_text(
                  COALESCE(c.tags, '[]'::jsonb) ||
                  COALESCE((SELECT jsonb_agg(t) FROM crm_contacts m, jsonb_array_elements_text(COALESCE(m.tags, '[]'::jsonb)) AS t WHERE m.id = ANY($1)), '[]'::jsonb)
                )
              ))
           ),
               updated_at = now()
         WHERE c.id = $2
      `, [mergeIds, keepId]);

      // Soft-delete the others
      await pool.query(`UPDATE crm_contacts SET deleted_at = now(), archived_at = now() WHERE id = ANY($1)`, [mergeIds]);

      // Activity log on the keeper
      await db.insert(crmActivities).values({
        contactId: keepId,
        userId: (req.user as any)?.id ?? null,
        type: "system",
        title: `Merged ${mergeIds.length} duplicate contact${mergeIds.length === 1 ? "" : "s"} into this one`,
        metadata: { mergedIds: mergeIds } as any,
      });

      emitCrmEvent({ kind: "contact.updated", id: keepId });
      for (const id of mergeIds) emitCrmEvent({ kind: "contact.deleted", id });

      res.json({ ok: true, kept: keepId, merged: mergeIds.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  /* ─────────────────────────────────────────────────────────
     DASHBOARD STATS
  ───────────────────────────────────────────────────────── */
  app.get("/api/crm-suite/dashboard", requireAuth, async (_req, res) => {
    try {
      const [
        contactsCount, leadsCount, customersCount,
        openOppValue, wonOppValue, lostOppCount, openOppCount,
        openTasksCount, overdueTasksCount,
        recentActivities,
      ] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS n FROM crm_contacts WHERE archived_at IS NULL AND deleted_at IS NULL`).then(r => r.rows[0].n as number),
        pool.query(`SELECT COUNT(*)::int AS n FROM crm_contacts WHERE status = 'lead' AND archived_at IS NULL AND deleted_at IS NULL`).then(r => r.rows[0].n as number),
        pool.query(`SELECT COUNT(*)::int AS n FROM crm_contacts WHERE status = 'customer' AND archived_at IS NULL AND deleted_at IS NULL`).then(r => r.rows[0].n as number),
        pool.query(`SELECT COALESCE(SUM(value_cents)::bigint, 0) AS v FROM crm_opportunities WHERE status = 'open'`).then(r => Number(r.rows[0].v)),
        pool.query(`SELECT COALESCE(SUM(value_cents)::bigint, 0) AS v FROM crm_opportunities WHERE status = 'won'`).then(r => Number(r.rows[0].v)),
        pool.query(`SELECT COUNT(*)::int AS n FROM crm_opportunities WHERE status = 'lost'`).then(r => r.rows[0].n as number),
        pool.query(`SELECT COUNT(*)::int AS n FROM crm_opportunities WHERE status = 'open'`).then(r => r.rows[0].n as number),
        pool.query(`SELECT COUNT(*)::int AS n FROM crm_tasks WHERE status = 'open'`).then(r => r.rows[0].n as number),
        pool.query(`SELECT COUNT(*)::int AS n FROM crm_tasks WHERE status = 'open' AND due_at IS NOT NULL AND due_at < NOW()`).then(r => r.rows[0].n as number),
        db.select().from(crmActivities).orderBy(desc(crmActivities.occurredAt)).limit(15),
      ]);

      // Stage breakdown for default pipeline
      const { rows: stageStats } = await pool.query(`
        SELECT s.id, s.name, s.color, s.position,
          COUNT(o.id)::int AS deals,
          COALESCE(SUM(o.value_cents)::bigint, 0) AS total_value
        FROM crm_pipeline_stages s
        LEFT JOIN crm_opportunities o ON o.stage_id = s.id AND o.status = 'open'
        WHERE s.pipeline_id = (SELECT id FROM crm_pipelines ORDER BY is_default DESC, position ASC LIMIT 1)
        GROUP BY s.id, s.name, s.color, s.position
        ORDER BY s.position ASC
      `);

      res.json({
        counts: {
          contacts: contactsCount, leads: leadsCount, customers: customersCount,
          openOpportunities: openOppCount, lostOpportunities: lostOppCount,
          openTasks: openTasksCount, overdueTasks: overdueTasksCount,
        },
        revenue: {
          pipelineCents: openOppValue,
          wonCents: wonOppValue,
        },
        stageStats,
        recentActivities,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
