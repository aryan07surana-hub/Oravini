/**
 * Suspicious Login Detection & Alerts
 * 
 * Detects logins from new IPs/devices and sends email notifications.
 * Tracks known devices per user in the database.
 */

import { Pool } from "pg";
import { createHash } from "crypto";

let pool: Pool | null = null;

export async function initSuspiciousLoginDetection(dbPool: Pool): Promise<void> {
  pool = dbPool;

  // Create known_devices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS known_devices (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      device_hash VARCHAR(64) NOT NULL,
      ip VARCHAR(45),
      user_agent TEXT,
      device_name VARCHAR(255),
      first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, device_hash)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_known_devices_user ON known_devices(user_id);
  `).catch(() => {});

  console.log("[security] Suspicious login detection initialized");
}

/**
 * Generate a device fingerprint hash from IP + User-Agent.
 */
function getDeviceHash(ip: string, userAgent: string): string {
  return createHash("sha256").update(`${ip}:${userAgent}`).digest("hex");
}

/**
 * Check if a login is from a known device. If not, flag it as suspicious.
 * Returns whether the device is new (suspicious).
 */
export async function checkLoginDevice(
  userId: string,
  ip: string,
  userAgent: string
): Promise<{ isNew: boolean; deviceName: string }> {
  if (!pool) return { isNew: false, deviceName: "Unknown" };

  const deviceHash = getDeviceHash(ip, userAgent);
  const deviceName = parseDeviceName(userAgent);

  try {
    // Check if this device is known
    const existing = await pool.query(
      `SELECT id FROM known_devices WHERE user_id = $1 AND device_hash = $2`,
      [userId, deviceHash]
    );

    if (existing.rows.length > 0) {
      // Known device — update last_seen
      await pool.query(
        `UPDATE known_devices SET last_seen = NOW(), ip = $1 WHERE user_id = $2 AND device_hash = $3`,
        [ip, userId, deviceHash]
      );
      return { isNew: false, deviceName };
    }

    // New device — register it
    await pool.query(
      `INSERT INTO known_devices (user_id, device_hash, ip, user_agent, device_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, device_hash) DO UPDATE SET last_seen = NOW()`,
      [userId, deviceHash, ip, userAgent.substring(0, 500), deviceName]
    );

    // Check if user has ANY known devices (first login ever shouldn't trigger alert)
    const deviceCount = await pool.query(
      `SELECT COUNT(*) FROM known_devices WHERE user_id = $1`,
      [userId]
    );

    const count = parseInt(deviceCount.rows[0].count, 10);
    // If this is the first or second device, don't flag (first login + this one)
    if (count <= 1) {
      return { isNew: false, deviceName };
    }

    return { isNew: true, deviceName };
  } catch (err) {
    console.error("[security] Device check failed:", err);
    return { isNew: false, deviceName };
  }
}

/**
 * Send a suspicious login alert email.
 */
export async function sendSuspiciousLoginAlert(
  userEmail: string,
  userName: string,
  ip: string,
  deviceName: string,
  timestamp: Date
): Promise<void> {
  try {
    const nodemailer = await import("nodemailer");

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (!emailUser || !emailPass) {
      console.warn("[security] Email not configured — skipping suspicious login alert");
      return;
    }

    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPass },
    });

    const formattedTime = timestamp.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <div style="max-width:580px;margin:0 auto;padding:40px 24px;">
          <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="color:#d4b461;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">ORAVINI SECURITY</span>
          </div>
          
          <h2 style="color:#ffffff;font-size:20px;margin:0 0 16px;">New Login Detected</h2>
          
          <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 24px;">
            Hi ${userName}, we noticed a login to your account from a new device or location.
          </p>
          
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px;margin-bottom:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="color:rgba(255,255,255,0.5);font-size:13px;padding:6px 0;">Device</td>
                <td style="color:#ffffff;font-size:13px;padding:6px 0;text-align:right;">${deviceName}</td>
              </tr>
              <tr>
                <td style="color:rgba(255,255,255,0.5);font-size:13px;padding:6px 0;">IP Address</td>
                <td style="color:#ffffff;font-size:13px;padding:6px 0;text-align:right;">${ip}</td>
              </tr>
              <tr>
                <td style="color:rgba(255,255,255,0.5);font-size:13px;padding:6px 0;">Time</td>
                <td style="color:#ffffff;font-size:13px;padding:6px 0;text-align:right;">${formattedTime}</td>
              </tr>
            </table>
          </div>
          
          <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 8px;">
            If this was you, you can ignore this email.
          </p>
          <p style="color:#e74c3c;font-size:14px;line-height:1.6;margin:0;">
            If this wasn't you, please change your password immediately and review your active sessions in your account settings.
          </p>
          
          <div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07);">
            <p style="color:rgba(255,255,255,0.22);font-size:11px;line-height:1.7;margin:0;">
              This is an automated security alert from Oravini.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Oravini Security" <${emailUser}>`,
      to: userEmail,
      subject: "⚠️ New login to your Oravini account",
      html,
    });

    console.log(`[security] Suspicious login alert sent to ${userEmail}`);
  } catch (err) {
    console.error("[security] Failed to send suspicious login alert:", err);
  }
}

function parseDeviceName(userAgent: string): string {
  if (!userAgent) return "Unknown Device";
  const ua = userAgent.toLowerCase();

  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android") && ua.includes("mobile")) return "Android Phone";
  if (ua.includes("android")) return "Android Tablet";

  let os = "Unknown OS";
  if (ua.includes("mac os") || ua.includes("macintosh")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("linux")) os = "Linux";

  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";

  return `${browser} on ${os}`;
}
