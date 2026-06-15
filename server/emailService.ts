import nodemailer from "nodemailer";

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const APP_URL = process.env.APP_URL || process.env.SITE_URL || "http://localhost:5000";

// Create reusable transporter
let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    if (!EMAIL_USER || !EMAIL_PASS) {
      console.warn("⚠️  EMAIL_USER or EMAIL_PASS not configured. Emails will not be sent.");
      return null;
    }
    
    transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }
  return transporter;
}

/* ══════════════════════════════════════════════════════════════
   BOOKING CONFIRMATION EMAIL
   ══════════════════════════════════════════════════════════════ */

export async function sendBookingConfirmation(booking: {
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
  coachEmail?: string;
  coachName?: string;
}) {
  const transport = getTransporter();
  if (!transport) return;

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
    await transport.sendMail({
      from: `"Oravini Scheduling" <${EMAIL_USER}>`,
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
    .event-icon { width: 20px; height: 20px; margin-right: 12px; color: #d4b461; }
    .event-text { color: #52525b; font-size: 14px; line-height: 1.5; }
    .event-text strong { color: #18181b; }
    .meet-link { background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .meet-link h3 { margin: 0 0 12px 0; color: #fff; font-size: 16px; }
    .meet-button { display: inline-block; background: #fff; color: #059669; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
    .notes { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .notes h4 { margin: 0 0 8px 0; color: #92400e; font-size: 14px; font-weight: 600; }
    .notes p { margin: 0; color: #78350f; font-size: 14px; line-height: 1.5; }
    .actions { text-align: center; margin: 32px 0; }
    .action-links { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .action-link { display: inline-block; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; }
    .action-link-primary { background: #18181b; color: #fff; }
    .action-link-secondary { background: #f4f4f5; color: #18181b; }
    .footer { background: #18181b; padding: 24px; text-align: center; }
    .footer p { margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.6; }
    .footer a { color: #d4b461; text-decoration: none; }
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
          <svg class="event-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <div class="event-text">
            <strong>${dateFormatted}</strong><br/>
            ${timeFormatted} – ${endTimeFormatted}<br/>
            <span style="color: #71717a;">${durationMinutes} minutes</span>
          </div>
        </div>

        ${location ? `
        <div class="event-detail">
          <svg class="event-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <div class="event-text">
            ${location}
          </div>
        </div>
        ` : ''}

        <div class="event-detail">
          <svg class="event-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <div class="event-text">
            <strong>${clientName}</strong><br/>
            ${clientEmail}
          </div>
        </div>
      </div>

      ${meetLink ? `
      <div class="meet-link">
        <h3>🎥 Video Meeting</h3>
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
        <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.8); font-size: 12px;">A unique meet link has been created for this call</p>
      </div>
      ` : ''}

      ${notes ? `
      <div class="notes">
        <h4>📝 Notes</h4>
        <p>${notes}</p>
      </div>
      ` : ''}

      <div class="actions">
        <div class="action-links">
          ${meetLink ? `<a href="${meetLink}" class="action-link action-link-primary">Join Meeting</a>` : ''}
          <a href="${APP_URL}/schedule" class="action-link action-link-secondary">View All Bookings</a>
        </div>
      </div>

      <p style="text-align: center; color: #71717a; font-size: 13px; line-height: 1.6; margin: 24px 0;">
        <strong>What happens next?</strong><br/>
        You'll receive reminder emails 24 hours and 1 hour before the call.<br/>
        ${meetLink ? 'Click the "Join Meeting" button when it\'s time.' : 'Check your email for meeting details.'}
      </p>
    </div>

    <div class="footer">
      <p>
        Need to reschedule or cancel?<br/>
        <a href="${APP_URL}/schedule">Manage your bookings</a>
      </p>
      <p style="margin-top: 16px;">
        Powered by <a href="${APP_URL}">Oravini</a>
      </p>
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

You'll receive reminder emails 24 hours and 1 hour before the call.

Need to reschedule? Visit ${APP_URL}/schedule

Powered by Oravini
      `.trim(),
    });

    console.log(`✓ Booking confirmation sent to ${clientEmail}`);
  } catch (error) {
    console.error("Email send error:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   24-HOUR REMINDER EMAIL
   ══════════════════════════════════════════════════════════════ */

export async function send24HourReminder(booking: {
  clientName: string;
  clientEmail: string;
  startTime: Date;
  title: string;
  meetLink?: string | null;
}) {
  const transport = getTransporter();
  if (!transport) return;

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
    await transport.sendMail({
      from: `"Oravini Scheduling" <${EMAIL_USER}>`,
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
    .reminder-badge h2 { margin: 0 0 8px 0; color: #92400e; font-size: 18px; }
    .reminder-badge p { margin: 0; color: #78350f; font-size: 14px; }
    .event-details { background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .event-details h3 { margin: 0 0 16px 0; font-size: 18px; color: #18181b; }
    .detail-row { margin-bottom: 12px; color: #52525b; font-size: 14px; }
    .detail-row strong { color: #18181b; }
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
        <h2>24-Hour Reminder</h2>
        <p>Your scheduled call is coming up soon!</p>
      </div>

      <div class="event-details">
        <h3>${title}</h3>
        <div class="detail-row"><strong>When:</strong> ${dateFormatted} at ${timeFormatted}</div>
        <div class="detail-row"><strong>Who:</strong> ${clientName}</div>
      </div>

      ${meetLink ? `
      <div style="text-align: center;">
        <a href="${meetLink}" class="meet-button">Join Google Meet</a>
      </div>
      ` : ''}

      <p style="text-align: center; color: #71717a; font-size: 13px; margin-top: 24px;">
        You'll receive another reminder 1 hour before the call.
      </p>
    </div>
    <div class="footer">
      <p>Powered by Oravini</p>
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

Powered by Oravini
      `.trim(),
    });

    console.log(`✓ 24-hour reminder sent to ${clientEmail}`);
  } catch (error) {
    console.error("Email send error:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   1-HOUR REMINDER EMAIL
   ══════════════════════════════════════════════════════════════ */

export async function send1HourReminder(booking: {
  clientName: string;
  clientEmail: string;
  startTime: Date;
  title: string;
  meetLink?: string | null;
}) {
  const transport = getTransporter();
  if (!transport) return;

  const { clientName, clientEmail, startTime, title, meetLink } = booking;

  const timeFormatted = new Date(startTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    await transport.sendMail({
      from: `"Oravini Scheduling" <${EMAIL_USER}>`,
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
    .urgent-badge h2 { margin: 0 0 8px 0; color: #991b1b; font-size: 20px; }
    .urgent-badge p { margin: 0; color: #7f1d1d; font-size: 16px; font-weight: 600; }
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
        <h2>Starting Soon!</h2>
        <p>${title} at ${timeFormatted}</p>
      </div>

      <p style="color: #52525b; font-size: 15px; margin-bottom: 24px;">
        Hi ${clientName},<br/><br/>
        Your scheduled call is starting in about an hour. Make sure you're ready!
      </p>

      ${meetLink ? `
      <a href="${meetLink}" class="meet-button">Join Google Meet Now</a>
      <p style="color: #71717a; font-size: 12px; margin-top: 16px;">Click the button when you're ready to join</p>
      ` : ''}
    </div>
    <div class="footer">
      <p>Powered by Oravini</p>
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

Powered by Oravini
      `.trim(),
    });

    console.log(`✓ 1-hour reminder sent to ${clientEmail}`);
  } catch (error) {
    console.error("Email send error:", error);
  }
}

/* ══════════════════════════════════════════════════════════════
   CANCELLATION EMAIL
   ══════════════════════════════════════════════════════════════ */

export async function sendCancellationEmail(booking: {
  clientName: string;
  clientEmail: string;
  startTime: Date;
  title: string;
  reason?: string;
}) {
  const transport = getTransporter();
  if (!transport) return;

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
    await transport.sendMail({
      from: `"Oravini Scheduling" <${EMAIL_USER}>`,
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
    .cancelled-badge p { margin: 0; color: #991b1b; font-weight: 600; }
    .event-details { background: #fafafa; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .rebook-button { display: inline-block; background: linear-gradient(135deg, #d4b461 0%, #b89848 100%); color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
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
        <p>✕ This booking has been cancelled</p>
      </div>

      <div class="event-details">
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

      <div style="text-align: center; margin: 32px 0;">
        <a href="${APP_URL}/schedule" class="rebook-button">Schedule Another Call</a>
      </div>

      <p style="text-align: center; color: #71717a; font-size: 13px;">
        Need help? Contact support at ${EMAIL_USER}
      </p>
    </div>
    <div class="footer">
      <p>Powered by Oravini</p>
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

Want to schedule another call? Visit ${APP_URL}/schedule

Need help? Contact support at ${EMAIL_USER}

Powered by Oravini
      `.trim(),
    });

    console.log(`✓ Cancellation email sent to ${clientEmail}`);
  } catch (error) {
    console.error("Email send error:", error);
  }
}
