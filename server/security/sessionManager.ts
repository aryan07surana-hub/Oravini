/**
 * Session Management
 * 
 * Allows users to view their active sessions and revoke them.
 * Uses the connect-pg-simple session store in PostgreSQL.
 */

import { Pool } from "pg";

export interface UserSession {
  sid: string;
  ip: string;
  userAgent: string;
  device: string;
  lastActive: Date;
  createdAt: Date;
  isCurrent: boolean;
}

let pool: Pool | null = null;

export function initSessionManager(dbPool: Pool): void {
  pool = dbPool;
}

/**
 * Parse device info from user agent string.
 */
function parseDevice(userAgent: string): string {
  if (!userAgent) return "Unknown Device";

  const ua = userAgent.toLowerCase();

  // Mobile detection
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android") && ua.includes("mobile")) return "Android Phone";
  if (ua.includes("android")) return "Android Tablet";

  // Desktop OS
  let os = "Unknown";
  if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("chrome os")) os = "ChromeOS";

  // Browser
  let browser = "";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else browser = "Browser";

  return `${browser} on ${os}`;
}

/**
 * Get all active sessions for a user.
 */
export async function getUserSessions(
  userId: string,
  currentSessionId?: string
): Promise<UserSession[]> {
  if (!pool) return [];

  try {
    // connect-pg-simple stores sessions in a "session" table by default
    const result = await pool.query(
      `SELECT sid, sess, expire FROM "session" WHERE sess::jsonb->'passport'->>'user' = $1 AND expire > NOW()`,
      [userId]
    );

    return result.rows.map((row) => {
      const sess = typeof row.sess === "string" ? JSON.parse(row.sess) : row.sess;
      const ip = sess._ip || sess.ip || "Unknown";
      const userAgent = sess._userAgent || sess.userAgent || "";
      const createdAt = sess._createdAt ? new Date(sess._createdAt) : new Date();

      return {
        sid: row.sid,
        ip,
        userAgent,
        device: parseDevice(userAgent),
        lastActive: new Date(row.expire.getTime() - 7 * 24 * 60 * 60 * 1000), // expire - maxAge
        createdAt,
        isCurrent: row.sid === currentSessionId,
      };
    });
  } catch (err) {
    console.error("[sessions] Failed to get user sessions:", err);
    return [];
  }
}

/**
 * Revoke (delete) a specific session.
 */
export async function revokeSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  if (!pool) return false;

  try {
    // Verify the session belongs to this user before deleting
    const check = await pool.query(
      `SELECT sid FROM "session" WHERE sid = $1 AND sess::jsonb->'passport'->>'user' = $2`,
      [sessionId, userId]
    );

    if (check.rows.length === 0) return false;

    await pool.query(`DELETE FROM "session" WHERE sid = $1`, [sessionId]);
    return true;
  } catch (err) {
    console.error("[sessions] Failed to revoke session:", err);
    return false;
  }
}

/**
 * Revoke all sessions for a user except the current one.
 */
export async function revokeAllOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<number> {
  if (!pool) return 0;

  try {
    const result = await pool.query(
      `DELETE FROM "session" WHERE sess::jsonb->'passport'->>'user' = $1 AND sid != $2`,
      [userId, currentSessionId]
    );
    return result.rowCount || 0;
  } catch (err) {
    console.error("[sessions] Failed to revoke all sessions:", err);
    return 0;
  }
}
