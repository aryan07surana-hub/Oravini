import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import nodemailer from "nodemailer";

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

  // Send test email
  app.post("/api/webinars/:id/emails/:emailId/test", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      const email = await storage.getWebinarEmailById(p(req.params.emailId));
      if (!email) return res.status(404).json({ message: "Email not found" });

      const webinar = await storage.getWebinar(p(req.params.id));
      if (!webinar) return res.status(404).json({ message: "Webinar not found" });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const body = replaceTemplateVars(email.bodyHtml, {
        name: user.name || "Test User",
        webinarTitle: webinar.title,
        date: webinar.scheduledAt ? new Date(webinar.scheduledAt).toLocaleDateString() : "TBD",
        time: webinar.scheduledAt ? new Date(webinar.scheduledAt).toLocaleTimeString() : "TBD",
        duration: String(webinar.durationMinutes || 60),
        watchUrl: `${baseUrl}/watch/${webinar.meetingCode}`,
        replayUrl: webinar.replayVideoUrl || "",
      });

      const subject = replaceTemplateVars(email.subject, {
        name: user.name || "Test User",
        webinarTitle: webinar.title,
      });

      // Try to send via configured transport
      const transporter = getMailTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || "webinars@oravini.com",
          to: user.email,
          subject,
          html: body,
        });
      }

      res.json({ ok: true, sentTo: user.email });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Trigger send to all registrants (manual send)
  app.post("/api/webinars/:id/emails/:emailId/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const email = await storage.getWebinarEmailById(p(req.params.emailId));
      if (!email) return res.status(404).json({ message: "Email not found" });

      const webinar = await storage.getWebinar(p(req.params.id));
      if (!webinar) return res.status(404).json({ message: "Webinar not found" });

      const registrations = await storage.getWebinarRegistrations(p(req.params.id));
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const transporter = getMailTransporter();
      let sentCount = 0;

      if (transporter) {
        for (const reg of registrations) {
          const body = replaceTemplateVars(email.bodyHtml, {
            name: reg.name,
            webinarTitle: webinar.title,
            date: webinar.scheduledAt ? new Date(webinar.scheduledAt).toLocaleDateString() : "TBD",
            time: webinar.scheduledAt ? new Date(webinar.scheduledAt).toLocaleTimeString() : "TBD",
            duration: String(webinar.durationMinutes || 60),
            watchUrl: `${baseUrl}/watch/${webinar.meetingCode}`,
            replayUrl: webinar.replayVideoUrl || "",
          });
          const subject = replaceTemplateVars(email.subject, {
            name: reg.name,
            webinarTitle: webinar.title,
          });

          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || "webinars@oravini.com",
              to: reg.email,
              subject,
              html: body,
            });
            sentCount++;
            await storage.logWebinarEmail(email.id, reg.email, reg.name);
          } catch (e) { /* skip failed sends */ }
        }
      }

      await storage.updateWebinarEmail(email.id, { sentCount: (email.sentCount || 0) + sentCount });
      res.json({ ok: true, sent: sentCount, total: registrations.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Get email sending logs
  app.get("/api/webinars/:id/emails/:emailId/logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getWebinarEmailLogs(p(req.params.emailId));
      res.json(logs);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}

function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  // Handle {{#if var}}...{{/if}} blocks
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
    return vars[varName] ? content : "";
  });
  return result;
}

function getMailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return null;
}
