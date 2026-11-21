/**
 * DM Automation onboarding + reliability — pure, dependency-free logic shared by
 * the server (server/dmOnboarding.ts) and the client wizard / status panel.
 *
 * Nothing here touches the database, Meta credentials, OAuth scopes or webhook
 * configuration: it only describes templates, explains Meta errors in plain
 * English and turns health facts into alerts.
 */

// ── Templates ────────────────────────────────────────────────────────────────

/** Which existing automation table a template installs into. */
export type DmAutomationKind = "dm_trigger" | "comment_reply" | "welcome_dm" | "story_reply";

export interface DmTemplateField {
  key: "keyword" | "message" | "publicReply" | "link" | "postUrl";
  label: string;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
  help?: string;
}

export interface DmTemplate {
  id: string;
  kind: DmAutomationKind;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  /** What the user should do from a second account in the test step. */
  testInstruction: string;
  /** Which webhook event type the test step waits for. */
  testEventType: DmEventType;
  fields: DmTemplateField[];
  defaults: Partial<Record<DmTemplateField["key"], string>>;
}

export type DmEventType = "dm" | "comment" | "story_mention" | "other";

export const DM_TEMPLATES: DmTemplate[] = [
  {
    id: "comment_to_dm",
    kind: "comment_reply",
    name: "Comment-to-DM link",
    tagline: "Someone comments a keyword → they get your link in their DMs",
    description: "The classic growth play. Ask people to comment a word like GUIDE on any post or reel and they instantly get a DM with your link, plus a public reply so others see it works.",
    emoji: "💬",
    testInstruction: "From a second Instagram account, comment the keyword on any of your posts.",
    testEventType: "comment",
    fields: [
      { key: "keyword", label: "Keyword people comment", placeholder: "GUIDE", required: true, help: "Not case-sensitive. Matches if the comment contains this word." },
      { key: "message", label: "DM they receive", placeholder: "Here's the guide you asked for 👇", multiline: true, required: true },
      { key: "link", label: "Link to include (optional)", placeholder: "https://…" },
      { key: "publicReply", label: "Public reply under their comment (optional)", placeholder: "Sent you a DM 📩" },
    ],
    defaults: {
      keyword: "GUIDE",
      message: "Hey! Here's the guide you asked for 👇",
      publicReply: "Just sent it to your DMs 📩",
    },
  },
  {
    id: "comment_to_dm_post",
    kind: "comment_reply",
    name: "Lead magnet on one post",
    tagline: "Comment-to-DM, but only on a specific post or reel",
    description: "Same as Comment-to-DM, but it only fires on one post — perfect for a launch reel or a lead-magnet post so other posts aren't affected.",
    emoji: "🎯",
    testInstruction: "From a second Instagram account, comment the keyword on the post you chose.",
    testEventType: "comment",
    fields: [
      { key: "postUrl", label: "Post or reel link", placeholder: "https://www.instagram.com/reel/…", required: true },
      { key: "keyword", label: "Keyword people comment", placeholder: "FREE", required: true },
      { key: "message", label: "DM they receive", placeholder: "Here you go 👇", multiline: true, required: true },
      { key: "link", label: "Link to include (optional)", placeholder: "https://…" },
      { key: "publicReply", label: "Public reply (optional)", placeholder: "Check your DMs 🔥" },
    ],
    defaults: {
      keyword: "FREE",
      message: "Here you go — enjoy! 👇",
      publicReply: "Check your DMs 🔥",
    },
  },
  {
    id: "keyword_dm",
    kind: "dm_trigger",
    name: "DM keyword auto-reply",
    tagline: "Someone DMs you a keyword → instant reply with your link",
    description: "Tell people in stories or captions to DM you a word (e.g. LINK) and they get an instant answer, any time of day.",
    emoji: "⚡",
    testInstruction: "From a second Instagram account, send your account a DM containing the keyword.",
    testEventType: "dm",
    fields: [
      { key: "keyword", label: "Keyword people DM you", placeholder: "LINK", required: true },
      { key: "message", label: "Your instant reply", placeholder: "Here's the link 👇", multiline: true, required: true },
      { key: "link", label: "Link to include (optional)", placeholder: "https://…" },
    ],
    defaults: {
      keyword: "LINK",
      message: "Thanks for reaching out! Here's the link 👇",
    },
  },
  {
    id: "welcome_dm",
    kind: "welcome_dm",
    name: "Welcome new DMs",
    tagline: "First message from someone new → welcome + link",
    description: "Anyone who messages you for the first time gets a friendly welcome with your main link — no keyword needed. Keyword auto-replies still take priority.",
    emoji: "👋",
    testInstruction: "From a second Instagram account that has never messaged you, send any DM.",
    testEventType: "dm",
    fields: [
      { key: "message", label: "Welcome message", placeholder: "Hey, thanks for reaching out!", multiline: true, required: true },
      { key: "link", label: "Link to include (optional)", placeholder: "https://…" },
    ],
    defaults: {
      message: "Hey 👋 thanks for reaching out! I'll get back to you personally soon. In the meantime, here's where to start:",
    },
  },
  {
    id: "story_mention",
    kind: "story_reply",
    name: "Story mention thank-you",
    tagline: "Someone mentions you in their story → automatic thank-you DM",
    description: "Reward people who share you. Every time someone @mentions you in their story, they get a thank-you DM (optionally with a gift link).",
    emoji: "🙌",
    testInstruction: "From a second Instagram account, post a story that @mentions your account.",
    testEventType: "story_mention",
    fields: [
      { key: "message", label: "Thank-you DM", placeholder: "Thank you so much for the shoutout!", multiline: true, required: true },
      { key: "link", label: "Gift link (optional)", placeholder: "https://…" },
    ],
    defaults: {
      message: "Thank you so much for the shoutout! 🙏 Here's a little something as a thank-you:",
    },
  },
];

export function getDmTemplate(id: string | null | undefined): DmTemplate | undefined {
  return DM_TEMPLATES.find(t => t.id === id);
}

export type DmTemplateValues = Partial<Record<DmTemplateField["key"], string>>;

/** Combine message + optional link into the text that is actually sent. */
export function composeMessage(message: string | undefined, link: string | undefined): string {
  const m = (message ?? "").trim();
  const l = (link ?? "").trim();
  if (!l) return m;
  if (m.includes(l)) return m;
  return m ? `${m}\n${l}` : l;
}

/** Returns a list of human-readable problems, empty when the values are OK. */
export function validateTemplateValues(t: DmTemplate, values: DmTemplateValues): string[] {
  const problems: string[] = [];
  for (const f of t.fields) {
    const v = (values[f.key] ?? "").trim();
    if (f.required && !v) problems.push(`${f.label} is required`);
  }
  const link = (values.link ?? "").trim();
  if (link && !/^https?:\/\/\S+$/i.test(link)) problems.push("Link must start with http:// or https://");
  const postUrl = (values.postUrl ?? "").trim();
  if (postUrl && !/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+/i.test(postUrl)) {
    problems.push("Post link must be an Instagram post or reel URL (instagram.com/p/… or /reel/…)");
  }
  const msg = composeMessage(values.message, values.link);
  if (msg.length > 1000) problems.push("Message is too long (Instagram DMs are limited to 1000 characters)");
  const kw = (values.keyword ?? "").trim();
  if (kw.length > 100) problems.push("Keyword is too long");
  return problems;
}

// ── Test-step matching ────────────────────────────────────────────────────────

export interface DmTestEvent {
  eventType: DmEventType;
  text: string | null;
}

export interface InstalledAutomationShape {
  kind: DmAutomationKind;
  keyword?: string | null;
  matchType?: string | null;
}

export function keywordMatches(text: string, keyword: string, matchType = "contains"): boolean {
  const t = text.trim().toLowerCase();
  const k = keyword.trim().toLowerCase();
  if (!t || !k) return false;
  switch (matchType) {
    case "exact": return t === k;
    case "starts_with": return t.startsWith(k);
    default: return t.includes(k);
  }
}

/** Would the installed automation fire for this event? (post filter is checked server-side) */
export function evaluateTestEvent(a: InstalledAutomationShape, e: DmTestEvent): { wouldMatch: boolean; reason: string } {
  switch (a.kind) {
    case "comment_reply":
      if (e.eventType !== "comment") return { wouldMatch: false, reason: "This automation reacts to comments, and this was a " + labelEventType(e.eventType) + "." };
      if (!a.keyword) return { wouldMatch: true, reason: "Any comment matches (no keyword set)." };
      return keywordMatches(e.text ?? "", a.keyword, "contains")
        ? { wouldMatch: true, reason: `Comment contains "${a.keyword}".` }
        : { wouldMatch: false, reason: `Comment doesn't contain "${a.keyword}".` };
    case "dm_trigger":
      if (e.eventType !== "dm") return { wouldMatch: false, reason: "This automation reacts to DMs, and this was a " + labelEventType(e.eventType) + "." };
      return a.keyword && keywordMatches(e.text ?? "", a.keyword, a.matchType ?? "contains")
        ? { wouldMatch: true, reason: `DM contains "${a.keyword}".` }
        : { wouldMatch: false, reason: `DM doesn't contain "${a.keyword ?? ""}".` };
    case "welcome_dm":
      return e.eventType === "dm"
        ? { wouldMatch: true, reason: "New DM received — first-time senders get the welcome." }
        : { wouldMatch: false, reason: "This automation reacts to DMs, and this was a " + labelEventType(e.eventType) + "." };
    case "story_reply":
      return e.eventType === "story_mention"
        ? { wouldMatch: true, reason: "Story mention received." }
        : { wouldMatch: false, reason: "Waiting for a story mention — this was a " + labelEventType(e.eventType) + "." };
  }
}

export function labelEventType(t: DmEventType | string): string {
  switch (t) {
    case "dm": return "DM";
    case "comment": return "comment";
    case "story_mention": return "story mention";
    default: return "other event";
  }
}

// ── Meta error codes → plain English ─────────────────────────────────────────

export interface MetaErrorExplanation {
  code: number | null;
  title: string;
  fix: string;
  /** Problem with the connection itself (reconnect fixes it) rather than one recipient. */
  connectionProblem: boolean;
}

export function parseMetaErrorCode(message: string | null | undefined): { code: number | null; subcode: number | null } {
  if (!message) return { code: null, subcode: null };
  const code = message.match(/\(code (\d+)\)/i) ?? message.match(/"code"\s*:\s*(\d+)/);
  const sub = message.match(/subcode[^\d]{0,4}(\d+)/i);
  return { code: code ? Number(code[1]) : null, subcode: sub ? Number(sub[1]) : null };
}

export function explainMetaError(message: string | null | undefined, codeIn?: number | null, subcodeIn?: number | null): MetaErrorExplanation {
  const parsed = parseMetaErrorCode(message);
  const code = codeIn ?? parsed.code;
  const subcode = subcodeIn ?? parsed.subcode;
  const msg = (message ?? "").toLowerCase();

  if (msg.includes("no page access token") || msg.includes("not connected")) {
    return { code, title: "Instagram isn't fully connected", fix: "Reconnect Instagram from the DM Automation page and make sure you select your Facebook Page and Instagram account in the Meta popup.", connectionProblem: true };
  }
  if (code === 10 && (subcode === 2018278 || msg.includes("outside of allowed window") || /24[- ]?hour/.test(msg))) {
    return { code, title: "Outside Instagram's 24-hour window", fix: "Instagram only lets you message someone within 24 hours of their last message to you. Nothing to fix — it will work next time they message you.", connectionProblem: false };
  }
  if (msg.includes("private repl") && (msg.includes("already") || msg.includes("only one"))) {
    return { code, title: "Already replied privately to this comment", fix: "Instagram allows only one private DM per comment. Nothing to fix.", connectionProblem: false };
  }
  switch (code) {
    case 190:
      return { code, title: "Instagram connection expired", fix: "Your Meta access token expired or was revoked (e.g. password change or you removed the app). Click Reconnect Instagram.", connectionProblem: true };
    case 102:
    case 463:
    case 467:
      return { code, title: "Instagram session expired", fix: "Click Reconnect Instagram to refresh your connection.", connectionProblem: true };
    case 10:
    case 200:
    case 230:
    case 299:
      return { code, title: "Missing a permission", fix: "Reconnect Instagram and leave every permission switched on in the Meta popup (especially messages and page management). Also check that Allow access to messages is on in the Instagram app: Settings → Messages and story replies → Message controls → Connected tools.", connectionProblem: true };
    case 3:
      return { code, title: "Messaging isn't enabled for this account", fix: "Make sure your Instagram is a Professional (Business or Creator) account linked to a Facebook Page, then reconnect.", connectionProblem: true };
    case 551:
      return { code, title: "This person can't receive messages right now", fix: "The recipient has limited who can message them or is unavailable. Nothing to fix on your side.", connectionProblem: false };
    case 4:
    case 17:
    case 32:
    case 613:
      return { code, title: "Instagram rate limit hit", fix: "Too many messages in a short time. Instagram will allow sending again shortly — no action needed unless it keeps happening.", connectionProblem: false };
    case 368:
      return { code, title: "Temporarily blocked by Instagram", fix: "Instagram flagged recent activity. Pause bulk sends for 24 hours and make sure messages aren't spammy.", connectionProblem: false };
    case 100:
      return { code, title: "Instagram rejected the request", fix: "Usually the comment is older than 7 days, was deleted, or the person's account isn't reachable. If it happens on every run, reconnect Instagram.", connectionProblem: false };
    case 1:
    case 2:
      return { code, title: "Temporary Instagram error", fix: "Meta had a hiccup on their side. It usually resolves by itself — no action needed.", connectionProblem: false };
  }
  return { code, title: "Message couldn't be sent", fix: "If this keeps happening, reconnect Instagram. If it continues after reconnecting, contact support with the error below.", connectionProblem: false };
}

// ── Health → alerts ──────────────────────────────────────────────────────────

/** Scopes the existing OAuth flow requests and DM automation depends on (read-only list). */
export const DM_REQUIRED_SCOPES = ["instagram_basic", "instagram_manage_messages", "pages_manage_metadata", "pages_show_list"];

export const WEBHOOK_QUIET_DAYS = 3;

export interface DmHealthFacts {
  now: Date;
  connected: boolean;
  hasIgAccount: boolean;
  hasPageToken: boolean;
  tokenExpiresAt: Date | null;
  /** null = not checked; false = Meta rejected the token on a live check */
  tokenLiveValid: boolean | null;
  scopes: string[] | null;
  activeAutomations: number;
  lastEventAt: Date | null;
  connectedAt: Date | null;
  sent24h: number;
  failed24h: number;
  lastFailure: { message: string | null; code: number | null; at: Date } | null;
}

export interface DmAlert {
  level: "error" | "warning";
  code: string;
  title: string;
  message: string;
  fix: string;
  action?: "reconnect" | "open_logs" | "open_wizard";
}

const DAY = 24 * 60 * 60 * 1000;

export function tokenStatus(f: Pick<DmHealthFacts, "now" | "connected" | "tokenExpiresAt" | "tokenLiveValid">): "valid" | "expiring" | "expired" | "invalid" | "not_connected" {
  if (!f.connected) return "not_connected";
  if (f.tokenLiveValid === false) return "invalid";
  if (f.tokenExpiresAt) {
    const ms = f.tokenExpiresAt.getTime() - f.now.getTime();
    // A live check that succeeded beats the stored date: page tokens derived
    // from long-lived user tokens often outlive the stored expiry.
    if (ms <= 0) return f.tokenLiveValid === true ? "valid" : "expired";
    if (ms < 7 * DAY) return "expiring";
  }
  return "valid";
}

export function webhookState(f: Pick<DmHealthFacts, "now" | "lastEventAt" | "activeAutomations">): "receiving" | "quiet" | "never" {
  if (!f.lastEventAt) return "never";
  return f.now.getTime() - f.lastEventAt.getTime() > WEBHOOK_QUIET_DAYS * DAY ? "quiet" : "receiving";
}

export function computeDmAlerts(f: DmHealthFacts): DmAlert[] {
  const alerts: DmAlert[] = [];
  if (!f.connected) {
    if (f.activeAutomations > 0) {
      alerts.push({ level: "error", code: "not_connected", title: "Instagram is not connected", message: `You have ${f.activeAutomations} active automation${f.activeAutomations === 1 ? "" : "s"}, but no Instagram account is connected, so nothing will be sent.`, fix: "Connect Instagram to start sending.", action: "reconnect" });
    }
    return alerts;
  }
  if (!f.hasIgAccount) {
    alerts.push({ level: "error", code: "no_ig_account", title: "No Instagram Business account found", message: "We connected to Facebook but couldn't find an Instagram Professional account linked to your Page.", fix: "In Instagram: Settings → Account type → switch to Professional, then link it to your Facebook Page (Accounts Center). Then reconnect.", action: "reconnect" });
  }
  if (!f.hasPageToken) {
    alerts.push({ level: "error", code: "no_page_token", title: "No Facebook Page selected", message: "The connection has no Page access token, which Instagram messaging requires.", fix: "Reconnect and tick your Facebook Page (and its Instagram account) in the Meta popup.", action: "reconnect" });
  }
  const ts = tokenStatus(f);
  if (ts === "expired" || ts === "invalid") {
    alerts.push({ level: "error", code: "token_expired", title: ts === "expired" ? "Instagram connection expired" : "Instagram connection no longer valid", message: "Meta no longer accepts your access token, so automations can't send.", fix: "Click Reconnect Instagram — it takes about 30 seconds and keeps all your automations.", action: "reconnect" });
  } else if (ts === "expiring" && f.tokenExpiresAt) {
    const days = Math.max(0, Math.ceil((f.tokenExpiresAt.getTime() - f.now.getTime()) / DAY));
    alerts.push({ level: "warning", code: "token_expiring", title: `Instagram connection expires in ${days} day${days === 1 ? "" : "s"}`, message: "When it expires, automations stop sending.", fix: "Reconnect Instagram now to renew it for another ~60 days.", action: "reconnect" });
  }
  if (f.scopes && f.scopes.length) {
    const missing = DM_REQUIRED_SCOPES.filter(s => !f.scopes!.includes(s));
    if (missing.length) {
      alerts.push({ level: "warning", code: "missing_scopes", title: "Some permissions weren't granted", message: `Missing: ${missing.join(", ")}.`, fix: "Reconnect Instagram and leave every permission switched on in the Meta popup.", action: "reconnect" });
    }
  }
  if (f.activeAutomations > 0) {
    const ws = webhookState(f);
    const sinceConnect = f.connectedAt ? f.now.getTime() - f.connectedAt.getTime() : Infinity;
    if (ws === "quiet") {
      const days = Math.floor((f.now.getTime() - f.lastEventAt!.getTime()) / DAY);
      alerts.push({ level: "warning", code: "webhook_quiet", title: `No Instagram events in ${days} days`, message: "Your automations are active but we haven't received a comment or DM from Instagram for a while. Either it's been quiet, or Instagram stopped delivering events.", fix: "Send a test DM from a second account. If nothing shows up in the log within a minute, reconnect Instagram and check Settings → Messages and story replies → Message controls → Connected tools → Allow access to messages is on.", action: "reconnect" });
    } else if (ws === "never" && sinceConnect > DAY) {
      alerts.push({ level: "warning", code: "webhook_never", title: "We've never received an event from Instagram", message: "Automations are active but no comment or DM has reached us yet.", fix: "Run the guided test (comment or DM from a second account). If nothing arrives, reconnect Instagram and enable Allow access to messages in the Instagram app (Settings → Messages and story replies → Message controls → Connected tools).", action: "open_wizard" });
    }
  }
  if (f.failed24h > 0) {
    const total = f.sent24h + f.failed24h;
    const rate = total ? f.failed24h / total : 1;
    const expl = f.lastFailure ? explainMetaError(f.lastFailure.message, f.lastFailure.code) : null;
    const severe = rate >= 0.5 && f.failed24h >= 3;
    alerts.push({
      level: severe || expl?.connectionProblem ? "error" : "warning",
      code: "send_failures",
      title: `${f.failed24h} message${f.failed24h === 1 ? "" : "s"} failed to send in the last 24h`,
      message: expl ? `Most recent: ${expl.title}${expl.code ? ` (Meta error ${expl.code})` : ""}.` : "Some automation replies couldn't be delivered.",
      fix: expl?.fix ?? "Open the run log for details.",
      action: expl?.connectionProblem ? "reconnect" : "open_logs",
    });
  }
  return alerts;
}

// ── Wizard progress ──────────────────────────────────────────────────────────

export const DM_WIZARD_STEPS = [
  { id: 1, key: "connect", label: "Connect Instagram" },
  { id: 2, key: "template", label: "Pick a template" },
  { id: 3, key: "test", label: "Test it" },
  { id: 4, key: "live", label: "Go live" },
] as const;

export interface DmOnboardingProgress {
  currentStep: number;
  completedSteps: number[];
  templateId: string | null;
  automationKind: DmAutomationKind | null;
  automationId: string | null;
  testStartedAt: string | null;
  testConfirmedAt: string | null;
  dismissedAt: string | null;
  completedAt: string | null;
}

/** Show the wizard until connected AND an automation is live — unless skipped or finished. */
export function shouldShowWizard(p: Pick<DmOnboardingProgress, "dismissedAt" | "completedAt">, connected: boolean, liveAutomations: number): boolean {
  if (p.dismissedAt || p.completedAt) return false;
  return !(connected && liveAutomations > 0);
}

/** The step the user should land on when they come back. */
export function resumeStep(p: Pick<DmOnboardingProgress, "currentStep" | "automationId">, connected: boolean): number {
  if (!connected) return 1;
  const step = Math.min(Math.max(p.currentStep || 1, 1), 4);
  if (step >= 3 && !p.automationId) return 2;
  return step === 1 ? 2 : step;
}
