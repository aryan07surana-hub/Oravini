import nodemailer from "nodemailer";

export type PlatformMail = {
  from?: string;
  to: string;
  subject: string;
  html: string;
};

const SEND_TIMEOUT_MS = 10_000;

// Render free web services block outbound SMTP (ports 25, 465, 587), so system emails
// (password reset, login code) go through the Resend HTTPS API when RESEND_API_KEY is set.
// The From address must be on a domain verified in Resend (default: support@oravini.com).
function defaultFrom(): string {
  return process.env.RESEND_FROM || '"Oravini" <support@oravini.com>';
}

async function sendViaResend(mail: PlatformMail): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || mail.from || defaultFrom(),
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
}

let smtpTransport: nodemailer.Transporter | null = null;

async function sendViaSmtp(mail: PlatformMail): Promise<void> {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: process.env.PLATFORM_SMTP_HOST || "email-smtp.us-east-1.amazonaws.com",
      port: parseInt(process.env.PLATFORM_SMTP_PORT || "587"),
      secure: false,
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
      auth: {
        user: process.env.PLATFORM_SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.PLATFORM_SMTP_PASS || process.env.EMAIL_PASS,
      },
    });
  }
  await smtpTransport.sendMail({
    from: mail.from || defaultFrom(),
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
  });
}

/** Sends one system email. Throws on failure; never waits longer than about 10 seconds. */
export async function sendPlatformMail(mail: PlatformMail): Promise<void> {
  if (process.env.RESEND_API_KEY) return sendViaResend(mail);
  return sendViaSmtp(mail);
}

/** Fire and forget: returns immediately, logs failures, never throws. */
export function sendPlatformMailInBackground(mail: PlatformMail): void {
  sendPlatformMail(mail).catch((err: any) => {
    console.error("[mail] send failed:", err?.message || err);
  });
}
