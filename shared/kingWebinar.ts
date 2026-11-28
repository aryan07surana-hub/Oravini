// ─────────────────────────────────────────────────────────────────────────────
// King Astrology webinar funnel — single source of truth (client + server).
//
// Everything about this one event lives here: the instant it starts, the Whop
// checkout, the WhatsApp groups, the three videos. Change a value here and the
// funnel page, both confirmation pages, the admin dashboard, the reminder
// emails and the calendar invites all follow.
//
// Nothing in this file touches React, the DOM or the database, so it is unit
// testable (tests/kingWebinar.test.ts).
// ─────────────────────────────────────────────────────────────────────────────

/** Public path of the funnel. `/king` is a short alias for the same page. */
export const KING_SLUG = "king-astrology";
export const KING_PATHS = {
  funnel: "/king-astrology",
  funnelShort: "/king",
  general: "/king-astrology/general",
  vip: "/king-astrology/vip",
  admin: "/king-astrology/admin",
} as const;

// ── When it starts ───────────────────────────────────────────────────────────
// Saturday, December 5 2026, 1:00 PM US Eastern. December is EST (UTC-5), so
// that is exactly 18:00 UTC. The countdown is computed from this fixed instant
// and never from the visitor's clock offset, so a wrong device timezone (or a
// device set to the wrong date) cannot move the event.
export const KING_EVENT_UTC_ISO = "2026-12-05T18:00:00.000Z";
export const KING_EVENT_MS = Date.UTC(2026, 11, 5, 18, 0, 0);

export const KING_EVENT = {
  /** IANA zone the event is scheduled in. */
  zone: "America/New_York",
  /** Shown verbatim next to the countdown, as asked. */
  label: "1:00 PM ET",
  /** Short zone name for date lines ("Sat, 5 Dec 2026, 1:00 PM ET"). */
  zoneShort: "ET",
  /** Host-timezone date line, fixed because the instant is fixed. */
  dateLine: "Saturday, December 5, 2026",
  timeLine: "1:00 PM ET",
  durationMinutes: 90,
} as const;

export const KING_TITLE = "King Astrology Live Masterclass";
export const KING_HOST = "King Astrology";
export const KING_DESCRIPTION =
  "A live reading of what the next twelve months hold for you — the planetary shifts that matter, " +
  "how they land on your chart, and what to do about them. Watch the video below, then reserve your seat.";

// ── Whop (paid VIP tier) ─────────────────────────────────────────────────────
// Direct plan checkout, NOT the product page: a buyer lands on the payment
// form itself. $15 one-time. The price is shown plainly everywhere — no
// strikethrough, no "was", no discount or savings badge.
export const KING_WHOP = {
  business: "King Astrology Inner Circle",
  productId: "prod_oP6wAR1ulIVRv",
  planId: "plan_uQzQcb8LYeGMF",
  checkoutUrl: "https://whop.com/checkout/plan_uQzQcb8LYeGMF/",
  price: "$15",
  amount: 15,
  currency: "USD",
} as const;

/**
 * The VIP checkout URL, with the registrant's email prefilled when we have it
 * (Whop reads `email` on a checkout link). Opened in the same tab.
 * An unusable email is dropped rather than sent as a broken query value.
 */
export function kingWhopCheckoutUrl(email?: string | null): string {
  const clean = String(email || "").trim();
  if (!clean || clean.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return KING_WHOP.checkoutUrl;
  }
  return `${KING_WHOP.checkoutUrl}?email=${encodeURIComponent(clean)}`;
}

// ── WhatsApp groups ──────────────────────────────────────────────────────────
export const KING_WHATSAPP = {
  vip: "https://chat.whatsapp.com/EBdSrBnjaNn1H11UBpLNe8",
  general: "https://chat.whatsapp.com/GbddxBxB9QO4iOjF4zBIuK",
} as const;

// ── The three videos ─────────────────────────────────────────────────────────
// Served from client/public/king-webinar/ (vertical 9:16, shot on a phone).
export const KING_VIDEOS = {
  vsl: "/king-webinar/vsl.mp4",
  general: "/king-webinar/general-section.mp4",
  vip: "/king-webinar/vip-section.mp4",
} as const;

/**
 * Where "Join the webinar" points once the countdown hits zero. Empty until
 * there is a real stream link: the pages then fall back to the registrant's
 * WhatsApp group, which is where the live link gets posted.
 */
export const KING_JOIN_URL: string = "";

/**
 * Whether the VIP WhatsApp link waits for Whop to confirm payment.
 *
 * Left false on purpose: the webhook secret is added after publishing, so
 * until then no payment can be verified and gating here would lock paying
 * customers out of the group they just bought. Payment status is still
 * recorded and shown honestly in the admin dashboard, so unpaid VIP rows are
 * easy to spot. Flip to true once the webhook is registered and verified.
 */
export const KING_VIP_REQUIRE_PAID: boolean = false;

export type KingTier = "general" | "vip";
export const KING_TIERS: readonly KingTier[] = ["general", "vip"] as const;
export function isKingTier(v: unknown): v is KingTier {
  return v === "general" || v === "vip";
}

// ── Countdown ────────────────────────────────────────────────────────────────

/** Milliseconds until the event, from the fixed UTC instant. Never negative. */
export function kingMsUntilStart(now: number = Date.now()): number {
  return Math.max(0, KING_EVENT_MS - now);
}

/** True once the event's start instant has passed. */
export function kingHasStarted(now: number = Date.now()): boolean {
  return now >= KING_EVENT_MS;
}

/** Days/hours/minutes/seconds for the countdown. Never negative. */
export function kingCountdownParts(msLeft: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor((Number.isFinite(msLeft) ? msLeft : 0) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

// ── Timezones ────────────────────────────────────────────────────────────────

/** The visitor's IANA timezone, or null when the runtime can't say. */
export function kingViewerTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * The event's start instant rendered in `timeZone`, e.g.
 * { date: "Sat, 5 Dec 2026", time: "11:30 PM", zone: "GMT+5:30" }.
 * Returns null if the zone is unknown to the runtime.
 */
export function kingTimeIn(timeZone: string, instantMs: number = KING_EVENT_MS):
  { date: string; time: string; zone: string } | null {
  const d = new Date(instantMs);
  try {
    const date = d.toLocaleDateString("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true });
    const zone =
      new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
        .formatToParts(d).find(p => p.type === "timeZoneName")?.value || timeZone;
    return { date, time, zone };
  } catch {
    return null;
  }
}

/**
 * The start time in the visitor's own timezone — the "…your time" line.
 * Returns null when the zone is unknown, or when it would only repeat the ET
 * line because the visitor is already on Eastern time.
 */
export function kingViewerLocal(tz: string | null = kingViewerTimeZone()):
  { date: string; time: string; zone: string } | null {
  if (!tz) return null;
  const local = kingTimeIn(tz);
  const host = kingTimeIn(KING_EVENT.zone);
  if (!local || !host) return null;
  if (local.date === host.date && local.time === host.time) return null;
  return local;
}

// ── Calendar invites (Google · Apple · Outlook) ──────────────────────────────

export type KingCalendarOpts = { title?: string; details?: string; location?: string };

function calendarWindow(): { start: Date; end: Date } {
  const start = new Date(KING_EVENT_MS);
  return { start, end: new Date(KING_EVENT_MS + KING_EVENT.durationMinutes * 60_000) };
}

/** YYYYMMDDTHHMMSSZ — the form Google, Outlook and iCalendar all accept. */
function stampUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function kingGoogleCalendarUrl(opts: KingCalendarOpts = {}): string {
  const { start, end } = calendarWindow();
  const params = [
    "action=TEMPLATE",
    `text=${encodeURIComponent(opts.title || KING_TITLE)}`,
    `dates=${stampUtc(start)}/${stampUtc(end)}`,
    `ctz=${encodeURIComponent(KING_EVENT.zone)}`,
    ...(opts.details ? [`details=${encodeURIComponent(opts.details)}`] : []),
    ...(opts.location ? [`location=${encodeURIComponent(opts.location)}`] : []),
  ];
  return `https://calendar.google.com/calendar/render?${params.join("&")}`;
}

/** Outlook on the web ("add event" deeplink). Times go as ISO UTC. */
export function kingOutlookCalendarUrl(opts: KingCalendarOpts = {}): string {
  const { start, end } = calendarWindow();
  const params = [
    "path=%2Fcalendar%2Faction%2Fcompose",
    "rru=addevent",
    `subject=${encodeURIComponent(opts.title || KING_TITLE)}`,
    `startdt=${encodeURIComponent(start.toISOString())}`,
    `enddt=${encodeURIComponent(end.toISOString())}`,
    ...(opts.details ? [`body=${encodeURIComponent(opts.details)}`] : []),
    ...(opts.location ? [`location=${encodeURIComponent(opts.location)}`] : []),
  ];
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.join("&")}`;
}

/** Escapes a value for an iCalendar property (RFC 5545 §3.3.11). */
function icsEscape(v: string): string {
  return String(v).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/**
 * A .ics file for Apple Calendar and the Outlook desktop app. CRLF line
 * endings are required by RFC 5545 — Apple Calendar rejects bare LF.
 */
export function kingIcsFile(opts: KingCalendarOpts & { uid?: string } = {}): string {
  const { start, end } = calendarWindow();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Oravini//King Astrology Webinar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(opts.uid || `king-astrology-webinar-${KING_EVENT_MS}@oravini.com`)}`,
    `DTSTAMP:${stampUtc(new Date())}`,
    `DTSTART:${stampUtc(start)}`,
    `DTEND:${stampUtc(end)}`,
    `SUMMARY:${icsEscape(opts.title || KING_TITLE)}`,
    ...(opts.details ? [`DESCRIPTION:${icsEscape(opts.details)}`] : []),
    ...(opts.location ? [`LOCATION:${icsEscape(opts.location)}`] : []),
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:King Astrology Live Masterclass starts in 30 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

// ── Whop webhook payload reading ─────────────────────────────────────────────
// Whop's payload shape varies by event and API version, so every field is read
// defensively from a few known spellings rather than one assumed path.

const PAID_EVENTS =
  /^(payment[._]succeeded|payment[._]completed|membership[._]went[._]valid|membership[._]created|membership[._]activated)$/i;

function pick(obj: any, paths: string[]): string {
  for (const path of paths) {
    let cur = obj;
    for (const key of path.split(".")) {
      if (cur == null || typeof cur !== "object") { cur = undefined; break; }
      cur = cur[key];
    }
    if (typeof cur === "string" && cur.trim()) return cur.trim();
    if (typeof cur === "number") return String(cur);
  }
  return "";
}

export function readWhopEvent(payload: any): {
  event: string; isPaid: boolean; email: string; planId: string; productId: string;
  paymentId: string; membershipId: string; phone: string; amountCents: number | null; currency: string;
} {
  const event = pick(payload, ["action", "event", "type"]);
  const d = payload?.data ?? payload ?? {};
  // `customer_email` is the documented field on a Whop payment ("The buyer's
  // email address"). It is null unless the webhook has `member:email:read`, so
  // the other spellings stay as fallbacks for other event shapes.
  const email = pick(d, [
    "customer_email", "user_email", "email", "user.email", "member.email",
    "user.username_email", "checkout.email", "metadata.email", "custom_fields.email",
  ]).toLowerCase();
  // `amount` is major units as an exact decimal string ("15.00"), and is
  // negative on a refund — hence the > 0 guard below.
  const amountRaw = pick(d, ["amount", "final_amount", "subtotal", "total"]);
  const amount = Number(amountRaw);
  return {
    event,
    isPaid: PAID_EVENTS.test(event.replace(/\s+/g, "")),
    email,
    planId: pick(d, ["plan_id", "plan.id", "plan"]),
    productId: pick(d, ["product_id", "product.id", "access_pass_id", "product"]),
    paymentId: pick(d, ["id", "payment_id", "receipt_id"]),
    // Null on a one-off purchase, which this $15 webinar pass is.
    membershipId: pick(d, ["membership_id", "membership.id", "member_id"]),
    phone: pick(d, ["customer_phone", "user_phone", "phone"]),
    // Whop sends major units (15 = $15); store cents and never a NaN.
    amountCents: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : null,
    currency: (pick(d, ["currency"]) || KING_WHOP.currency).toUpperCase(),
  };
}

/**
 * Whether an event belongs to this webinar's offer.
 *
 * A Whop payment carries `product_id` but no `plan_id`, so the product is the
 * identifier that actually arrives; the plan is still checked for event shapes
 * that include it. When the payload names neither, it is accepted — the
 * webhook endpoint is registered against this one business already.
 *
 * KING_WHOP_PRODUCT_ID overrides the built-in product id, so a mismatch can be
 * corrected without a deploy (the handler logs the id it actually received).
 */
export function eventIsForKingPlan(e: { planId: string; productId: string }, productIdOverride?: string): boolean {
  const product = (productIdOverride || "").trim() || KING_WHOP.productId;
  if (e.planId && e.planId === KING_WHOP.planId) return true;
  if (e.productId && e.productId === product) return true;
  return !e.planId && !e.productId;
}
