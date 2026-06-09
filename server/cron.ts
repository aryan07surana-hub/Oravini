import cron from "node-cron";
import { storage } from "./storage";
import { log } from "./index";
import { processEmSendQueue } from "./routes/email-marketing";
import { getConnectedIGAccount, syncPostByPermalink } from "./meta";
import { extractYouTubeVideoId, getYouTubeVideoStats } from "./youtube";

async function apifyInstagram(payload: object): Promise<any[]> {
  const token = process.env.APIFY_INSTAGRAM_TOKEN || process.env.APIFY_TOKEN;
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
        const siteDomain =
          process.env.APP_URL?.replace(/\/$/, "") ||
          process.env.SITE_URL?.replace(/\/$/, "") ||
          process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ||
          `http://localhost:${process.env.PORT || "5000"}`;
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
  const token = process.env.APIFY_COMMENT_TOKEN || process.env.APIFY_INSTAGRAM_TOKEN || process.env.APIFY_TOKEN;
  if (!token) {
    log("IG Tracker: skipped — no Apify token set", "cron");
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

async function sendBookingReminders() {
  try {
    const upcoming = await storage.getUpcomingBookingsForReminders();
    if (upcoming.length === 0) return;
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const fmt = (d: Date) => d.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
    const now = new Date();
    for (const booking of upcoming) {
      const hoursUntil = (new Date(booking.startTime).getTime() - now.getTime()) / (1000 * 60 * 60);
      const mt = booking.meetingType;
      if (!mt) continue;
      // Parse scheduling config for per-user reminder preferences
      let cfg: any = {};
      try { cfg = mt.schedulingConfig ? JSON.parse((mt as any).schedulingConfig) : {}; } catch { cfg = {}; }
      const rem = cfg.reminders ?? {};
      const r24Enabled = rem.reminder24h !== false; // default on
      const r1Enabled = rem.reminder1h !== false;   // default on
      const customMsg = rem.customMessage ? `<p style="color:#ccc;margin-top:16px">${rem.customMessage}</p>` : "";

      const buildHtml = (hoursLabel: string) => `
        <div style="background:#111;color:#fff;font-family:sans-serif;padding:40px;border-radius:12px;max-width:520px;margin:auto">
          <h2 style="color:#d4b461;margin-bottom:4px">Oravini</h2>
          <p style="color:#aaa;margin-bottom:24px;font-size:13px">Meeting Reminder</p>
          <h3 style="color:#fff;margin-bottom:16px">Your meeting starts in ${hoursLabel}</h3>
          <div style="background:#222;border:1px solid #333;border-radius:8px;padding:20px">
            <p style="margin:0 0 8px;color:#ccc"><strong style="color:#d4b461">Meeting:</strong> ${mt.title}</p>
            <p style="margin:0 0 8px;color:#ccc"><strong style="color:#d4b461">When:</strong> ${fmt(new Date(booking.startTime))}</p>
            ${mt.location ? `<p style="margin:0;color:#ccc"><strong style="color:#d4b461">Location:</strong> ${mt.location}</p>` : ""}
          </div>
          ${booking.meetLink ? `<div style="text-align:center;margin-top:20px"><a href="${booking.meetLink}" style="display:inline-block;background:#d4b461;color:#000;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">🎥 Join Meeting</a></div>` : ""}
          ${customMsg}
        </div>`;

      // 24h reminder: send between 23h and 25h before meeting
      if (r24Enabled && hoursUntil <= 25 && hoursUntil >= 23 && !booking.reminder24Sent) {
        try {
          if (process.env.EMAIL_USER) {
            await transporter.sendMail({ from: `"Oravini" <support@oravini.com>`, to: booking.clientEmail, subject: `Reminder: ${mt.title} tomorrow`, html: buildHtml("24 hours") });
          }
          await storage.updateScheduledBooking(booking.id, { reminder24Sent: true });
          log(`Booking reminder 24h sent to ${booking.clientEmail}`, "cron");
        } catch (e: any) { log(`Reminder 24h failed: ${e.message}`, "cron"); }
      }
      // 1h reminder: send between 0 and 1h15m before meeting
      if (r1Enabled && hoursUntil <= 1.25 && hoursUntil > 0 && !booking.reminder1Sent) {
        try {
          if (process.env.EMAIL_USER) {
            await transporter.sendMail({ from: `"Oravini" <support@oravini.com>`, to: booking.clientEmail, subject: `Reminder: ${mt.title} in 1 hour`, html: buildHtml("1 hour") });
          }
          await storage.updateScheduledBooking(booking.id, { reminder1Sent: true });
          log(`Booking reminder 1h sent to ${booking.clientEmail}`, "cron");
        } catch (e: any) { log(`Reminder 1h failed: ${e.message}`, "cron"); }
      }
    }
  } catch (e: any) {
    log(`Booking reminders error: ${e.message}`, "cron");
  }
}

async function sendFollowUpEmails() {
  try {
    const completed = await storage.getCompletedBookingsForFollowUp();
    if (completed.length === 0) return;
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    const now = new Date();
    for (const booking of completed) {
      const mt = booking.meetingType;
      if (!mt) continue;
      let cfg: any = {};
      try { cfg = mt.schedulingConfig ? JSON.parse((mt as any).schedulingConfig) : {}; } catch { cfg = {}; }
      const emails = cfg.emails ?? {};
      if (!emails.followUpEnabled) continue;
      const delayHours = Number(emails.followUpDelayHours ?? 24);
      const sendAfter = new Date(new Date(booking.endTime).getTime() + delayHours * 60 * 60 * 1000);
      if (now < sendAfter) continue;

      const vars: Record<string, string> = {
        name: booking.clientName,
        title: mt.title,
        time: new Date(booking.startTime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }),
        duration: String(mt.duration ?? 30),
        link: mt.location ?? "",
      };
      const fill = (t: string) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
      const subject = fill(emails.followUpSubject || `How was your session with ${mt.title}?`);
      const bodyText = fill(emails.followUpBody || `Hi {{name}},\n\nThank you for meeting with us! We hope the session was valuable.\n\nFeel free to book another call whenever you're ready.`);
      const bodyHtml = `<div style="background:#111;color:#fff;font-family:sans-serif;padding:40px;border-radius:12px;max-width:520px;margin:auto"><h2 style="color:#d4b461;margin-bottom:4px">Oravini</h2><p style="color:#aaa;margin-bottom:24px;font-size:13px">Follow-up</p>${bodyText.split("\n").map(l => `<p style="color:#ccc;margin:0 0 12px">${l}</p>`).join("")}</div>`;

      try {
        if (process.env.EMAIL_USER) {
          await transporter.sendMail({ from: `"Oravini" <support@oravini.com>`, to: booking.clientEmail, subject, html: bodyHtml });
        }
        await storage.updateScheduledBooking(booking.id, { followUpSent: true } as any);
        log(`Follow-up email sent to ${booking.clientEmail} for booking ${booking.id}`, "cron");
      } catch (e: any) {
        log(`Follow-up email failed for booking ${booking.id}: ${e.message}`, "cron");
      }
    }
  } catch (e: any) {
    log(`sendFollowUpEmails error: ${e.message}`, "cron");
  }
}

export async function processEmailSequences() {
  try {
    const pending = await storage.getPendingEnrollments();
    for (const enrollment of pending) {
      try {
        const seqEmails = await storage.getSequenceEmails(enrollment.sequenceId);
        if (!seqEmails.length || enrollment.currentStep >= seqEmails.length) {
          await storage.advanceEnrollment(enrollment.id, enrollment.currentStep, null, true);
          continue;
        }
        const emailToSend = seqEmails[enrollment.currentStep];
        if (!emailToSend) {
          await storage.advanceEnrollment(enrollment.id, enrollment.currentStep, null, true);
          continue;
        }
        // Check sequence is still active
        const seq = await storage.getEmailSequence(enrollment.sequenceId);
        if (!seq?.active) continue;
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) continue;
        if (await storage.isEmailUnsubscribed(enrollment.userEmail)) {
          await storage.advanceEnrollment(enrollment.id, enrollment.currentStep, null, true);
          continue;
        }
        const emailLog = await storage.logEmail({ toEmail: enrollment.userEmail, toName: enrollment.userName ?? undefined, subject: emailToSend.subject, sequenceEmailId: emailToSend.id });
        const appBase = process.env.APP_URL || "https://oravini.com";
        const openPixel = `<img src="${appBase}/api/email/open/${emailLog.id}.gif" width="1" height="1" style="display:none" alt="" />`;
        const unsubUrl = `${appBase}/api/email/unsubscribe?email=${encodeURIComponent(enrollment.userEmail)}`;
        const name = enrollment.userName || "there";
        const filledHtml = emailToSend.bodyHtml.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => ({ name, email: enrollment.userEmail }[k] ?? ""));
        const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;"><div style="max-width:580px;margin:0 auto;padding:40px 24px;"><div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.08);"><span style="color:#d4b461;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">ORAVINI</span></div>${filledHtml}${openPixel}<div style="margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.07);"><p style="color:rgba(255,255,255,0.22);font-size:11px;line-height:1.7;margin:0;">You're receiving this because you joined Oravini.<br><a href="${unsubUrl}" style="color:#d4b461;text-decoration:none;">Unsubscribe</a></p></div></div></body></html>`;
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.default.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        await transporter.sendMail({ from: `"Oravini" <support@oravini.com>`, to: enrollment.userEmail, subject: emailToSend.subject, html: fullHtml });
        // Advance to next step
        const nextStep = enrollment.currentStep + 1;
        const isLast = nextStep >= seqEmails.length;
        const nextEmail = seqEmails[nextStep];
        const nextSendAt = isLast ? null : new Date(Date.now() + (nextEmail?.delayDays || 1) * 24 * 60 * 60 * 1000);
        await storage.advanceEnrollment(enrollment.id, nextStep, nextSendAt, isLast);
        log(`Sequence email sent to ${enrollment.userEmail} (step ${enrollment.currentStep + 1}/${seqEmails.length})`, "cron");
      } catch (e: any) {
        log(`Sequence send error for ${enrollment.userEmail}: ${e.message}`, "cron");
      }
    }
  } catch (e: any) {
    log(`processEmailSequences error: ${e.message}`, "cron");
  }
}

export async function processSmsSequences() {
  try {
    const pending = await storage.getPendingSmsEnrollments();
    if (pending.length === 0) return;
    log(`SMS sequences: processing ${pending.length} pending enrollment(s)`, "cron");
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      log("SMS sequences: skipped — EMAIL_USER/PASS not configured", "cron");
      return;
    }

    for (const enrollment of pending) {
      try {
        const steps = await storage.getSmsSequenceSteps(enrollment.sequenceId);
        if (!steps.length || enrollment.currentStep >= steps.length) {
          await storage.advanceSmsEnrollment(enrollment.id, enrollment.currentStep, null, true);
          continue;
        }

        const stepToSend = steps[enrollment.currentStep];
        if (!stepToSend) {
          await storage.advanceSmsEnrollment(enrollment.id, enrollment.currentStep, null, true);
          continue;
        }

        // Check sequence is still active
        const seq = await storage.getSmsSequence(enrollment.sequenceId);
        if (!seq?.active) continue;

        // Check if unsubscribed
        if (await storage.isSmsUnsubscribed(enrollment.phone)) {
          await storage.advanceSmsEnrollment(enrollment.id, enrollment.currentStep, null, true);
          continue;
        }

        // Get carrier gateway
        const gw = await storage.getSmsCarrierGateway(enrollment.phone);
        if (!gw || !gw.gatewayDomain) {
          log(`SMS sequence ${enrollment.id}: no carrier gateway for ${enrollment.phone}, skipping`, "cron");
          continue;
        }

        // Templatize message with {{phone}}
        const message = stepToSend.message;

        // Send via email-to-SMS gateway
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.default.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        const toEmail = `${enrollment.phone.replace(/[^+\d]/g, "")}@${gw.gatewayDomain}`;
        await transporter.sendMail({
          from: `"Oravini" <support@oravini.com>`,
          to: toEmail,
          subject: "",
          text: message,
        });

        // Log it
        await storage.logSms({
          toPhone: enrollment.phone,
          message: message.slice(0, 200),
          sequenceStepId: stepToSend.id,
        });

        // Advance
        const nextStep = enrollment.currentStep + 1;
        const isLast = nextStep >= steps.length;
        const nextStepObj = steps[nextStep];
        const nextSendAt = isLast
          ? null
          : new Date(Date.now() + (nextStepObj?.delayMinutes || 1) * 60 * 1000);
        await storage.advanceSmsEnrollment(enrollment.id, nextStep, nextSendAt, isLast);
        log(`SMS sent to ${enrollment.phone} (step ${enrollment.currentStep + 1}/${steps.length})`, "cron");
      } catch (e: any) {
        log(`SMS sequence send error for ${enrollment.phone}: ${e.message}`, "cron");
      }
    }
  } catch (e: any) {
    log(`processSmsSequences error: ${e.message}`, "cron");
  }
}

export async function processScheduledInstagramPosts() {
  try {
    const due = await storage.getPendingDueInstagramPosts();
    if (due.length === 0) return;
    log(`Instagram scheduler: marking ${due.length} post(s) as ready`, "cron");
    for (const post of due) {
      await storage.updateScheduledInstagramPost(post.id, { status: "ready" });
    }
  } catch (e: any) {
    log(`processScheduledInstagramPosts error: ${e.message}`, "cron");
  }
}

async function scanCompetitorWatchlist() {
  log("Competitor watch: starting daily scan", "cron");
  try {
    const items = await storage.getAllActiveWatchlistItems();
    if (items.length === 0) return;
    log(`Competitor watch: scanning ${items.length} item(s)`, "cron");

    for (const item of items) {
      try {
        const token = process.env.APIFY_INSTAGRAM_TOKEN || process.env.APIFY_TOKEN;
        if (!token) break;

        const url = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}&timeout=60`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: [item.handle], proxy: { useApifyProxy: true } }),
        });
        if (!resp.ok) continue;

        const profileItems: any[] = await resp.json();
        if (!profileItems.length) continue;

        const profile = profileItems[0];
        const followerCount: number | null = profile.followersCount ?? null;
        const followingCount: number | null = profile.followingCount ?? null;
        const postCount: number | null = profile.postsCount ?? null;
        const bio: string | null = profile.biography || null;
        const avatarUrl: string | null = profile.profilePicUrl || item.avatarUrl || null;
        const displayName: string | null = profile.fullName || item.displayName || null;

        // Compute averages from latestPosts if available
        const posts: any[] = profile.latestPosts || [];
        let avgViews = 0, avgLikes = 0, avgComments = 0, avgEngagement = 0;
        const recentPosts = posts.slice(0, 10).map((p: any) => ({
          url: p.url || (p.shortCode ? `https://instagram.com/p/${p.shortCode}` : ""),
          thumbnail: p.displayUrl || null,
          views: p.videoViewCount || 0,
          likes: p.likesCount || 0,
          comments: p.commentsCount || 0,
          caption: (p.caption || "").slice(0, 150),
          timestamp: p.timestamp || null,
          type: p.videoViewCount ? "reel" : "image",
        }));

        if (posts.length > 0) {
          avgViews = posts.reduce((s: number, p: any) => s + (p.videoViewCount || 0), 0) / posts.length;
          avgLikes = posts.reduce((s: number, p: any) => s + (p.likesCount || 0), 0) / posts.length;
          avgComments = posts.reduce((s: number, p: any) => s + (p.commentsCount || 0), 0) / posts.length;
          avgEngagement = followerCount && followerCount > 0
            ? ((avgLikes + avgComments) / followerCount) * 100
            : 0;
        }

        const lastSnap = await storage.getLatestSnapshot(item.id);

        await storage.createCompetitorSnapshot({
          watchlistId: item.id,
          userId: item.userId,
          followerCount,
          followingCount,
          postCount,
          avgViews,
          avgLikes,
          avgComments,
          avgEngagement,
          bio,
          recentPosts,
        });

        await storage.updateWatchlistItem(item.id, {
          lastScannedAt: new Date(),
          displayName: displayName || item.displayName,
          avatarUrl: avatarUrl || item.avatarUrl,
        });

        if (lastSnap) {
          if (followerCount && lastSnap.followerCount && lastSnap.followerCount > 0) {
            const pct = ((followerCount - lastSnap.followerCount) / lastSnap.followerCount) * 100;
            if (Math.abs(pct) >= 5) {
              await storage.createCompetitorAlert({
                userId: item.userId,
                watchlistId: item.id,
                alertType: "follower_spike",
                title: `@${item.handle} ${pct > 0 ? "gained" : "lost"} followers`,
                description: `${Math.abs(Math.round(pct))}% ${pct > 0 ? "increase" : "decrease"} — from ${lastSnap.followerCount.toLocaleString()} to ${(followerCount ?? 0).toLocaleString()}`,
                data: { from: lastSnap.followerCount, to: followerCount, pctChange: pct },
                isRead: false,
              });
            }
          }

          if (bio && lastSnap.bio && bio !== lastSnap.bio) {
            await storage.createCompetitorAlert({
              userId: item.userId,
              watchlistId: item.id,
              alertType: "bio_change",
              title: `@${item.handle} updated their bio`,
              description: `New bio: "${bio.slice(0, 120)}"`,
              data: { oldBio: lastSnap.bio, newBio: bio },
              isRead: false,
            });
          }

          if (postCount && lastSnap.postCount && postCount > lastSnap.postCount) {
            const newPosts = postCount - lastSnap.postCount;
            await storage.createCompetitorAlert({
              userId: item.userId,
              watchlistId: item.id,
              alertType: "new_post",
              title: `@${item.handle} posted ${newPosts} new ${newPosts === 1 ? "time" : "times"}`,
              description: `Total posts: ${postCount}`,
              data: { newPosts, totalPosts: postCount },
              isRead: false,
            });
          }

          if (avgEngagement > 0 && lastSnap.avgEngagement && lastSnap.avgEngagement > 0) {
            const engPct = ((avgEngagement - lastSnap.avgEngagement) / lastSnap.avgEngagement) * 100;
            if (engPct >= 20) {
              await storage.createCompetitorAlert({
                userId: item.userId,
                watchlistId: item.id,
                alertType: "engagement_spike",
                title: `@${item.handle} engagement spiked +${Math.round(engPct)}%`,
                description: `Avg engagement went from ${lastSnap.avgEngagement.toFixed(2)}% to ${avgEngagement.toFixed(2)}%`,
                data: { from: lastSnap.avgEngagement, to: avgEngagement, pctChange: engPct },
                isRead: false,
              });
            }
          }
        }

        log(`Competitor watch: scanned @${item.handle}`, "cron");
        // Rate limit: 3s between scans
        await new Promise(r => setTimeout(r, 3000));
      } catch (e: any) {
        log(`Competitor watch: error scanning @${item.handle} — ${e.message}`, "cron");
      }
    }
    log("Competitor watch: daily scan complete", "cron");
  } catch (e: any) {
    log(`Competitor watch: scan error — ${e.message}`, "cron");
  }
}

export function startCronJobs() {
  cron.schedule("0 3 * * *", runAutoSync, { timezone: "UTC" });
  cron.schedule("0 6 * * *", syncIgFollowerCounts, { timezone: "UTC" });
  cron.schedule("0 8 * * *", scanCompetitorWatchlist, { timezone: "UTC" });
  cron.schedule("*/5 * * * *", processScheduledTweets);
  cron.schedule("*/5 * * * *", processScheduledLinkedinPosts);
  cron.schedule("*/5 * * * *", processScheduledYoutubePosts);
  cron.schedule("*/5 * * * *", processScheduledInstagramPosts);
  cron.schedule("*/15 * * * *", sendBookingReminders);
  cron.schedule("*/15 * * * *", sendFollowUpEmails);
  cron.schedule("0 * * * *", processEmailSequences);
  cron.schedule("*/2 * * * *", processSmsSequences);
  cron.schedule("*/5 * * * *", processEmSendQueue);
  log("Cron jobs scheduled — auto-sync 3AM; IG tracker 6AM; competitor watch 8AM; schedulers every 5 min; reminders + follow-ups every 15 min; email sequences hourly; SMS sequences every 2 min; em send queue every 5 min", "cron");
}
