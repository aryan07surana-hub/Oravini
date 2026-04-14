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

export async function processScheduledLinkedinPosts() {
  try {
    const duePosts = await storage.getPendingDueLinkedinPosts();
    if (duePosts.length === 0) return;
    log(`Scheduled LinkedIn posts: processing ${duePosts.length}`, "cron");
    for (const post of duePosts) {
      try {
        const token = await storage.getLinkedinToken(post.userId);
        if (!token || !token.linkedinUserId) {
          await storage.updateScheduledLinkedinPost(post.id, { status: "failed", errorMessage: "LinkedIn not connected" });
          continue;
        }
        const body = {
          author: `urn:li:person:${token.linkedinUserId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: post.content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        };
        const resp = await fetch("https://api.linkedin.com/v2/ugcPosts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data: any = await resp.json();
        await storage.updateScheduledLinkedinPost(post.id, { status: "posted", postId: data.id ?? "" });
        log(`LinkedIn post published: ${data.id}`, "cron");
      } catch (e: any) {
        await storage.updateScheduledLinkedinPost(post.id, { status: "failed", errorMessage: e.message });
        log(`LinkedIn post failed for ${post.id}: ${e.message}`, "cron");
      }
    }
  } catch (e: any) {
    log(`LinkedIn scheduler error: ${e.message}`, "cron");
  }
}

async function processScheduledYoutubePosts() {
  try {
    const posts = await storage.getPendingDueYoutubePosts();
    if (posts.length === 0) return;
    log(`YouTube scheduler: processing ${posts.length} pending post(s)`, "cron");
    const { google } = await import("googleapis");
    const { Readable } = await import("stream");
    for (const post of posts) {
      try {
        const token = await storage.getYoutubeToken(post.userId);
        if (!token) {
          await storage.updateScheduledYoutubePost(post.id, { status: "failed", errorMessage: "YouTube not connected" });
          continue;
        }
        const siteDomain = process.env.SITE_URL?.replace(/\/$/, "") ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000"}`;
        const YOUTUBE_CALLBACK = `${siteDomain}/api/auth/youtube/callback`;
        const oauth2Client = new google.auth.OAuth2(
          process.env.YOUTUBE_CLIENT_ID,
          process.env.YOUTUBE_CLIENT_SECRET,
          YOUTUBE_CALLBACK,
        );
        if (token.expiresAt && new Date(token.expiresAt) < new Date() && token.refreshToken) {
          oauth2Client.setCredentials({ refresh_token: token.refreshToken });
          const { credentials } = await oauth2Client.refreshAccessToken();
          await storage.upsertYoutubeToken(post.userId, {
            accessToken: credentials.access_token!,
            refreshToken: credentials.refresh_token ?? token.refreshToken,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
            channelId: token.channelId,
            channelTitle: token.channelTitle,
            channelThumbnail: token.channelThumbnail,
          });
          oauth2Client.setCredentials(credentials);
        } else {
          oauth2Client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken ?? undefined });
        }
        const yt = google.youtube({ version: "v3", auth: oauth2Client });
        const videoResp = await fetch(post.videoUrl);
        if (!videoResp.ok) throw new Error(`Cannot fetch video URL: ${videoResp.statusText}`);
        const videoBuffer = await videoResp.arrayBuffer();
        const stream = Readable.from(Buffer.from(videoBuffer));
        const res = await yt.videos.insert({
          part: ["snippet", "status"],
          requestBody: {
            snippet: {
              title: post.title,
              description: post.description ?? "",
              tags: post.tags ?? [],
              categoryId: post.category ?? "22",
            },
            status: { privacyStatus: post.privacyStatus ?? "public" },
          },
          media: { mimeType: "video/*", body: stream },
        });
        await storage.updateScheduledYoutubePost(post.id, { status: "posted", youtubeVideoId: res.data.id ?? "" });
        log(`YouTube video uploaded: ${res.data.id}`, "cron");
      } catch (e: any) {
        await storage.updateScheduledYoutubePost(post.id, { status: "failed", errorMessage: e.message });
        log(`YouTube upload failed for ${post.id}: ${e.message}`, "cron");
      }
    }
  } catch (e: any) {
    log(`YouTube scheduler error: ${e.message}`, "cron");
  }
}

async function syncIgFollowerCounts() {
  const token = process.env.APIFY_INSTAGRAM_TOKEN;
  if (!token) {
    log("IG Tracker: skipped — APIFY_INSTAGRAM_TOKEN not set", "cron");
    return;
  }
  const profiles = await storage.getAllIgTrackedProfiles();
  if (!profiles.length) return;
  log(`IG Tracker: auto-scanning ${profiles.length} profile(s)`, "cron");
  for (const profile of profiles) {
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/7RQ4RlfRihUhflQtJ/run-sync-get-dataset-items?token=${token}&timeout=60`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usernames: [profile.username] }) }
      );
      if (!res.ok) continue;
      const items: any[] = await res.json();
      const item = items?.[0];
      if (!item) continue;
      await storage.updateIgTrackedProfile(profile.id, {
        fullName: item.userFullName || profile.fullName,
        profilePic: item.profilePic || profile.profilePic,
      });
      await storage.addIgFollowerSnapshot({ profileId: profile.id, followersCount: item.followersCount ?? 0, followsCount: item.followsCount ?? 0 });
      log(`IG Tracker: scanned @${profile.username} — ${item.followersCount} followers`, "cron");
      await new Promise(r => setTimeout(r, 3000));
    } catch (e: any) {
      log(`IG Tracker: failed for @${profile.username}: ${e.message}`, "cron");
    }
  }
  log("IG Tracker: daily auto-scan complete", "cron");
}

export function startCronJobs() {
  cron.schedule("0 3 * * *", runAutoSync, { timezone: "UTC" });
  cron.schedule("0 6 * * *", syncIgFollowerCounts, { timezone: "UTC" });
  cron.schedule("*/5 * * * *", processScheduledTweets);
  cron.schedule("*/5 * * * *", processScheduledLinkedinPosts);
  cron.schedule("*/5 * * * *", processScheduledYoutubePosts);
  log("Cron jobs scheduled — auto-sync daily 3AM UTC; IG tracker 6AM UTC; Twitter + LinkedIn + YouTube schedulers every 5 minutes", "cron");
}
