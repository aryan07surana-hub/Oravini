/**
 * WebSocket Authentication
 * 
 * Validates session cookies on WebSocket upgrade requests
 * instead of trusting a userId query parameter.
 */

import type { IncomingMessage } from "http";
import { Pool } from "pg";
import cookie from "cookie-parser";

let pool: Pool | null = null;

export function initWsAuth(dbPool: Pool): void {
  pool = dbPool;
}

/**
 * Extract and validate the user from a WebSocket upgrade request
 * by checking the session cookie against the PostgreSQL session store.
 * 
 * Returns the userId if valid, null if not authenticated.
 */
export async function authenticateWsConnection(
  req: IncomingMessage
): Promise<string | null> {
  if (!pool) return null;

  try {
    // Parse cookies from the request
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    // Parse the cookie string
    const cookies = parseCookies(cookieHeader);
    const sessionCookie = cookies["__session"] || cookies["connect.sid"];

    if (!sessionCookie) return null;

    // The session ID is usually signed: s:sessionId.signature
    // We need to extract the actual session ID
    const sessionId = unsignSessionId(sessionCookie);
    if (!sessionId) return null;

    // Look up the session in PostgreSQL
    const result = await pool.query(
      `SELECT sess FROM "session" WHERE sid = $1 AND expire > NOW()`,
      [sessionId]
    );

    if (result.rows.length === 0) return null;

    const sess = typeof result.rows[0].sess === "string"
      ? JSON.parse(result.rows[0].sess)
      : result.rows[0].sess;

    // Extract user ID from passport session data
    const userId = sess?.passport?.user;
    return userId || null;
  } catch (err) {
    console.error("[ws-auth] Authentication failed:", err);
    return null;
  }
}

/**
 * Parse a cookie header string into key-value pairs.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((pair) => {
    const [key, ...valueParts] = pair.trim().split("=");
    if (key) {
      cookies[key.trim()] = decodeURIComponent(valueParts.join("="));
    }
  });
  return cookies;
}

/**
 * Extract the session ID from a signed cookie value.
 * Signed cookies have format: s:sessionId.signature
 */
function unsignSessionId(signedValue: string): string | null {
  // If it starts with "s:", it's signed
  if (signedValue.startsWith("s:")) {
    const dotIndex = signedValue.indexOf(".", 2);
    if (dotIndex === -1) return signedValue.substring(2);
    return signedValue.substring(2, dotIndex);
  }
  // Not signed, return as-is
  return signedValue;
}
