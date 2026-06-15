import nodemailer from "nodemailer";
import { db } from "./storage";
import { eq } from "drizzle-orm";

// Cache of transporters per user to avoid recreating them
const transporterCache = new Map<string, any>();

/* ══════════════════════════════════════════════════════════════
   GET USER'S EMAIL TRANSPORTER
   Each user has their own SMTP config stored in DB
   ══════════════════════════════════════════════════════════════ */

async function getUserTransporter(userId: string) {
  // Check cache first
  if (transporterCache.has(userId)) {
    return transporterCache.get(userId);
  }

  // Get user's SMTP config from database
  const user = await db.query.users.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, userId),
  });

  if (!user) {
    console.warn(`⚠️  No user found with ID: ${userId}`);
    return null;
  }

  // Check if user has configured their email
  const emailConfig = (user as any).emailConfig;
  
  if (!emailConfig?.smtpUser || !emailConfig?.smtpPass) {
    console.warn(`⚠️  User ${userId} has not configured email settings`);
    return null;
  }

  // Create transporter with user's credentials
  const transporter = nodemailer.createTransporter({
    service: emailConfig.smtpService || "gmail",
    host: emailConfig.smtpHost,
    port: emailConfig.smtpPort || 587,
    secure: emailConfig.smtpSecure || false,
    auth: {
      user: emailConfig.smtpUser,
      pass: emailConfig.smtpPass,
    },
  });

  // Cache it
  transporterCache.set(userId, transporter);
  
  return transporter;
}

/* ══════════════════════════════════════════════════════════════
   CLEAR USER'S TRANSPORTER CACHE (when they update settings)
   ══════════════════════════════════════════════════════════════ */

export function clearUserTransporter(userId: string) {
  transporterCache.delete(userId);
}

/* ══════════════════════════════════════════════════════════════
   GET USER'S FROM ADDRESS
   ══════════════════════════════════════════════════════════════ */

async function getUserFromAddress(userId: string) {
  const user = await db.query.users.findFirst({
    where: (users: any, { eq }: any) => eq(users.id, userId),
  });

  const emailConfig = (user as any)?.emailConfig;
  const fromName = emailConfig?.fromName || (user as any)?.name || "Oravini";
  const fromEmail = emailConfig?.smtpUser || (user as any)?.email;

  return `"${fromName}" <${fromEmail}>`;
}

/* ══════════════════════════════════════════════════════════════
   BOOKING CONFIRMATION EMAIL (USER-SPECIFIC)
   ══════════════════════════════════════════════════════════════ */

export async function sendBookingConfirmation(
  userId: string,
  booking: {
    id: string | number;
    clientName: string;
    clientEmail: string;
    startTime: Date;
    endTime: Date;
    title: string;
    durationMinutes: number;
    meetLink?: string | null;
    notes?: string | null;
    location?: string | null;
  }
) {
  const transporter = await getUserTransporter(userId);
  if (!transporter) {
    console.warn(`⚠️  Cannot send email - user ${userId} has not configured email`);
    return;
  }

  const fromAddress = await getUserFromAddress(userId);
  const APP_URL = process.env.APP_URL || "http://localhost:5000";

  const {
    clientName,
    clientEmail,
    startTime,
    endTime,
    title,
    durationMinutes,
    meetLink,
    notes,
    location,
  } = booking;

  const dateFormatted = new Date(startTime).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatted = new Date(startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const endTimeFormatted = new Date(endTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: clientEmail,
      subject: `✓ Confirmed: ${title} on ${dateFormatted}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #d4b461 0%, #b89848 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #000; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; }
    .status { background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
    .status-text { color: #166534; font-weight: 600; margin: 0; }
    .event-card { background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .event-title { font-size: 20px; font-weight: 700; color: #18181b; margin: 0 0 16px 0; }
    .event-detail { display: flex; align-items: flex-start; margin-bottom: 12px; }
    .event-text { color: #52525b; font-size: 14px; line-height: 1.5; }
    .event-text strong { color: #18181b; }
    .meet-link { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .meet-button { display: inline-block; background: #fff; color: #059669; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
    .footer { background: #18181b; padding: 24px; text-align: center; }
    .footer p { margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Your Call is Confirmed!</h1>
    </div>
    <div class="content">
      <div class="status">
        <p class="status-text">✓ Booking Confirmed</p>
      </div>

      <div class="event-card">
        <h2 class="event-title">${title}</h2>
        
        <div class="event-detail">
          <div class="event-text">
            <strong>${dateFormatted}</strong><br/>
            ${timeFormatted} – ${endTimeFormatted}<br/>
            <span style="color: #71717a;">${durationMinutes} minutes</span>
          </div>
        </div>

        ${location ? `
        <div class="event-detail">
          <div class="event-text">
            ${location}
          </div>
        </div>
        ` : ''}

        <div class="event-detail">
          <div class="event-text">
            <strong>${clientName}</strong><br/>
            ${clientEmail}
          </div>
        </div>
      </div>

      ${meetLink ? `
      <div class="meet-link">
        <h3 style="margin: 0 0 12px 0; color: #fff; font-size: 16px;">🎥 Video Meeting</h3>
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
      </div>
      ` : ''}

      ${notes ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600;">📝 Notes</h4>
        <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">${notes}</p>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Need to reschedule? Reply to this email</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
Your Call is Confirmed!

${title}

Date: ${dateFormatted}
Time: ${timeFormatted} – ${endTimeFormatted} (${durationMinutes} minutes)
${location ? `Location: ${location}` : ''}

Attendee: ${clientName} (${clientEmail})

${meetLink ? `Google Meet Link: ${meetLink}` : ''}

${notes ? `Notes: ${notes}` : ''}

Need to reschedule? Reply to this email.
      `.trim(),
    });

    console.log(`✓ Booking confirmation sent to ${clientEmail} from ${fromAddress}`);
  } catch (error) {
    console.error(`❌ Email send error for user ${userId}:`, error);
  }
}

/* ══════════════════════════════════════════════════════════════
   24-HOUR REMINDER EMAIL (USER-SPECIFIC)
   ══════════════════════════════════════════════════════════════ */

export async function send24HourReminder(
  userId: string,
  booking: {
    clientName: string;
    clientEmail: string;
    startTime: Date;
    title: string;
    meetLink?: string | null;
  }
) {
  const transporter = await getUserTransporter(userId);
  if (!transporter) return;

  const fromAddress = await getUserFromAddress(userId);
  const { clientName, clientEmail, startTime, title, meetLink } = booking;

  const dateFormatted = new Date(startTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const timeFormatted = new Date(startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: clientEmail,
      subject: `⏰ Reminder: ${title} tomorrow at ${timeFormatted}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #f59e0b; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; }
    .reminder-badge { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
    .meet-button { display: inline-block; background: linear-gradient(135deg, #d4b461 0%, #b89848 100%); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 16px 0; }
    .footer { background: #18181b; padding: 24px; text-align: center; }
    .footer p { margin: 0; color: #a1a1aa; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Reminder: Your Call is Tomorrow</h1>
    </div>
    <div class="content">
      <div class="reminder-badge">
        <h2 style="margin: 0 0 8px 0; color: #92400e; font-size: 18px;">24-Hour Reminder</h2>
        <p style="margin: 0; color: #78350f; font-size: 14px;">Your scheduled call is coming up soon!</p>
      </div>

      <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #18181b;">${title}</h3>
        <div style="margin-bottom: 12px; color: #52525b; font-size: 14px;"><strong>When:</strong> ${dateFormatted} at ${timeFormatted}</div>
        <div style="color: #52525b; font-size: 14px;"><strong>Who:</strong> ${clientName}</div>
      </div>

      ${meetLink ? `
      <div style="text-align: center;">
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>You'll receive another reminder 1 hour before the call</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
⏰ Reminder: Your Call is Tomorrow

${title}

When: ${dateFormatted} at ${timeFormatted}
Who: ${clientName}

${meetLink ? `Join here: ${meetLink}` : ''}

You'll receive another reminder 1 hour before the call.
      `.trim(),
    });

    console.log(`✓ 24-hour reminder sent to ${clientEmail} from ${fromAddress}`);
  } catch (error) {
    console.error(`❌ Email send error for user ${userId}:`, error);
  }
}

/* ══════════════════════════════════════════════════════════════
   1-HOUR REMINDER EMAIL (USER-SPECIFIC)
   ══════════════════════════════════════════════════════════════ */

export async function send1HourReminder(
  userId: string,
  booking: {
    clientName: string;
    clientEmail: string;
    startTime: Date;
    title: string;
    meetLink?: string | null;
  }
) {
  const transporter = await getUserTransporter(userId);
  if (!transporter) return;

  const fromAddress = await getUserFromAddress(userId);
  const { clientName, clientEmail, startTime, title, meetLink } = booking;

  const timeFormatted = new Date(startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: clientEmail,
      subject: `🔔 Starting soon: ${title} in 1 hour`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #ef4444; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; text-align: center; }
    .urgent-badge { background: #fee2e2; border: 2px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .meet-button { display: inline-block; background: linear-gradient(135deg, #d4b461 0%, #b89848 100%); color: #000; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 24px 0; }
    .footer { background: #18181b; padding: 24px; text-align: center; }
    .footer p { margin: 0; color: #a1a1aa; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Your Call Starts in 1 Hour</h1>
    </div>
    <div class="content">
      <div class="urgent-badge">
        <h2 style="margin: 0 0 8px 0; color: #991b1b; font-size: 20px;">Starting Soon!</h2>
        <p style="margin: 0; color: #7f1d1d; font-size: 16px; font-weight: 600;">${title} at ${timeFormatted}</p>
      </div>

      <p style="color: #52525b; font-size: 15px; margin-bottom: 24px;">
        Hi ${clientName},<br/><br/>
        Your scheduled call is starting in about an hour. Make sure you're ready!
      </p>

      ${meetLink ? `
      <a href="${meetLink}" class="meet-button">Join Google Meet Now</a>
      ` : ''}
    </div>
    <div class="footer">
      <p>See you soon!</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
🔔 Your Call Starts in 1 Hour

${title} at ${timeFormatted}

Hi ${clientName},

Your scheduled call is starting in about an hour. Make sure you're ready!

${meetLink ? `Join here: ${meetLink}` : ''}
      `.trim(),
    });

    console.log(`✓ 1-hour reminder sent to ${clientEmail} from ${fromAddress}`);
  } catch (error) {
    console.error(`❌ Email send error for user ${userId}:`, error);
  }
}

/* ══════════════════════════════════════════════════════════════
   CANCELLATION EMAIL (USER-SPECIFIC)
   ══════════════════════════════════════════════════════════════ */

export async function sendCancellationEmail(
  userId: string,
  booking: {
    clientName: string;
    clientEmail: string;
    startTime: Date;
    title: string;
    reason?: string;
  }
) {
  const transporter = await getUserTransporter(userId);
  if (!transporter) return;

  const fromAddress = await getUserFromAddress(userId);
  const { clientName, clientEmail, startTime, title, reason } = booking;

  const dateFormatted = new Date(startTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const timeFormatted = new Date(startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: clientEmail,
      subject: `Cancelled: ${title} on ${dateFormatted}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #71717a; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; }
    .cancelled-badge { background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px; }
    .footer { background: #18181b; padding: 24px; text-align: center; }
    .footer p { margin: 0; color: #a1a1aa; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Booking Cancelled</h1>
    </div>
    <div class="content">
      <div class="cancelled-badge">
        <p style="margin: 0; color: #991b1b; font-weight: 600;">✕ This booking has been cancelled</p>
      </div>

      <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #18181b;">${title}</h3>
        <p style="margin: 0; color: #52525b; font-size: 14px;">
          ${dateFormatted} at ${timeFormatted}
        </p>
      </div>

      ${reason ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; color: #78350f; font-size: 14px;"><strong>Reason:</strong> ${reason}</p>
      </div>
      ` : ''}

      <p style="text-align: center; color: #71717a; font-size: 13px;">
        Need to reschedule? Reply to this email
      </p>
    </div>
    <div class="footer">
      <p>Thank you for understanding</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
Booking Cancelled

${title}
${dateFormatted} at ${timeFormatted}

${reason ? `Reason: ${reason}` : ''}

Need to reschedule? Reply to this email.
      `.trim(),
    });

    console.log(`✓ Cancellation email sent to ${clientEmail} from ${fromAddress}`);
  } catch (error) {
    console.error(`❌ Email send error for user ${userId}:`, error);
  }
}
