/**
 * AI Page Studio — Lovable-style landing page generation on marketing_landing_pages.
 *
 *  POST /api/page-studio/generate            { prompt }            → new page (AI picks sections, copy, theme, imagery)
 *  POST /api/page-studio/from-template       { templateId, title? } → new page from a gallery template
 *  POST /api/page-studio/:id/chat            { message }           → AI edits copy / restyles theme / regenerates
 *  GET  /api/page-studio/:id/versions                              → version history
 *  POST /api/page-studio/:id/versions/:vid/restore                 → revert to any version (non-destructive)
 *  POST /api/page-studio/:id/undo                                  → step back one version
 *
 * Every AI change and restore writes a row to landing_page_versions, so nothing is ever lost.
 * AI provider chain: aiService (Groq first, OpenRouter fallback). Images: free Unsplash keywords
 * resolved client-side from shared IMAGE_LIBRARY, layered on CSS gradients.
 */
import type { Express, Request, Response } from "express";
import { pool } from "./storage";
import { aiChatJson } from "./aiService";
import {
  normalizePageDoc, normalizeSections, normalizeTheme, SECTION_SCHEMA_DOC, THEME_SCHEMA_DOC,
  IMAGE_KEYWORDS, THEME_PRESETS, type PageDoc,
} from "@shared/pageEngine";
import { getTemplate, instantiateTemplate } from "@shared/pageTemplates";
import { ensureSubdomain } from "./pageDomains";

export async function ensurePageStudioSchema() {
  await pool.query(`
    ALTER TABLE marketing_landing_pages ADD COLUMN IF NOT EXISTS theme JSONB;
    ALTER TABLE marketing_landing_pages ADD COLUMN IF NOT EXISTS prompt TEXT;
    ALTER TABLE funnel_steps ADD COLUMN IF NOT EXISTS theme JSONB;
    CREATE TABLE IF NOT EXISTS landing_page_versions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      page_id VARCHAR NOT NULL REFERENCES marketing_landing_pages(id) ON DELETE CASCADE,
      version_no INTEGER NOT NULL,
      title TEXT,
      theme JSONB,
      sections JSONB NOT NULL DEFAULT '[]',
      source VARCHAR(20) NOT NULL,
      label TEXT,
      restored_from VARCHAR,
      created_at TIMESTAMP DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_lpv_page ON landing_page_versions(page_id, version_no DESC);
  `);
}

// ── Prompting ────────────────────────────────────────────────────────────────

const DESIGN_RULES = `
DESIGN + COPY RULES
- You decide the section mix and order for this specific goal. Typical strong pages use 6–10 sections. Start with "hero". Only use section types from the schema.
- The page MUST convert: include an opt-in ("form" section and/or hero.showForm=true) unless the goal is clearly a sale (then "pricing" + "cta").
- Write real, specific, benefit-driven copy for the stated audience: concrete numbers, outcomes, names, timeframes. NEVER use placeholders, brackets like [Your Name], lorem ipsum or "Benefit one".
- Testimonials: realistic first names + roles + specific results. Stats: plausible, specific numbers.
- Theme: pick a palette, light/dark mode, fonts, radius, button and surface style that fit the brand and audience. Ensure strong contrast (text vs bg, primaryText vs primary).
- Imagery: only use these keywords for hero.image / image.src / avatars: ${IMAGE_KEYWORDS.join(", ")}. Leave image empty when a section reads better without one. Use hero.layout "split" or "image-bg" when an image helps.
- Leave URLs empty unless the user gave one.`;

const GENERATE_SYSTEM = `You are a world-class landing page designer and direct-response copywriter (think Lovable + top agency).
Return ONLY a JSON object: { "title": string, "theme": THEME, "sections": [{ "type": string, "data": object }] }

THEME = ${THEME_SCHEMA_DOC}

SECTION SCHEMA (type: data fields)
${SECTION_SCHEMA_DOC}
${DESIGN_RULES}`;

const CHAT_SYSTEM = `You are the AI designer inside a landing page builder. The user is iterating on a page by chat.
Decide which ONE action fits the message and return ONLY JSON:
{ "action": "edit" | "restyle" | "regenerate" | "answer",
  "reply": short friendly sentence describing what you changed (or answering),
  "title"?: string,
  "theme"?: THEME (required for "restyle"; optional for "edit"/"regenerate"),
  "sections"?: full updated sections array (required for "edit" and "regenerate") }
- "edit": change copy/sections. Return the COMPLETE sections array, keeping each unchanged section's "id" and data exactly as given.
- "restyle": change only the visual theme (colors, light/dark, fonts, buttons, surfaces). Do not return sections.
- "regenerate": rebuild the whole page (new section mix + copy + theme) for the same goal, adjusted by the message.
- "answer": a question with no change.

THEME = ${THEME_SCHEMA_DOC}

SECTION SCHEMA
${SECTION_SCHEMA_DOC}
${DESIGN_RULES}`;

function parseJson(raw: string): any {
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) return JSON.parse(m[0]);
  throw new Error("AI returned invalid JSON");
}

const PLACEHOLDER = /\[[^\]]{2,40}\]|lorem ipsum/gi;
/** Remove leftover template placeholders and make sure the page can capture a lead. */
function polishDoc(doc: PageDoc): PageDoc {
  const clean = (v: any): any =>
    typeof v === "string" ? v.replace(PLACEHOLDER, "").replace(/\s{2,}/g, " ").trim()
      : Array.isArray(v) ? v.map(clean)
      : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v;
  const sections = doc.sections.map(s => ({ ...s, data: clean(s.data) }));
  // Drop list items that were nothing but placeholders.
  for (const s of sections) {
    if (s.type === "testimonials") s.data.testimonials = (s.data.testimonials || []).filter((t: any) => t.name && t.quote);
    if (s.type === "faq") s.data.faqs = (s.data.faqs || []).filter((f: any) => f.question && f.answer);
    if (s.type === "stats") s.data.stats = (s.data.stats || []).filter((x: any) => x.number);
  }
  const converts = sections.some(s => s.type === "form" || s.type === "two_step_form" || s.type === "pricing" || (s.type === "hero" && s.data.showForm));
  if (!converts) {
    sections.push({ id: Math.random().toString(36).slice(2, 10), type: "form", data: { formTitle: "Get started", formSubtext: "Leave your details and we'll be in touch.", buttonText: "Continue", fields: ["name", "email"] } });
  }
  if (!sections.length || sections[0].type !== "hero") {
    const heroIdx = sections.findIndex(s => s.type === "hero");
    if (heroIdx > 0) sections.unshift(sections.splice(heroIdx, 1)[0]);
  }
  return { ...doc, sections };
}

async function generateDoc(prompt: string): Promise<PageDoc> {
  const raw = await aiChatJson(GENERATE_SYSTEM, `Build a complete landing page for:\n"""${prompt.slice(0, 2000)}"""`, { maxTokens: 6000, temperature: 0.8 });
  const parsed = parseJson(raw);
  const doc = polishDoc(normalizePageDoc(parsed));
  if (doc.sections.length < 3) throw new Error("AI returned too few sections — please try again");
  return doc;
}

// ── Persistence helpers ──────────────────────────────────────────────────────

async function snapshot(pageId: string, source: string, label: string | null, restoredFrom: string | null = null) {
  const { rows } = await pool.query(
    `INSERT INTO landing_page_versions (page_id, version_no, title, theme, sections, source, label, restored_from)
     SELECT p.id, COALESCE((SELECT MAX(version_no) FROM landing_page_versions WHERE page_id = p.id), 0) + 1,
            p.title, p.theme, p.sections, $2, $3, $4
       FROM marketing_landing_pages p WHERE p.id = $1
     RETURNING id, version_no, source, label, created_at`,
    [pageId, source, label ? label.slice(0, 200) : null, restoredFrom]);
  return rows[0];
}

const sameContent = (a: any, b: any) =>
  JSON.stringify([a.title, a.theme ?? null, a.sections]) === JSON.stringify([b.title, b.theme ?? null, b.sections]);

/** If the page was edited by hand since the latest version, keep those edits as a "manual" version first. */
async function snapshotIfDirty(page: any) {
  const { rows } = await pool.query(`SELECT * FROM landing_page_versions WHERE page_id = $1 ORDER BY version_no DESC LIMIT 1`, [page.id]);
  if (!rows[0] || !sameContent(page, rows[0])) await snapshot(page.id, "manual", "Manual edits");
}

async function applyDoc(pageId: string, doc: Partial<PageDoc>) {
  const { rows } = await pool.query(
    `UPDATE marketing_landing_pages SET
       title = COALESCE($1, title), theme = COALESCE($2::jsonb, theme), sections = COALESCE($3::jsonb, sections), updated_at = now()
     WHERE id = $4 RETURNING *`,
    [doc.title ?? null, doc.theme ? JSON.stringify(doc.theme) : null, doc.sections ? JSON.stringify(doc.sections) : null, pageId]);
  return rows[0];
}

async function createPage(userId: string, doc: PageDoc, prompt: string | null, template: string) {
  const base = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "page";
  const slug = `${base}-${Date.now().toString(36)}`;
  const { rows } = await pool.query(
    `INSERT INTO marketing_landing_pages (user_id, title, template, color_scheme, sections, slug, theme, prompt)
     VALUES ($1, $2, $3, 'gold', $4, $5, $6, $7) RETURNING *`,
    [userId, doc.title, template, JSON.stringify(doc.sections), slug, JSON.stringify(doc.theme), prompt]);
  rows[0].subdomain = await ensureSubdomain("landing_page", rows[0].id);
  return rows[0];
}

async function ownedPage(id: string, userId: string) {
  const { rows } = await pool.query(`SELECT * FROM marketing_landing_pages WHERE id = $1 AND user_id = $2`, [id, userId]);
  return rows[0];
}

const aiError = (res: Response, e: any) => {
  console.error("[page-studio]", e.message);
  const notConfigured = /not configured|API key/i.test(e.message);
  res.status(notConfigured ? 503 : 502).json({ message: notConfigured ? "AI is not configured on this server." : `AI couldn't finish that: ${e.message}` });
};

// ── Routes ───────────────────────────────────────────────────────────────────

export function registerPageStudioRoutes(app: Express, requireAuth: any) {
  app.post("/api/page-studio/generate", requireAuth, async (req: Request, res: Response) => {
    const user = req.user as any;
    const prompt = String(req.body?.prompt || "").trim();
    if (prompt.length < 8) return res.status(400).json({ message: "Describe your page in a sentence or two" });
    let doc: PageDoc;
    try { doc = await generateDoc(prompt); } catch (e: any) { return aiError(res, e); }
    try {
      const page = await createPage(user.id, doc, prompt, "ai");
      await snapshot(page.id, "generate", prompt);
      res.status(201).json(page);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/page-studio/from-template", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const t = getTemplate(String(req.body?.templateId || ""));
      if (!t) return res.status(404).json({ message: "Template not found" });
      const { theme, sections } = instantiateTemplate(t);
      const page = await createPage(user.id, { title: String(req.body?.title || t.name).slice(0, 120), theme, sections }, null, `tpl:${t.id}`);
      await snapshot(page.id, "template", `Template: ${t.name}`);
      res.status(201).json(page);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/page-studio/:id/chat", requireAuth, async (req: Request, res: Response) => {
    const user = req.user as any;
    const page = await ownedPage(String(req.params.id), user.id);
    if (!page) return res.status(404).json({ message: "Not found" });
    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ message: "Message required" });
    const current: PageDoc = normalizePageDoc({ title: page.title, theme: page.theme, sections: page.sections });

    let out: any;
    try {
      const raw = await aiChatJson(CHAT_SYSTEM,
        `Original goal: ${page.prompt || page.title}\n\nCURRENT PAGE JSON:\n${JSON.stringify(current)}\n\nUSER MESSAGE: ${message.slice(0, 1500)}`,
        { maxTokens: 6000, temperature: 0.6 });
      out = parseJson(raw);
    } catch (e: any) { return aiError(res, e); }

    const action = ["edit", "restyle", "regenerate", "answer"].includes(out?.action) ? out.action : "answer";
    const reply = String(out?.reply || "Done.").slice(0, 500);
    if (action === "answer") return res.json({ action, reply, page, version: null });

    const next: Partial<PageDoc> = {};
    if (action === "restyle" || out.theme) next.theme = normalizeTheme(out.theme, current.theme);
    if ((action === "edit" || action === "regenerate") && Array.isArray(out.sections)) {
      const doc = polishDoc({ title: current.title, theme: next.theme || current.theme, sections: normalizeSections(out.sections) });
      if (doc.sections.length >= 2) next.sections = doc.sections;
    }
    if (typeof out.title === "string" && out.title.trim() && action !== "restyle") next.title = out.title.trim().slice(0, 120);
    if (!next.theme && !next.sections && !next.title) return res.json({ action: "answer", reply: reply || "I couldn't apply that change — try rephrasing.", page, version: null });

    try {
      await snapshotIfDirty(page);
      const updated = await applyDoc(page.id, next);
      const version = await snapshot(page.id, "chat", `${action}: ${message}`);
      res.json({ action, reply, page: updated, version });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/page-studio/:id/versions", requireAuth, async (req: Request, res: Response) => {
    const user = req.user as any;
    if (!(await ownedPage(String(req.params.id), user.id))) return res.status(404).json({ message: "Not found" });
    const { rows } = await pool.query(
      `SELECT id, version_no, source, label, restored_from, created_at, theme->>'name' AS theme_name, jsonb_array_length(sections) AS section_count
         FROM landing_page_versions WHERE page_id = $1 ORDER BY version_no DESC LIMIT 100`, [req.params.id]);
    res.json(rows);
  });

  async function restore(pageId: string, versionId: string, label: string) {
    const { rows } = await pool.query(`SELECT * FROM landing_page_versions WHERE id = $1 AND page_id = $2`, [versionId, pageId]);
    if (!rows[0]) return null;
    const v = rows[0];
    const page = await applyDoc(pageId, { title: v.title, theme: v.theme ?? undefined, sections: v.sections });
    if (!v.theme) await pool.query(`UPDATE marketing_landing_pages SET theme = NULL WHERE id = $1`, [pageId]);
    const version = await snapshot(pageId, "restore", `${label} v${v.version_no}`, v.id);
    return { page: v.theme ? page : { ...page, theme: null }, version };
  }

  app.post("/api/page-studio/:id/versions/:vid/restore", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const page = await ownedPage(String(req.params.id), user.id);
      if (!page) return res.status(404).json({ message: "Not found" });
      await snapshotIfDirty(page);
      const out = await restore(page.id, String(req.params.vid), "Reverted to");
      if (!out) return res.status(404).json({ message: "Version not found" });
      res.json(out);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/page-studio/:id/undo", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const page = await ownedPage(String(req.params.id), user.id);
      if (!page) return res.status(404).json({ message: "Not found" });
      await snapshotIfDirty(page);
      const { rows: versions } = await pool.query(`SELECT id, version_no, source, restored_from FROM landing_page_versions WHERE page_id = $1 ORDER BY version_no DESC`, [page.id]);
      const latest = versions[0];
      if (!latest) return res.status(400).json({ message: "Nothing to undo" });
      // If the latest version is itself a restore, step back from the version it restored (so repeated undo keeps going back).
      const anchorNo = latest.source === "restore" ? (versions.find(v => v.id === latest.restored_from)?.version_no ?? latest.version_no) : latest.version_no;
      const target = versions.find(v => v.version_no < anchorNo && v.source !== "restore");
      if (!target) return res.status(400).json({ message: "Nothing to undo" });
      const out = await restore(page.id, target.id, "Undo → back to");
      res.json(out);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/page-studio/theme-presets", requireAuth, (_req, res) => res.json(THEME_PRESETS));
}
