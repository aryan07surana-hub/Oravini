/**
 * Webinar Email Scheduler — runs periodically to send timed emails
 * (24h reminder, 1h reminder, 15m reminder, follow-up, replay).
 *
 * Triggers automatically based on each webinar's scheduledAt time.
 */

import { db, pool } from "../storage";
import { storage } from "../storage";
import nodemailer from "nodemailer";

interface ScheduledEmail {
  webinarId: string;
  webinarTitle: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingCode: string;
  replayVideoUrl: string | null;
  emailType: string;
  emailId: string;
  subject: string;
  bodyHtml: string;
}

function getMailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return null;
}

function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    return vars[varName] ? content : "";
  });
  return result;
}

/**
 * Determine which emails should be sent right now based on time relative to scheduledAt.
 *
 * Schedule:
 *   - confirmation: sent immediately on registration (handled elsewhere)
 *   - reminder_24h: 24 hours before scheduledAt
 *   - reminder_1h:  1 hour before scheduledAt
 *   - reminder_15m: 15 minutes before scheduledAt
 *   - followup:     30 minutes after webinar ends (scheduledAt + duration)
 *   - replay:       2 hours after webinar ends
 */
function getDueEmailTypes(scheduledAt: Date, durationMinutes: number): { type: string; windowMs: number }[] {
  const now = Date.now();
  const start = scheduledAt.getTime();
  const end = start + durationMinutes * 60 * 1000;

  // 5-minute window for matching (we run cron every minute)
  const WINDOW = 5 * 60 * 1000;

  const due: { type: string; windowMs: number }[] = [];

  // 24h before
  const t24 = start - 24 * 60 * 60 * 1000;
  if (now >= t24 && now < t24 + WINDOW) due.push({ type: "reminder_24h", windowMs: t24 });

  // 1h before
  const t1h = start - 60 * 60 * 1000;
  if (now >= t1h && now < t1h + WINDOW) due.push({ type: "reminder_1h", windowMs: t1h });

  // 15m before
  const t15m = start - 15 * 60 * 1000;
  if (now >= t15m && now < t15m + WINDOW) due.push({ type: "reminder_15m", windowMs: t15m });

  // 30m after end (followup)
  const tFollow = end + 30 * 60 * 1000;
  if (now >= tFollow && now < tFollow + WINDOW) due.push({ type: "followup", windowMs: tFollow });

  // 2h after end (replay)
  const tReplay = end + 2 * 60 * 60 * 1000;
  if (now >= tReplay && now < tReplay + WINDOW) due.push({ type: "replay", windowMs: tReplay });

  return due;
}

/**
 * Process all due emails for all webinars. Called by the cron scheduler.
 */
export async function processWebinarEmailQueue(): Promise<{ sent: number; skipped: number }> {
  let sentCount = 0;
  let skippedCount = 0;

  const transporter = getMailTransporter();
  if (!transporter) {
    return { sent: 0, skipped: 0 };
  }

  try {
    // Fetch all webinars with future or recent scheduledAt
    const result = await pool.query(`
      SELECT id, title, scheduled_at, duration_minutes, meeting_code, replay_video_url
      FROM webinars
      WHERE status != 'cancelled'
        AND scheduled_at > NOW() - INTERVAL '6 hours'
        AND scheduled_at < NOW() + INTERVAL '48 hours'
    `);

    for (const webinar of result.rows) {
      const scheduledAt = new Date(webinar.scheduled_at);
      const dueTypes = getDueEmailTypes(scheduledAt, webinar.duration_minutes || 60);
      if (!dueTypes.length) continue;

      // Get configured emails for this webinar
      const emails = await storage.getWebinarEmails(webinar.id);
      const registrations = await storage.getWebinarRegistrations(webinar.id);

      for (const due of dueTypes) {
        const email = emails.find((e: any) => e.type === due.type && e.enabled);
        if (!email) {
          skippedCount++;
          continue;
        }

        // Get list of recipients who haven't received this email yet
        const sentRows = await pool.query(`
          SELECT recipient_email FROM webinar_email_logs
          WHERE webinar_email_id = $1
        `, [email.id]);
        const alreadySent = new Set(sentRows.rows.map((r: any) => r.recipient_email));

        for (const reg of registrations) {
          if (alreadySent.has(reg.email)) continue;

          const baseUrl = process.env.PUBLIC_URL || "http://localhost:5000";
          const body = replaceTemplateVars(email.bodyHtml, {
            name: reg.name,
            webinarTitle: webinar.title,
            date: scheduledAt.toLocaleDateString(),
            time: scheduledAt.toLocaleTimeString(),
            duration: String(webinar.duration_minutes || 60),
            watchUrl: `${baseUrl}/watch/${webinar.meeting_code}`,
            replayUrl: webinar.replay_video_url || `${baseUrl}/watch/${webinar.meeting_code}`,
          });
          const subject = replaceTemplateVars(email.subject, {
            name: reg.name,
            webinarTitle: webinar.title,
          });

          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || "webinars@oravini.com",
              to: reg.email,
              subject,
              html: body,
            });
            await storage.logWebinarEmail(email.id, reg.email, reg.name);
            sentCount++;
          } catch (err: any) {
            console.error(`[email-scheduler] Failed to send to ${reg.email}: ${err.message}`);
            skippedCount++;
          }
        }

        // Update sent count on the email
        await storage.updateWebinarEmail(email.id, {
          sentCount: (email.sentCount || 0) + (registrations.length - alreadySent.size),
        });
      }
    }
  } catch (err: any) {
    console.error(`[email-scheduler] Error: ${err.message}`);
  }

  return { sent: sentCount, skipped: skippedCount };
}

/**
 * Send a confirmation email immediately when someone registers.
 * Called from the registration endpoint.
 */
export async function sendRegistrationConfirmation(webinarId: string, registration: { name: string; email: string }) {
  const transporter = getMailTransporter();
  if (!transporter) return;

  const emails = await storage.getWebinarEmails(webinarId);
  const confirmation = emails.find((e: any) => e.type === "confirmation" && e.enabled);
  if (!confirmation) return;

  const webinar = await storage.getWebinar(webinarId);
  if (!webinar) return;

  const baseUrl = process.env.PUBLIC_URL || "http://localhost:5000";
  const scheduledAt = webinar.scheduledAt ? new Date(webinar.scheduledAt) : new Date();

  const body = replaceTemplateVars(confirmation.bodyHtml, {
    name: registration.name,
    webinarTitle: webinar.title,
    date: scheduledAt.toLocaleDateString(),
    time: scheduledAt.toLocaleTimeString(),
    duration: String(webinar.durationMinutes || 60),
    watchUrl: `${baseUrl}/watch/${webinar.meetingCode}`,
    replayUrl: webinar.replayVideoUrl || `${baseUrl}/watch/${webinar.meetingCode}`,
  });
  const subject = replaceTemplateVars(confirmation.subject, {
    name: registration.name,
    webinarTitle: webinar.title,
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "webinars@oravini.com",
      to: registration.email,
      subject,
      html: body,
    });
    await storage.logWebinarEmail(confirmation.id, registration.email, registration.name);
    await storage.updateWebinarEmail(confirmation.id, { sentCount: (confirmation.sentCount || 0) + 1 });
  } catch (err: any) {
    console.error(`[email-scheduler] Confirmation failed: ${err.message}`);
  }
}

/**
 * Start the cron scheduler — runs every minute.
 */
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startWebinarEmailScheduler(intervalMs: number = 60_000) {
  if (schedulerInterval) return;
  console.log("[webinar-email-scheduler] Starting (interval:", intervalMs, "ms)");

  schedulerInterval = setInterval(async () => {
    try {
      const result = await processWebinarEmailQueue();
      if (result.sent > 0) {
        console.log(`[webinar-email-scheduler] Sent ${result.sent} emails (${result.skipped} skipped)`);
      }
    } catch (err: any) {
      console.error(`[webinar-email-scheduler] Tick error: ${err.message}`);
    }
  }, intervalMs);
}

export function stopWebinarEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
