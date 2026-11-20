/**
 * Meta (Instagram) webhook → DM automation.
 *
 * - entry.messaging[] message events  → keyword DM triggers (dm_triggers) → auto-reply DM
 * - entry.changes[] with field "comments" → comment auto-replies (comment_auto_replies)
 *                                          → public reply and/or private reply DM
 *
 * The page / IG account in each entry is mapped to an Oravini user through meta_tokens
 * (ig_account_id or fb_page_id). Every fired trigger is logged. Nothing in here throws:
 * unknown or malformed event shapes are logged and skipped.
 *
 * Reliability log (server/dmOnboarding.ts): every inbound DM / comment / story mention for
 * a connected user is recorded in dm_webhook_events, and every automation that matched is
 * recorded in dm_automation_runs (sent / failed + Meta error) for the status panel.
 * Also handled here: story mentions → story_reply_configs, and first-time DMs with no
 * keyword match → welcome_dm_configs.
 */
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "./storage";
import { metaTokens, dmTriggers, commentAutoReplies } from "@shared/schema";
import type { DmTrigger, CommentAutoReply } from "@shared/schema";
import { getUserMetaCredentials, sendInstagramDM, sendInstagramPrivateReply, replyToInstagramComment } from "./meta";
import type { DmEventType } from "@shared/dmOnboarding";
import {
  recordWebhookEvent, recordAutomationRun, hasPriorDmFromSender, getActiveStoryReply, getActiveWelcomeDm,
} from "./dmOnboarding";

const LOG = "[Meta Webhook]";

// Meta retries deliveries it thinks failed; remember recently handled ids so we don't double-send.
const SEEN_MAX = 2000;
const seen = new Set<string>();
function alreadyHandled(id: string | undefined): boolean {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  if (seen.size > SEEN_MAX) {
    const first = seen.values().next().value;
    if (first !== undefined) seen.delete(first);
  }
  return false;
}

async function findUserIdForAccount(accountId: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: metaTokens.userId })
    .from(metaTokens)
    .where(or(eq(metaTokens.igAccountId, accountId), eq(metaTokens.fbPageId, accountId)))
    .limit(1);
  return row?.userId ?? null;
}

// Send credentials for one webhook event: the IG account id to send from and the
// connected user's decrypted page access token (from meta_tokens).
interface SendCreds { igAccountId: string; token: string }

async function getSendCreds(userId: string, accountId: string): Promise<SendCreds | null> {
  try {
    const creds = await getUserMetaCredentials(userId);
    if (!creds?.token) return null;
    // Webhook entry id is the IG account id for object=instagram; prefer the stored one.
    return { igAccountId: creds.igAccountId || accountId, token: creds.token };
  } catch (e: any) {
    console.warn(`${LOG} could not load meta_tokens for user=${userId}: ${e.message}`);
    return null;
  }
}

export function matchesKeyword(text: string, keyword: string, matchType: string): boolean {
  const t = text.trim().toLowerCase();
  const k = keyword.trim().toLowerCase();
  if (!t || !k) return false;
  switch (matchType) {
    case "exact": return t === k;
    case "starts_with": return t.startsWith(k);
    case "contains":
    default: return t.includes(k);
  }
}

// ── Direct messages ─────────────────────────────────────────────────────────
export function classifyMessagingEvent(evt: any): DmEventType | null {
  const message = evt?.message;
  if (!message || typeof message !== "object") return null;
  const attachments: any[] = Array.isArray(message.attachments) ? message.attachments : [];
  if (attachments.some(a => a?.type === "story_mention")) return "story_mention";
  return "dm";
}

async function handleMessagingEvent(accountId: string, userId: string, creds: SendCreds, evt: any, eventId: string | null = null): Promise<void> {
  const message = evt?.message;
  if (!message || typeof message !== "object") {
    console.log(`${LOG} Skipping non-message messaging event for ${accountId}:`, Object.keys(evt || {}).join(","));
    return;
  }
  const senderId: string | undefined = evt?.sender?.id;
  if (!senderId || senderId === accountId) return;
  const text: string = typeof message.text === "string" ? message.text : "";
  if (classifyMessagingEvent(evt) === "story_mention") {
    if (alreadyHandled(message.mid ? `story:${message.mid}` : undefined)) return;
    await handleStoryMention(accountId, userId, creds, senderId, eventId);
    return;
  }
  if (!text.trim()) {
    // attachments / reactions: no keyword to match, but a first-time sender still gets the welcome DM
    if (alreadyHandled(message.mid ? `dm:${message.mid}` : undefined)) return;
    await maybeSendWelcome(accountId, userId, creds, senderId, "", eventId);
    return;
  }
  if (alreadyHandled(message.mid ? `dm:${message.mid}` : undefined)) return;

  const triggers: DmTrigger[] = await db
    .select()
    .from(dmTriggers)
    .where(and(eq(dmTriggers.userId, userId), eq(dmTriggers.isActive, true)));

  // First matching trigger wins (oldest first, so the order users created them in is respected).
  const ordered = [...triggers].sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  const trigger = ordered.find(t => matchesKeyword(text, t.keyword, t.matchType));
  if (!trigger) {
    await maybeSendWelcome(accountId, userId, creds, senderId, text, eventId);
    return;
  }

  try {
    const { messageId } = await sendInstagramDM(creds.igAccountId, senderId, trigger.replyMessage, creds.token);
    await db.update(dmTriggers)
      .set({ triggerCount: sql`${dmTriggers.triggerCount} + 1` })
      .where(eq(dmTriggers.id, trigger.id));
    console.log(`${LOG} Fired DM trigger "${trigger.name}" (${trigger.id}) user=${userId} account=${accountId} recipient=${senderId} keyword="${trigger.keyword}" match=${trigger.matchType} messageId=${messageId}`);
    await recordAutomationRun({ userId, eventId, automationKind: "dm_trigger", automationId: trigger.id, automationName: trigger.name, triggerEvent: "dm", triggerText: text, senderId, action: "dm", status: "sent" });
  } catch (e: any) {
    console.error(`${LOG} DM trigger "${trigger.name}" (${trigger.id}) matched but send failed: ${e.message}`);
    await recordAutomationRun({ userId, eventId, automationKind: "dm_trigger", automationId: trigger.id, automationName: trigger.name, triggerEvent: "dm", triggerText: text, senderId, action: "dm", status: "failed", errorMessage: e.message });
  }
}

// First message from someone new, no keyword matched → welcome DM (if configured).
async function maybeSendWelcome(accountId: string, userId: string, creds: SendCreds, senderId: string, text: string, eventId: string | null): Promise<void> {
  const welcome = await getActiveWelcomeDm(userId);
  if (!welcome) return;
  if (await hasPriorDmFromSender(userId, senderId, eventId)) return;
  try {
    const { messageId } = await sendInstagramDM(creds.igAccountId, senderId, welcome.message, creds.token);
    console.log(`${LOG} Sent welcome DM user=${userId} account=${accountId} recipient=${senderId} messageId=${messageId}`);
    await recordAutomationRun({ userId, eventId, automationKind: "welcome_dm", automationId: userId, automationName: "Welcome new DMs", triggerEvent: "dm", triggerText: text, senderId, action: "dm", status: "sent" });
  } catch (e: any) {
    console.error(`${LOG} welcome DM send failed user=${userId}: ${e.message}`);
    await recordAutomationRun({ userId, eventId, automationKind: "welcome_dm", automationId: userId, automationName: "Welcome new DMs", triggerEvent: "dm", triggerText: text, senderId, action: "dm", status: "failed", errorMessage: e.message });
  }
}

// Someone @mentioned the account in their story → thank-you DM (if configured).
async function handleStoryMention(accountId: string, userId: string, creds: SendCreds, senderId: string, eventId: string | null): Promise<void> {
  const cfg = await getActiveStoryReply(userId);
  if (!cfg) return;
  try {
    const { messageId } = await sendInstagramDM(creds.igAccountId, senderId, cfg.replyMessage, creds.token);
    console.log(`${LOG} Sent story-mention thank-you user=${userId} account=${accountId} recipient=${senderId} messageId=${messageId}`);
    await recordAutomationRun({ userId, eventId, automationKind: "story_reply", automationId: cfg.id, automationName: "Story mention thank-you", triggerEvent: "story_mention", senderId, action: "dm", status: "sent" });
  } catch (e: any) {
    console.error(`${LOG} story-mention DM failed user=${userId}: ${e.message}`);
    await recordAutomationRun({ userId, eventId, automationKind: "story_reply", automationId: cfg.id, automationName: "Story mention thank-you", triggerEvent: "story_mention", senderId, action: "dm", status: "failed", errorMessage: e.message });
  }
}

// ── Comments ────────────────────────────────────────────────────────────────
function postShortcode(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

const permalinkCache = new Map<string, string | null>();
async function getMediaPermalink(mediaId: string, token: string): Promise<string | null> {
  if (permalinkCache.has(mediaId)) return permalinkCache.get(mediaId)!;
  let permalink: string | null = null;
  try {
    if (token) {
      const r = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(mediaId)}?fields=permalink`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json() as any;
      permalink = typeof d?.permalink === "string" ? d.permalink : null;
    }
  } catch { /* leave null */ }
  permalinkCache.set(mediaId, permalink);
  return permalink;
}

async function handleCommentChange(accountId: string, userId: string, creds: SendCreds, value: any, eventId: string | null = null): Promise<void> {
  const commentId: string | undefined = value?.id;
  const text: string = typeof value?.text === "string" ? value.text : "";
  const fromId: string | undefined = value?.from?.id;
  const mediaId: string | undefined = value?.media?.id;
  if (!commentId || !text.trim()) {
    console.log(`${LOG} Skipping comment change without id/text for ${accountId}`);
    return;
  }
  if (fromId && fromId === accountId) return; // our own comment / public reply
  if (alreadyHandled(`comment:${commentId}`)) return;

  const rules: CommentAutoReply[] = await db
    .select()
    .from(commentAutoReplies)
    .where(and(eq(commentAutoReplies.userId, userId), eq(commentAutoReplies.isActive, true)));
  if (!rules.length) return;

  const ordered = [...rules].sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  let rule: CommentAutoReply | undefined;
  for (const r of ordered) {
    if (r.keyword && r.keyword.trim() && !matchesKeyword(text, r.keyword, "contains")) continue;
    const wantCode = postShortcode(r.postUrl);
    if (wantCode) {
      if (!mediaId) continue;
      const gotCode = postShortcode(await getMediaPermalink(mediaId, creds.token));
      if (!gotCode || gotCode !== wantCode) continue;
    }
    rule = r;
    break;
  }
  if (!rule) return;

  const actions: string[] = [];
  const attempted: string[] = [];
  const errors: string[] = [];
  if (rule.replyMessage?.trim()) {
    attempted.push("public-reply");
    try {
      await replyToInstagramComment(commentId, rule.replyMessage.trim(), creds.token);
      actions.push("public-reply");
    } catch (e: any) {
      console.error(`${LOG} Comment rule "${rule.name}" (${rule.id}) public reply failed: ${e.message}`);
      errors.push(e.message);
    }
  }
  if (rule.alsoDm && rule.dmMessage?.trim()) {
    attempted.push("dm");
    try {
      await sendInstagramPrivateReply(commentId, rule.dmMessage.trim(), creds.token);
      actions.push("dm");
    } catch (e: any) {
      console.error(`${LOG} Comment rule "${rule.name}" (${rule.id}) comment-to-DM failed: ${e.message}`);
      errors.push(e.message);
    }
  }
  if (attempted.length) {
    await recordAutomationRun({
      userId, eventId, automationKind: "comment_reply", automationId: rule.id, automationName: rule.name,
      triggerEvent: "comment", triggerText: text, senderId: fromId ?? null, action: attempted.join("+"),
      status: errors.length === 0 ? "sent" : actions.length ? "partial" : "failed",
      errorMessage: errors.length ? errors.join(" | ") : null,
    });
  }
  if (!actions.length) return;

  await db.update(commentAutoReplies)
    .set({ triggerCount: sql`${commentAutoReplies.triggerCount} + 1` })
    .where(eq(commentAutoReplies.id, rule.id));
  console.log(`${LOG} Fired comment trigger "${rule.name}" (${rule.id}) user=${userId} account=${accountId} comment=${commentId} media=${mediaId ?? "?"} from=${fromId ?? "?"} actions=${actions.join("+")}`);
}

// ── Entry point ─────────────────────────────────────────────────────────────
export async function handleMetaWebhookEvent(body: any): Promise<void> {
  try {
    if (!body || typeof body !== "object") return;
    if (body.object !== "instagram") {
      console.log(`${LOG} Ignoring object type: ${String(body.object)}`);
      return;
    }
    const entries: any[] = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries) {
      try {
        const accountId = entry?.id != null ? String(entry.id) : "";
        if (!accountId) continue;
        // Drop echoes (our own outgoing messages) and deletions BEFORE the account
        // lookup, so tester-account echoes don't log misleading "No connected
        // Oravini account" warnings.
        const messaging: any[] = (Array.isArray(entry.messaging) ? entry.messaging : [])
          .filter((evt: any) => !(evt?.message?.is_echo || evt?.message?.is_deleted));
        const changes: any[] = Array.isArray(entry.changes) ? entry.changes : [];
        const commentChanges = changes.filter(c => c?.field === "comments");
        for (const c of changes) {
          if (c?.field !== "comments") console.log(`${LOG} Change field: ${String(c?.field)} (not automated)`);
        }
        if (!messaging.length && !commentChanges.length) continue;

        const userId = await findUserIdForAccount(accountId);
        if (!userId) {
          console.warn(`${LOG} No connected Oravini account for IG/page id ${accountId} — skipping ${messaging.length} message(s), ${commentChanges.length} comment(s)`);
          continue;
        }
        // Record every inbound event first (even if sending will fail) so the status
        // panel can show that Instagram is delivering webhooks.
        const messagingIds = new Map<any, string | null>();
        for (const evt of messaging) {
          const type = classifyMessagingEvent(evt);
          if (!type) continue;
          const sender = evt?.sender?.id != null ? String(evt.sender.id) : null;
          if (sender && sender === accountId) continue;
          messagingIds.set(evt, await recordWebhookEvent({
            userId, accountId, eventType: type, senderId: sender,
            externalId: evt?.message?.mid ? `msg:${evt.message.mid}` : null,
            text: typeof evt?.message?.text === "string" ? evt.message.text : null,
          }));
        }
        const commentIds = new Map<any, string | null>();
        for (const change of commentChanges) {
          const v = change?.value;
          if (!v?.id || (v?.from?.id && String(v.from.id) === accountId)) continue;
          commentIds.set(change, await recordWebhookEvent({
            userId, accountId, eventType: "comment", externalId: `comment:${v.id}`,
            senderId: v?.from?.id != null ? String(v.from.id) : null,
            senderUsername: typeof v?.from?.username === "string" ? v.from.username : null,
            text: typeof v?.text === "string" ? v.text : null, mediaId: v?.media?.id != null ? String(v.media.id) : null,
          }));
        }
        const creds = await getSendCreds(userId, accountId);
        if (!creds) {
          console.warn(`${LOG} No Meta access token stored for user=${userId} (account ${accountId}) — reconnect Instagram; skipping ${messaging.length} message(s), ${commentChanges.length} comment(s)`);
          continue;
        }
        for (const evt of messaging) {
          try { await handleMessagingEvent(accountId, userId, creds, evt, messagingIds.get(evt) ?? null); }
          catch (e: any) { console.error(`${LOG} messaging event error: ${e.message}`); }
        }
        for (const change of commentChanges) {
          try { await handleCommentChange(accountId, userId, creds, change?.value, commentIds.get(change) ?? null); }
          catch (e: any) { console.error(`${LOG} comment change error: ${e.message}`); }
        }
      } catch (e: any) {
        console.error(`${LOG} entry error: ${e.message}`);
      }
    }
  } catch (e: any) {
    console.error(`${LOG} handler error: ${e.message}`);
  }
}
