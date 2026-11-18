import { storage, pool } from "./storage";
import { decryptToken } from "./security/tokenEncryption";

const META_BASE = "https://graph.facebook.com/v19.0";
// Send endpoints (messages, private replies, comment replies).
const GRAPH_SEND_BASE = "https://graph.facebook.com/v25.0";

// ── Per-user Meta credentials (meta_tokens row written by the OAuth callback) ─
// access_token holds the PAGE access token for the page linked to the IG business
// account (required by Instagram Messaging), encrypted at rest.
export interface UserMetaCredentials {
  token: string;
  igAccountId: string | null;
  fbPageId: string | null;
}

export async function getUserMetaCredentials(userId: string): Promise<UserMetaCredentials | null> {
  const r = await pool.query(
    "SELECT access_token, ig_account_id, fb_page_id FROM meta_tokens WHERE user_id = $1 LIMIT 1",
    [userId],
  );
  const row = r.rows[0];
  if (!row?.access_token) return null;
  const token = decryptToken(row.access_token);
  if (!token) return null;
  return { token, igAccountId: row.ig_account_id ?? null, fbPageId: row.fb_page_id ?? null };
}

// ── Get active token ──────────────────────────────────────────────────────────
// With a userId: that user's meta_tokens row (decrypted). Without one, or when the
// user has no row: legacy global app_settings META_ACCESS_TOKEN, then env var.
export async function getActiveToken(userId?: string): Promise<string | null> {
  if (userId) {
    try {
      const creds = await getUserMetaCredentials(userId);
      if (creds?.token) return creds.token;
    } catch (e: any) {
      console.warn(`[meta] could not read meta_tokens for user ${userId}: ${e?.message ?? e}`);
    }
  }
  try {
    const dbToken = await storage.getAppSetting("META_ACCESS_TOKEN");
    if (dbToken) return dbToken;
  } catch { /* ignore DB errors, fall through to env */ }
  return process.env.META_ACCESS_TOKEN || null;
}

// ── Save token to DB ──────────────────────────────────────────────────────────
export async function saveTokenToDB(token: string): Promise<void> {
  await storage.setAppSetting("META_ACCESS_TOKEN", token);
}

// ── Core fetch helper ────────────────────────────────────────────────────────
export async function metaGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const token = await getActiveToken();
  if (!token) throw new Error("META_ACCESS_TOKEN not configured");
  const url = new URL(`${META_BASE}${path}`);
  url.searchParams.set("access_token", token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Meta API: ${data.error.message} (code ${data.error.code})`);
  return data;
}

// ── Token info ───────────────────────────────────────────────────────────────
export async function getTokenInfo(): Promise<{ valid: boolean; expiresAt?: Date; userId?: string; scopes?: string[] }> {
  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const token = await getActiveToken();
    if (!token || !appId || !appSecret) return { valid: false };
    const res = await fetch(`${META_BASE}/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`);
    const data = await res.json() as any;
    if (!data?.data?.is_valid) {
      // Fallback: just try a simple /me call to see if token works at all
      const meRes = await fetch(`${META_BASE}/me?access_token=${token}`);
      const me = await meRes.json() as any;
      if (me?.id) return { valid: true };
      return { valid: false };
    }
    return {
      valid: true,
      expiresAt: data.data.expires_at ? new Date(data.data.expires_at * 1000) : undefined,
      userId: data.data.user_id,
      scopes: data.data.scopes || [],
    };
  } catch {
    return { valid: false };
  }
}

// ── Exchange short-lived for long-lived token (60 days) ──────────────────────
export async function exchangeForLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) return null;
    const url = `${META_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;
    const res = await fetch(url);
    const data = await res.json() as any;
    if (data?.error || !data?.access_token) return null;
    return data;
  } catch {
    return null;
  }
}

// ── Get Pages and linked Instagram Business Account ───────────────────────────
export async function getConnectedIGAccount(): Promise<{ pageId: string; pageName: string; igAccountId: string; igUsername: string } | null> {
  try {
    const pages = await metaGet("/me/accounts", { fields: "id,name,instagram_business_account{id,username}" });
    if (!pages?.data?.length) return null;
    for (const page of pages.data) {
      if (page.instagram_business_account?.id) {
        return {
          pageId: page.id,
          pageName: page.name,
          igAccountId: page.instagram_business_account.id,
          igUsername: page.instagram_business_account.username || "",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ── Get IG account profile ────────────────────────────────────────────────────
export async function getIGProfile(igAccountId: string): Promise<any> {
  return metaGet(`/${igAccountId}`, {
    fields: "id,username,followers_count,media_count,biography,profile_picture_url,website,name",
  });
}

// ── Get all media for IG account ─────────────────────────────────────────────
export async function getIGMedia(igAccountId: string, limit = 50): Promise<any[]> {
  const data = await metaGet(`/${igAccountId}/media`, {
    fields: "id,caption,permalink,timestamp,media_type,like_count,comments_count,thumbnail_url,is_shared_to_feed",
    limit: String(limit),
  });
  return data?.data || [];
}

// ── Get insights for a single media post ─────────────────────────────────────
export async function getMediaInsights(mediaId: string, mediaType: string): Promise<Record<string, number>> {
  try {
    const isVideo = mediaType === "VIDEO" || mediaType === "REELS";
    const metric = isVideo
      ? "plays,video_views,impressions,reach,saved,comments,likes,shares"
      : "impressions,reach,saved,comments,likes,shares";
    const data = await metaGet(`/${mediaId}/insights`, { metric });
    const result: Record<string, number> = {};
    (data?.data || []).forEach((item: any) => {
      result[item.name] = item.values?.[0]?.value ?? item.value ?? 0;
    });
    return result;
  } catch {
    return {};
  }
}

// ── Get IG account-level insights ────────────────────────────────────────────
export async function getIGAccountInsights(igAccountId: string): Promise<any> {
  try {
    const since = Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000);
    const until = Math.floor(Date.now() / 1000);
    return await metaGet(`/${igAccountId}/insights`, {
      metric: "follower_count,impressions,reach,profile_views",
      period: "day",
      since: String(since),
      until: String(until),
    });
  } catch {
    return null;
  }
}

// ── Send an Instagram Direct Message ─────────────────────────────────────────
// Facebook Login for Business surface: POST /{ig-user-id}/messages on
// graph.facebook.com with the PAGE access token of the page linked to the IG
// business account. Requires instagram_manage_messages.
// The recipient must have messaged the business first within the 24-hour window.
export async function sendInstagramDM(igAccountId: string, recipientId: string, messageText: string, token: string): Promise<{ messageId: string }> {
  if (!token) throw new Error("Instagram DM: no page access token");
  if (!igAccountId) throw new Error("Instagram DM: no Instagram account id");
  const url = `${GRAPH_SEND_BASE}/${encodeURIComponent(igAccountId)}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
    }),
  });
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Instagram DM: ${data.error.message} (code ${data.error.code})`);
  return { messageId: data.message_id || data.id || "sent" };
}

// Convenience for request handlers: send as the given Oravini user, using their
// meta_tokens row (IG account id + decrypted page token).
export async function sendInstagramDMForUser(userId: string, recipientId: string, messageText: string): Promise<{ messageId: string }> {
  const creds = await getUserMetaCredentials(userId);
  if (!creds?.token || !creds.igAccountId) throw new Error("Instagram not connected — connect your Instagram account first");
  return sendInstagramDM(creds.igAccountId, recipientId, messageText, creds.token);
}

// ── Private reply to a comment (comment-to-DM) ────────────────────────────────
// Instagram only allows a business to DM a commenter via a "private reply" that
// references the comment_id (one per comment, within 7 days of the comment).
// `me` resolves through the page token's linked IG account.
export async function sendInstagramPrivateReply(commentId: string, messageText: string, token: string): Promise<{ messageId: string }> {
  if (!token) throw new Error("Instagram private reply: no page access token");
  const res = await fetch(`${GRAPH_SEND_BASE}/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: messageText } }),
  });
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Instagram private reply: ${data.error.message} (code ${data.error.code})`);
  return { messageId: data.message_id || data.id || "sent" };
}

// ── Public reply to a comment ─────────────────────────────────────────────────
export async function replyToInstagramComment(commentId: string, messageText: string, token: string): Promise<{ id: string }> {
  if (!token) throw new Error("Instagram comment reply: no page access token");
  const url = `${GRAPH_SEND_BASE}/${encodeURIComponent(commentId)}/replies?message=${encodeURIComponent(messageText)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
  });
  const data = await res.json() as any;
  if (data?.error) throw new Error(`Instagram comment reply: ${data.error.message} (code ${data.error.code})`);
  return { id: data.id || "sent" };
}

// ── Fetch a post's metrics by its permalink (used for auto-sync) ──────────────
export async function syncPostByPermalink(igAccountId: string, permalink: string): Promise<{
  views: number; likes: number; comments: number; saves: number;
} | null> {
  try {
    const media = await getIGMedia(igAccountId, 100);
    const normalise = (url: string) => url.replace(/\/$/, "").toLowerCase();
    const found = media.find((m: any) => normalise(m.permalink) === normalise(permalink));
    if (!found) return null;
    const insights = await getMediaInsights(found.id, found.media_type);
    return {
      views: insights.plays ?? insights.video_views ?? 0,
      likes: found.like_count || insights.likes || 0,
      comments: found.comments_count || insights.comments || 0,
      saves: insights.saved || 0,
    };
  } catch {
    return null;
  }
}
