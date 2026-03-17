import cron from "node-cron";
import { storage } from "./storage";
import { log } from "./index";

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

export async function runAutoSync() {
  try {
    log("Auto-sync: starting daily Instagram stats sync", "cron");
    const posts = await storage.getAllInstagramPostsWithUrls();
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

        const items = await apifyInstagram({ directUrls: [post.postUrl], resultsType: "posts", resultsLimit: 1 });
        const item = items?.[0];
        if (!item) continue;

        const v = item.videoPlayCount ?? item.videoViewCount ?? item.playsCount ?? 0;
        const l = item.likesCount ?? 0;
        const c = item.commentsCount ?? 0;
        const s = item.savesCount ?? 0;
        const ts = new Date();

        let updateData: any = {};
        if (checkpoint === "initial") {
          updateData = { views: v, likes: l, comments: c, saves: s, initialSyncedAt: ts };
        } else if (checkpoint === "2w") {
          updateData = { views2w: v, likes2w: l, comments2w: c, saves2w: s, twoWeekSyncedAt: ts };
        } else {
          updateData = { views4w: v, likes4w: l, comments4w: c, saves4w: s, fourWeekSyncedAt: ts };
        }

        await storage.updateContentPost(post.id, updateData);
        synced++;
        await new Promise(r => setTimeout(r, 1500));
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
