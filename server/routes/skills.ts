import { type Express, type Request, type Response } from "express";
import { pool } from "../storage";
import { randomUUID } from "crypto";
import { generateSkillFromDNA, seedPlatformSkills } from "../skillsEngine";

export async function bootstrapSkills() {
  await seedPlatformSkills();
}

export function registerSkillsRoutes(
  app: Express,
  requireAuth: (req: Request, res: Response, next: any) => void
) {
  // ── GET /api/skills/store — browse all platform + public skills ────────────
  app.get("/api/skills/store", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { category, platform } = req.query as Record<string, string>;

      let sql = `SELECT s.*, us."isActive" as "userIsActive", (us."skillId" IS NOT NULL) as installed
                 FROM "Skill" s
                 LEFT JOIN "UserSkill" us ON us."skillId" = s.id AND us."userId" = $1
                 WHERE (s."isSystem" = TRUE OR s."isPublic" = TRUE)`;
      const params: any[] = [userId];

      if (category) {
        params.push(category);
        sql += ` AND s.category = $${params.length}`;
      }
      if (platform) {
        params.push(platform);
        sql += ` AND $${params.length} = ANY(s.platforms)`;
      }

      sql += ` ORDER BY s."isSystem" DESC, s."usageCount" DESC`;

      const result = await pool.query(sql, params);
      return res.json(result.rows.map((r: any) => ({
        ...r,
        installed: r.installed,
        isActive: r.userIsActive ?? false,
      })));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── GET /api/skills/mine — user's installed + created skills ──────────────
  app.get("/api/skills/mine", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      const [installed, created] = await Promise.all([
        pool.query(
          `SELECT s.*, us."isActive", us.id as "userSkillId", us."lastUsedAt", us."useCount" FROM "UserSkill" us
           JOIN "Skill" s ON s.id = us."skillId"
           WHERE us."userId" = $1
           ORDER BY us."installedAt" DESC`,
          [userId]
        ),
        pool.query(
          `SELECT * FROM "Skill" WHERE "createdBy" = $1 AND "isSystem" = FALSE ORDER BY "createdAt" DESC`,
          [userId]
        ),
      ]);

      return res.json({
        installed: installed.rows,
        created: created.rows,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/skills/:id/install ──────────────────────────────────────────
  app.post("/api/skills/:id/install", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const skill = await pool.query(`SELECT id FROM "Skill" WHERE id = $1`, [id]);
      if (!skill.rows.length) return res.status(404).json({ message: "Skill not found" });

      const existing = await pool.query(
        `SELECT id FROM "UserSkill" WHERE "userId" = $1 AND "skillId" = $2`,
        [userId, id]
      );

      if (existing.rows.length) {
        await pool.query(`UPDATE "UserSkill" SET "isActive" = TRUE WHERE "userId" = $1 AND "skillId" = $2`, [userId, id]);
      } else {
        await pool.query(
          `INSERT INTO "UserSkill" (id, "userId", "skillId", "isActive", "installedAt") VALUES ($1, $2, $3, TRUE, NOW())`,
          [randomUUID(), userId, id]
        );
      }

      await pool.query(`UPDATE "Skill" SET "usageCount" = "usageCount" + 1 WHERE id = $1`, [id]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── DELETE /api/skills/:id/uninstall ──────────────────────────────────────
  app.delete("/api/skills/:id/uninstall", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      await pool.query(`DELETE FROM "UserSkill" WHERE "userId" = $1 AND "skillId" = $2`, [userId, id]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── PATCH /api/skills/:id/toggle ──────────────────────────────────────────
  app.patch("/api/skills/:id/toggle", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE "UserSkill" SET "isActive" = NOT "isActive" WHERE "userId" = $1 AND "skillId" = $2 RETURNING *`,
        [userId, id]
      );
      if (!result.rows.length) return res.status(404).json({ message: "Skill not installed" });
      return res.json(result.rows[0]);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/skills — create custom skill ────────────────────────────────
  app.post("/api/skills", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { name, description, category, platforms, instructions, icon, tags, isPublic } = req.body;

      if (!name || !instructions || !category) {
        return res.status(400).json({ message: "name, category, and instructions required" });
      }

      const slug = `${userId.slice(0, 8)}-${name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40)}-${Date.now()}`;
      const id = randomUUID();

      await pool.query(
        `INSERT INTO "Skill" (id, slug, name, description, category, platforms, instructions, icon, tags, "isSystem", "isPublic", "createdBy", "usageCount", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10, $11, 0, NOW(), NOW())`,
        [id, slug, name, description || "", category, platforms || ["all"], instructions, icon || "⚡", tags || [], isPublic ?? false, userId]
      );

      // Auto-install for creator
      await pool.query(
        `INSERT INTO "UserSkill" (id, "userId", "skillId", "isActive", "installedAt") VALUES ($1, $2, $3, TRUE, NOW())`,
        [randomUUID(), userId, id]
      );

      const skill = await pool.query(`SELECT * FROM "Skill" WHERE id = $1`, [id]);
      return res.status(201).json(skill.rows[0]);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── PUT /api/skills/:id — update custom skill ─────────────────────────────
  app.put("/api/skills/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const skill = await pool.query(`SELECT * FROM "Skill" WHERE id = $1`, [id]);
      if (!skill.rows.length) return res.status(404).json({ message: "Skill not found" });
      if (skill.rows[0].isSystem || skill.rows[0].createdBy !== userId) {
        return res.status(403).json({ message: "Cannot edit this skill" });
      }

      const { name, description, category, platforms, instructions, icon, tags, isPublic } = req.body;
      const result = await pool.query(
        `UPDATE "Skill" SET name=$1, description=$2, category=$3, platforms=$4, instructions=$5, icon=$6, tags=$7, "isPublic"=$8, "updatedAt"=NOW()
         WHERE id=$9 RETURNING *`,
        [name, description, category, platforms, instructions, icon, tags, isPublic, id]
      );

      return res.json(result.rows[0]);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── DELETE /api/skills/:id — delete custom skill ──────────────────────────
  app.delete("/api/skills/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const skill = await pool.query(`SELECT * FROM "Skill" WHERE id = $1`, [id]);
      if (!skill.rows.length) return res.status(404).json({ message: "Skill not found" });
      if (skill.rows[0].isSystem || skill.rows[0].createdBy !== userId) {
        return res.status(403).json({ message: "Cannot delete this skill" });
      }

      await pool.query(`DELETE FROM "Skill" WHERE id = $1`, [id]);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/skills/generate-from-dna ───────────────────────────────────
  app.post("/api/skills/generate-from-dna", requireAuth, async (req: Request, res: Response) => {
    try {
      const { dnaContent } = req.body;
      if (!dnaContent || dnaContent.trim().length < 50) {
        return res.status(400).json({ message: "Provide at least 50 characters of content DNA" });
      }

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "AI not configured" });

      const generated = await generateSkillFromDNA(dnaContent, apiKey);
      return res.json(generated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── GET /api/skills/active-prompt — combined skill prompt for AI calls ────
  app.get("/api/skills/active-prompt", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { category, platform } = req.query as Record<string, string>;

      const { buildSkillsPrompt } = await import("../skillsEngine");
      const prompt = await buildSkillsPrompt(userId, { category, platform });

      return res.json({ prompt });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── POST /api/skills/:id/try — live sandbox test ──────────────────────────
  app.post("/api/skills/:id/try", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { prompt } = req.body;
      if (!prompt || prompt.trim().length < 3) {
        return res.status(400).json({ message: "Provide a test prompt" });
      }

      const skill = await pool.query(`SELECT * FROM "Skill" WHERE id = $1`, [id]);
      if (!skill.rows.length) return res.status(404).json({ message: "Skill not found" });

      const s = skill.rows[0];
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.status(500).json({ message: "AI not configured" });

      const systemPrompt = `You are an AI assistant. Apply the following skill instructions exactly:\n\n## ${s.icon} ${s.name}\n${s.instructions}`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!r.ok) {
        const err = await r.text();
        return res.status(500).json({ message: `AI error: ${err}` });
      }

      const data: any = await r.json();
      const result = data?.choices?.[0]?.message?.content || "";
      return res.json({ result, skillName: s.name, skillIcon: s.icon });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });
}
