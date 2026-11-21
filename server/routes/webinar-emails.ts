import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { respondWebinarOutboundDisabled } from "../webinarOutboundDisabled";

function p(id: string | string[] | undefined): string {
  const s = Array.isArray(id) ? id[0] : id;
  if (!s) throw new Error("Missing ID");
  return s;
}

// Default email templates
const DEFAULT_TEMPLATES: Record<string, { subject: string; bodyHtml: string }> = {
  confirmation: {
    subject: "You're registered! 🎉 {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">You're In! 🎉</h1>
      <p>Hi {{name}},</p>
      <p>You're confirmed for <strong>{{webinarTitle}}</strong>.</p>
      <p><strong>When:</strong> {{date}} at {{time}}</p>
      <p><strong>Duration:</strong> {{duration}} minutes</p>
      <a href="{{watchUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Join Webinar →</a>
      <p style="color: #666; font-size: 14px;">Add this to your calendar so you don't miss it!</p>
    </div>`,
  },
  reminder_24h: {
    subject: "Tomorrow: {{webinarTitle}} — Don't Miss It!",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">Happening Tomorrow! ⏰</h1>
      <p>Hi {{name}},</p>
      <p><strong>{{webinarTitle}}</strong> is happening in 24 hours.</p>
      <p><strong>When:</strong> {{date}} at {{time}}</p>
      <a href="{{watchUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Save Your Spot →</a>
    </div>`,
  },
  reminder_1h: {
    subject: "Starting in 1 hour: {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">We Start in 1 Hour! 🔴</h1>
      <p>Hi {{name}},</p>
      <p><strong>{{webinarTitle}}</strong> starts in 60 minutes. Get ready!</p>
      <a href="{{watchUrl}}" style="display: inline-block; background: #ef4444; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Join Now →</a>
    </div>`,
  },
  reminder_15m: {
    subject: "Starting in 15 minutes! {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #ef4444;">We're Starting! 🚨</h1>
      <p>Hi {{name}}, the webinar starts in 15 minutes.</p>
      <a href="{{watchUrl}}" style="display: inline-block; background: #ef4444; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Join Live Now →</a>
    </div>`,
  },
  followup: {
    subject: "Thanks for attending {{webinarTitle}}!",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">Thanks for Joining! 🙏</h1>
      <p>Hi {{name}},</p>
      <p>Thank you for attending <strong>{{webinarTitle}}</strong>.</p>
      <p>We hope you found it valuable. Here's what you can do next:</p>
      {{#if replayUrl}}<a href="{{replayUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Watch Replay →</a>{{/if}}
    </div>`,
  },
  replay: {
    subject: "Replay Available: {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">Replay Is Ready! 🎬</h1>
      <p>Hi {{name}},</p>
      <p>The replay of <strong>{{webinarTitle}}</strong> is now available.</p>
      <a href="{{replayUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Watch Replay →</a>
    </div>`,
  },
};

/**
 * Post-webinar segmented follow-ups for Webinar Funnels (/w/:slug). Sent once per
 * registrant by server/webinarFunnelFollowup.ts. Kept separate from DEFAULT_TEMPLATES
 * so "init-defaults" for LiveKit webinars is unchanged.
 * Vars: {{name}} {{webinarTitle}} {{replayUrl}} {{ctaUrl}} {{ctaText}}; {{#if var}}…{{/if}}.
 */
export const WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES: Record<"followup_clicked" | "followup_attended" | "followup_no_show", { subject: string; bodyHtml: string }> = {
  followup_clicked: {
    subject: "You grabbed the offer — last chance: {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">You Grabbed the Offer — Last Chance ⏳</h1>
      <p>Hi {{name}},</p>
      <p>We saw you check out the offer during <strong>{{webinarTitle}}</strong>. It's closing soon, so this is your last chance to lock it in.</p>
      {{#if ctaUrl}}<a href="{{ctaUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">{{ctaText}} →</a>{{/if}}
      <p>Want a refresher first? <a href="{{replayUrl}}" style="color: #d4b461;">Rewatch the replay</a>.</p>
    </div>`,
  },
  followup_attended: {
    subject: "Thanks for coming — here's your replay + the offer",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">Thanks for Coming! 🙏</h1>
      <p>Hi {{name}},</p>
      <p>Thank you for showing up to <strong>{{webinarTitle}}</strong>. Here's the replay so you can revisit anything you missed.</p>
      <a href="{{replayUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Watch Replay →</a>
      {{#if ctaUrl}}<p>And if you're ready for the next step, the offer from the session is still open:</p>
      <a href="{{ctaUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">{{ctaText}} →</a>{{/if}}
    </div>`,
  },
  followup_no_show: {
    subject: "Sorry we missed you — watch the replay of {{webinarTitle}}",
    bodyHtml: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #d4b461;">Sorry We Missed You 👋</h1>
      <p>Hi {{name}},</p>
      <p>Life happens — we noticed you couldn't make it to <strong>{{webinarTitle}}</strong>. The good news: the replay is ready for you.</p>
      <a href="{{replayUrl}}" style="display: inline-block; background: #d4b461; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Watch the Replay →</a>
    </div>`,
  },
};

export function registerWebinarEmailRoutes(app: Express, requireAuth: any) {
  // Get email configs for a webinar
  app.get("/api/webinars/:id/emails", requireAuth, async (req: Request, res: Response) => {
    try {
      const emails = await storage.getWebinarEmails(p(req.params.id));
      res.json(emails);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Create/update email config
  app.post("/api/webinars/:id/emails", requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, subject, bodyHtml, enabled } = req.body;
      if (!type) return res.status(400).json({ message: "Email type required" });
      const defaults = DEFAULT_TEMPLATES[type] || { subject: "", bodyHtml: "" };
      const email = await storage.upsertWebinarEmail({
        webinarId: p(req.params.id),
        type,
        subject: subject || defaults.subject,
        bodyHtml: bodyHtml || defaults.bodyHtml,
        enabled: enabled ?? true,
      });
      res.status(201).json(email);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Update email
  app.patch("/api/webinars/:id/emails/:emailId", requireAuth, async (req: Request, res: Response) => {
    try {
      const email = await storage.updateWebinarEmail(p(req.params.emailId), req.body);
      res.json(email);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Delete email config
  app.delete("/api/webinars/:id/emails/:emailId", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteWebinarEmail(p(req.params.emailId));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Initialize default email templates for a webinar
  app.post("/api/webinars/:id/emails/init-defaults", requireAuth, async (req: Request, res: Response) => {
    try {
      const webinarId = p(req.params.id);
      const results = [];
      for (const [type, template] of Object.entries(DEFAULT_TEMPLATES)) {
        const email = await storage.upsertWebinarEmail({
          webinarId,
          type,
          subject: template.subject,
          bodyHtml: template.bodyHtml,
          enabled: true,
        });
        results.push(email);
      }
      res.json(results);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Send test email — DISABLED. Returns 410 before any storage read or send.
  // The saved template this would have rendered is untouched.
  app.post("/api/webinars/:id/emails/:emailId/test", requireAuth, async (_req: Request, res: Response) => {
    return respondWebinarOutboundDisabled(res, { sentTo: null });
  });

  // Trigger send to all registrants (manual send) — DISABLED. Returns 410 before
  // any storage read, recipient loop, email log write or sentCount update, so no
  // counter moves and no registrant is recorded as messaged.
  app.post("/api/webinars/:id/emails/:emailId/send", requireAuth, async (_req: Request, res: Response) => {
    return respondWebinarOutboundDisabled(res, { sent: 0, total: 0 });
  });

  // Get email sending logs
  app.get("/api/webinars/:id/emails/:emailId/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getWebinarEmailLogs(p(req.params.emailId));
      res.json(logs);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
