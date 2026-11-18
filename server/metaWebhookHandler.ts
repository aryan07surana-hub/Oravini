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
 */
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "./storage";
import { metaTokens, dmTriggers, commentAutoReplies } from "@shared/schema";
import type { DmTrigger, CommentAutoReply } from "@shared/schema";
import { getActiveToken, sendInstagramDM, sendInstagramPrivateReply, replyToInstagramComment } from "./meta";

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
async function handleMessagingEvent(accountId: string, userId: string, evt: any): Promise<void> {
  const message = evt?.message;
  if (!message || typeof message !== "object") {
    console.log(`${LOG} Skipping non-message messaging event for ${accountId}:`, Object.keys(evt || {}).join(","));
    return;
  }
  if (message.is_echo || message.is_deleted) return; // our own outgoing messages / deletions
  const senderId: string | undefined = evt?.sender?.id;
  if (!senderId || senderId === accountId) return;
  const text: string = typeof message.text === "string" ? message.text : "";
  if (!text.trim()) return; // attachments / reactions / story mentions: no keyword to match
  if (alreadyHandled(message.mid ? `dm:${message.mid}` : undefined)) return;

  const triggers: DmTrigger[] = await db
    .select()
    .from(dmTriggers)
    .where(and(eq(dmTriggers.userId, userId), eq(dmTriggers.isActive, true)));

  // First matching trigger wins (oldest first, so the order users created them in is respected).
  const ordered = [...triggers].sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  const trigger = ordered.find(t => matchesKeyword(text, t.keyword, t.matchType));
  if (!trigger) return;

  try {
    const { messageId } = await sendInstagramDM(senderId, trigger.replyMessage);
    await db.update(dmTriggers)
      .set({ triggerCount: sql`${dmTriggers.triggerCount} + 1` })
      .where(eq(dmTriggers.id, trigger.id));
    console.log(`${LOG} Fired DM trigger "${trigger.name}" (${trigger.id}) user=${userId} account=${accountId} recipient=${senderId} keyword="${trigger.keyword}" match=${trigger.matchType} messageId=${messageId}`);
  } catch (e: any) {
    console.error(`${LOG} DM trigger "${trigger.name}" (${trigger.id}) matched but send failed: ${e.message}`);
  }
}

// ── Comments ────────────────────────────────────────────────────────────────
function postShortcode(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}

const permalinkCache = new Map<string, string | null>();
async function getMediaPermalink(mediaId: string): Promise<string | null> {
  if (permalinkCache.has(mediaId)) return permalinkCache.get(mediaId)!;
  let permalink: string | null = null;
  try {
    const token = await getActiveToken();
    if (token) {
      const r = await fetch(`https://graph.instagram.com/v25.0/${encodeURIComponent(mediaId)}?fields=permalink`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json() as any;
      permalink = typeof d?.permalink === "string" ? d.permalink : null;
    }
  } catch { /* leave null */ }
  permalinkCache.set(mediaId, permalink);
  return permalink;
}

async function handleCommentChange(accountId: string, userId: string, value: any): Promise<void> {
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
      const gotCode = postShortcode(await getMediaPermalink(mediaId));
      if (!gotCode || gotCode !== wantCode) continue;
    }
    rule = r;
    break;
  }
  if (!rule) return;

  const actions: string[] = [];
  if (rule.replyMessage?.trim()) {
    try {
      await replyToInstagramComment(commentId, rule.replyMessage.trim());
      actions.push("public-reply");
    } catch (e: any) {
      console.error(`${LOG} Comment rule "${rule.name}" (${rule.id}) public reply failed: ${e.message}`);
    }
  }
  if (rule.alsoDm && rule.dmMessage?.trim()) {
    try {
      await sendInstagramPrivateReply(commentId, rule.dmMessage.trim());
      actions.push("dm");
    } catch (e: any) {
      console.error(`${LOG} Comment rule "${rule.name}" (${rule.id}) comment-to-DM failed: ${e.message}`);
    }
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
        const messaging: any[] = Array.isArray(entry.messaging) ? entry.messaging : [];
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
        for (const evt of messaging) {
          try { await handleMessagingEvent(accountId, userId, evt); }
          catch (e: any) { console.error(`${LOG} messaging event error: ${e.message}`); }
        }
        for (const change of commentChanges) {
          try { await handleCommentChange(accountId, userId, change?.value); }
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
