import type { Express, Request, Response } from "express";
import { pool } from "../storage";

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 49,
  growth: 99,
  pro: 199,
  elite: 497,
};

const MRR_GOAL = 10000;

export function registerAdminOverviewRoutes(app: Express, requireAdmin: any) {
  app.get("/api/admin/overview-stats", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const [
        signupsR, trendR, membersR, plansR, activeR,
        emailR, smsR, surveyR, referralR, npsR, npsCurrentR, unreadR,
        weeklySignupsR, weeklyMsgsR, weeklyCallsR,
        topMembersR, aiUsageR, aiTotalR, contentR, confirmedPlansR,
      ] = await Promise.allSettled([
        // signups this month
        pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= date_trunc('month', NOW())`),
        // signup trend last 14 days
        pool.query(`
          SELECT to_char(d.day::date, 'MM/DD') AS date, COALESCE(COUNT(u.id), 0)::int AS count
          FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day') AS d(day)
          LEFT JOIN users u ON DATE(u.created_at) = d.day
          GROUP BY d.day ORDER BY d.day
        `),
        // total members
        pool.query(`SELECT COUNT(*)::int AS count FROM users`),
        // members by plan (all)
        pool.query(`SELECT plan, COUNT(*)::int AS count FROM users GROUP BY plan`),
        // active today
        pool.query(`SELECT COUNT(DISTINCT sender_id)::int AS count FROM messages WHERE created_at >= CURRENT_DATE`),
        // email stats
        pool.query(`
          SELECT
            COUNT(*)::int AS sent,
            COALESCE(SUM(sent_count), 0)::int AS total_sent,
            COALESCE(SUM(opened_count), 0)::int AS total_opened,
            COALESCE(SUM(clicked_count), 0)::int AS total_clicked,
            COALESCE(SUM(recipient_count), 0)::int AS total_recipients
          FROM em_broadcasts WHERE status = 'sent'
        `),
        // SMS sent this month
        pool.query(`
          SELECT COALESCE(SUM(recipients_count), 0)::int AS sms_sent
          FROM sms_broadcasts WHERE sent_at >= date_trunc('month', NOW())
        `),
        // survey completion
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM onboarding_surveys) AS completed,
            (SELECT COUNT(*)::int FROM users) AS total
        `),
        // referral conversions
        pool.query(`
          SELECT
            COUNT(CASE WHEN converted = true THEN 1 END)::int AS conversions,
            COUNT(CASE WHEN registered = true THEN 1 END)::int AS registered
          FROM referral_conversions
        `),
        // NPS trend last 6 months
        pool.query(`
          SELECT
            to_char(date_trunc('month', submitted_at), 'Mon') AS month,
            ROUND(AVG(nps_score)::numeric, 1)::float AS avg_nps,
            COUNT(*)::int AS count
          FROM user_feedback
          WHERE nps_score IS NOT NULL
            AND submitted_at >= date_trunc('month', NOW()) - INTERVAL '5 months'
          GROUP BY date_trunc('month', submitted_at)
          ORDER BY date_trunc('month', submitted_at)
        `),
        // current NPS
        pool.query(`
          SELECT
            COUNT(CASE WHEN nps_score >= 9 THEN 1 END)::int AS promoters,
            COUNT(CASE WHEN nps_score <= 6 THEN 1 END)::int AS detractors,
            COUNT(*)::int AS total
          FROM user_feedback WHERE nps_score IS NOT NULL
        `),
        // unread messages
        pool.query(`SELECT COUNT(*)::int AS count FROM messages WHERE read = false`),
        // weekly digest — signups
        pool.query(`
          SELECT
            COUNT(CASE WHEN created_at >= date_trunc('week', NOW()) THEN 1 END)::int AS this_week,
            COUNT(CASE WHEN created_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
                        AND created_at < date_trunc('week', NOW()) THEN 1 END)::int AS last_week
          FROM users
        `),
        // weekly digest — messages
        pool.query(`
          SELECT
            COUNT(CASE WHEN created_at >= date_trunc('week', NOW()) THEN 1 END)::int AS this_week,
            COUNT(CASE WHEN created_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
                        AND created_at < date_trunc('week', NOW()) THEN 1 END)::int AS last_week
          FROM messages
        `),
        // weekly digest — calls booked
        pool.query(`
          SELECT
            COUNT(CASE WHEN created_at >= date_trunc('week', NOW()) THEN 1 END)::int AS this_week,
            COUNT(CASE WHEN created_at >= date_trunc('week', NOW()) - INTERVAL '7 days'
                        AND created_at < date_trunc('week', NOW()) THEN 1 END)::int AS last_week
          FROM call_bookings
        `),
        // top engaged members (last 30 days by messages + completed tasks)
        pool.query(`
          SELECT
            u.name,
            u.plan,
            COUNT(DISTINCT m.id)::int AS messages_sent,
            COUNT(DISTINCT t.id) FILTER (WHERE t.completed = true)::int AS tasks_done
          FROM users u
          LEFT JOIN messages m ON m.sender_id = u.id AND m.created_at >= NOW() - INTERVAL '30 days'
          LEFT JOIN tasks t ON t.client_id = u.id AND t.completed = true
          WHERE u.role = 'client'
          GROUP BY u.id, u.name, u.plan
          HAVING COUNT(DISTINCT m.id) > 0 OR COUNT(DISTINCT t.id) FILTER (WHERE t.completed = true) > 0
          ORDER BY (COUNT(DISTINCT m.id) + COUNT(DISTINCT t.id) FILTER (WHERE t.completed = true)) DESC
          LIMIT 5
        `),
        // AI usage by feature this month
        pool.query(`
          SELECT
            type,
            MAX(description) AS label,
            COUNT(*)::int AS uses,
            ABS(SUM(amount))::int AS credits_used
          FROM credit_transactions
          WHERE created_at >= date_trunc('month', NOW()) AND amount < 0
          GROUP BY type
          ORDER BY uses DESC
          LIMIT 8
        `),
        // AI total this month
        pool.query(`
          SELECT COUNT(*)::int AS total, ABS(SUM(amount))::int AS total_credits
          FROM credit_transactions
          WHERE created_at >= date_trunc('month', NOW()) AND amount < 0
        `),
        // content activity this week
        pool.query(`
          SELECT
            COUNT(*)::int AS posts_this_week,
            COUNT(CASE WHEN platform = 'instagram' THEN 1 END)::int AS instagram,
            COUNT(CASE WHEN platform = 'youtube' THEN 1 END)::int AS youtube,
            COUNT(CASE WHEN platform = 'tiktok' THEN 1 END)::int AS tiktok,
            COUNT(CASE WHEN platform = 'twitter' THEN 1 END)::int AS twitter,
            COUNT(CASE WHEN platform = 'linkedin' THEN 1 END)::int AS linkedin
          FROM content_posts
          WHERE created_at >= NOW() - INTERVAL '7 days'
        `),
        // confirmed paying plans for MRR
        pool.query(`
          SELECT plan, COUNT(*)::int AS count
          FROM users
          WHERE plan_confirmed = true AND plan != 'free'
          GROUP BY plan
        `),
      ]);

      const safe = (r: PromiseSettledResult<any>) => r.status === "fulfilled" ? (r.value?.rows[0] || {}) : {};
      const safeRows = (r: PromiseSettledResult<any>) => r.status === "fulfilled" ? (r.value?.rows || []) : [];

      const signups = safe(signupsR);
      const trend = safeRows(trendR);
      const members = safe(membersR);
      const plans = safeRows(plansR);
      const active = safe(activeR);
      const email = safe(emailR);
      const sms = safe(smsR);
      const survey = safe(surveyR);
      const referral = safe(referralR);
      const npsTrend = safeRows(npsR);
      const npsCurrent = safe(npsCurrentR);
      const unread = safe(unreadR);
      const wSignups = safe(weeklySignupsR);
      const wMsgs = safe(weeklyMsgsR);
      const wCalls = safe(weeklyCallsR);
      const topMembers = safeRows(topMembersR);
      const aiUsage = safeRows(aiUsageR);
      const aiTotal = safe(aiTotalR);
      const content = safe(contentR);
      const confirmedPlans = safeRows(confirmedPlansR);

      // Plan distribution
      const planMap: Record<string, number> = { free: 0, starter: 0, growth: 0, pro: 0, elite: 0 };
      plans.forEach((p: any) => { if (p.plan) planMap[p.plan] = p.count; });

      // NPS
      const npsTotal = npsCurrent.total || 0;
      const npsScore = npsTotal > 0
        ? Math.round(((npsCurrent.promoters - npsCurrent.detractors) / npsTotal) * 100)
        : null;

      // Email rates
      const emailRecipients = email.total_recipients || 0;
      const emailOpenRate = emailRecipients > 0 ? Math.round((email.total_opened / emailRecipients) * 100) : null;
      const emailClickRate = emailRecipients > 0 ? Math.round((email.total_clicked / emailRecipients) * 100) : null;

      // Survey rate
      const surveyRate = survey.total > 0 ? Math.round((survey.completed / survey.total) * 100) : 0;

      // MRR estimate from plan-confirmed paying users
      let estimatedMrr = 0;
      confirmedPlans.forEach((p: any) => {
        estimatedMrr += (PLAN_PRICES[p.plan] || 0) * p.count;
      });

      // Weekly deltas
      const weeklyDelta = (thisWeek: number, lastWeek: number) => ({
        thisWeek,
        lastWeek,
        delta: thisWeek - lastWeek,
        pct: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null,
      });

      res.json({
        signupsThisMonth: signups.count ?? 0,
        signupsTrend: trend,
        totalMembers: members.count ?? 0,
        membersByPlan: planMap,
        activeToday: active.count ?? 0,
        emailStats: {
          campaignsSent: email.sent ?? 0,
          openRate: emailOpenRate,
          clickRate: emailClickRate,
          totalSent: email.total_sent ?? 0,
        },
        smsSentThisMonth: sms.sms_sent ?? 0,
        surveyCompletionRate: surveyRate,
        surveyCompleted: survey.completed ?? 0,
        referralConversions: referral.conversions ?? 0,
        referralRegistered: referral.registered ?? 0,
        npsTrend,
        npsScore,
        unreadMessages: unread.count ?? 0,
        weeklyDigest: {
          signups: weeklyDelta(wSignups.this_week ?? 0, wSignups.last_week ?? 0),
          messages: weeklyDelta(wMsgs.this_week ?? 0, wMsgs.last_week ?? 0),
          calls: weeklyDelta(wCalls.this_week ?? 0, wCalls.last_week ?? 0),
        },
        topEngagedMembers: topMembers,
        aiUsage: {
          features: aiUsage,
          totalUses: aiTotal.total ?? 0,
          totalCredits: aiTotal.total_credits ?? 0,
        },
        contentActivity: {
          postsThisWeek: content.posts_this_week ?? 0,
          byPlatform: {
            instagram: content.instagram ?? 0,
            youtube: content.youtube ?? 0,
            tiktok: content.tiktok ?? 0,
            twitter: content.twitter ?? 0,
            linkedin: content.linkedin ?? 0,
          },
        },
        mrr: {
          estimated: estimatedMrr,
          goal: MRR_GOAL,
          byPlan: confirmedPlans,
        },
      });
    } catch (err: any) {
      console.error("[admin-overview] error:", err.message);
      res.status(500).json({ message: err.message });
    }
  });
}
