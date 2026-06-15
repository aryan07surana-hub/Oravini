import type { Express, Request, Response } from "express";
import { pool } from "../storage";

export function registerAnalyticsRoutes(app: Express, requireAuth: any) {
  app.get("/api/analytics/overview", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      const [
        smsR, emailR, videoR, webinarR, dmR, schedR,
      ] = await Promise.allSettled([
        // SMS
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM sms_contacts WHERE user_id = $1) AS contacts,
            (SELECT COUNT(*)::int FROM sms_contacts WHERE user_id = $1 AND opted_in) AS opted_in,
            (SELECT COUNT(*)::int FROM sms_campaigns WHERE user_id = $1 AND status = 'sent') AS campaigns_sent,
            (SELECT COALESCE(SUM(delivered_count),0)::int FROM sms_campaigns WHERE user_id = $1) AS delivered,
            (SELECT COALESCE(SUM(recipients_count),0)::int FROM sms_campaigns WHERE user_id = $1) AS recipients,
            (SELECT COUNT(*)::int FROM sms_conversations WHERE user_id = $1 AND unread_count > 0) AS unread_threads
        `, [userId]),
        // Email
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM em_contacts WHERE user_id = $1) AS contacts,
            (SELECT COUNT(*)::int FROM em_contacts WHERE user_id = $1 AND subscribed) AS subscribed,
            (SELECT COUNT(*)::int FROM em_broadcasts WHERE user_id = $1 AND status = 'sent') AS sent,
            (SELECT COALESCE(AVG(open_rate),0)::numeric(5,1) FROM em_broadcasts WHERE user_id = $1 AND open_rate > 0) AS avg_open_rate,
            (SELECT COUNT(*)::int FROM em_sequences WHERE user_id = $1 AND status = 'active') AS active_sequences
        `, [userId]),
        // Video
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM video_events WHERE user_id = $1) AS videos,
            (SELECT COALESCE(SUM(views),0)::int FROM video_events WHERE user_id = $1) AS total_views,
            (SELECT COUNT(*)::int FROM video_channels WHERE user_id = $1) AS channels,
            (SELECT COALESCE(SUM(subscriber_count),0)::int FROM video_channels WHERE user_id = $1) AS total_subs
        `, [userId]),
        // Webinars
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM webinars WHERE user_id = $1) AS total,
            (SELECT COUNT(*)::int FROM webinars WHERE user_id = $1 AND status = 'ended') AS completed,
            (SELECT COUNT(*)::int FROM webinars WHERE user_id = $1 AND status = 'live') AS live_now,
            (SELECT COALESCE(SUM(views),0)::int FROM webinars WHERE user_id = $1) AS total_views
        `, [userId]),
        // DM automation
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM dm_automations WHERE user_id = $1 AND active) AS active_automations,
            (SELECT COUNT(*)::int FROM dm_conversations WHERE user_id = $1) AS conversations
        `, [userId]),
        // Scheduling
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM scheduled_posts WHERE user_id = $1) AS total,
            (SELECT COUNT(*)::int FROM scheduled_posts WHERE user_id = $1 AND status = 'published') AS published,
            (SELECT COUNT(*)::int FROM scheduled_posts WHERE user_id = $1 AND status = 'scheduled') AS pending
        `, [userId]),
      ]);

      const safe = (r: PromiseSettledResult<any>) => r.status === "fulfilled" ? r.value?.rows[0] || {} : {};

      const sms = safe(smsR);
      const email = safe(emailR);
      const video = safe(videoR);
      const webinar = safe(webinarR);
      const dm = safe(dmR);
      const sched = safe(schedR);

      const smsDeliveryRate = sms.recipients > 0
        ? Math.round((sms.delivered / sms.recipients) * 100)
        : null;

      res.json({
        sms: {
          contacts: sms.contacts ?? 0,
          optedIn: sms.opted_in ?? 0,
          campaignsSent: sms.campaigns_sent ?? 0,
          delivered: sms.delivered ?? 0,
          deliveryRate: smsDeliveryRate,
          unreadThreads: sms.unread_threads ?? 0,
        },
        email: {
          contacts: email.contacts ?? 0,
          subscribed: email.subscribed ?? 0,
          sent: email.sent ?? 0,
          avgOpenRate: email.avg_open_rate ? parseFloat(email.avg_open_rate) : null,
          activeSequences: email.active_sequences ?? 0,
        },
        video: {
          videos: video.videos ?? 0,
          totalViews: video.total_views ?? 0,
          channels: video.channels ?? 0,
          totalSubs: video.total_subs ?? 0,
        },
        webinar: {
          total: webinar.total ?? 0,
          completed: webinar.completed ?? 0,
          liveNow: webinar.live_now ?? 0,
          totalViews: webinar.total_views ?? 0,
        },
        dm: {
          activeAutomations: dm.active_automations ?? 0,
          conversations: dm.conversations ?? 0,
        },
        scheduling: {
          total: sched.total ?? 0,
          published: sched.published ?? 0,
          pending: sched.pending ?? 0,
        },
      });
    } catch (err: any) {
      console.error("[analytics] error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });
}
