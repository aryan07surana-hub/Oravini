/**
 * Persistent Audit Logging to Database
 * 
 * Stores security-relevant actions in a dedicated audit_logs table
 * for compliance, forensics, and monitoring.
 */

import { Pool } from "pg";

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  severity?: "info" | "warning" | "critical";
}

let pool: Pool | null = null;

/**
 * Initialize the audit logger with a database pool and ensure the table exists.
 */
export async function initAuditLog(dbPool: Pool): Promise<void> {
  pool = dbPool;

  // Create audit_logs table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      action VARCHAR(255) NOT NULL,
      resource VARCHAR(255),
      resource_id VARCHAR(255),
      details JSONB,
      ip VARCHAR(45),
      user_agent TEXT,
      severity VARCHAR(20) NOT NULL DEFAULT 'info',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create index for efficient querying
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
  `).catch(() => {});
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
  `).catch(() => {});
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `).catch(() => {});

  console.log("[audit] Audit log table initialized");
}

/**
 * Write an audit log entry to the database.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  if (!pool) {
    console.warn("[audit] Audit log not initialized — logging to console only");
    console.log(`[AUDIT] ${JSON.stringify(entry)}`);
    return;
  }

  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip, user_agent, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.userId || "anonymous",
        entry.action,
        entry.resource || null,
        entry.resourceId || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ip || null,
        entry.userAgent?.substring(0, 500) || null,
        entry.severity || "info",
      ]
    );
  } catch (err) {
    // Never let audit logging failure break the app
    console.error("[audit] Failed to write audit log:", err);
    console.log(`[AUDIT-FALLBACK] ${JSON.stringify(entry)}`);
  }
}

// ─── Pre-defined audit actions ──────────────────────────────────────────────

export const AuditActions = {
  // Auth
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILED: "auth.login.failed",
  LOGOUT: "auth.logout",
  REGISTER: "auth.register",
  PASSWORD_CHANGED: "auth.password_changed",
  ACCOUNT_LOCKED: "auth.account_locked",
  SESSION_REVOKED: "auth.session_revoked",

  // Admin
  ADMIN_USER_CREATED: "admin.user.created",
  ADMIN_USER_UPDATED: "admin.user.updated",
  ADMIN_USER_DELETED: "admin.user.deleted",
  ADMIN_PLAN_CHANGED: "admin.plan.changed",
  ADMIN_ROLE_CHANGED: "admin.role.changed",
  ADMIN_SETTINGS_UPDATED: "admin.settings.updated",

  // OAuth
  OAUTH_CONNECTED: "oauth.connected",
  OAUTH_DISCONNECTED: "oauth.disconnected",
  OAUTH_TOKEN_REFRESHED: "oauth.token_refreshed",

  // Data
  DATA_EXPORTED: "data.exported",
  DATA_DELETED: "data.deleted",

  // Security
  SUSPICIOUS_LOGIN: "security.suspicious_login",
  RATE_LIMIT_HIT: "security.rate_limit",
  CSP_VIOLATION: "security.csp_violation",
} as const;

/**
 * Get audit logs with filtering and pagination.
 */
export async function getAuditLogs(options: {
  userId?: string;
  action?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: any[]; total: number }> {
  if (!pool) return { logs: [], total: 0 };

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (options.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(options.userId);
  }
  if (options.action) {
    conditions.push(`action LIKE $${paramIndex++}`);
    params.push(`${options.action}%`);
  }
  if (options.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    params.push(options.severity);
  }
  if (options.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(options.startDate);
  }
  if (options.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(options.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const [logsResult, countResult] = await Promise.all([
    pool.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM audit_logs ${where}`, params),
  ]);

  return {
    logs: logsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}
