import cron from "node-cron";
import { db } from "./storage";
import { scheduledBookings, meetingTypes, schedulingWorkflows } from "@shared/schema";
import { eq, and, gte, lte, lt, ne } from "drizzle-orm";
import { send24HourReminder, send1HourReminder } from "./emailService";
import nodemailer from "nodemailer";

function getTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
}

/* ══════════════════════════════════════════════════════════════
   24-HOUR REMINDER JOB
   ══════════════════════════════════════════════════════════════ */

async function check24HourReminders() {
  try {
    const now = new Date();
    const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcoming = await db
      .select()
      .from(scheduledBookings)
      .where(
        and(
          eq(scheduledBookings.status, "scheduled"),
          eq(scheduledBookings.reminder24Sent, false),
          gte(scheduledBookings.startTime, in23Hours),
          lte(scheduledBookings.startTime, in25Hours)
        )
      );

    for (const booking of upcoming) {
      const mt = await db.select().from(meetingTypes).where(eq(meetingTypes.id, booking.meetingTypeId)).then(r => r[0]);
      await send24HourReminder({
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        startTime: booking.startTime,
        title: booking.title || mt?.title || "Strategy Call",
        meetLink: booking.meetLink,
      });
      await db.update(scheduledBookings).set({ reminder24Sent: true }).where(eq(scheduledBookings.id, booking.id));
      console.log(`✓ Sent 24h reminder for booking ${booking.id}`);
    }
  } catch (error) {
    console.error("Error checking 24-hour reminders:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   1-HOUR REMINDER JOB
   ══════════════════════════════════════════════════════════════ */

async function check1HourReminders() {
  try {
    const now = new Date();
    const in50Minutes = new Date(now.getTime() + 50 * 60 * 1000);
    const in70Minutes = new Date(now.getTime() + 70 * 60 * 1000);

    const upcoming = await db
      .select()
      .from(scheduledBookings)
      .where(
        and(
          eq(scheduledBookings.status, "scheduled"),
          eq(scheduledBookings.reminder1Sent, false),
          gte(scheduledBookings.startTime, in50Minutes),
          lte(scheduledBookings.startTime, in70Minutes)
        )
      );

    for (const booking of upcoming) {
      const mt = await db.select().from(meetingTypes).where(eq(meetingTypes.id, booking.meetingTypeId)).then(r => r[0]);
      await send1HourReminder({
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        startTime: booking.startTime,
        title: booking.title || mt?.title || "Strategy Call",
        meetLink: booking.meetLink,
      });
      await db.update(scheduledBookings).set({ reminder1Sent: true }).where(eq(scheduledBookings.id, booking.id));
      console.log(`✓ Sent 1h reminder for booking ${booking.id}`);
    }
  } catch (error) {
    console.error("Error checking 1-hour reminders:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   FOLLOW-UP EMAIL JOB
   Fires after a booking's endTime passes (for non-cancelled bookings)
   ══════════════════════════════════════════════════════════════ */

async function checkFollowUpEmails() {
  try {
    const transport = getTransporter();
    if (!transport) return;

    const now = new Date();
    const past = await db
      .select()
      .from(scheduledBookings)
      .where(
        and(
          ne(scheduledBookings.status, "cancelled"),
          eq(scheduledBookings.followUpSent, false),
          lt(scheduledBookings.endTime, now)
        )
      );

    for (const booking of past) {
      const mt = await db.select().from(meetingTypes).where(eq(meetingTypes.id, booking.meetingTypeId)).then(r => r[0]);
      if (!mt) continue;

      let config: any = {};
      try { config = mt.schedulingConfig ? JSON.parse(mt.schedulingConfig) : {}; } catch {}

      const emailCfg = config.emails ?? {};
      if (!emailCfg.followUpEnabled) {
        // Mark sent anyway so we don't keep checking
        await db.update(scheduledBookings).set({ followUpSent: true }).where(eq(scheduledBookings.id, booking.id));
        continue;
      }

      const delayHours = emailCfg.followUpDelayHours ?? 24;
      const sendAfter = new Date(booking.endTime.getTime() + delayHours * 60 * 60 * 1000);
      if (now < sendAfter) continue;

      const subject = (emailCfg.followUpSubject || "How did our call go, {{name}}?").replace("{{name}}", booking.clientName);
      const bodyTemplate = emailCfg.followUpBody || `Hey {{name}},\n\nIt was great speaking with you today.\n\nLet me know if you have any questions!\n\nBest,\nYour Coach`;
      const body = bodyTemplate
        .replace(/\{\{name\}\}/g, booking.clientName)
        .replace(/\{\{title\}\}/g, mt.title);

      await transport.sendMail({
        from: `"Oravini" <support@oravini.com>`,
        to: booking.clientEmail,
        subject,
        html: `<div style="background:#111;color:#fff;font-family:sans-serif;padding:40px;border-radius:12px;max-width:520px;margin:auto">
          <h2 style="color:#d4b461;margin-bottom:4px">Oravini</h2>
          <div style="white-space:pre-line;color:#ccc;line-height:1.7">${body.replace(/\n/g, "<br>")}</div>
        </div>`,
      });

      await db.update(scheduledBookings).set({ followUpSent: true }).where(eq(scheduledBookings.id, booking.id));
      console.log(`✓ Sent follow-up for booking ${booking.id}`);
    }
  } catch (error) {
    console.error("Error checking follow-up emails:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   START CRON JOBS
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   WORKFLOW EXECUTOR — fire on booking events
   ══════════════════════════════════════════════════════════════ */

export async function executeWorkflows(
  trigger: string,
  booking: { id: string; userId: string; meetingTypeId: string; clientName: string; clientEmail: string; startTime: Date; endTime: Date; title?: string | null },
) {
  try {
    const transport = getTransporter();
    const workflows = await db
      .select()
      .from(schedulingWorkflows)
      .where(
        and(
          eq(schedulingWorkflows.userId, booking.userId),
          eq(schedulingWorkflows.trigger, trigger),
          eq(schedulingWorkflows.isActive, true),
        ),
      );

    for (const wf of workflows) {
      // Optionally scoped to specific meeting type
      if (wf.meetingTypeId && wf.meetingTypeId !== booking.meetingTypeId) continue;

      if (wf.action === "send_email" && transport && wf.emailSubject && wf.emailBody) {
        const subject = (wf.emailSubject ?? "")
          .replace(/\{\{name\}\}/g, booking.clientName)
          .replace(/\{\{title\}\}/g, booking.title ?? "Meeting");
        const body = (wf.emailBody ?? "")
          .replace(/\{\{name\}\}/g, booking.clientName)
          .replace(/\{\{title\}\}/g, booking.title ?? "Meeting")
          .replace(/\{\{date\}\}/g, booking.startTime.toLocaleDateString());

        await transport.sendMail({
          from: `"Oravini" <${process.env.EMAIL_USER}>`,
          to: booking.clientEmail,
          subject,
          html: `<div style="background:#111;color:#fff;font-family:sans-serif;padding:40px;border-radius:12px;max-width:520px;margin:auto">
            <h2 style="color:#d4b461;margin-bottom:4px">Oravini</h2>
            <div style="white-space:pre-line;color:#ccc;line-height:1.7">${body.replace(/\n/g, "<br>")}</div>
          </div>`,
        });
        console.log(`✓ Workflow "${wf.name}" fired for booking ${booking.id}`);
      } else if (wf.action === "webhook" && wf.webhookUrl) {
        try {
          await fetch(wf.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trigger, booking }),
          });
          console.log(`✓ Workflow webhook "${wf.name}" fired for booking ${booking.id}`);
        } catch (webhookErr: any) {
          console.error(`Workflow webhook failed: ${webhookErr.message}`);
        }
      }
    }
  } catch (err: any) {
    console.error(`executeWorkflows error: ${err.message}`);
  }
}

export function startSchedulingCronJobs() {
  // 24-hour reminder: every hour
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Running 24-hour reminder check...");
    await check24HourReminders();
  });

  // 1-hour reminder: every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏰ Running 1-hour reminder check...");
    await check1HourReminders();
  });

  // Follow-up emails: every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log("📧 Running follow-up email check...");
    await checkFollowUpEmails();
  });

  console.log("✓ Scheduling cron jobs started");
  console.log("  - 24h reminders: Every hour (DB-tracked, no duplicates)");
  console.log("  - 1h reminders: Every 10 minutes (DB-tracked, no duplicates)");
  console.log("  - Follow-up emails: Every 30 minutes");
}
