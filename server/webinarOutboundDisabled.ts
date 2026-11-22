/**
 * Webinar outbound email/SMS delivery is switched OFF.
 *
 * Every webinar-originated send path (funnel confirmations, 1h reminders,
 * segmented follow-ups, legacy manual/test sends, the CRM hot-lead alert and the
 * email-to-carrier SMS gateway) returns early through the helpers here, BEFORE it
 * touches a mail transport, claims a queue row, advances an enrollment, or
 * increments a sent counter. Nothing is consumed, so no registrant is silently
 * marked as "already messaged" while delivery is off.
 *
 * Deliberately NOT affected: login OTP, auth/security alerts, booking and
 * scheduling mail, admin email-marketing and funnel automations, and
 * Google/YouTube OAuth. Saved templates, logs, settings and credentials are all
 * left in place — this is a delivery switch, not a data removal.
 */
import type { Response } from "express";

export const WEBINAR_OUTBOUND_DISABLED = true as const;

/** Human-readable reason surfaced to API clients and written to logs. */
export const WEBINAR_OUTBOUND_DISABLED_MESSAGE =
  "Webinar email and SMS delivery is currently inactive. Saved templates, logs and settings are unchanged.";

export const WEBINAR_OUTBOUND_DISABLED_CODE = "webinar_outbound_disabled" as const;

export function webinarOutboundDisabledPayload(extra?: Record<string, unknown>) {
  return {
    ok: false as const,
    disabled: true as const,
    code: WEBINAR_OUTBOUND_DISABLED_CODE,
    message: WEBINAR_OUTBOUND_DISABLED_MESSAGE,
    ...extra,
  };
}

/**
 * 410 Gone — the endpoint still exists and is routed, but the delivery behind it
 * is intentionally inactive. Never a 2xx: callers must not read this as a send.
 */
export function respondWebinarOutboundDisabled(res: Response, extra?: Record<string, unknown>) {
  return res.status(410).json(webinarOutboundDisabledPayload(extra));
}

let warned = new Set<string>();
/** Logs once per call-site so disabled jobs don't spam the log each tick. */
export function noteWebinarOutboundDisabled(site: string) {
  if (warned.has(site)) return;
  warned.add(site);
  console.log(`[webinar-outbound] ${site}: delivery disabled — no send attempted`);
}

/** Test seam: lets a test assert the "logged once" behaviour from a clean slate. */
export function __resetWebinarOutboundNotices() {
  warned = new Set<string>();
}
