import cron from "node-cron";
import { storage } from "./storage";
import { log } from "./index";
import { getConnectedIGAccount, syncPostByPermalink } from "./meta";
import { extractYouTubeVideoId, getYouTubeVideoStats } from "./youtube";

async function apifyInstagram(payload: object): Promise<any[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];
  const url = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, maxRequestRetries: 2, proxy: { useApifyProxy: true } }),
  });
  if (!resp.ok) return [];
  return resp.json();
}

// Resolve Meta IG account ID once per run, cached per invocation
async function resolveMetaIgAccountId(): Promise<string | null> {
  try {
    const acct = await getConnectedIGAccount();
    return acct?.igAccountId ?? null;
  } catch {
    return null;
  }
}

async function syncInstagramPosts() {
  log("Auto-sync: starting daily Instagram stats sync", "cron");
  const posts = await storage.getAllInstagramPostsWithUrls();
  const now = Date.now();
  let synced = 0;

  const metaIgAccountId = await resolveMetaIgAccountId();
  if (metaIgAccountId) {
    log(`Auto-sync: Meta API ready — account ${metaIgAccountId}`, "cron");
  } else {
    log("Auto-sync: Meta API unavailable — falling back to Apify for all posts", "cron");
  }

  for (const post of posts) {
    try {
      const ageMs = now - new Date(post.createdAt || post.postDate).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      let checkpoint: "initial" | "2w" | "4w";
      if (ageDays < 14) checkpoint = "initial";
      else if (ageDays < 28) checkpoint = "2w";
      else if (ageDays < 35) checkpoint = "4w";
      else continue;

      let v = 0, l = 0, c = 0, s = 0;
      let sourceUsed = "apify";

      if (metaIgAccountId && post.postUrl) {
        try {
          const metaResult = await syncPostByPermalink(metaIgAccountId, post.postUrl);
          if (metaResult) {
            v = metaResult.views; l = metaResult.likes; c = metaResult.comments; s = metaResult.saves;
            sourceUsed = "meta";
          }
        } catch (e: any) { /* silent — fall to Apify */ }
      }

      if (sourceUsed === "apify") {
        const items = await apifyInstagram({ directUrls: [post.postUrl], resultsType: "posts", resultsLimit: 1 });
        const item = items?.[0];
        if (!item) continue;
        v = item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0;
        l = item.likesCount ?? 0;
        c = item.commentsCount ?? 0;
        s = item.savesCount ?? 0;
      }

      const ts = new Date();
      let updateData: any = {};
      if (checkpoint === "initial") updateData = { views: v, likes: l, comments: c, saves: s, initialSyncedAt: ts };
      else if (checkpoint === "2w") updateData = { views2w: v, likes2w: l, comments2w: c, saves2w: s, twoWeekSyncedAt: ts };
      else updateData = { views4w: v, likes4w: l, comments4w: c, saves4w: s, fourWeekSyncedAt: ts };

      await storage.updateContentPost(post.id, updateData);
      synced++;
      if (sourceUsed === "apify") await new Promise(r => setTimeout(r, 1500));
    } catch (e: any) {
      log(`Auto-sync Instagram: failed for post ${post.id}: ${e.message}`, "cron");
    }
  }

  log(`Auto-sync Instagram: completed — ${synced}/${posts.length} posts synced`, "cron");
}

async function syncYouTubePosts() {
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) {
    log("Auto-sync YouTube: skipped — YOUTUBE_API_KEY not set", "cron");
    return;
  }

  log("Auto-sync: starting daily YouTube stats sync", "cron");
  const posts = await storage.getAllYouTubePostsWithUrls();
  const now = Date.now();
  let synced = 0;

  for (const post of posts) {
    try {
      const ageMs = now - new Date(post.createdAt || post.postDate).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      let checkpoint: "initial" | "2w" | "4w";
      if (ageDays < 14) checkpoint = "initial";
      else if (ageDays < 28) checkpoint = "2w";
      else if (ageDays < 35) checkpoint = "4w";
      else continue;

      if (!post.postUrl) continue;
      const videoId = extractYouTubeVideoId(post.postUrl);
      if (!videoId) continue;

      const stats = await getYouTubeVideoStats(videoId);
      if (!stats) continue;

      const ts = new Date();
      let updateData: any = {};
      if (checkpoint === "initial") updateData = { views: stats.views, likes: stats.likes, comments: stats.comments, initialSyncedAt: ts };
      else if (checkpoint === "2w") updateData = { views2w: stats.views, likes2w: stats.likes, comments2w: stats.comments, twoWeekSyncedAt: ts };
      else updateData = { views4w: stats.views, likes4w: stats.likes, comments4w: stats.comments, fourWeekSyncedAt: ts };

      await storage.updateContentPost(post.id, updateData);
      synced++;
      await new Promise(r => setTimeout(r, 500));
    } catch (e: any) {
      log(`Auto-sync YouTube: failed for post ${post.id}: ${e.message}`, "cron");
    }
  }

  log(`Auto-sync YouTube: completed — ${synced}/${posts.length} posts synced`, "cron");
}

export async function processScheduledTweets() {
  try {
    const dueTweets = await storage.getPendingDueTweets();
    if (dueTweets.length === 0) return;
    const { TwitterApi } = await import("twitter-api-v2");
    log(`Scheduled tweets: processing ${dueTweets.length} due tweet(s)`, "cron");
    for (const tweet of dueTweets) {
      try {
        const token = await storage.getTwitterToken(tweet.userId);
        if (!token) {
          await storage.updateScheduledTweet(tweet.id, { status: "failed", errorMessage: "Twitter not connected" });
          continue;
        }
        let accessToken = token.accessToken;
        if (token.expiresAt && new Date(token.expiresAt) < new Date() && token.refreshToken) {
          const baseClient = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID!, clientSecret: process.env.TWITTER_CLIENT_SECRET! });
          const refreshed = await baseClient.refreshOAuth2Token(token.refreshToken);
          accessToken = refreshed.accessToken;
          const expiresAt = refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : null;
          await storage.upsertTwitterToken(tweet.userId, {
            accessToken,
            refreshToken: refreshed.refreshToken ?? token.refreshToken,
            expiresAt,
            twitterUserId: token.twitterUserId,
            twitterHandle: token.twitterHandle,
          });
        }
        const client = new TwitterApi(accessToken);
        const posted = await client.v2.tweet(tweet.content);
        await storage.updateScheduledTweet(tweet.id, { status: "posted", tweetId: posted.data.id });
        log(`Scheduled tweet posted: ${posted.data.id}`, "cron");
      } catch (e: any) {
        await storage.updateScheduledTweet(tweet.id, { status: "failed", errorMessage: e.message });
        log(`Scheduled tweet failed for ${tweet.id}: ${e.message}`, "cron");
      }
    }
  } catch (e: any) {
    log(`Scheduled tweets error: ${e.message}`, "cron");
  }
}

export async function runAutoSync() {
  try {
    await syncInstagramPosts();
    await syncYouTubePosts();
  } catch (e: any) {
    log(`Auto-sync: error — ${e.message}`, "cron");
  }
}

export function startCronJobs() {
  cron.schedule("0 3 * * *", runAutoSync, { timezone: "UTC" });
  cron.schedule("*/5 * * * *", processScheduledTweets);
  log("Cron jobs scheduled — auto-sync runs daily at 3:00 AM UTC; tweet scheduler runs every 5 minutes", "cron");
}
