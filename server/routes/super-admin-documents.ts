import type { Express, Request, Response } from "express";
import { pool } from "../storage";

export function registerSuperAdminDocumentRoutes(app: Express, requireAdmin: any) {
  // List all files with doc counts
  app.get("/api/super-admin/doc-files", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const { rows: files } = await pool.query(
        `SELECT f.id, f.name, f.parent_id AS "parentId", f.created_at AS "createdAt",
                COUNT(d.id)::int AS "docCount"
         FROM super_admin_doc_files f
         LEFT JOIN super_admin_docs d ON d.file_id = f.id
         GROUP BY f.id
         ORDER BY f.created_at DESC`
      );

      const { rows: docs } = await pool.query(
        `SELECT id, file_id AS "fileId", name, type, url, content, created_at AS "createdAt"
         FROM super_admin_docs ORDER BY created_at DESC`
      );

      const docsMap: Record<string, any[]> = {};
      for (const doc of docs) {
        if (!docsMap[doc.fileId]) docsMap[doc.fileId] = [];
        docsMap[doc.fileId].push(doc);
      }

      const result = files.map((f: any) => ({ ...f, docs: docsMap[f.id] ?? [] }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create file
  app.post("/api/super-admin/doc-files", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id, name, parentId } = req.body;
      if (!id || !name) return res.status(400).json({ error: "id and name required" });
      const { rows } = await pool.query(
        `INSERT INTO super_admin_doc_files (id, name, parent_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, parent_id AS "parentId", created_at AS "createdAt"`,
        [id, name, parentId ?? null]
      );
      res.json({ ...rows[0], docs: [] });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Update file (rename or reparent)
  app.patch("/api/super-admin/doc-files/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, parentId } = req.body;
      const { rows } = await pool.query(
        `UPDATE super_admin_doc_files
         SET name = COALESCE($1, name), parent_id = $2
         WHERE id = $3
         RETURNING id, name, parent_id AS "parentId", created_at AS "createdAt"`,
        [name ?? null, parentId ?? null, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete file (cascades docs, clears parentId on children)
  app.delete("/api/super-admin/doc-files/:id", requireAdmin, async (_req: Request, res: Response) => {
    try {
      await pool.query("DELETE FROM super_admin_doc_files WHERE id = $1", [_req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Bulk import (seed from localStorage dump)
  app.post("/api/super-admin/doc-files/bulk-import", requireAdmin, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const files: Array<{ id: string; name: string; parentId?: string | null; createdAt: string; docs: Array<{ id: string; name: string; type: string; url: string; content: string; createdAt: string }> }> = req.body;
      if (!Array.isArray(files)) return res.status(400).json({ error: "Expected array" });

      await client.query("BEGIN");
      for (const f of files) {
        await client.query(
          `INSERT INTO super_admin_doc_files (id, name, parent_id, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [f.id, f.name, f.parentId ?? null, f.createdAt]
        );
      }
      for (const f of files) {
        for (const d of f.docs ?? []) {
          await client.query(
            `INSERT INTO super_admin_docs (id, file_id, name, type, url, content, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO NOTHING`,
            [d.id, f.id, d.name, d.type, d.url ?? "", d.content ?? "", d.createdAt]
          );
        }
      }
      await client.query("COMMIT");
      res.json({ ok: true, imported: files.length });
    } catch (e: any) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: e.message });
    } finally {
      client.release();
    }
  });

  // Add doc to a file
  app.post("/api/super-admin/doc-files/:fileId/docs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id, name, type, url, content } = req.body;
      if (!id || !name || !type) return res.status(400).json({ error: "id, name, type required" });
      const { rows } = await pool.query(
        `INSERT INTO super_admin_docs (id, file_id, name, type, url, content)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, file_id AS "fileId", name, type, url, content, created_at AS "createdAt"`,
        [id, req.params.fileId, name, type, url ?? "", content ?? ""]
      );
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Edit doc
  app.patch("/api/super-admin/docs/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name, type, url, content } = req.body;
      const { rows } = await pool.query(
        `UPDATE super_admin_docs
         SET name = COALESCE($1, name),
             type = COALESCE($2, type),
             url = COALESCE($3, url),
             content = COALESCE($4, content)
         WHERE id = $5
         RETURNING id, file_id AS "fileId", name, type, url, content, created_at AS "createdAt"`,
        [name ?? null, type ?? null, url ?? null, content ?? null, req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete doc
  app.delete("/api/super-admin/docs/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      await pool.query("DELETE FROM super_admin_docs WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
