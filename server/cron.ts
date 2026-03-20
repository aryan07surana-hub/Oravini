import cron from "node-cron";
import { storage } from "./storage";
import { log } from "./index";
import { getConnectedIGAccount, syncPostByPermalink } from "./meta";

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

export async function runAutoSync() {
  try {
    log("Auto-sync: starting daily Instagram stats sync", "cron");
    const posts = await storage.getAllInstagramPostsWithUrls();
    const now = Date.now();
    let synced = 0;

    // Try to get Meta IG account ID once for the whole run
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

        // Try Meta API first
        if (metaIgAccountId && post.postUrl) {
          try {
            const metaResult = await syncPostByPermalink(metaIgAccountId, post.postUrl);
            if (metaResult) {
              v = metaResult.views; l = metaResult.likes; c = metaResult.comments; s = metaResult.saves;
              sourceUsed = "meta";
            }
          } catch (e: any) { /* silent — fall to Apify */ }
        }

        // Apify fallback
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
        if (sourceUsed === "apify") await new Promise(r => setTimeout(r, 1500)); // rate-limit Apify
      } catch (e: any) {
        log(`Auto-sync: failed for post ${post.id}: ${e.message}`, "cron");
      }
    }

    log(`Auto-sync: completed — ${synced}/${posts.length} posts synced`, "cron");
  } catch (e: any) {
    log(`Auto-sync: error — ${e.message}`, "cron");
  }
}

export function startCronJobs() {
  cron.schedule("0 3 * * *", runAutoSync, { timezone: "UTC" });
  log("Cron jobs scheduled — auto-sync runs daily at 3:00 AM UTC", "cron");
}
