import type { Express, Request, Response } from "express";
import { db } from "./storage";
import { eq, desc, and, lte } from "drizzle-orm";
import {
  contactCustomFieldDefs, contactCustomFieldValues,
  welcomeDmConfigs, outboundWebhooks,
  dmClickLinks, dmClickEvents, dmFunnelEvents,
  conversationNotes, dmScheduledBroadcasts,
  dmLeads, dmContactTags, metaTokens,
} from "@shared/schema";
import { sendInstagramDM } from "./meta";

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export function interpolateMessage(template: string, lead: any, customFields: Record<string, string> = {}): string {
  const firstName = (lead.name || "").split(" ")[0];
  const lastName = (lead.name || "").split(" ").slice(1).join(" ");
  return template
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_name\}\}/g, lastName)
    .replace(/\{\{name\}\}/g, lead.name || "")
    .replace(/\{\{instagram\}\}/g, lead.instagramHandle ? `@${lead.instagramHandle}` : "")
    .replace(/\{\{email\}\}/g, lead.email || "")
    .replace(/\{\{phone\}\}/g, lead.phone || "")
    .replace(/\{\{(\w+)\}\}/g, (_, key) => customFields[key] || "");
}

async function fireWebhooks(userId: string, event: string, value: string | null, payload: any) {
  try {
    const hooks = await db.select().from(outboundWebhooks)
      .where(and(eq(outboundWebhooks.userId, userId), eq(outboundWebhooks.triggerEvent, event), eq(outboundWebhooks.isActive, true)));
    for (const hook of hooks) {
      if (hook.triggerValue && hook.triggerValue !== value) continue;
      fetch(hook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, value, payload, timestamp: new Date().toISOString() }),
      }).catch(() => {});
      await db.update(outboundWebhooks).set({ fireCount: (hook.fireCount || 0) + 1 }).where(eq(outboundWebhooks.id, hook.id));
    }
  } catch {}
}

export function registerDMAdvancedRoutes(app: Express) {

  // ── Custom Field Defs ──────────────────────────────────────────────────────
  app.get("/api/dm/custom-field-defs", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      res.json(await db.select().from(contactCustomFieldDefs).where(eq(contactCustomFieldDefs.userId, userId)).orderBy(contactCustomFieldDefs.createdAt));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/custom-field-defs", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { label, fieldType = "text" } = req.body;
      const fieldKey = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const [row] = await db.insert(contactCustomFieldDefs).values({ userId, label, fieldKey, fieldType }).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/custom-field-defs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(contactCustomFieldDefs).where(eq(contactCustomFieldDefs.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Custom Field Values per lead ───────────────────────────────────────────
  app.get("/api/dm/leads/:leadId/fields", requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await db.select().from(contactCustomFieldValues).where(eq(contactCustomFieldValues.leadId, String(req.params.leadId))));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/dm/leads/:leadId/fields", requireAuth, async (req: Request, res: Response) => {
    try {
      const leadId = String(req.params.leadId);
      const fields: { fieldDefId: string; value: string }[] = req.body;
      for (const f of fields) {
        await db.insert(contactCustomFieldValues)
          .values({ leadId, fieldDefId: f.fieldDefId, value: f.value })
          .onConflictDoUpdate({ target: [contactCustomFieldValues.leadId, contactCustomFieldValues.fieldDefId], set: { value: f.value, updatedAt: new Date() } });
      }
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Welcome DM ─────────────────────────────────────────────────────────────
  app.get("/api/dm/welcome-dm", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const [row] = await db.select().from(welcomeDmConfigs).where(eq(welcomeDmConfigs.userId, userId));
      res.json(row || { userId, isActive: false, message: "", delayMinutes: 0 });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/dm/welcome-dm", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const existing = await db.select().from(welcomeDmConfigs).where(eq(welcomeDmConfigs.userId, userId));
      let row;
      if (existing.length > 0) {
        [row] = await db.update(welcomeDmConfigs).set({ ...req.body, updatedAt: new Date() }).where(eq(welcomeDmConfigs.userId, userId)).returning();
      } else {
        [row] = await db.insert(welcomeDmConfigs).values({ userId, ...req.body }).returning();
      }
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Opt-out / Unsubscribe ──────────────────────────────────────────────────
  app.post("/api/dm/leads/:id/opt-out", requireAuth, async (req: Request, res: Response) => {
    try {
      const [row] = await db.update(dmLeads).set({ isOptedOut: true }).where(eq(dmLeads.id, String(req.params.id))).returning();
      await fireWebhooks((req.user as any).id, "opted_out", null, row);
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/leads/:id/opt-out", requireAuth, async (req: Request, res: Response) => {
    try {
      const [row] = await db.update(dmLeads).set({ isOptedOut: false }).where(eq(dmLeads.id, String(req.params.id))).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── AI Lead Scoring ────────────────────────────────────────────────────────
  app.post("/api/dm/leads/:id/score", requireAuth, async (req: Request, res: Response) => {
    try {
      const [lead] = await db.select().from(dmLeads).where(eq(dmLeads.id, String(req.params.id)));
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.status(400).json({ message: "AI not configured" });
      const ctx = `Name: ${lead.name}, Instagram: @${lead.instagramHandle || "?"}, Status: ${lead.status}, Source: ${lead.source || "?"}, Notes: ${lead.notes || "none"}`;
      const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.1-70b-versatile", max_tokens: 100, messages: [{ role: "user", content: `Score this sales lead 1-10 and explain in 10 words. ${ctx}. Reply as JSON: {"score":7,"reason":"..."}` }] }),
      });
      const aiData: any = await aiRes.json();
      const text = aiData?.choices?.[0]?.message?.content ?? "";
      let score = 5, reason = "Unable to score";
      try { const p = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}"); score = p.score || 5; reason = p.reason || ""; } catch {}
      const [updated] = await db.update(dmLeads).set({ leadScore: score, leadScoreReason: reason }).where(eq(dmLeads.id, String(req.params.id))).returning();
      res.json({ score, reason, lead: updated });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Outbound Webhooks ──────────────────────────────────────────────────────
  app.get("/api/dm/webhooks", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      res.json(await db.select().from(outboundWebhooks).where(eq(outboundWebhooks.userId, userId)).orderBy(desc(outboundWebhooks.createdAt)));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/webhooks", requireAuth, async (req: Request, res: Response) => {
    try {
      const [row] = await db.insert(outboundWebhooks).values({ ...req.body, userId: (req.user as any).id }).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/dm/webhooks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const [row] = await db.update(outboundWebhooks).set(req.body).where(eq(outboundWebhooks.id, String(req.params.id))).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/webhooks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(outboundWebhooks).where(eq(outboundWebhooks.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/webhooks/:id/test", requireAuth, async (req: Request, res: Response) => {
    try {
      const [hook] = await db.select().from(outboundWebhooks).where(eq(outboundWebhooks.id, String(req.params.id)));
      if (!hook) return res.status(404).json({ message: "Not found" });
      const r = await fetch(hook.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "test", payload: { message: "Test from DM Automation" }, timestamp: new Date().toISOString() }) });
      res.json({ status: r.status, ok: r.ok });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Click Tracking Links ───────────────────────────────────────────────────
  app.get("/api/dm/click-links", requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await db.select().from(dmClickLinks).where(eq(dmClickLinks.userId, (req.user as any).id)).orderBy(desc(dmClickLinks.createdAt)));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/click-links", requireAuth, async (req: Request, res: Response) => {
    try {
      const shortCode = Math.random().toString(36).substring(2, 8);
      const [row] = await db.insert(dmClickLinks).values({ ...req.body, userId: (req.user as any).id, shortCode }).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/click-links/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dmClickLinks).where(eq(dmClickLinks.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Public redirect — tracks click and redirects to original URL
  app.get("/r/:code", async (req: Request, res: Response) => {
    try {
      const [link] = await db.select().from(dmClickLinks).where(eq(dmClickLinks.shortCode, String(req.params.code)));
      if (!link) return res.status(404).send("Link not found");
      await db.update(dmClickLinks).set({ clickCount: link.clickCount + 1 }).where(eq(dmClickLinks.id, link.id));
      await db.insert(dmClickEvents).values({ linkId: link.id, ipAddress: String(req.ip || "") });
      res.redirect(link.originalUrl);
    } catch { res.status(500).send("Error"); }
  });

  // ── Funnel Events & Analytics ──────────────────────────────────────────────
  app.post("/api/dm/funnel-events", requireAuth, async (req: Request, res: Response) => {
    try {
      const [row] = await db.insert(dmFunnelEvents).values({ ...req.body, userId: (req.user as any).id }).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/dm/funnel-analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const events = await db.select().from(dmFunnelEvents).where(eq(dmFunnelEvents.userId, userId));
      const counts: Record<string, number> = {};
      for (const e of events) counts[e.eventType] = (counts[e.eventType] || 0) + 1;
      const STAGES = [
        { stage: "Trigger Fired",  key: "trigger_fired" },
        { stage: "Message Sent",   key: "message_sent" },
        { stage: "Reply Received", key: "reply_received" },
        { stage: "Tag Added",      key: "tag_added" },
        { stage: "Converted",      key: "converted" },
      ];
      const funnel = STAGES.map((s, i) => {
        const count = counts[s.key] || 0;
        const prev = i > 0 ? (counts[STAGES[i - 1].key] || 0) : count;
        const dropOff = prev > 0 ? Math.round(((prev - count) / prev) * 100) : 0;
        return { ...s, count, dropOff };
      });
      res.json({ funnel, total: events.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Conversation Notes ─────────────────────────────────────────────────────
  app.get("/api/dm/conversations/:igUserId/notes", requireAuth, async (req: Request, res: Response) => {
    try {
      const rows = await db.select().from(conversationNotes)
        .where(and(eq(conversationNotes.userId, (req.user as any).id), eq(conversationNotes.igUserId, String(req.params.igUserId))))
        .orderBy(desc(conversationNotes.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/conversations/:igUserId/notes", requireAuth, async (req: Request, res: Response) => {
    try {
      const [row] = await db.insert(conversationNotes).values({ userId: (req.user as any).id, igUserId: String(req.params.igUserId), note: req.body.note }).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/notes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(conversationNotes).where(eq(conversationNotes.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Scheduled Broadcasts ───────────────────────────────────────────────────
  app.get("/api/dm/scheduled-broadcasts", requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await db.select().from(dmScheduledBroadcasts).where(eq(dmScheduledBroadcasts.userId, (req.user as any).id)).orderBy(dmScheduledBroadcasts.scheduledAt));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dm/scheduled-broadcasts", requireAuth, async (req: Request, res: Response) => {
    try {
      const [row] = await db.insert(dmScheduledBroadcasts).values({ ...req.body, userId: (req.user as any).id, scheduledAt: new Date(req.body.scheduledAt) }).returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dm/scheduled-broadcasts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.update(dmScheduledBroadcasts).set({ status: "cancelled" }).where(eq(dmScheduledBroadcasts.id, String(req.params.id)));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Process due scheduled broadcasts (frontend polls this)
  app.post("/api/dm/scheduled-broadcasts/process", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const due = await db.select().from(dmScheduledBroadcasts)
        .where(and(eq(dmScheduledBroadcasts.userId, userId), eq(dmScheduledBroadcasts.status, "pending"), lte(dmScheduledBroadcasts.scheduledAt, new Date())));
      let processed = 0;
      for (const broadcast of due) {
        let leads = await db.select().from(dmLeads).where(eq(dmLeads.clientId, userId));
        if (broadcast.targetTag) {
          const tagged = await db.select().from(dmContactTags).where(eq(dmContactTags.tag, broadcast.targetTag));
          const ids = new Set(tagged.map(t => t.leadId));
          leads = leads.filter(l => ids.has(l.id));
        }
        if (broadcast.targetStatus) leads = leads.filter(l => l.status === broadcast.targetStatus);
        leads = leads.filter(l => !l.isOptedOut);
        let sent = 0;
        for (const lead of leads) {
          if (!lead.instagramHandle) continue;
          try { await sendInstagramDM(lead.instagramHandle, broadcast.message); sent++; } catch {}
        }
        await db.update(dmScheduledBroadcasts).set({ status: "sent", sentAt: new Date(), recipientCount: sent }).where(eq(dmScheduledBroadcasts.id, broadcast.id));
        processed++;
      }
      res.json({ processed });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── CSV Export ─────────────────────────────────────────────────────────────
  app.get("/api/dm/leads/export", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const leads = await db.select().from(dmLeads).where(eq(dmLeads.clientId, userId)).orderBy(desc(dmLeads.createdAt));
      const tags = await db.select().from(dmContactTags);
      const tagMap: Record<string, string[]> = {};
      for (const t of tags) tagMap[t.leadId] = [...(tagMap[t.leadId] || []), t.tag];
      const csv = [
        "name,instagram_handle,status,source,email,phone,lead_score,is_opted_out,tags,notes,follow_up_date,created_at",
        ...leads.map(l => [
          `"${(l.name || "").replace(/"/g, '""')}"`,
          l.instagramHandle || "",
          l.status || "",
          l.source || "",
          l.email || "",
          l.phone || "",
          l.leadScore ?? "",
          l.isOptedOut ? "true" : "false",
          `"${(tagMap[l.id] || []).join(", ")}"`,
          `"${(l.notes || "").replace(/"/g, '""')}"`,
          l.followUpDate ? new Date(l.followUpDate).toISOString().split("T")[0] : "",
          l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : "",
        ].join(",")),
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="leads-${Date.now()}.csv"`);
      res.send(csv);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Competitor Comment Scraper ─────────────────────────────────────────────
  app.post("/api/dm/competitor-scrape", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { postUrl } = req.body;
      if (!postUrl) return res.status(400).json({ message: "postUrl required" });
      const [tokenRow] = await db.select().from(metaTokens).where(eq(metaTokens.userId, userId));
      if (!tokenRow?.accessToken) return res.status(400).json({ message: "Instagram not connected — go to Settings first" });
      // Extract shortcode from URL
      const match = postUrl.match(/\/p\/([A-Za-z0-9_-]+)/);
      if (!match) return res.status(400).json({ message: "Invalid Instagram post URL" });
      const shortcode = match[1];
      // Search own media for shortcode (can only get comments on your own posts via Graph API)
      const mediaRes = await fetch(`https://graph.facebook.com/v18.0/${tokenRow.igAccountId}/media?fields=id,shortcode&access_token=${tokenRow.accessToken}&limit=100`);
      const mediaData = await mediaRes.json() as any;
      const media = (mediaData.data || []).find((m: any) => m.shortcode === shortcode);
      if (!media) return res.json({ comments: [], message: "This post isn't on your account. Meta's API only allows fetching comments from your own posts." });
      // Fetch comments
      const commentsRes = await fetch(`https://graph.facebook.com/v18.0/${media.id}/comments?fields=from,text,timestamp&access_token=${tokenRow.accessToken}&limit=100`);
      const commentsData = await commentsRes.json() as any;
      res.json({ comments: commentsData.data || [], total: commentsData.data?.length || 0 });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Variable Preview ───────────────────────────────────────────────────────
  app.post("/api/dm/preview-message", requireAuth, async (req: Request, res: Response) => {
    try {
      const { template, leadId } = req.body;
      if (!leadId) return res.json({ preview: template });
      const [lead] = await db.select().from(dmLeads).where(eq(dmLeads.id, leadId));
      if (!lead) return res.json({ preview: template });
      const fieldValues = await db.select().from(contactCustomFieldValues).where(eq(contactCustomFieldValues.leadId, leadId));
      const customFields: Record<string, string> = {};
      for (const f of fieldValues) customFields[f.fieldDefId] = f.value || "";
      res.json({ preview: interpolateMessage(template, lead, customFields) });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── AI Sentiment Analysis ──────────────────────────────────────────────────
  app.post("/api/dm/analyze-sentiment", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return res.json({ sentiment: "neutral", action: "continue" });
      const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.1-70b-versatile", max_tokens: 60, messages: [{ role: "user", content: `Classify this DM message sentiment and recommend action. Message: "${message}". Reply as JSON: {"sentiment":"positive|negative|neutral","action":"continue|escalate|ignore"}` }] }),
      });
      const aiData: any = await aiRes.json();
      const text = aiData?.choices?.[0]?.message?.content ?? "";
      let result = { sentiment: "neutral", action: "continue" };
      try { result = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}"); } catch {}
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
