import type { Express, Request, Response } from "express";
import { pool } from "./storage";
import { decryptToken } from "./security/tokenEncryption";
import { runDailyUpdate, runCreativeAlert } from "./metaAdsAgent";

const p = (param: string | string[]): string => Array.isArray(param) ? param[0] : param;

function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  if ((req.user as any).role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

async function getClientConn(clientId: string) {
  const result = await pool.query(
    "SELECT access_token, ad_account_id FROM client_meta_ads_connections WHERE client_id = $1 AND is_active = true",
    [clientId]
  );
  if (!result.rows[0]) return null;
  const { access_token, ad_account_id } = result.rows[0];
  return { token: decryptToken(access_token), adAccountId: ad_account_id };
}

export function registerMetaAdsAgentRoutes(app: Express) {
  // GET /api/meta-ads/agent-logs/:clientId — fetch all logs for a client
  app.get("/api/meta-ads/agent-logs/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { type, limit = "20" } = req.query as Record<string, string>;
      let query = "SELECT * FROM meta_ads_agent_logs WHERE client_id = $1";
      const params: any[] = [clientId];
      if (type) { query += ` AND type = $2`; params.push(type); }
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET /api/meta-ads/agent-logs/:clientId/unread-count
  app.get("/api/meta-ads/agent-logs/:clientId/unread-count", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const result = await pool.query(
        "SELECT COUNT(*) FROM meta_ads_agent_logs WHERE client_id = $1 AND is_read = FALSE",
        [clientId]
      );
      res.json({ count: parseInt(result.rows[0].count) });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/meta-ads/agent-logs/:clientId/read-all — mark all as read
  app.patch("/api/meta-ads/agent-logs/:clientId/read-all", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      await pool.query(
        "UPDATE meta_ads_agent_logs SET is_read = TRUE WHERE client_id = $1",
        [clientId]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // PATCH /api/meta-ads/agent-logs/:logId/read — mark single log as read
  app.patch("/api/meta-ads/agent-logs/log/:logId/read", requireAdmin, async (req: Request, res: Response) => {
    try {
      const logId = p(req.params.logId);
      await pool.query("UPDATE meta_ads_agent_logs SET is_read = TRUE WHERE id = $1", [logId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // POST /api/meta-ads/agent-run/:clientId — manual trigger
  app.post("/api/meta-ads/agent-run/:clientId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const clientId = p(req.params.clientId);
      const { type = "24h_update" } = req.body as { type?: "24h_update" | "72h_creative_alert" };

      const conn = await getClientConn(clientId);
      if (!conn) return res.status(404).json({ message: "No Meta Ads connection for this client" });

      let summary: string;
      if (type === "72h_creative_alert") {
        summary = await runCreativeAlert(clientId, conn.token, conn.adAccountId);
      } else {
        summary = await runDailyUpdate(clientId, conn.token, conn.adAccountId);
      }

      res.json({ success: true, summary });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
