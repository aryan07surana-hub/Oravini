import type { Express, Request, Response } from "express";
import { db } from "../storage";
import { userActivityEvents } from "../../shared/schema";
import { eq, desc, gte, and } from "drizzle-orm";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

async function groq(messages: { role: string; content: string }[], opts: { max_tokens?: number; temperature?: number } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const r = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: opts.max_tokens ?? 1024, temperature: opts.temperature ?? 0.7 }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`Groq error ${r.status}: ${err}`);
  }
  const data = await r.json() as any;
  return data.choices[0].message.content as string;
}

function buildVaultContext(vault: { files: Array<{ name: string; folder: string; tags: string[]; content: string; updatedAt: string }> }) {
  const index = vault.files
    .map((f) => `- [[${f.name.replace(".md", "")}]] (folder: ${f.folder || "root"}, tags: ${f.tags.join(", ") || "none"})`)
    .join("\n");
  return index;
}

export function registerVaultRoutes(app: Express, requireAuth: (req: Request, res: Response, next: any) => void) {
  /* ─── Agent chat ─── */
  app.post("/api/vault/agent", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { messages, currentNote, vault } = req.body as {
        messages: { role: "user" | "assistant"; content: string }[];
        currentNote?: { name: string; content: string; folder: string; tags: string[] };
        vault: { files: Array<{ name: string; folder: string; tags: string[]; content: string; updatedAt: string }> };
      };

      if (!messages?.length) return res.status(400).json({ message: "messages required" });

      // Pull recent activity for behavioral context
      const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const recentActivity = await db
        .select({ eventType: userActivityEvents.eventType, feature: userActivityEvents.feature, action: userActivityEvents.action, createdAt: userActivityEvents.createdAt })
        .from(userActivityEvents)
        .where(and(eq(userActivityEvents.userId, userId), gte(userActivityEvents.createdAt, since14d)))
        .orderBy(desc(userActivityEvents.createdAt))
        .limit(100)
        .catch(() => []);

      const featureCounts: Record<string, number> = {};
      for (const e of recentActivity) {
        if (e.feature) featureCounts[e.feature] = (featureCounts[e.feature] ?? 0) + 1;
      }
      const topFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([f, c]) => `${f} (${c}x)`);

      const vaultIndex = buildVaultContext(vault);
      const noteCtx = currentNote
        ? `\n\nCURRENT OPEN NOTE:\nTitle: ${currentNote.name.replace(".md", "")}\nFolder: ${currentNote.folder || "root"}\nTags: ${currentNote.tags.join(", ") || "none"}\nContent:\n${currentNote.content.slice(0, 3000)}`
        : "";

      const activityCtx = topFeatures.length
        ? `\n\nUSER BEHAVIOR (last 14 days — most used platform features):\n${topFeatures.join(", ")}\n(Use this to make recommendations hyper-relevant to what they're actually working on.)`
        : "";

      const systemPrompt = `You are Cortex, a second brain AI agent for a content creator and entrepreneur on Oravini. You have full access to their vault AND their behavioral data from across the platform.

YOUR VAULT INDEX (all notes):
${vaultIndex}
${noteCtx}
${activityCtx}

YOUR ROLE:
- Think like a brilliant thought partner who has read everything in their vault AND watched them use the platform
- Surface connections between notes they haven't seen
- Identify knowledge gaps — topics referenced but not yet documented
- Use their behavioral patterns to make recommendations hyper-specific to what they're actually working on
- Suggest specific new notes to create when appropriate

When suggesting a new note to create, include at the end of your response:
\`\`\`suggestion
{"title": "Note Title", "folder": "Research", "content": "# Note Title\\n\\n[draft content]"}
\`\`\`

Be direct, sharp, and insightful. No generic advice.`;

      const reply = await groq(
        [{ role: "system", content: systemPrompt }, ...messages],
        { max_tokens: 1500, temperature: 0.72 }
      );

      res.json({ reply });
    } catch (err: any) {
      console.error("[vault/agent]", err);
      res.status(500).json({ message: err.message ?? "Agent error" });
    }
  });

  /* ─── Analyze note: extract concepts, find gaps, suggest links ─── */
  app.post("/api/vault/analyze", requireAuth, async (req: Request, res: Response) => {
    try {
      const { note, vault } = req.body as {
        note: { name: string; content: string; tags: string[] };
        vault: { files: Array<{ name: string; folder: string; tags: string[] }> };
      };

      if (!note?.content) return res.status(400).json({ message: "note required" });

      const existingTitles = vault.files.map((f) => f.name.replace(".md", ""));
      const prompt = `Analyze this note from a content creator's second brain vault.

NOTE TITLE: ${note.name.replace(".md", "")}
NOTE CONTENT:
${note.content.slice(0, 3000)}

EXISTING VAULT NOTES:
${existingTitles.join(", ")}

Return a JSON object with:
{
  "concepts": ["key concept 1", "key concept 2", ...],
  "suggestedTags": ["tag1", "tag2", ...],
  "suggestedLinks": ["ExistingNoteName1", "ExistingNoteName2", ...],
  "gaps": ["Topic that should have its own note", ...],
  "insight": "One sharp insight about this note and how it connects to their knowledge base"
}

Only suggest links to notes that EXIST in the vault. Keep gaps to real missing topics.`;

      const raw = await groq([{ role: "user", content: prompt }], { max_tokens: 800, temperature: 0.4 });

      let parsed: any = {};
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        parsed = { insight: raw };
      }

      res.json(parsed);
    } catch (err: any) {
      console.error("[vault/analyze]", err);
      res.status(500).json({ message: err.message ?? "Analyze error" });
    }
  });

  /* ─── Knowledge gaps across entire vault ─── */
  app.post("/api/vault/gaps", requireAuth, async (req: Request, res: Response) => {
    try {
      const { vault } = req.body as {
        vault: { files: Array<{ name: string; folder: string; content: string; tags: string[] }> };
      };

      const existingTitles = new Set(vault.files.map((f) => f.name.replace(".md", "").toLowerCase()));

      // Extract all wikilinks from all notes
      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
      const referenced = new Set<string>();
      for (const f of vault.files) {
        let m;
        wikiLinkRegex.lastIndex = 0;
        while ((m = wikiLinkRegex.exec(f.content)) !== null) {
          referenced.add(m[1].toLowerCase());
        }
      }

      const missingLinks = [...referenced].filter((r) => !existingTitles.has(r));

      // Also ask AI for conceptual gaps
      const vaultSummary = vault.files
        .slice(0, 40)
        .map((f) => `${f.name.replace(".md", "")} [${f.folder}]: ${f.content.slice(0, 200)}`)
        .join("\n\n");

      const prompt = `Analyze this content creator's knowledge vault and identify the top knowledge gaps — important topics they should document but haven't yet.

VAULT SUMMARY:
${vaultSummary}

BROKEN WIKILINKS (referenced but no note exists): ${missingLinks.join(", ") || "none"}

Return JSON:
{
  "missingNotes": [{"title": "...", "folder": "...", "why": "brief reason"}],
  "underDocumented": ["topic that exists but needs more depth"],
  "nextToWrite": {"title": "...", "folder": "...", "starterContent": "# Title\n\n## Overview\n\n..."}
}

Keep missingNotes to max 5 most important gaps. nextToWrite should be the single most valuable note to create now.`;

      const raw = await groq([{ role: "user", content: prompt }], { max_tokens: 1000, temperature: 0.5 });

      let parsed: any = { missingNotes: [], underDocumented: [], missingLinks };
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) parsed = { ...JSON.parse(match[0]), missingLinks };
      } catch {
        parsed.missingLinks = missingLinks;
      }

      res.json(parsed);
    } catch (err: any) {
      console.error("[vault/gaps]", err);
      res.status(500).json({ message: err.message ?? "Gaps error" });
    }
  });

  /* ─── Synthesize: generate a synthesis note from multiple notes ─── */
  app.post("/api/vault/synthesize", requireAuth, async (req: Request, res: Response) => {
    try {
      const { notes, topic } = req.body as {
        notes: Array<{ name: string; content: string }>;
        topic?: string;
      };

      if (!notes?.length) return res.status(400).json({ message: "notes required" });

      const combined = notes
        .map((n) => `## ${n.name.replace(".md", "")}\n${n.content.slice(0, 1500)}`)
        .join("\n\n---\n\n");

      const prompt = `Synthesize these notes from a content creator's second brain into a new master note${topic ? ` about: ${topic}` : ""}.

NOTES TO SYNTHESIZE:
${combined}

Write a comprehensive synthesis note in Markdown that:
- Identifies the core themes and connections
- Combines insights in a novel way
- Surfaces non-obvious patterns
- Includes actionable takeaways
- Has clear structure with headers

Format as a complete, well-structured Markdown note ready to save.`;

      const synthesis = await groq([{ role: "user", content: prompt }], { max_tokens: 2000, temperature: 0.65 });

      const titleMatch = synthesis.match(/^#\s+(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : (topic || "Synthesis Note");

      res.json({ title, content: synthesis });
    } catch (err: any) {
      console.error("[vault/synthesize]", err);
      res.status(500).json({ message: err.message ?? "Synthesize error" });
    }
  });

  /* ─── Extract viral hooks from note ─── */
  app.post("/api/vault/extract-hooks", requireAuth, async (req: Request, res: Response) => {
    try {
      const { note, platform = "all" } = req.body as {
        note: { name: string; content: string };
        platform?: string;
      };

      if (!note?.content) return res.status(400).json({ message: "note required" });

      const prompt = `You are a viral content strategist for creators on TikTok, Instagram, YouTube, and LinkedIn.

Extract and rewrite the core ideas from this note as 6 viral hooks. Each must be punchy, platform-ready, and reference specific details from the note.

NOTE TITLE: ${note.name.replace(".md", "")}
NOTE CONTENT:
${note.content.slice(0, 2500)}
TARGET PLATFORM: ${platform}

Generate exactly 6 hooks in these styles:
1. Curiosity gap — "Most [audience] don't know that..."
2. Bold claim — "The reason [common belief] is completely wrong"
3. Story opener — "I [specific action] and it changed [outcome]..."
4. Counter-intuitive — "The more you [X], the less [Y]"
5. List hook — "[Number] [things] that [specific result] (especially #[n])"
6. Direct value — "How to [specific outcome] without [common pain point]"

Return ONLY valid JSON:
{"hooks": [{"style": "Curiosity Gap", "text": "..."}, {"style": "Bold Claim", "text": "..."}, {"style": "Story Opener", "text": "..."}, {"style": "Counter-Intuitive", "text": "..."}, {"style": "List Hook", "text": "..."}, {"style": "Direct Value", "text": "..."}]}

Be specific, not generic. Reference actual content from the note.`;

      const raw = await groq([{ role: "user", content: prompt }], { max_tokens: 900, temperature: 0.85 });
      let parsed: any = { hooks: [] };
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {
        parsed = { hooks: [] };
      }
      res.json(parsed);
    } catch (err: any) {
      console.error("[vault/extract-hooks]", err);
      res.status(500).json({ message: err.message ?? "Hook extraction error" });
    }
  });

  /* ─── Auto-memory: synthesize behavior + vault into a Cortex Memory note ─── */
  app.post("/api/vault/auto-memory", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { vault } = req.body as {
        vault: { files: Array<{ name: string; folder: string; content: string; updatedAt: string; tags: string[] }> };
      };

      // Pull 30 days of rich activity
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activity = await db
        .select({
          eventType: userActivityEvents.eventType,
          feature: userActivityEvents.feature,
          action: userActivityEvents.action,
          metadata: userActivityEvents.metadata,
          createdAt: userActivityEvents.createdAt,
        })
        .from(userActivityEvents)
        .where(and(eq(userActivityEvents.userId, userId), gte(userActivityEvents.createdAt, since30d)))
        .orderBy(desc(userActivityEvents.createdAt))
        .limit(500)
        .catch(() => []);

      // Aggregate behavioral patterns
      const featureCounts: Record<string, number> = {};
      const actionCounts: Record<string, number> = {};
      const hourCounts = new Array(24).fill(0);
      const noteOpenCounts: Record<string, number> = {};
      const searchTerms: string[] = [];

      for (const e of activity) {
        if (e.feature) featureCounts[e.feature] = (featureCounts[e.feature] ?? 0) + 1;
        if (e.action) actionCounts[e.action] = (actionCounts[e.action] ?? 0) + 1;
        if (e.createdAt) hourCounts[new Date(e.createdAt).getHours()]++;
        const meta = e.metadata as any;
        if (e.action === "note_opened" && meta?.noteName) {
          noteOpenCounts[meta.noteName] = (noteOpenCounts[meta.noteName] ?? 0) + 1;
        }
        if (e.action === "searched" && meta?.query) searchTerms.push(meta.query);
      }

      const peakHours = hourCounts
        .map((c, h) => ({ h, c }))
        .sort((a, b) => b.c - a.c)
        .slice(0, 3)
        .map(({ h }) => `${h}:00`);

      const topFeatures = Object.entries(featureCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([f, c]) => `${f} (${c}x)`);

      const topNotes = Object.entries(noteOpenCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([n, c]) => `${n} (opened ${c}x)`);

      const recentVaultFiles = vault.files
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 15)
        .map((f) => `- [[${f.name.replace(".md", "")}]] [${f.folder}]: ${f.content.slice(0, 150)}`);

      const prompt = `Synthesize this creator's 30-day behavioral data and vault activity into a "Cortex Memory" note — a rich context file the AI agent reads before every conversation.

BEHAVIORAL PATTERNS (30 days):
- Total events: ${activity.length}
- Peak writing hours: ${peakHours.join(", ")}
- Most-used platform features: ${topFeatures.join(", ")}
- Most-opened vault notes: ${topNotes.join(", ")}
- Recent search terms: ${[...new Set(searchTerms)].slice(0, 10).join(", ") || "none"}

RECENT VAULT ACTIVITY (last 15 updated notes):
${recentVaultFiles.join("\n")}

Write a comprehensive Cortex Memory note in Markdown with these sections:
## Creator Profile
(what kind of creator this is, based on their activity patterns)

## Active Focus Areas
(what they're actually working on right now — infer from note titles + activity)

## Behavioral Patterns
(when they work, what features they use most, how they use the vault)

## Knowledge Architecture
(what topics they've documented, what connections exist)

## AI Agent Instructions
(specific instructions for how to help this creator based on their patterns — what kinds of suggestions resonate, what their content strategy seems to be)

## Open Questions & Gaps
(what they seem to be searching for but haven't found yet)

Be specific. This note will be read by an AI every session to give personalized help. Make it a genuine character snapshot.`;

      const content = await groq([{ role: "user", content: prompt }], { max_tokens: 2000, temperature: 0.65 });
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

      res.json({
        title: `Cortex Memory — ${today}`,
        folder: "Daily",
        content,
      });
    } catch (err: any) {
      console.error("[vault/auto-memory]", err);
      res.status(500).json({ message: err.message ?? "Memory synthesis error" });
    }
  });

  /* ─── Push note to content calendar as draft ─── */
  app.post("/api/vault/push-to-calendar", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { note, platform, scheduledDate } = req.body as {
        note: { name: string; content: string };
        platform: string;
        scheduledDate?: string;
      };

      if (!note?.content) return res.status(400).json({ message: "note required" });

      // Use AI to format the note content as a platform-optimized post
      const prompt = `Convert this vault note into a ready-to-post ${platform} caption/script. Keep the creator's voice. Extract the core message and format it correctly for the platform.

NOTE: ${note.name.replace(".md", "")}
CONTENT: ${note.content.slice(0, 2000)}
PLATFORM: ${platform}

For Instagram/TikTok: Write a punchy caption with hook + value + CTA + hashtags
For LinkedIn: Professional narrative format, no hashtags spam
For YouTube: Video description format with timestamps
For Twitter/X: Thread-ready, 280 chars per tweet

Return ONLY the formatted post text, ready to copy-paste.`;

      const formatted = await groq([{ role: "user", content: prompt }], { max_tokens: 600, temperature: 0.7 });

      // Create draft in scheduled_posts table (gracefully degrade if table schema differs)
      try {
        const schedDate = scheduledDate ? new Date(scheduledDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.execute(
          `INSERT INTO scheduled_posts (user_id, platform, content, status, scheduled_at, metadata)
           VALUES ($1, $2, $3, 'draft', $4, $5)
           ON CONFLICT DO NOTHING` as any,
          [userId, platform, formatted, schedDate.toISOString(), JSON.stringify({ sourceNote: note.name, vaultPush: true })]
        );
      } catch {
        // Table might have different schema — just return the formatted content
      }

      res.json({ success: true, formatted, platform });
    } catch (err: any) {
      console.error("[vault/push-to-calendar]", err);
      res.status(500).json({ message: err.message ?? "Push to calendar error" });
    }
  });

  /* ─── Daily synthesis ─── */
  app.post("/api/vault/daily-synthesis", requireAuth, async (req: Request, res: Response) => {
    try {
      const { vault, recentDays = 7 } = req.body as {
        vault: { files: Array<{ name: string; content: string; updatedAt: string; folder: string }> };
        recentDays?: number;
      };

      const cutoff = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
      const recent = vault.files
        .filter((f) => new Date(f.updatedAt) > cutoff)
        .slice(0, 20);

      if (!recent.length) {
        return res.json({
          title: `Synthesis — ${new Date().toLocaleDateString()}`,
          content: `# Synthesis — ${new Date().toLocaleDateString()}\n\nNo notes updated in the last ${recentDays} days. Time to write something new.\n`,
        });
      }

      const combined = recent
        .map((f) => `### ${f.name.replace(".md", "")} [${f.folder}]\n${f.content.slice(0, 800)}`)
        .join("\n\n");

      const prompt = `You are synthesizing a content creator's recent vault activity into a daily/weekly synthesis note.

RECENT NOTES (last ${recentDays} days):
${combined}

Write a synthesis note in Markdown that:
1. **Patterns & Themes** — what themes keep appearing?
2. **Key Insights** — the most important ideas from this period
3. **Connections** — how do these ideas relate to each other?
4. **Next Actions** — what should they document, explore, or create next?
5. **Open Questions** — what questions do these notes raise?

Be sharp and specific. Reference actual note titles using [[Note Name]] syntax. This synthesis should feel like a thought partner reviewing their week.`;

      const content = await groq([{ role: "user", content: prompt }], { max_tokens: 1800, temperature: 0.7 });
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      res.json({ title: `Synthesis — ${today}`, content });
    } catch (err: any) {
      console.error("[vault/daily-synthesis]", err);
      res.status(500).json({ message: err.message ?? "Synthesis error" });
    }
  });
}
