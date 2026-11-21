/**
 * Webinar Funnel follow-up email templates — shared by the server (sending) and the
 * client (funnel editor "Emails" section + live preview), so both render identically.
 *
 * Per-funnel overrides live in webinar_funnels.email_templates (JSONB) as
 * { followup_clicked?: { subject, bodyHtml }, followup_attended?: …, followup_no_show?: … };
 * a missing / empty override falls back to the default below.
 */

export const FOLLOWUP_TEMPLATE_KEYS = ["followup_attended", "followup_no_show", "followup_clicked"] as const;
export type FollowupTemplateKey = typeof FOLLOWUP_TEMPLATE_KEYS[number];
export type EmailTemplate = { subject: string; bodyHtml: string };
export type FunnelEmailTemplateOverrides = Partial<Record<FollowupTemplateKey, EmailTemplate>>;

export const FOLLOWUP_TEMPLATE_LABELS: Record<FollowupTemplateKey, { label: string; hint: string }> = {
  followup_attended: { label: "Attended", hint: "Watched live but didn't click the offer" },
  followup_no_show: { label: "No-show", hint: "Registered but never joined" },
  followup_clicked: { label: "Clicked offer", hint: "Clicked the offer / CTA during the webinar" },
};

/** Variables available in subject + body. Values are HTML-escaped in the body. */
export const FOLLOWUP_TEMPLATE_VARIABLES: { key: string; description: string; sample: string }[] = [
  { key: "name", description: "Registrant's first name (\"there\" if unknown)", sample: "Priya" },
  { key: "webinarTitle", description: "Funnel / webinar title", sample: "Get your first 10 clients" },
  { key: "replayUrl", description: "Replay link (falls back to the /w/:slug page)", sample: "https://oravini.com/w/first-10-clients" },
  { key: "ctaUrl", description: "Offer / CTA link (empty if not set)", sample: "https://example.com/offer" },
  { key: "ctaText", description: "Offer / CTA button text", sample: "Claim the offer" },
];

export const TEMPLATE_SUBJECT_MAX = 200;
export const TEMPLATE_BODY_MAX = 50_000;

export const WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES: Record<FollowupTemplateKey, EmailTemplate> = {
  followup_clicked: {
    subject: "You grabbed the offer — last chance: {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">You Grabbed the Offer — Last Chance ⏳</h1>
      <p>Hi {{name}},</p>
      <p>We saw you check out the offer during <strong>{{webinarTitle}}</strong>. It's closing soon, so this is your last chance to lock it in.</p>
      {{#if ctaUrl}}<a href="{{ctaUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">{{ctaText}} →</a>{{/if}}
      <p>Want a refresher first? <a href="{{replayUrl}}" style="color: #d4b461;">Rewatch the replay</a>.</p>
    </div>`,
  },
  followup_attended: {
    subject: "Thanks for coming — here's your replay + the offer",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">Thanks for Coming! 🙏</h1>
      <p>Hi {{name}},</p>
      <p>Thank you for showing up to <strong>{{webinarTitle}}</strong>. Here's the replay so you can revisit anything you missed.</p>
      <a href="{{replayUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Watch Replay →</a>
      {{#if ctaUrl}}<p>And if you're ready for the next step, the offer from the session is still open:</p>
      <a href="{{ctaUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">{{ctaText}} →</a>{{/if}}
    </div>`,
  },
  followup_no_show: {
    subject: "Sorry we missed you — watch the replay of {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">Sorry We Missed You 👋</h1>
      <p>Hi {{name}},</p>
      <p>Life happens — we noticed you couldn't make it to <strong>{{webinarTitle}}</strong>. The good news: the replay is ready for you.</p>
      <a href="{{replayUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Watch the Replay →</a>
    </div>`,
  },
};

const escHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** {{#if var}}…{{/if}} then {{var}} substitution; values are HTML-escaped when `html`. */
export function renderFollowupTemplate(template: string, vars: Record<string, string>, html = true): string {
  return template
    .replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, k, content) => (vars[k] ? content : ""))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => (html ? escHtml(vars[k] ?? "") : (vars[k] ?? "")));
}

/** Keeps only well-formed, non-empty overrides for known keys (defensive read of the JSONB column). */
export function sanitizeTemplateOverrides(raw: unknown): FunnelEmailTemplateOverrides {
  const out: FunnelEmailTemplateOverrides = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of FOLLOWUP_TEMPLATE_KEYS) {
    const t = (raw as any)[key];
    if (t && typeof t.subject === "string" && typeof t.bodyHtml === "string" && t.subject.trim() && t.bodyHtml.trim()) {
      out[key] = { subject: t.subject.slice(0, TEMPLATE_SUBJECT_MAX), bodyHtml: t.bodyHtml.slice(0, TEMPLATE_BODY_MAX) };
    }
  }
  return out;
}

/** The template actually used for a funnel: its override if present, else the default. */
export function resolveFollowupTemplate(key: FollowupTemplateKey, overrides: unknown): EmailTemplate & { isCustom: boolean } {
  const custom = sanitizeTemplateOverrides(overrides)[key];
  return custom ? { ...custom, isCustom: true } : { ...WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES[key], isCustom: false };
}

/** Email send-log types (webinar_email_sends.type). */
export const WEBINAR_EMAIL_SEND_TYPES = ["confirmation", "reminder", "followup_attended", "followup_no_show", "followup_clicked", "test"] as const;
export type WebinarEmailSendType = typeof WEBINAR_EMAIL_SEND_TYPES[number];
export type WebinarEmailSendStatus = "sent" | "failed" | "skipped";
/** Which transport handled (or would have handled) a send. */
export type EmailVia = "account" | "platform_gmail" | "platform_smtp" | "none";

export const EMAIL_SENDER_PROVIDERS = ["gmail_app_password", "smtp"] as const;
export type EmailSenderProvider = typeof EMAIL_SENDER_PROVIDERS[number];
/** Gmail's free sending cap for consumer accounts (Workspace is ~2,000/day). */
export const GMAIL_DAILY_CAP = 500;
/** Ports a custom SMTP sender may use. Anything else is refused (keeps the server from probing internal services). */
export const ALLOWED_SMTP_PORTS = [25, 465, 587, 2525] as const;
