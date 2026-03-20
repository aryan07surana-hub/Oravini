const META_BASE = "https://graph.facebook.com/v19.0";

// ── Core fetch helper ────────────────────────────────────────────────────────
export async function metaGet(path: string, params: Record<string, string> = {}): Promise<any> {
  const token = process.env.META_ACCESS_TOKEN;
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
    const token = process.env.META_ACCESS_TOKEN;
    if (!token || !appId || !appSecret) return { valid: false };
    const res = await fetch(`${META_BASE}/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`);
    const data = await res.json() as any;
    if (!data?.data?.is_valid) return { valid: false };
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
