import type { Express, Request, Response } from "express";
import { eq, and, desc, sql, inArray, gte, lt, count } from "drizzle-orm";
import { db, storage } from "../storage";
import {
  dialerLeads, dialerCallLogs, dialerSettings,
  dialerAiCampaigns, dialerAiCallResults,
  dialerVoicemails, dialerLocalNumbers,
  dialerSmsConversations, dialerSmsMessages,
  dialerCadences, dialerCadenceSteps, dialerCadenceEnrollments,
  dialerCallbacks, dialerGoals, dialerObjections, dialerTimelineEvents,
  webinarRegistrations, webinarEvents, webinars,
} from "@shared/schema";
import { randomUUID } from "crypto";

function uid(req: Request): string {
  return (req as any).user?.id;
}

function computePriority(score: number): string {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  if (score >= 20) return "normal";
  return "cold";
}

// ── AI Provider: start a single call ─────────────────────────────────────────

async function startVapiCall(opts: {
  apiKey: string;
  assistantId?: string;
  systemPrompt?: string;
  firstMessage?: string;
  phone: string;
  fromPhone?: string;
  leadName: string;
  webinarTitle?: string;
  behavior?: any;
  webhookUrl: string;
}): Promise<{ callId: string }> {
  const body: any = {
    phoneNumber: { twilioPhoneNumber: opts.fromPhone },
    customer: { number: opts.phone, name: opts.leadName },
    serverUrl: opts.webhookUrl,
  };

  if (opts.assistantId) {
    body.assistantId = opts.assistantId;
  } else {
    const contextParts: string[] = [];
    if (opts.webinarTitle) contextParts.push(`They attended a webinar: "${opts.webinarTitle}".`);
    if (opts.behavior?.askedQuestions && opts.behavior.questionsAsked?.[0]) {
      contextParts.push(`They asked: "${opts.behavior.questionsAsked[0]}".`);
    }
    if (opts.behavior?.clickedCta) contextParts.push("They clicked the offer CTA during the webinar.");
    if (opts.behavior?.raisedHand) contextParts.push("They raised their hand during Q&A.");

    body.assistant = {
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: opts.systemPrompt ||
            `You are a friendly sales representative. Your goal is to qualify the lead and book a meeting.
            Context about this lead: ${contextParts.join(" ") || "They expressed interest in our products."}
            Keep responses short and conversational. Ask open-ended questions. If they are interested, offer to book a meeting.
            If not interested, thank them and end politely. Do not be pushy.`,
        }],
        temperature: 0.7,
      },
      voice: { provider: "playht", voiceId: "jennifer" },
      firstMessage: opts.firstMessage ||
        `Hi, is this ${opts.leadName}? This is Alex calling from Oravini. ${contextParts[0] ? `I noticed you ${contextParts[0].toLowerCase().replace("they ", "").replace(".", "")}` : "I wanted to follow up on your interest"} — do you have a quick 2 minutes?`,
      endCallMessage: "Great talking with you! Have a wonderful day.",
      recordingEnabled: true,
    };
  }

  const res = await fetch("https://api.vapi.ai/call/phone", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vapi error ${res.status}: ${err}`);
  }
  const data: any = await res.json();
  return { callId: data.id };
}

async function startBlandCall(opts: {
  apiKey: string;
  phone: string;
  leadName: string;
  systemPrompt?: string;
  firstMessage?: string;
  voiceId?: string;
  webinarTitle?: string;
  behavior?: any;
  webhookUrl: string;
}): Promise<{ callId: string }> {
  const contextParts: string[] = [];
  if (opts.webinarTitle) contextParts.push(`attended webinar: "${opts.webinarTitle}"`);
  if (opts.behavior?.askedQuestions && opts.behavior.questionsAsked?.[0]) {
    contextParts.push(`asked: "${opts.behavior.questionsAsked[0]}"`);
  }
  if (opts.behavior?.clickedCta) contextParts.push("clicked the offer CTA");

  const body: any = {
    phone_number: opts.phone,
    task: opts.systemPrompt ||
      `You are a friendly sales rep for Oravini. Call ${opts.leadName}${contextParts.length ? ` who ${contextParts.join(", ")}` : ""}.
      Goal: qualify them and book a meeting if interested. Keep it natural, conversational, under 3 minutes.
      If they want to book: confirm day/time preference and tell them you'll send a calendar invite.
      Be respectful if not interested — just thank them and hang up.`,
    first_sentence: opts.firstMessage ||
      `Hi, is this ${opts.leadName}? This is Alex from Oravini — just following up on your webinar attendance, got a quick second?`,
    voice: opts.voiceId || "maya",
    record: true,
    wait_for_greeting: true,
    webhook: opts.webhookUrl,
    metadata: { leadName: opts.leadName },
  };

  const res = await fetch("https://api.bland.ai/v1/calls", {
    method: "POST",
    headers: { authorization: opts.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bland AI error ${res.status}: ${err}`);
  }
  const data: any = await res.json();
  return { callId: data.call_id };
}

async function startRetellCall(opts: {
  apiKey: string;
  agentId: string;
  phone: string;
  fromPhone: string;
  leadName: string;
  webinarTitle?: string;
  behavior?: any;
  webhookUrl: string;
}): Promise<{ callId: string }> {
  const contextParts: string[] = [];
  if (opts.webinarTitle) contextParts.push(opts.webinarTitle);
  if (opts.behavior?.askedQuestions && opts.behavior.questionsAsked?.[0]) {
    contextParts.push(opts.behavior.questionsAsked[0]);
  }

  const payload: any = {
    from_number: opts.fromPhone,
    to_number: opts.phone,
    agent_id: opts.agentId,
    retell_llm_dynamic_variables: {
      lead_name: opts.leadName,
      webinar_title: opts.webinarTitle || "",
      context: contextParts.join(". "),
    },
    metadata: { leadName: opts.leadName },
  };

  const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell error ${res.status}: ${err}`);
  }
  const data: any = await res.json();
  return { callId: data.call_id };
}

// ── Parse AI call result from webhook body ────────────────────────────────────

function parseVapiWebhook(body: any): {
  callId: string; status: string; outcome: string; durationSeconds: number;
  transcript: string; summary: string; sentiment: string;
  appointmentBooked: boolean; appointmentTime: string;
  hotLead: boolean; needsHumanFollowup: boolean; recordingUrl: string;
  keyPoints: string[]; objections: string[];
} {
  const msg = body.message || body;
  const endedReason = msg.endedReason || "";
  const transcript = (msg.artifact?.transcript || msg.transcript || "");
  const analysis   = msg.analysis || {};

  const transcriptLower = transcript.toLowerCase();
  const appointmentBooked = transcriptLower.includes("book") || transcriptLower.includes("schedule") || transcriptLower.includes("calendar");
  const notInterested = transcriptLower.includes("not interested") || transcriptLower.includes("no thanks") || transcriptLower.includes("remove me");
  const hotLead = transcriptLower.includes("definitely") || transcriptLower.includes("let's do it") || transcriptLower.includes("sounds good");

  const outcome = appointmentBooked ? "booked"
    : notInterested ? "not_interested"
    : endedReason === "customer-ended-call" ? "answered"
    : endedReason === "voicemail" ? "voicemail"
    : endedReason === "no-answer" ? "no_answer"
    : "answered";

  return {
    callId: msg.call?.id || body.call_id || "",
    status: "completed",
    outcome,
    durationSeconds: Math.round((msg.call?.endedAt ? new Date(msg.call.endedAt).getTime() - new Date(msg.call.startedAt).getTime() : 0) / 1000),
    transcript,
    summary: analysis.summary || msg.summary || "",
    sentiment: analysis.sentiment || (hotLead ? "positive" : notInterested ? "negative" : "neutral"),
    appointmentBooked,
    appointmentTime: "",
    hotLead,
    needsHumanFollowup: hotLead && !appointmentBooked,
    recordingUrl: msg.artifact?.recordingUrl || msg.recordingUrl || "",
    keyPoints: analysis.structuredData?.keyPoints || [],
    objections: analysis.structuredData?.objections || [],
  };
}

function parseBlandWebhook(body: any): ReturnType<typeof parseVapiWebhook> {
  const transcript = body.concatenated_transcript || body.transcript || "";
  const transcriptLower = transcript.toLowerCase();

  const appointmentBooked = transcriptLower.includes("book") || transcriptLower.includes("schedule") || transcriptLower.includes("calendar");
  const notInterested = transcriptLower.includes("not interested") || transcriptLower.includes("no thanks") || transcriptLower.includes("remove me");
  const hotLead = transcriptLower.includes("definitely") || transcriptLower.includes("let's do it") || transcriptLower.includes("sounds good");

  const outcome = appointmentBooked ? "booked"
    : notInterested ? "not_interested"
    : body.status === "voicemail" ? "voicemail"
    : body.status === "no-answer" ? "no_answer"
    : "answered";

  return {
    callId: body.call_id || "",
    status: "completed",
    outcome,
    durationSeconds: body.call_length ? Math.round(body.call_length) : 0,
    transcript,
    summary: body.summary || "",
    sentiment: hotLead ? "positive" : notInterested ? "negative" : "neutral",
    appointmentBooked,
    appointmentTime: "",
    hotLead,
    needsHumanFollowup: hotLead && !appointmentBooked,
    recordingUrl: body.recording_url || "",
    keyPoints: [],
    objections: [],
  };
}

function parseRetellWebhook(body: any): ReturnType<typeof parseVapiWebhook> {
  // Retell sends event_type: "call_ended" with a call object
  const call = body.call || body;
  const transcript = call.transcript || "";
  const transcriptLower = transcript.toLowerCase();

  const appointmentBooked = transcriptLower.includes("book") || transcriptLower.includes("schedule") || transcriptLower.includes("calendar");
  const notInterested = transcriptLower.includes("not interested") || transcriptLower.includes("no thanks") || transcriptLower.includes("remove me");
  const hotLead = transcriptLower.includes("definitely") || transcriptLower.includes("let's do it") || transcriptLower.includes("sounds good");

  const disconnReason = call.disconnection_reason || "";
  const outcome = appointmentBooked ? "booked"
    : notInterested ? "not_interested"
    : disconnReason === "voicemail_reached" ? "voicemail"
    : disconnReason === "no_answer" ? "no_answer"
    : "answered";

  const startMs = call.start_timestamp || 0;
  const endMs   = call.end_timestamp   || 0;
  const durationSeconds = startMs && endMs ? Math.round((endMs - startMs) / 1000) : 0;

  return {
    callId: call.call_id || "",
    status: "completed",
    outcome,
    durationSeconds,
    transcript,
    summary: call.call_analysis?.call_summary || "",
    sentiment: hotLead ? "positive" : notInterested ? "negative" : "neutral",
    appointmentBooked,
    appointmentTime: "",
    hotLead,
    needsHumanFollowup: hotLead && !appointmentBooked,
    recordingUrl: call.recording_url || "",
    keyPoints: [],
    objections: [],
  };
}

// ── Post-call AI analysis ─────────────────────────────────────────────────────

async function analyzeCallTranscript(opts: {
  transcript: string;
  leadName: string;
  outcome: string;
  openAiKey: string;
}): Promise<{
  hotSignals: string[];
  objections: string[];
  nextAction: string;
  updatedScore: number | null;
  summary: string;
  suggestedSms: string;
}> {
  const prompt = `Analyze this sales call transcript and extract structured insights.

Lead name: ${opts.leadName}
Call outcome: ${opts.outcome}
Transcript:
${opts.transcript.slice(0, 4000)}

Return JSON only:
{
  "hotSignals": ["buying intent phrases or positive signals from lead"],
  "objections": ["objections or concerns raised"],
  "nextAction": "one sentence recommended next step for the sales rep",
  "updatedScore": <0-100 engagement score based on this call>,
  "summary": "2-3 sentence call summary",
  "suggestedSms": "personalized follow-up SMS, 1-2 sentences, friendly, references the call"
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data: any = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function sendAutoSms(settings: any, toPhone: string, message: string): Promise<void> {
  const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone  = settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromPhone || !toPhone) return;
  const twilio = (await import("twilio")).default;
  await twilio(accountSid, authToken).messages.create({ to: toPhone, from: fromPhone, body: message });
}

async function runPostCallAnalysis(
  existing: { id: string; userId: string; leadId: string | null; leadName: string; leadPhone: string },
  parsed: ReturnType<typeof parseVapiWebhook>,
  settings: any,
): Promise<void> {
  const openAiKey = process.env.GROQ_API_KEY || (settings as any)?.openAiApiKey || process.env.OPENAI_API_KEY;
  const firstName = (existing.leadName || "").split(" ")[0] || "there";

  let analysis: Awaited<ReturnType<typeof analyzeCallTranscript>> | null = null;

  // 1. Transcript analysis
  if (openAiKey && parsed.transcript && parsed.transcript.length > 80) {
    try {
      analysis = await analyzeCallTranscript({
        transcript: parsed.transcript,
        leadName: existing.leadName,
        outcome: parsed.outcome,
        openAiKey,
      });

      await db.update(dialerAiCallResults).set({
        summary:    analysis.summary   || parsed.summary,
        keyPoints:  analysis.hotSignals.length  ? analysis.hotSignals  : parsed.keyPoints,
        objections: analysis.objections.length  ? analysis.objections  : parsed.objections,
      }).where(eq(dialerAiCallResults.id, existing.id));

      if (existing.leadId && analysis.updatedScore != null) {
        const score = Math.max(0, Math.min(100, analysis.updatedScore));
        await db.update(dialerLeads).set({
          engagementScore: score,
          priority: computePriority(score),
          updatedAt: new Date(),
        }).where(eq(dialerLeads.id, existing.leadId));
      }
    } catch (e: any) {
      console.error("[post-call-analysis] GPT failed:", e.message);
    }
  }

  // 2. Auto SMS
  if (!(settings as any)?.autoSmsEnabled) return;
  if (parsed.outcome === "not_interested") return;
  if (!existing.leadPhone) return;

  let smsText = "";
  if (parsed.outcome === "booked") {
    smsText = (settings as any)?.autoSmsBookedTemplate
      || `Hey ${firstName}! Great chatting just now. I'll send over the calendar invite shortly — looking forward to it!`;
  } else if (parsed.hotLead || parsed.outcome === "answered") {
    smsText = analysis?.suggestedSms
      || (settings as any)?.autoSmsHotLeadTemplate
      || `Hey ${firstName}, thanks for your time just now! Feel free to reply here with any questions.`;
  } else if (parsed.outcome === "no_answer" || parsed.outcome === "voicemail") {
    smsText = (settings as any)?.autoSmsNoAnswerTemplate
      || `Hey ${firstName}, I tried reaching you just now — happy to connect whenever works for you. Reply here anytime!`;
  }

  if (smsText) {
    try {
      await sendAutoSms(settings, existing.leadPhone, smsText);
    } catch (e: any) {
      console.error("[post-call-analysis] SMS failed:", e.message);
    }
  }

  // 3. Auto-enroll in SMS sequence matching this call outcome
  if (existing.leadId) {
    try {
      const matchingCadences = await db.select().from(dialerCadences)
        .where(and(
          eq(dialerCadences.userId, existing.userId),
          eq(dialerCadences.triggerOutcome, parsed.outcome),
          eq(dialerCadences.isActive, true),
        ));
      for (const cadence of matchingCadences) {
        const [firstStep] = await db.select().from(dialerCadenceSteps)
          .where(eq(dialerCadenceSteps.cadenceId, cadence.id))
          .orderBy(dialerCadenceSteps.stepOrder).limit(1);
        const nextRunAt = firstStep
          ? new Date(Date.now() + (firstStep.delayHours || 0) * 3600000)
          : null;
        await db.insert(dialerCadenceEnrollments)
          .values({ id: randomUUID(), cadenceId: cadence.id, leadId: existing.leadId!, userId: existing.userId, currentStepIndex: 0, status: "active", nextRunAt })
          .onConflictDoNothing();
      }
    } catch (e: any) {
      console.error("[post-call-analysis] auto-enroll failed:", e.message);
    }
  }
}

// ── SMS Sequence Runner ───────────────────────────────────────────────────────

async function personalizeSequenceSms(template: string, leadName: string, webinarTitle: string | null, openAiKey: string): Promise<string> {
  const firstName = leadName.split(" ")[0] || "there";
  const prompt = `Rewrite this SMS follow-up message to sound more personal and natural for ${leadName}${webinarTitle ? ` who attended a webinar about "${webinarTitle}"` : ""}. Keep it under 160 characters. Return only the SMS text, nothing else.\n\nOriginal: ${template}`;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], max_tokens: 100, temperature: 0.7 }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data: any = await res.json();
    return data.choices[0].message.content.trim();
  } catch {
    return template.replace(/{name}/g, firstName);
  }
}

async function runDueSequenceSteps(): Promise<void> {
  try {
    const now = new Date();
    const due = await db.select().from(dialerCadenceEnrollments)
      .where(and(
        eq(dialerCadenceEnrollments.status, "active"),
        sql`${dialerCadenceEnrollments.nextRunAt} <= ${now}`,
      ));

    for (const enrollment of due) {
      try {
        const steps = await db.select().from(dialerCadenceSteps)
          .where(eq(dialerCadenceSteps.cadenceId, enrollment.cadenceId))
          .orderBy(dialerCadenceSteps.stepOrder);

        const step = steps[enrollment.currentStepIndex];
        if (!step) {
          await db.update(dialerCadenceEnrollments)
            .set({ status: "completed" })
            .where(eq(dialerCadenceEnrollments.id, enrollment.id));
          continue;
        }

        if (step.action === "sms") {
          const [lead] = await db.select().from(dialerLeads).where(eq(dialerLeads.id, enrollment.leadId));
          const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, enrollment.userId));
          if (lead?.phone && step.template) {
            const openAiKey = process.env.GROQ_API_KEY || (settings as any)?.openAiApiKey || process.env.OPENAI_API_KEY;
            let message = step.template;

            if ((step as any).aiPersonalize && openAiKey) {
              message = await personalizeSequenceSms(message, lead.name, lead.sourceWebinarTitle || null, openAiKey);
            } else {
              const firstName = lead.name.split(" ")[0] || "there";
              message = message
                .replace(/{name}/g, firstName)
                .replace(/{fullName}/g, lead.name)
                .replace(/{webinar}/g, lead.sourceWebinarTitle || "our webinar");
            }

            await sendAutoSms(settings, lead.phone, message);
          }
        }

        // Advance to next step
        const nextIndex = enrollment.currentStepIndex + 1;
        const nextStep  = steps[nextIndex];
        if (nextStep) {
          await db.update(dialerCadenceEnrollments).set({
            currentStepIndex: nextIndex,
            nextRunAt: new Date(Date.now() + (nextStep.delayHours || 0) * 3600000),
          }).where(eq(dialerCadenceEnrollments.id, enrollment.id));
        } else {
          await db.update(dialerCadenceEnrollments)
            .set({ status: "completed" })
            .where(eq(dialerCadenceEnrollments.id, enrollment.id));
        }
      } catch (e: any) {
        console.error(`[sequence-runner] enrollment ${enrollment.id}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error("[sequence-runner]", e.message);
  }
}

export function startSequenceRunner(): void {
  // Fire immediately on startup, then every 60 seconds
  runDueSequenceSteps();
  setInterval(runDueSequenceSteps, 60_000);
  console.log("[sequence-runner] started");
}

export function registerDialerRoutes(app: Express, requireAuth: any) {

  // ── Settings ────────────────────────────────────────────────────────────────

  app.get("/api/dialer/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const [s] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, uid(req)));
      res.json(s ?? null);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/dialer/settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const {
        twilioAccountSid, twilioAuthToken, twilioPhoneNumber, twilioTwimlAppSid,
        defaultScript, smsTemplate, recordCalls,
        aiProvider, vapiApiKey, vapiAssistantId, blandApiKey, blandVoiceId,
        retellApiKey, retellAgentId, aiSystemPrompt,
        openAiApiKey, autoSmsEnabled,
        autoSmsBookedTemplate, autoSmsNoAnswerTemplate, autoSmsHotLeadTemplate,
        inboundAgentEnabled, inboundAgentId,
      } = req.body;
      const [existing] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const data = {
        twilioAccountSid, twilioAuthToken, twilioPhoneNumber, twilioTwimlAppSid,
        defaultScript, smsTemplate, recordCalls: !!recordCalls,
        aiProvider: aiProvider || "retell",
        vapiApiKey, vapiAssistantId, blandApiKey, blandVoiceId,
        retellApiKey, retellAgentId, aiSystemPrompt,
        openAiApiKey, autoSmsEnabled: !!autoSmsEnabled,
        autoSmsBookedTemplate, autoSmsNoAnswerTemplate, autoSmsHotLeadTemplate,
        inboundAgentEnabled: !!inboundAgentEnabled, inboundAgentId,
        updatedAt: new Date(),
      };
      if (existing) {
        const [updated] = await db.update(dialerSettings).set(data).where(eq(dialerSettings.userId, userId)).returning();
        res.json(updated);
      } else {
        const [created] = await db.insert(dialerSettings).values({ id: randomUUID(), userId, ...data }).returning();
        res.json(created);
      }
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Twilio Access Token ───────────────────────────────────────────────────────

  app.post("/api/dialer/token", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const accountSid  = settings?.twilioAccountSid  || process.env.TWILIO_ACCOUNT_SID;
      const authToken   = settings?.twilioAuthToken   || process.env.TWILIO_AUTH_TOKEN;
      const twimlAppSid = settings?.twilioTwimlAppSid || process.env.TWILIO_TWIML_APP_SID;
      if (!accountSid || !authToken || !twimlAppSid) {
        return res.status(503).json({ message: "Twilio not configured. Add credentials in Dialer Settings." });
      }
      const twilio = await import("twilio");
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant  = AccessToken.VoiceGrant;
      const voiceGrant = new VoiceGrant({ outgoingApplicationSid: twimlAppSid, incomingAllow: false });
      const token = new AccessToken(accountSid, authToken, authToken, {
        identity: `dialer_${userId}`, ttl: 3600,
      } as any);
      token.addGrant(voiceGrant);
      res.json({ token: token.toJwt() });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── TwiML Voice Webhook ───────────────────────────────────────────────────────

  app.post("/api/dialer/twiml/voice", async (req: Request, res: Response) => {
    try {
      const { To } = req.body;
      const twilio = await import("twilio");
      const twiml  = new twilio.twiml.VoiceResponse();

      // Check if caller wants recording
      const fromPhone = process.env.TWILIO_PHONE_NUMBER || "";
      if (To) {
        const dial = twiml.dial({
          callerId: fromPhone,
          record: "record-from-ringing-dual" as any,
          recordingStatusCallback: `${process.env.APP_URL || ""}/api/dialer/twiml/recording-status`,
        });
        dial.number({}, To);
      } else {
        twiml.say("Welcome to the Oravini dialer.");
      }
      res.type("text/xml").send(twiml.toString());
    } catch (err: any) {
      res.status(500).send("<Response><Say>Error</Say></Response>");
    }
  });

  app.post("/api/dialer/twiml/recording-status", async (req: Request, res: Response) => {
    try {
      const { CallSid, RecordingUrl, RecordingDuration } = req.body;
      if (CallSid && RecordingUrl) {
        await db.update(dialerCallLogs)
          .set({ recordingUrl: RecordingUrl + ".mp3", durationSeconds: parseInt(RecordingDuration) || 0 })
          .where(eq(dialerCallLogs.twilioCallSid, CallSid));
      }
      res.status(200).send("<Response/>");
    } catch { res.status(200).send("<Response/>"); }
  });

  // ── Leads ─────────────────────────────────────────────────────────────────────

  app.get("/api/dialer/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const leads = await db.select().from(dialerLeads)
        .where(eq(dialerLeads.userId, uid(req)))
        .orderBy(desc(dialerLeads.engagementScore), desc(dialerLeads.createdAt));
      res.json(leads);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { name, phone, email, company, notes, tags } = req.body;
      if (!name || !phone) return res.status(400).json({ message: "name and phone required" });
      const [lead] = await db.insert(dialerLeads)
        .values({ id: randomUUID(), userId, name, phone, email, company, notes, tags: tags || [], sourceType: "manual" })
        .returning();
      res.json(lead);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/dialer/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { status, notes, nextCallAt, priority } = req.body;
      const updateData: any = { updatedAt: new Date() };
      if (status    !== undefined) updateData.status    = status;
      if (notes     !== undefined) updateData.notes     = notes;
      if (priority  !== undefined) updateData.priority  = priority;
      if (nextCallAt !== undefined) updateData.nextCallAt = nextCallAt ? new Date(nextCallAt) : null;
      const [updated] = await db.update(dialerLeads)
        .set(updateData)
        .where(and(eq(dialerLeads.id, req.params.id), eq(dialerLeads.userId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Lead not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dialer/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dialerLeads)
        .where(and(eq(dialerLeads.id, req.params.id), eq(dialerLeads.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Import from Webinar ───────────────────────────────────────────────────────

  app.post("/api/dialer/leads/import-webinar/:webinarId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId    = uid(req);
      const webinarId = req.params.webinarId;
      const [webinar] = await db.select().from(webinars)
        .where(and(eq(webinars.id, webinarId), eq(webinars.userId, userId)));
      if (!webinar) return res.status(404).json({ message: "Webinar not found" });

      const registrations = await db.select().from(webinarRegistrations)
        .where(eq(webinarRegistrations.webinarId, webinarId));
      if (registrations.length === 0) return res.json({ imported: 0, skipped: 0, message: "No registrations found" });

      const events = await db.select().from(webinarEvents)
        .where(eq(webinarEvents.webinarId, webinarId));

      const existingLeads = await db.select({ phone: dialerLeads.phone, email: dialerLeads.email })
        .from(dialerLeads).where(eq(dialerLeads.userId, userId));
      const existingPhones = new Set(existingLeads.map(l => l.phone).filter(Boolean));
      const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));

      let imported = 0, skipped = 0;
      for (const reg of registrations) {
        if (!reg.phone && !reg.email) { skipped++; continue; }
        if (reg.phone && existingPhones.has(reg.phone)) { skipped++; continue; }
        if (!reg.phone && reg.email && existingEmails.has(reg.email)) { skipped++; continue; }

        let score = 0;
        const behavior: any = {};
        if (reg.attended) score += 20;
        if (reg.watchedDuration && reg.watchedDuration > 0) {
          score += Math.min(20, Math.floor(reg.watchedDuration / 60));
          behavior.watchedSeconds = reg.watchedDuration;
        }
        const viewerEvents = events.filter(e =>
          e.viewerName?.toLowerCase() === reg.name?.toLowerCase()
        );
        for (const e of viewerEvents) {
          if (e.eventType === "qa") {
            score += 20; behavior.askedQuestions = true;
            if (e.data) { behavior.questionsAsked = behavior.questionsAsked || []; behavior.questionsAsked.push((e.data as any)?.message); }
          }
          if (e.eventType === "raise_hand") { score += 15; behavior.raisedHand = true; }
          if (e.eventType === "reaction")   { score += 5; }
        }
        if ((reg as any).ctaClicked) { score += 25; behavior.clickedCta = true; }
        score = Math.min(100, score);

        await db.insert(dialerLeads).values({
          id: randomUUID(), userId, name: reg.name, phone: reg.phone || "", email: reg.email || null,
          sourceType: reg.attended ? "webinar_attendee" : "webinar_registrant",
          sourceWebinarId: webinarId, sourceWebinarTitle: webinar.title,
          engagementScore: score, priority: computePriority(score),
          webinarBehavior: Object.keys(behavior).length > 0 ? behavior : null, status: "pending",
        });
        if (reg.phone) existingPhones.add(reg.phone);
        if (reg.email) existingEmails.add(reg.email);
        imported++;
      }
      res.json({ imported, skipped, message: `Imported ${imported} leads from "${webinar.title}"` });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Call Logs ─────────────────────────────────────────────────────────────────

  app.get("/api/dialer/calls", requireAuth, async (req: Request, res: Response) => {
    try {
      const calls = await db.select().from(dialerCallLogs)
        .where(eq(dialerCallLogs.userId, uid(req)))
        .orderBy(desc(dialerCallLogs.startedAt))
        .limit(200);
      res.json(calls);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/calls", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { leadId, leadName, leadPhone, twilioCallSid, durationSeconds, outcome, notes, scriptUsed, endedAt } = req.body;
      if (!leadName || !leadPhone) return res.status(400).json({ message: "leadName and leadPhone required" });
      const [log] = await db.insert(dialerCallLogs).values({
        id: randomUUID(), userId, leadId: leadId || null, leadName, leadPhone,
        twilioCallSid, durationSeconds: durationSeconds || 0,
        outcome: outcome || "no_answer", notes, scriptUsed,
        endedAt: endedAt ? new Date(endedAt) : null,
      }).returning();
      if (leadId) {
        await db.update(dialerLeads).set({
          lastCallAt: new Date(), status: outcome || "called",
          callCount: sql`${dialerLeads.callCount} + 1`, updatedAt: new Date(),
        }).where(and(eq(dialerLeads.id, leadId), eq(dialerLeads.userId, userId)));
      }
      res.json(log);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── SMS ───────────────────────────────────────────────────────────────────────

  app.post("/api/dialer/sms", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { to, message, leadId } = req.body;
      if (!to || !message) return res.status(400).json({ message: "to and message required" });
      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
      const fromPhone  = settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
      if (!accountSid || !authToken || !fromPhone) return res.status(503).json({ message: "Twilio not configured" });
      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      const msg = await client.messages.create({ to, from: fromPhone, body: message });
      await db.insert(dialerCallLogs).values({
        id: randomUUID(), userId, leadId: leadId || null,
        leadName: req.body.leadName || "Unknown", leadPhone: to,
        twilioCallSid: msg.sid, durationSeconds: 0, outcome: "sms_sent",
        notes: `SMS: ${message}`,
      });
      res.json({ ok: true, sid: msg.sid });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Stats ─────────────────────────────────────────────────────────────────────

  app.get("/api/dialer/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const allLeads  = await db.select().from(dialerLeads).where(eq(dialerLeads.userId, userId));
      const todayCalls = await db.select().from(dialerCallLogs)
        .where(and(eq(dialerCallLogs.userId, userId), sql`${dialerCallLogs.startedAt} >= ${today}`));
      const todayAiCalls = await db.select().from(dialerAiCallResults)
        .where(and(eq(dialerAiCallResults.userId, userId), sql`${dialerAiCallResults.startedAt} >= ${today}`));
      const connected = todayCalls.filter(c => c.durationSeconds! > 0);
      const booked    = [...todayCalls, ...todayAiCalls].filter(c => c.outcome === "booked");
      const avgDur    = connected.length > 0
        ? Math.round(connected.reduce((s, c) => s + (c.durationSeconds || 0), 0) / connected.length)
        : 0;
      res.json({
        callsToday:        todayCalls.length + todayAiCalls.length,
        connected:         connected.length + todayAiCalls.filter(c => (c.durationSeconds ?? 0) > 0).length,
        booked:            booked.length,
        avgDurationSeconds: avgDur,
        totalLeads:        allLeads.length,
        pendingLeads:      allLeads.filter(l => l.status === "pending").length,
        hotLeads:          allLeads.filter(l => l.priority === "hot").length,
        convertedLeads:    allLeads.filter(l => l.status === "converted").length,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Analytics: Best time to call heatmap ─────────────────────────────────────

  app.get("/api/dialer/analytics/heatmap", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);

      const [manualCalls, aiCalls] = await Promise.all([
        db.select({ startedAt: dialerCallLogs.startedAt, durationSeconds: dialerCallLogs.durationSeconds, outcome: dialerCallLogs.outcome })
          .from(dialerCallLogs)
          .where(and(eq(dialerCallLogs.userId, userId), sql`${dialerCallLogs.startedAt} IS NOT NULL`)),
        db.select({ startedAt: dialerAiCallResults.startedAt, durationSeconds: dialerAiCallResults.durationSeconds, outcome: dialerAiCallResults.outcome })
          .from(dialerAiCallResults)
          .where(and(eq(dialerAiCallResults.userId, userId), sql`${dialerAiCallResults.startedAt} IS NOT NULL`)),
      ]);

      const allCalls = [...manualCalls, ...aiCalls];

      const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, total: 0, answered: 0, booked: 0 }));
      const daily  = Array.from({ length: 7  }, (_, d) => ({ dow: d,  total: 0, answered: 0, booked: 0 }));

      for (const call of allCalls) {
        if (!call.startedAt) continue;
        const d   = new Date(call.startedAt);
        const h   = d.getHours();
        const dow = d.getDay();
        hourly[h].total++;
        daily[dow].total++;
        if ((call.durationSeconds || 0) > 15) { hourly[h].answered++; daily[dow].answered++; }
        if (call.outcome === "booked") { hourly[h].booked++; daily[dow].booked++; }
      }

      const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const hourlyOut = hourly.map(h => ({
        ...h,
        label: h.hour === 0 ? "12am" : h.hour < 12 ? `${h.hour}am` : h.hour === 12 ? "12pm" : `${h.hour - 12}pm`,
        answerRate: h.total > 0 ? Math.round((h.answered / h.total) * 100) : 0,
        bookRate:   h.total > 0 ? Math.round((h.booked   / h.total) * 100) : 0,
      }));
      const dailyOut = daily.map(d => ({
        ...d,
        label: DOW_LABELS[d.dow],
        answerRate: d.total > 0 ? Math.round((d.answered / d.total) * 100) : 0,
      }));

      const bestSlots = [...hourlyOut]
        .filter(h => h.total >= 3)
        .sort((a, b) => b.answerRate - a.answerRate || b.bookRate - a.bookRate)
        .slice(0, 3);

      res.json({ hourly: hourlyOut, daily: dailyOut, bestSlots, totalCalls: allCalls.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── AI: Quota status ──────────────────────────────────────────────────────────

  app.get("/api/dialer/ai/quota", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const plan = (req as any).user?.plan || "free";
      const quota = await storage.getAiCallQuota(userId, plan);
      res.json({ ...quota, plan });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── AI: Top-up — called client-side after Whop redirect confirms purchase ────
  // Matches the same pattern as /api/auth/confirm-plan (Whop redirect-based).
  // Adds 100 bonus calls that carry over month-to-month.

  app.post("/api/dialer/ai/topup", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const plan = (req as any).user?.plan || "free";
      if (!["pro", "elite"].includes(plan)) {
        return res.status(403).json({ message: "Top-up only available on Pro or Elite plan." });
      }
      const result = await storage.addAiCallTopUp(userId, 100);
      const quota = await storage.getAiCallQuota(userId, plan);
      res.json({ ok: true, bonusAdded: 100, bonus: result.bonus, quota });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── AI: Single call ───────────────────────────────────────────────────────────

  app.post("/api/dialer/ai/call", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { leadId, campaignId } = req.body;
      if (!leadId) return res.status(400).json({ message: "leadId required" });

      const [lead] = await db.select().from(dialerLeads)
        .where(and(eq(dialerLeads.id, leadId), eq(dialerLeads.userId, userId)));
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (!lead.phone) return res.status(400).json({ message: "Lead has no phone number" });

      // ── Quota gate ────────────────────────────────────────────────────────
      const plan = (req as any).user?.plan || "free";
      const quota = await storage.checkAndIncrementAiCallQuota(userId, plan);
      if (!quota.allowed) {
        return res.status(403).json({
          message: `AI call limit reached (${quota.used}/${quota.limit} this month). Upgrade to unlock more.`,
          quotaExceeded: true, used: quota.used, limit: quota.limit,
        });
      }

      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const provider  = settings?.aiProvider || "retell";
      const appUrl    = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
      const webhookUrl = `${appUrl}/api/dialer/ai/webhook/${provider}`;

      let callId: string;
      if (provider === "retell") {
        const apiKey  = (settings as any)?.retellApiKey  || process.env.RETELL_API_KEY;
        const agentId = (settings as any)?.retellAgentId || process.env.RETELL_AGENT_ID;
        if (!apiKey)  return res.status(503).json({ message: "Retell API key not configured in Dialer Settings" });
        if (!agentId) return res.status(503).json({ message: "Retell Agent ID not configured in Dialer Settings" });
        const result = await startRetellCall({
          apiKey, agentId,
          phone: lead.phone, fromPhone: settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
          leadName: lead.name, webinarTitle: lead.sourceWebinarTitle || undefined,
          behavior: lead.webinarBehavior, webhookUrl,
        });
        callId = result.callId;
      } else if (provider === "vapi") {
        const apiKey = settings?.vapiApiKey || process.env.VAPI_API_KEY;
        if (!apiKey) return res.status(503).json({ message: "Vapi API key not configured in Dialer Settings" });
        const result = await startVapiCall({
          apiKey, assistantId: settings?.vapiAssistantId || undefined,
          systemPrompt: settings?.aiSystemPrompt || undefined,
          phone: lead.phone, fromPhone: settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
          leadName: lead.name, webinarTitle: lead.sourceWebinarTitle || undefined,
          behavior: lead.webinarBehavior, webhookUrl,
        });
        callId = result.callId;
      } else {
        const apiKey = settings?.blandApiKey || process.env.BLAND_API_KEY;
        if (!apiKey) return res.status(503).json({ message: "Bland AI API key not configured in Dialer Settings" });
        const result = await startBlandCall({
          apiKey, phone: lead.phone, leadName: lead.name,
          systemPrompt: settings?.aiSystemPrompt || undefined,
          voiceId: settings?.blandVoiceId || undefined,
          webinarTitle: lead.sourceWebinarTitle || undefined,
          behavior: lead.webinarBehavior, webhookUrl,
        });
        callId = result.callId;
      }

      // Create pending result record
      const [result] = await db.insert(dialerAiCallResults).values({
        id: randomUUID(), userId,
        campaignId: campaignId || null,
        leadId: lead.id, leadName: lead.name, leadPhone: lead.phone,
        provider, providerCallId: callId, status: "initiated",
      }).returning();

      // Update lead status
      await db.update(dialerLeads).set({
        status: "called", lastCallAt: new Date(), callCount: sql`${dialerLeads.callCount} + 1`, updatedAt: new Date(),
      }).where(eq(dialerLeads.id, leadId));

      res.json({ ok: true, callId, resultId: result.id });
    } catch (err: any) {
      console.error("[dialer/ai/call]", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ── AI: Webhook (Vapi + Bland) ────────────────────────────────────────────────

  app.post("/api/dialer/ai/webhook/:provider", async (req: Request, res: Response) => {
    try {
      const provider = req.params.provider as "vapi" | "bland" | "retell";
      const parsed = provider === "vapi" ? parseVapiWebhook(req.body)
        : provider === "retell" ? parseRetellWebhook(req.body)
        : parseBlandWebhook(req.body);

      if (!parsed.callId) return res.status(200).json({ ok: true });

      // Find existing result record
      const [existing] = await db.select().from(dialerAiCallResults)
        .where(eq(dialerAiCallResults.providerCallId, parsed.callId));

      if (existing) {
        await db.update(dialerAiCallResults).set({
          status: parsed.status,
          outcome: parsed.outcome,
          durationSeconds: parsed.durationSeconds,
          transcript: parsed.transcript,
          summary: parsed.summary,
          sentiment: parsed.sentiment,
          appointmentBooked: parsed.appointmentBooked,
          appointmentTime: parsed.appointmentTime || null,
          hotLead: parsed.hotLead,
          needsHumanFollowup: parsed.needsHumanFollowup,
          recordingUrl: parsed.recordingUrl || null,
          keyPoints: parsed.keyPoints,
          objections: parsed.objections,
          endedAt: new Date(),
        }).where(eq(dialerAiCallResults.id, existing.id));

        // Update lead status based on outcome
        if (existing.leadId) {
          const newStatus = parsed.outcome === "booked" ? "booked"
            : parsed.outcome === "not_interested" ? "not_interested"
            : parsed.outcome === "voicemail" ? "voicemail"
            : "called";
          await db.update(dialerLeads).set({ status: newStatus, updatedAt: new Date() })
            .where(eq(dialerLeads.id, existing.leadId));
        }

        // Update campaign progress if part of one
        if (existing.campaignId) {
          const updates: any = { calledCount: sql`${dialerAiCampaigns.calledCount} + 1` };
          if (parsed.durationSeconds > 0) updates.answeredCount = sql`${dialerAiCampaigns.answeredCount} + 1`;
          if (parsed.outcome === "booked") updates.bookedCount = sql`${dialerAiCampaigns.bookedCount} + 1`;
          if (parsed.outcome === "not_interested") updates.notInterestedCount = sql`${dialerAiCampaigns.notInterestedCount} + 1`;
          await db.update(dialerAiCampaigns).set(updates)
            .where(eq(dialerAiCampaigns.id, existing.campaignId));

          // Check if campaign is complete
          const [campaign] = await db.select().from(dialerAiCampaigns)
            .where(eq(dialerAiCampaigns.id, existing.campaignId));
          if (campaign && campaign.calledCount >= campaign.totalLeads) {
            await db.update(dialerAiCampaigns).set({ status: "completed", completedAt: new Date() })
              .where(eq(dialerAiCampaigns.id, campaign.id));
          }
        }

        // For inbound calls: create or update the lead record from caller phone
        if ((existing as any).direction === "inbound" && !existing.leadId && existing.leadPhone) {
          const [existingLead] = await db.select().from(dialerLeads)
            .where(and(eq(dialerLeads.userId, existing.userId), sql`${dialerLeads.phone} = ${existing.leadPhone}`))
            .limit(1);
          if (existingLead) {
            await db.update(dialerAiCallResults).set({ leadId: existingLead.id, leadName: existingLead.name })
              .where(eq(dialerAiCallResults.id, existing.id));
            await db.update(dialerLeads).set({ lastCallAt: new Date(), callCount: sql`${dialerLeads.callCount} + 1`, updatedAt: new Date() })
              .where(eq(dialerLeads.id, existingLead.id));
          } else {
            // New inbound caller — create a lead automatically
            const [newLead] = await db.insert(dialerLeads).values({
              id: randomUUID(), userId: existing.userId,
              name: `Inbound ${existing.leadPhone}`,
              phone: existing.leadPhone,
              sourceType: "inbound_call",
              status: "called", priority: "normal",
              lastCallAt: new Date(), callCount: 1,
            }).returning();
            await db.update(dialerAiCallResults).set({ leadId: newLead.id, leadName: newLead.name })
              .where(eq(dialerAiCallResults.id, existing.id));
          }
        }

        // Post-call AI analysis + auto-SMS (fire-and-forget — never block webhook)
        if (parsed.transcript) {
          db.select().from(dialerSettings).where(eq(dialerSettings.userId, existing.userId))
            .then(([settings]) => runPostCallAnalysis(existing, parsed, settings))
            .catch(e => console.error("[post-call-analysis]", e.message));
        }
      }

      res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("[dialer/ai/webhook]", err);
      res.status(200).json({ ok: true }); // always 200 for webhooks
    }
  });

  // ── AI Campaigns ──────────────────────────────────────────────────────────────

  app.get("/api/dialer/ai/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const campaigns = await db.select().from(dialerAiCampaigns)
        .where(eq(dialerAiCampaigns.userId, uid(req)))
        .orderBy(desc(dialerAiCampaigns.createdAt));
      res.json(campaigns);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/ai/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { name, systemPrompt, firstMessage, objective, sourceWebinarId, maxCallsPerHour, concurrentCalls } = req.body;
      if (!name) return res.status(400).json({ message: "name required" });
      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));

      let sourceTitle: string | undefined;
      if (sourceWebinarId) {
        const [w] = await db.select().from(webinars).where(eq(webinars.id, sourceWebinarId));
        sourceTitle = w?.title;
      }

      const [campaign] = await db.insert(dialerAiCampaigns).values({
        id: randomUUID(), userId, name,
        provider: settings?.aiProvider || "vapi",
        systemPrompt: systemPrompt || settings?.aiSystemPrompt || null,
        firstMessage: firstMessage || null,
        objective: objective || "book_meeting",
        sourceWebinarId: sourceWebinarId || null,
        sourceWebinarTitle: sourceTitle || null,
        maxCallsPerHour: maxCallsPerHour || 10,
        concurrentCalls: concurrentCalls || 1,
      }).returning();
      res.json(campaign);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Start campaign — launches AI calls for all pending leads in the queue
  app.post("/api/dialer/ai/campaigns/:id/start", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId     = uid(req);
      const campaignId = req.params.id;
      const { leadIds } = req.body; // array of lead IDs to call, or empty = all pending

      const [campaign] = await db.select().from(dialerAiCampaigns)
        .where(and(eq(dialerAiCampaigns.id, campaignId), eq(dialerAiCampaigns.userId, userId)));
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });

      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const provider   = settings?.aiProvider || "retell";
      const appUrl     = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
      const webhookUrl = `${appUrl}/api/dialer/ai/webhook/${provider}`;

      // Get leads to call
      let leads;
      if (leadIds && leadIds.length > 0) {
        leads = await db.select().from(dialerLeads)
          .where(and(eq(dialerLeads.userId, userId), inArray(dialerLeads.id, leadIds)));
      } else {
        leads = await db.select().from(dialerLeads)
          .where(and(eq(dialerLeads.userId, userId), eq(dialerLeads.status, "pending")))
          .orderBy(desc(dialerLeads.engagementScore))
          .limit(500);
      }

      if (leads.length === 0) return res.status(400).json({ message: "No pending leads to call" });

      // ── Quota gate for campaign ───────────────────────────────────────────
      const plan = (req as any).user?.plan || "free";
      const quotaCheck = await storage.getAiCallQuota(userId, plan);
      const remaining = quotaCheck.limit - quotaCheck.used;
      if (remaining <= 0) {
        return res.status(403).json({
          message: `AI call limit reached (${quotaCheck.used}/${quotaCheck.limit} this month). Upgrade to unlock more.`,
          quotaExceeded: true, used: quotaCheck.used, limit: quotaCheck.limit,
        });
      }
      // Clamp campaign to remaining quota
      const callableLeads = leads.slice(0, remaining);

      // Check API key
      const apiKey = provider === "retell"
        ? ((settings as any)?.retellApiKey || process.env.RETELL_API_KEY)
        : provider === "vapi"
        ? (settings?.vapiApiKey  || process.env.VAPI_API_KEY)
        : (settings?.blandApiKey || process.env.BLAND_API_KEY);
      const agentId = provider === "retell"
        ? ((settings as any)?.retellAgentId || process.env.RETELL_AGENT_ID)
        : undefined;
      if (!apiKey) return res.status(503).json({ message: `${provider} API key not configured` });
      if (provider === "retell" && !agentId) return res.status(503).json({ message: "Retell Agent ID not configured" });

      // Update campaign status
      await db.update(dialerAiCampaigns).set({
        status: "running", totalLeads: callableLeads.length, startedAt: new Date(), updatedAt: new Date(),
      }).where(eq(dialerAiCampaigns.id, campaignId));

      // Fire calls — first batch up to concurrentCalls limit, rest are queued server-side
      const maxConcurrent = Math.min(campaign.concurrentCalls || 1, 5);
      const firstBatch    = callableLeads.slice(0, maxConcurrent);

      const callPromises = firstBatch.map(async (lead) => {
        if (!lead.phone) return;
        try {
          let callId: string;
          if (provider === "retell") {
            const r = await startRetellCall({
              apiKey: apiKey!, agentId: agentId!,
              phone: lead.phone, fromPhone: settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
              leadName: lead.name, webinarTitle: lead.sourceWebinarTitle || campaign.sourceWebinarTitle || undefined,
              behavior: lead.webinarBehavior, webhookUrl,
            });
            callId = r.callId;
          } else if (provider === "vapi") {
            const r = await startVapiCall({
              apiKey: apiKey!, assistantId: settings?.vapiAssistantId || undefined,
              systemPrompt: campaign.systemPrompt || settings?.aiSystemPrompt || undefined,
              firstMessage: campaign.firstMessage || undefined,
              phone: lead.phone, fromPhone: settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
              leadName: lead.name, webinarTitle: lead.sourceWebinarTitle || campaign.sourceWebinarTitle || undefined,
              behavior: lead.webinarBehavior, webhookUrl,
            });
            callId = r.callId;
          } else {
            const r = await startBlandCall({
              apiKey: apiKey!, phone: lead.phone, leadName: lead.name,
              systemPrompt: campaign.systemPrompt || settings?.aiSystemPrompt || undefined,
              firstMessage: campaign.firstMessage || undefined,
              voiceId: settings?.blandVoiceId || undefined,
              webinarTitle: lead.sourceWebinarTitle || campaign.sourceWebinarTitle || undefined,
              behavior: lead.webinarBehavior, webhookUrl,
            });
            callId = r.callId;
          }
          await db.insert(dialerAiCallResults).values({
            id: randomUUID(), userId, campaignId, leadId: lead.id,
            leadName: lead.name, leadPhone: lead.phone, provider,
            providerCallId: callId, status: "initiated",
          });
          await db.update(dialerLeads).set({
            status: "called", lastCallAt: new Date(), callCount: sql`${dialerLeads.callCount} + 1`, updatedAt: new Date(),
          }).where(eq(dialerLeads.id, lead.id));
        } catch (e: any) {
          console.error(`[ai-campaign] failed to call ${lead.phone}:`, e.message);
        }
      });

      await Promise.allSettled(callPromises);

      // Queue remaining leads for background processing
      if (callableLeads.length > maxConcurrent) {
        const remaining = callableLeads.slice(maxConcurrent);
        const msPerCall = Math.max(1, Math.floor(3600000 / (campaign.maxCallsPerHour || 10)));
        remaining.forEach((lead, i) => {
          setTimeout(async () => {
            const [currentCampaign] = await db.select().from(dialerAiCampaigns)
              .where(eq(dialerAiCampaigns.id, campaignId));
            if (!currentCampaign || currentCampaign.status !== "running") return;
            if (!lead.phone) return;
            try {
              let callId: string;
              if (provider === "retell") {
                const r = await startRetellCall({
                  apiKey: apiKey!, agentId: agentId!,
                  phone: lead.phone, fromPhone: settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
                  leadName: lead.name, webinarTitle: lead.sourceWebinarTitle || campaign.sourceWebinarTitle || undefined,
                  behavior: lead.webinarBehavior, webhookUrl,
                });
                callId = r.callId;
              } else if (provider === "vapi") {
                const r = await startVapiCall({
                  apiKey: apiKey!, assistantId: settings?.vapiAssistantId || undefined,
                  systemPrompt: campaign.systemPrompt || settings?.aiSystemPrompt || undefined,
                  firstMessage: campaign.firstMessage || undefined,
                  phone: lead.phone, fromPhone: settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER || "",
                  leadName: lead.name, webinarTitle: lead.sourceWebinarTitle || campaign.sourceWebinarTitle || undefined,
                  behavior: lead.webinarBehavior, webhookUrl,
                });
                callId = r.callId;
              } else {
                const r = await startBlandCall({
                  apiKey: apiKey!, phone: lead.phone, leadName: lead.name,
                  systemPrompt: campaign.systemPrompt || settings?.aiSystemPrompt || undefined,
                  firstMessage: campaign.firstMessage || undefined,
                  voiceId: settings?.blandVoiceId || undefined,
                  webinarTitle: lead.sourceWebinarTitle || campaign.sourceWebinarTitle || undefined,
                  behavior: lead.webinarBehavior, webhookUrl,
                });
                callId = r.callId;
              }
              await db.insert(dialerAiCallResults).values({
                id: randomUUID(), userId, campaignId, leadId: lead.id,
                leadName: lead.name, leadPhone: lead.phone, provider,
                providerCallId: callId, status: "initiated",
              });
              await db.update(dialerLeads).set({
                status: "called", lastCallAt: new Date(), callCount: sql`${dialerLeads.callCount} + 1`, updatedAt: new Date(),
              }).where(eq(dialerLeads.id, lead.id));
            } catch (e: any) {
              console.error(`[ai-campaign-queue] failed to call ${lead.phone}:`, e.message);
            }
          }, (i + 1) * msPerCall);
        });
      }

      res.json({ ok: true, totalLeads: callableLeads.length, firstBatch: firstBatch.length });
    } catch (err: any) {
      console.error("[ai-campaign/start]", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/dialer/ai/campaigns/:id/stop", requireAuth, async (req: Request, res: Response) => {
    try {
      const [updated] = await db.update(dialerAiCampaigns)
        .set({ status: "stopped", updatedAt: new Date() })
        .where(and(eq(dialerAiCampaigns.id, req.params.id), eq(dialerAiCampaigns.userId, uid(req))))
        .returning();
      if (!updated) return res.status(404).json({ message: "Campaign not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dialer/ai/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dialerAiCampaigns)
        .where(and(eq(dialerAiCampaigns.id, req.params.id), eq(dialerAiCampaigns.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/dialer/ai/campaigns/:id/results", requireAuth, async (req: Request, res: Response) => {
    try {
      const results = await db.select().from(dialerAiCallResults)
        .where(and(
          eq(dialerAiCallResults.campaignId, req.params.id),
          eq(dialerAiCallResults.userId, uid(req)),
        ))
        .orderBy(desc(dialerAiCallResults.startedAt))
        .limit(500);
      res.json(results);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 1: Voicemail Drop ─────────────────────────────────────────────────

  app.get("/api/dialer/voicemails", requireAuth, async (req: Request, res: Response) => {
    try {
      const rows = await db.select().from(dialerVoicemails)
        .where(eq(dialerVoicemails.userId, uid(req)))
        .orderBy(desc(dialerVoicemails.createdAt));
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/voicemails", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, recordingUrl, durationSeconds, isDefault } = req.body;
      if (!name || !recordingUrl) return res.status(400).json({ message: "name and recordingUrl required" });
      const userId = uid(req);
      if (isDefault) {
        await db.update(dialerVoicemails).set({ isDefault: false }).where(eq(dialerVoicemails.userId, userId));
      }
      const [row] = await db.insert(dialerVoicemails)
        .values({ id: randomUUID(), userId, name, recordingUrl, durationSeconds: durationSeconds || 0, isDefault: !!isDefault })
        .returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dialer/voicemails/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dialerVoicemails)
        .where(and(eq(dialerVoicemails.id, req.params.id), eq(dialerVoicemails.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // TwiML endpoint: plays voicemail recording, then hangs up (called when AMD detects answering machine)
  app.post("/api/dialer/twiml/voicemail-drop", async (req: Request, res: Response) => {
    try {
      const { vmUrl } = req.query;
      const twilio = await import("twilio");
      const twiml  = new twilio.twiml.VoiceResponse();
      if (vmUrl) {
        twiml.play({}, vmUrl as string);
      } else {
        twiml.say("Sorry we missed you — we'll try again soon. Have a great day!");
      }
      twiml.hangup();
      res.type("text/xml").send(twiml.toString());
    } catch { res.type("text/xml").send("<Response><Hangup/></Response>"); }
  });

  // TwiML voice with AMD + voicemail drop
  app.post("/api/dialer/twiml/voice-with-vm", async (req: Request, res: Response) => {
    try {
      const { To, vmUrl } = req.body;
      const twilio = await import("twilio");
      const twiml  = new twilio.twiml.VoiceResponse();
      const appUrl = process.env.APP_URL || "";
      const vmCallback = vmUrl
        ? `${appUrl}/api/dialer/twiml/voicemail-drop?vmUrl=${encodeURIComponent(vmUrl)}`
        : `${appUrl}/api/dialer/twiml/voicemail-drop`;

      if (To) {
        const dial = twiml.dial({
          callerId: process.env.TWILIO_PHONE_NUMBER || "",
          record: "record-from-ringing-dual" as any,
          recordingStatusCallback: `${appUrl}/api/dialer/twiml/recording-status`,
          action: vmCallback, // fires when call ends without answer → machine detected
        } as any);
        dial.number({
          url: vmCallback, // AMD URL — Twilio checks this if machine answers
        } as any, To);
      } else {
        twiml.say("Welcome to Oravini.");
      }
      res.type("text/xml").send(twiml.toString());
    } catch { res.status(500).send("<Response><Say>Error</Say></Response>"); }
  });

  // ── FEATURE 2: Local Presence Numbers ────────────────────────────────────────

  app.get("/api/dialer/local-numbers", requireAuth, async (req: Request, res: Response) => {
    try {
      const rows = await db.select().from(dialerLocalNumbers)
        .where(eq(dialerLocalNumbers.userId, uid(req)))
        .orderBy(dialerLocalNumbers.areaCode);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/local-numbers", requireAuth, async (req: Request, res: Response) => {
    try {
      const { phoneNumber, areaCode, state, city } = req.body;
      if (!phoneNumber || !areaCode) return res.status(400).json({ message: "phoneNumber and areaCode required" });
      const [row] = await db.insert(dialerLocalNumbers)
        .values({ id: randomUUID(), userId: uid(req), phoneNumber, areaCode, state, city })
        .returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dialer/local-numbers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dialerLocalNumbers)
        .where(and(eq(dialerLocalNumbers.id, req.params.id), eq(dialerLocalNumbers.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Pick best local number for a target phone
  app.get("/api/dialer/local-numbers/best", requireAuth, async (req: Request, res: Response) => {
    try {
      const { targetPhone } = req.query;
      const targetArea = (targetPhone as string || "").replace(/\D/g, "").slice(1, 4);
      const numbers = await db.select().from(dialerLocalNumbers)
        .where(and(eq(dialerLocalNumbers.userId, uid(req)), eq(dialerLocalNumbers.isActive, true)));
      const exact = numbers.find(n => n.areaCode === targetArea);
      res.json({ number: exact || numbers[0] || null });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 3: Predictive Dialer (multi-dial) ──────────────────────────────────
  // Backend: launches N parallel Twilio calls. First to answer connects to browser; rest are cancelled.

  app.post("/api/dialer/predictive/start", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { leadIds, dialRatio = 3 } = req.body; // dialRatio: how many to dial simultaneously
      if (!leadIds || leadIds.length === 0) return res.status(400).json({ message: "leadIds required" });

      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
      const fromPhone  = settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
      if (!accountSid || !authToken || !fromPhone) {
        return res.status(503).json({ message: "Twilio not configured" });
      }

      const leads = await db.select().from(dialerLeads)
        .where(and(eq(dialerLeads.userId, userId), inArray(dialerLeads.id, leadIds.slice(0, dialRatio))));

      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      const appUrl = process.env.APP_URL || "";

      const callSids: string[] = [];
      for (const lead of leads) {
        if (!lead.phone) continue;
        try {
          const call = await (client.calls.create as any)({
            to: lead.phone,
            from: fromPhone,
            url: `${appUrl}/api/dialer/twiml/voice`,
            statusCallback: `${appUrl}/api/dialer/twiml/recording-status`,
            machineDetection: "Enable",
            machineDetectionUrl: `${appUrl}/api/dialer/twiml/voicemail-drop`,
          });
          callSids.push(call.sid);
          await db.insert(dialerCallLogs).values({
            id: randomUUID(), userId, leadId: lead.id, leadName: lead.name, leadPhone: lead.phone,
            twilioCallSid: call.sid, outcome: "no_answer",
          });
        } catch (e: any) {
          console.error(`[predictive] failed to dial ${lead.phone}:`, e.message);
        }
      }

      res.json({ ok: true, callSids, dialedCount: callSids.length });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 5: Inbound Call Routing ──────────────────────────────────────────

  app.post("/api/dialer/twiml/inbound", async (req: Request, res: Response) => {
    try {
      const { From } = req.body;
      const twilio = await import("twilio");
      const twiml  = new twilio.twiml.VoiceResponse();

      // Find lead by phone number
      const cleanPhone = (From || "").replace(/\s/g, "");
      const [lead] = await db.select().from(dialerLeads)
        .where(sql`${dialerLeads.phone} = ${cleanPhone}`)
        .limit(1);

      if (lead) {
        // Log inbound call event
        await db.insert(dialerTimelineEvents).values({
          id: randomUUID(), userId: lead.userId, leadId: lead.id,
          eventType: "call", title: `Inbound call from ${lead.name}`,
          occurredAt: new Date(),
        });
      }

      twiml.say("Thank you for calling. Please hold while we connect you.");
      // Connect to the browser client
      const dial = twiml.dial({ record: "record-from-ringing" as any });
      dial.client("dialer_agent"); // connects to browser SDK client named "dialer_agent"
      res.type("text/xml").send(twiml.toString());
    } catch { res.type("text/xml").send("<Response><Say>Unable to connect right now.</Say></Response>"); }
  });

  // ── Inbound AI Agent (Retell) ──────────────────────────────────────────────────
  // Point Twilio phone number's webhook to this URL to enable 24/7 AI answering.

  app.post("/api/dialer/twiml/inbound-ai", async (req: Request, res: Response) => {
    try {
      const { From, To, CallSid } = req.body;
      const cleanFrom = (From || "").replace(/\s/g, "");
      const cleanTo   = (To   || "").replace(/\s/g, "");

      // Look up user by their Twilio phone number
      const [settings] = await db.select().from(dialerSettings)
        .where(eq(dialerSettings.twilioPhoneNumber, cleanTo));

      if (!settings || !(settings as any).inboundAgentEnabled) {
        // Fallback: connect to browser client
        const twilio = await import("twilio");
        const twiml  = new twilio.twiml.VoiceResponse();
        twiml.say("Thank you for calling. Please hold.");
        const dial = twiml.dial({ record: "record-from-ringing" as any });
        dial.client("dialer_agent");
        return res.type("text/xml").send(twiml.toString());
      }

      const agentId = (settings as any).inboundAgentId || (settings as any).retellAgentId;
      const apiKey  = (settings as any).retellApiKey   || process.env.RETELL_API_KEY;

      if (!agentId || !apiKey) {
        return res.type("text/xml").send("<Response><Say>AI agent not configured. Goodbye.</Say></Response>");
      }

      // Register call with Retell
      const retellRes = await fetch("https://api.retellai.com/v2/register-call", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          audio_websocket_protocol: "twilio",
          audio_encoding: "mulaw",
          sample_rate: 8000,
          from_number: cleanFrom,
          to_number: cleanTo,
        }),
      });

      if (!retellRes.ok) {
        const err = await retellRes.text();
        console.error("[inbound-ai] Retell register failed:", err);
        return res.type("text/xml").send("<Response><Say>Unable to connect AI agent right now.</Say></Response>");
      }

      const { call_id, web_call_websocket_url } = await retellRes.json() as any;

      // Create pending result record so the webhook can find it
      const [existingLead] = await db.select().from(dialerLeads)
        .where(and(eq(dialerLeads.userId, settings.userId), sql`${dialerLeads.phone} = ${cleanFrom}`))
        .limit(1);

      await db.insert(dialerAiCallResults).values({
        id: randomUUID(),
        userId: settings.userId,
        leadId: existingLead?.id || null,
        leadName: existingLead?.name || `Inbound ${cleanFrom}`,
        leadPhone: cleanFrom,
        provider: "retell",
        providerCallId: call_id,
        status: "initiated",
        direction: "inbound",
      });

      // Return TwiML Stream to Retell
      res.type("text/xml").send(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="${web_call_websocket_url}"><Parameter name="call_id" value="${call_id}"/></Stream></Connect></Response>`
      );
    } catch (err: any) {
      console.error("[inbound-ai]", err);
      res.type("text/xml").send("<Response><Say>Error connecting. Please try again.</Say></Response>");
    }
  });

  // ── FEATURE 6: Automated Cadences ────────────────────────────────────────────

  app.get("/api/dialer/cadences", requireAuth, async (req: Request, res: Response) => {
    try {
      const cadences = await db.select().from(dialerCadences)
        .where(eq(dialerCadences.userId, uid(req)))
        .orderBy(desc(dialerCadences.createdAt));
      const result = await Promise.all(cadences.map(async (c) => ({
        ...c,
        steps: await db.select().from(dialerCadenceSteps)
          .where(eq(dialerCadenceSteps.cadenceId, c.id))
          .orderBy(dialerCadenceSteps.stepOrder),
      })));
      res.json(result);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/cadences", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, triggerOutcome, steps } = req.body;
      if (!name || !triggerOutcome) return res.status(400).json({ message: "name and triggerOutcome required" });
      const userId = uid(req);
      const [cadence] = await db.insert(dialerCadences)
        .values({ id: randomUUID(), userId, name, triggerOutcome })
        .returning();
      if (steps && Array.isArray(steps)) {
        for (let i = 0; i < steps.length; i++) {
          await db.insert(dialerCadenceSteps).values({
            id: randomUUID(), cadenceId: cadence.id,
            stepOrder: i, delayHours: steps[i].delayHours || 0,
            action: steps[i].action, template: steps[i].template || null,
            aiPersonalize: !!steps[i].aiPersonalize,
          });
        }
      }
      const stepRows = await db.select().from(dialerCadenceSteps).where(eq(dialerCadenceSteps.cadenceId, cadence.id));
      res.json({ ...cadence, steps: stepRows });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dialer/cadences/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dialerCadences)
        .where(and(eq(dialerCadences.id, req.params.id), eq(dialerCadences.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Enroll lead in cadence (triggered by call outcome)
  app.post("/api/dialer/cadences/:id/enroll", requireAuth, async (req: Request, res: Response) => {
    try {
      const { leadId } = req.body;
      if (!leadId) return res.status(400).json({ message: "leadId required" });
      const userId = uid(req);
      const [cadence] = await db.select().from(dialerCadences)
        .where(and(eq(dialerCadences.id, req.params.id), eq(dialerCadences.userId, userId)));
      if (!cadence) return res.status(404).json({ message: "Cadence not found" });

      const [firstStep] = await db.select().from(dialerCadenceSteps)
        .where(eq(dialerCadenceSteps.cadenceId, cadence.id))
        .orderBy(dialerCadenceSteps.stepOrder).limit(1);

      const nextRunAt = firstStep
        ? new Date(Date.now() + (firstStep.delayHours || 0) * 3600000)
        : null;

      const [enrollment] = await db.insert(dialerCadenceEnrollments)
        .values({ id: randomUUID(), cadenceId: cadence.id, leadId, userId, currentStepIndex: 0, status: "active", nextRunAt })
        .returning();
      res.json(enrollment);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/dialer/cadences/enrollments", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const enrollments = await db.select({
        id: dialerCadenceEnrollments.id,
        cadenceId: dialerCadenceEnrollments.cadenceId,
        leadId: dialerCadenceEnrollments.leadId,
        userId: dialerCadenceEnrollments.userId,
        currentStepIndex: dialerCadenceEnrollments.currentStepIndex,
        status: dialerCadenceEnrollments.status,
        nextRunAt: dialerCadenceEnrollments.nextRunAt,
        enrolledAt: dialerCadenceEnrollments.enrolledAt,
        leadName: dialerLeads.name,
        leadPhone: dialerLeads.phone,
        cadenceName: dialerCadences.name,
      }).from(dialerCadenceEnrollments)
        .leftJoin(dialerLeads, eq(dialerCadenceEnrollments.leadId, dialerLeads.id))
        .leftJoin(dialerCadences, eq(dialerCadenceEnrollments.cadenceId, dialerCadences.id))
        .where(eq(dialerCadenceEnrollments.userId, userId))
        .orderBy(desc(dialerCadenceEnrollments.enrolledAt))
        .limit(200);
      res.json(enrollments);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/cadences/enrollments/:id/stop", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.update(dialerCadenceEnrollments)
        .set({ status: "stopped" })
        .where(and(eq(dialerCadenceEnrollments.id, req.params.id), eq(dialerCadenceEnrollments.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 7: Scheduled Callback Reminders ────────────────────────────────────

  app.get("/api/dialer/callbacks", requireAuth, async (req: Request, res: Response) => {
    try {
      const callbacks = await db.select().from(dialerCallbacks)
        .where(eq(dialerCallbacks.userId, uid(req)))
        .orderBy(dialerCallbacks.scheduledFor);
      res.json(callbacks);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/callbacks", requireAuth, async (req: Request, res: Response) => {
    try {
      const { leadId, leadName, leadPhone, scheduledFor, notes } = req.body;
      if (!leadName || !leadPhone || !scheduledFor) return res.status(400).json({ message: "leadName, leadPhone, scheduledFor required" });
      const userId = uid(req);
      const [cb] = await db.insert(dialerCallbacks)
        .values({ id: randomUUID(), userId, leadId: leadId || null, leadName, leadPhone, scheduledFor: new Date(scheduledFor), notes })
        .returning();
      // Create timeline event
      if (leadId) {
        await db.insert(dialerTimelineEvents).values({
          id: randomUUID(), userId, leadId,
          eventType: "note", title: `Callback scheduled for ${new Date(scheduledFor).toLocaleString()}`,
          body: notes || null, occurredAt: new Date(),
        });
      }
      res.json(cb);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/dialer/callbacks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const [updated] = await db.update(dialerCallbacks)
        .set({ status })
        .where(and(eq(dialerCallbacks.id, req.params.id), eq(dialerCallbacks.userId, uid(req))))
        .returning();
      if (!updated) return res.status(404).json({ message: "Callback not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dialer/callbacks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dialerCallbacks)
        .where(and(eq(dialerCallbacks.id, req.params.id), eq(dialerCallbacks.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 8: Two-way SMS Inbox ─────────────────────────────────────────────

  app.get("/api/dialer/sms/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const convs = await db.select().from(dialerSmsConversations)
        .where(eq(dialerSmsConversations.userId, uid(req)))
        .orderBy(desc(dialerSmsConversations.lastMessageAt));
      res.json(convs);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.get("/api/dialer/sms/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const [conv] = await db.select().from(dialerSmsConversations)
        .where(and(eq(dialerSmsConversations.id, req.params.id), eq(dialerSmsConversations.userId, uid(req))));
      if (!conv) return res.status(404).json({ message: "Conversation not found" });

      const messages = await db.select().from(dialerSmsMessages)
        .where(eq(dialerSmsMessages.conversationId, conv.id))
        .orderBy(dialerSmsMessages.sentAt);

      // Mark as read
      await db.update(dialerSmsConversations)
        .set({ unreadCount: 0 })
        .where(eq(dialerSmsConversations.id, conv.id));

      res.json({ conversation: conv, messages });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/sms/conversations/:id/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "message required" });

      const [conv] = await db.select().from(dialerSmsConversations)
        .where(and(eq(dialerSmsConversations.id, req.params.id), eq(dialerSmsConversations.userId, userId)));
      if (!conv) return res.status(404).json({ message: "Conversation not found" });

      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
      const fromPhone  = settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
      if (!accountSid || !authToken || !fromPhone) return res.status(503).json({ message: "Twilio not configured" });

      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      const sent = await client.messages.create({ to: conv.leadPhone, from: fromPhone, body: message });

      const [msg] = await db.insert(dialerSmsMessages)
        .values({ id: randomUUID(), conversationId: conv.id, direction: "outbound", body: message, twilioSid: sent.sid, status: "sent" })
        .returning();

      await db.update(dialerSmsConversations)
        .set({ lastMessage: message, lastMessageAt: new Date() })
        .where(eq(dialerSmsConversations.id, conv.id));

      res.json(msg);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Twilio inbound SMS webhook
  app.post("/api/dialer/sms/inbound", async (req: Request, res: Response) => {
    try {
      const { From, To, Body, MessageSid } = req.body;
      const cleanFrom = (From || "").replace(/\s/g, "");

      // Find lead by phone to get userId
      const [lead] = await db.select().from(dialerLeads)
        .where(sql`${dialerLeads.phone} = ${cleanFrom}`)
        .limit(1);

      if (!lead) {
        res.type("text/xml").send("<Response/>");
        return;
      }

      // Get or create conversation
      let [conv] = await db.select().from(dialerSmsConversations)
        .where(and(
          eq(dialerSmsConversations.userId, lead.userId),
          eq(dialerSmsConversations.leadPhone, cleanFrom),
        )).limit(1);

      if (!conv) {
        [conv] = await db.insert(dialerSmsConversations)
          .values({ id: randomUUID(), userId: lead.userId, leadId: lead.id, leadName: lead.name, leadPhone: cleanFrom })
          .returning();
      }

      // Insert message
      await db.insert(dialerSmsMessages)
        .values({ id: randomUUID(), conversationId: conv.id, direction: "inbound", body: Body || "", twilioSid: MessageSid, status: "received" });

      // Update conversation
      await db.update(dialerSmsConversations)
        .set({ lastMessage: Body, lastMessageAt: new Date(), unreadCount: sql`${dialerSmsConversations.unreadCount} + 1` })
        .where(eq(dialerSmsConversations.id, conv.id));

      // Timeline event
      await db.insert(dialerTimelineEvents).values({
        id: randomUUID(), userId: lead.userId, leadId: lead.id,
        eventType: "sms", title: "Inbound SMS received",
        body: Body || "", occurredAt: new Date(),
      });

      // Stop active SMS sequences for this lead — they replied, human takes over
      await db.update(dialerCadenceEnrollments)
        .set({ status: "stopped" })
        .where(and(
          eq(dialerCadenceEnrollments.leadId, lead.id),
          eq(dialerCadenceEnrollments.status, "active"),
        ));

      res.type("text/xml").send("<Response/>");
    } catch (err: any) {
      console.error("[sms/inbound]", err);
      res.type("text/xml").send("<Response/>");
    }
  });

  // Send outbound SMS (also updates/creates conversation thread)
  app.post("/api/dialer/sms/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { to, message, leadId, leadName } = req.body;
      if (!to || !message) return res.status(400).json({ message: "to and message required" });

      const [settings] = await db.select().from(dialerSettings).where(eq(dialerSettings.userId, userId));
      const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
      const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
      const fromPhone  = settings?.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
      if (!accountSid || !authToken || !fromPhone) return res.status(503).json({ message: "Twilio not configured" });

      const twilio = (await import("twilio")).default;
      const client = twilio(accountSid, authToken);
      const sent = await client.messages.create({ to, from: fromPhone, body: message });

      // Upsert conversation
      let [conv] = await db.select().from(dialerSmsConversations)
        .where(and(eq(dialerSmsConversations.userId, userId), eq(dialerSmsConversations.leadPhone, to)))
        .limit(1);

      if (!conv) {
        [conv] = await db.insert(dialerSmsConversations)
          .values({ id: randomUUID(), userId, leadId: leadId || null, leadName: leadName || to, leadPhone: to })
          .returning();
      }

      await db.insert(dialerSmsMessages)
        .values({ id: randomUUID(), conversationId: conv.id, direction: "outbound", body: message, twilioSid: sent.sid, status: "sent" });

      await db.update(dialerSmsConversations)
        .set({ lastMessage: message, lastMessageAt: new Date() })
        .where(eq(dialerSmsConversations.id, conv.id));

      if (leadId) {
        await db.insert(dialerTimelineEvents).values({
          id: randomUUID(), userId, leadId,
          eventType: "sms", title: "SMS sent", body: message, occurredAt: new Date(),
        });
      }

      res.json({ ok: true, sid: sent.sid, conversationId: conv.id });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 9: Bulk Actions ───────────────────────────────────────────────────

  app.post("/api/dialer/leads/bulk", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { action, leadIds, data } = req.body;
      if (!action || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ message: "action and leadIds[] required" });
      }
      switch (action) {
        case "delete":
          await db.delete(dialerLeads)
            .where(and(eq(dialerLeads.userId, userId), inArray(dialerLeads.id, leadIds)));
          return res.json({ ok: true, affected: leadIds.length });

        case "set_status":
          if (!data?.status) return res.status(400).json({ message: "data.status required" });
          await db.update(dialerLeads)
            .set({ status: data.status, updatedAt: new Date() })
            .where(and(eq(dialerLeads.userId, userId), inArray(dialerLeads.id, leadIds)));
          return res.json({ ok: true, affected: leadIds.length });

        case "set_priority":
          if (!data?.priority) return res.status(400).json({ message: "data.priority required" });
          await db.update(dialerLeads)
            .set({ priority: data.priority, updatedAt: new Date() })
            .where(and(eq(dialerLeads.userId, userId), inArray(dialerLeads.id, leadIds)));
          return res.json({ ok: true, affected: leadIds.length });

        case "add_tags": {
          const leads = await db.select().from(dialerLeads)
            .where(and(eq(dialerLeads.userId, userId), inArray(dialerLeads.id, leadIds)));
          for (const lead of leads) {
            const existing = lead.tags || [];
            const merged   = [...new Set([...existing, ...(data.tags || [])])];
            await db.update(dialerLeads).set({ tags: merged, updatedAt: new Date() })
              .where(eq(dialerLeads.id, lead.id));
          }
          return res.json({ ok: true, affected: leads.length });
        }

        case "enroll_cadence":
          if (!data?.cadenceId) return res.status(400).json({ message: "data.cadenceId required" });
          for (const leadId of leadIds) {
            const [firstStep] = await db.select().from(dialerCadenceSteps)
              .where(eq(dialerCadenceSteps.cadenceId, data.cadenceId))
              .orderBy(dialerCadenceSteps.stepOrder).limit(1);
            await db.insert(dialerCadenceEnrollments)
              .values({
                id: randomUUID(), cadenceId: data.cadenceId, leadId, userId,
                nextRunAt: firstStep ? new Date(Date.now() + (firstStep.delayHours || 0) * 3600000) : null,
              })
              .onConflictDoNothing();
          }
          return res.json({ ok: true, affected: leadIds.length });

        default:
          return res.status(400).json({ message: `Unknown action: ${action}` });
      }
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 10: Daily Activity Goals ─────────────────────────────────────────

  app.get("/api/dialer/goals", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const [goal] = await db.select().from(dialerGoals).where(eq(dialerGoals.userId, userId));
      const today  = new Date(); today.setHours(0, 0, 0, 0);
      const todayCalls   = await db.select({ c: count() }).from(dialerCallLogs)
        .where(and(eq(dialerCallLogs.userId, userId), gte(dialerCallLogs.startedAt, today)));
      const todayBookings = await db.select({ c: count() }).from(dialerCallLogs)
        .where(and(eq(dialerCallLogs.userId, userId), gte(dialerCallLogs.startedAt, today), eq(dialerCallLogs.outcome, "booked")));
      const todaySms = await db.select({ c: count() }).from(dialerCallLogs)
        .where(and(eq(dialerCallLogs.userId, userId), gte(dialerCallLogs.startedAt, today), eq(dialerCallLogs.outcome, "sms_sent")));

      res.json({
        goals: goal ?? { dailyCallTarget: 50, dailySmsTarget: 20, dailyBookingTarget: 5, weeklyCallTarget: 250, streakDays: 0 },
        todayProgress: {
          calls: todayCalls[0]?.c ?? 0,
          bookings: todayBookings[0]?.c ?? 0,
          sms: todaySms[0]?.c ?? 0,
        },
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.put("/api/dialer/goals", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { dailyCallTarget, dailySmsTarget, dailyBookingTarget, weeklyCallTarget } = req.body;
      const [existing] = await db.select().from(dialerGoals).where(eq(dialerGoals.userId, userId));
      const data = { dailyCallTarget, dailySmsTarget, dailyBookingTarget, weeklyCallTarget, updatedAt: new Date() };
      if (existing) {
        const [updated] = await db.update(dialerGoals).set(data).where(eq(dialerGoals.userId, userId)).returning();
        return res.json(updated);
      }
      const [created] = await db.insert(dialerGoals).values({ id: randomUUID(), userId, ...data }).returning();
      res.json(created);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 11: Best Time to Call Analytics ────────────────────────────────────

  app.get("/api/dialer/analytics/best-time", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      // Group answered calls by hour-of-day and day-of-week
      const rows = await db.execute(sql`
        SELECT
          EXTRACT(HOUR FROM started_at)::integer AS hour,
          EXTRACT(DOW FROM started_at)::integer  AS dow,
          COUNT(*) AS total_calls,
          COUNT(*) FILTER (WHERE duration_seconds > 10) AS connected,
          COUNT(*) FILTER (WHERE outcome = 'booked') AS booked
        FROM dialer_call_logs
        WHERE user_id = ${userId}
        GROUP BY hour, dow
        ORDER BY connected DESC, booked DESC
      `);
      res.json(rows.rows || rows);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 12: Call Quality / Rep Dashboard ──────────────────────────────────

  app.get("/api/dialer/analytics/rep-stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { days = 30 } = req.query;
      const since = new Date(Date.now() - Number(days) * 86400000);

      const calls   = await db.select().from(dialerCallLogs)
        .where(and(eq(dialerCallLogs.userId, userId), gte(dialerCallLogs.startedAt, since)));
      const aiCalls = await db.select().from(dialerAiCallResults)
        .where(and(eq(dialerAiCallResults.userId, userId), gte(dialerAiCallResults.startedAt, since)));

      const allCalls  = calls.length + aiCalls.length;
      const connected = [...calls.filter(c => (c.durationSeconds || 0) > 10),
                         ...aiCalls.filter(c => (c.durationSeconds || 0) > 10)];
      const booked    = [...calls, ...aiCalls].filter(c => c.outcome === "booked");
      const avgDur    = connected.length
        ? Math.round(connected.reduce((s, c) => s + (c.durationSeconds || 0), 0) / connected.length)
        : 0;

      // Trend — last 7 days
      const trend: { date: string; calls: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const dayCount = calls.filter(c => c.startedAt && c.startedAt >= d && c.startedAt < next).length;
        trend.push({ date: d.toISOString().slice(0, 10), calls: dayCount });
      }

      res.json({
        totalCalls: allCalls,
        connected: connected.length,
        connectionRate: allCalls > 0 ? Math.round((connected.length / allCalls) * 100) : 0,
        booked: booked.length,
        bookingRate: connected.length > 0 ? Math.round((booked.length / connected.length) * 100) : 0,
        avgDurationSeconds: avgDur,
        aiCalls: aiCalls.length,
        trend,
      });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 13: Lead Notes Timeline ──────────────────────────────────────────

  app.get("/api/dialer/leads/:id/timeline", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const leadId = req.params.id;
      const [lead] = await db.select().from(dialerLeads)
        .where(and(eq(dialerLeads.id, leadId), eq(dialerLeads.userId, userId)));
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const [events, callLogs, aiResults, callbacks] = await Promise.all([
        db.select().from(dialerTimelineEvents)
          .where(and(eq(dialerTimelineEvents.leadId, leadId), eq(dialerTimelineEvents.userId, userId)))
          .orderBy(desc(dialerTimelineEvents.occurredAt)),
        db.select().from(dialerCallLogs)
          .where(and(eq(dialerCallLogs.leadId, leadId), eq(dialerCallLogs.userId, userId)))
          .orderBy(desc(dialerCallLogs.startedAt)).limit(50),
        db.select().from(dialerAiCallResults)
          .where(and(eq(dialerAiCallResults.leadId, leadId), eq(dialerAiCallResults.userId, userId)))
          .orderBy(desc(dialerAiCallResults.startedAt)).limit(50),
        db.select().from(dialerCallbacks)
          .where(and(eq(dialerCallbacks.leadId, leadId), eq(dialerCallbacks.userId, userId)))
          .orderBy(desc(dialerCallbacks.scheduledFor)),
      ]);

      res.json({ lead, events, callLogs, aiResults, callbacks });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/leads/:id/notes", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const leadId = req.params.id;
      const { note } = req.body;
      if (!note) return res.status(400).json({ message: "note required" });

      const [lead] = await db.select().from(dialerLeads)
        .where(and(eq(dialerLeads.id, leadId), eq(dialerLeads.userId, userId)));
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      // Update lead notes + create timeline event
      await db.update(dialerLeads).set({ notes: note, updatedAt: new Date() }).where(eq(dialerLeads.id, leadId));
      const [event] = await db.insert(dialerTimelineEvents)
        .values({ id: randomUUID(), userId, leadId, eventType: "note", title: "Note added", body: note, occurredAt: new Date() })
        .returning();
      res.json(event);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 14: Contact Enrichment ────────────────────────────────────────────

  app.post("/api/dialer/leads/:id/enrich", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const [lead] = await db.select().from(dialerLeads)
        .where(and(eq(dialerLeads.id, req.params.id), eq(dialerLeads.userId, userId)));
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const clearbitKey = process.env.CLEARBIT_API_KEY;
      const apolloKey   = process.env.APOLLO_API_KEY;

      let enriched: any = {};

      if (clearbitKey && lead.email) {
        try {
          const r = await fetch(`https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(lead.email)}`, {
            headers: { Authorization: `Bearer ${clearbitKey}` },
          });
          if (r.ok) {
            const data: any = await r.json();
            enriched = {
              company: data.company?.name,
              title:   data.person?.employment?.title,
              linkedinUrl: data.person?.linkedin?.handle ? `https://linkedin.com/in/${data.person.linkedin.handle}` : undefined,
              location: data.person?.geo?.city ? `${data.person.geo.city}, ${data.person.geo.country}` : undefined,
            };
          }
        } catch {}
      }

      if (apolloKey && lead.email && !enriched.company) {
        try {
          const r = await fetch("https://api.apollo.io/api/v1/people/match", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apolloKey },
            body: JSON.stringify({ email: lead.email }),
          });
          if (r.ok) {
            const data: any = await r.json();
            const person = data.person;
            if (person) {
              enriched = {
                company: person.organization?.name,
                title:   person.title,
                linkedinUrl: person.linkedin_url,
                location: person.city ? `${person.city}, ${person.country}` : undefined,
              };
            }
          }
        } catch {}
      }

      if (Object.keys(enriched).length === 0) {
        return res.json({ ok: false, message: "No enrichment data found (configure CLEARBIT_API_KEY or APOLLO_API_KEY in .env)" });
      }

      const updateData: any = { updatedAt: new Date() };
      if (enriched.company) updateData.company = enriched.company;
      if (enriched.title || enriched.linkedinUrl || enriched.location) {
        updateData.notes = [lead.notes, `Title: ${enriched.title}`, `Company: ${enriched.company}`, `LinkedIn: ${enriched.linkedinUrl}`, `Location: ${enriched.location}`].filter(Boolean).join("\n");
      }

      await db.update(dialerLeads).set(updateData).where(eq(dialerLeads.id, lead.id));

      await db.insert(dialerTimelineEvents).values({
        id: randomUUID(), userId, leadId: lead.id,
        eventType: "note", title: "Contact enriched",
        body: JSON.stringify(enriched), metadata: enriched, occurredAt: new Date(),
      });

      res.json({ ok: true, enriched });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── FEATURE 15: Objection Library ────────────────────────────────────────────

  app.get("/api/dialer/objections", requireAuth, async (req: Request, res: Response) => {
    try {
      const objections = await db.select().from(dialerObjections)
        .where(eq(dialerObjections.userId, uid(req)))
        .orderBy(desc(dialerObjections.occurrenceCount));
      res.json(objections);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.post("/api/dialer/objections", requireAuth, async (req: Request, res: Response) => {
    try {
      const { objection, response, category } = req.body;
      if (!objection) return res.status(400).json({ message: "objection required" });
      const userId = uid(req);

      // Check if same objection already exists (fuzzy match by exact text for now)
      const [existing] = await db.select().from(dialerObjections)
        .where(and(eq(dialerObjections.userId, userId), sql`lower(${dialerObjections.objection}) = lower(${objection})`))
        .limit(1);

      if (existing) {
        const [updated] = await db.update(dialerObjections)
          .set({ occurrenceCount: sql`${dialerObjections.occurrenceCount} + 1`, response: response || existing.response, updatedAt: new Date() })
          .where(eq(dialerObjections.id, existing.id))
          .returning();
        return res.json(updated);
      }

      const [row] = await db.insert(dialerObjections)
        .values({ id: randomUUID(), userId, objection, response: response || null, category: category || "other" })
        .returning();
      res.json(row);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.patch("/api/dialer/objections/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { response, category } = req.body;
      const [updated] = await db.update(dialerObjections)
        .set({ response, category, updatedAt: new Date() })
        .where(and(eq(dialerObjections.id, req.params.id), eq(dialerObjections.userId, uid(req))))
        .returning();
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  app.delete("/api/dialer/objections/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await db.delete(dialerObjections)
        .where(and(eq(dialerObjections.id, req.params.id), eq(dialerObjections.userId, uid(req))));
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // Mine objections from AI call transcripts
  app.post("/api/dialer/objections/mine-from-transcripts", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const results = await db.select().from(dialerAiCallResults)
        .where(and(eq(dialerAiCallResults.userId, userId), sql`${dialerAiCallResults.objections} IS NOT NULL`));

      let mined = 0;
      for (const r of results) {
        const objList = (r.objections as string[]) || [];
        for (const objText of objList) {
          if (!objText) continue;
          const [existing] = await db.select().from(dialerObjections)
            .where(and(eq(dialerObjections.userId, userId), sql`lower(${dialerObjections.objection}) = lower(${objText})`))
            .limit(1);
          if (existing) {
            await db.update(dialerObjections)
              .set({ occurrenceCount: sql`${dialerObjections.occurrenceCount} + 1`, updatedAt: new Date() })
              .where(eq(dialerObjections.id, existing.id));
          } else {
            await db.insert(dialerObjections)
              .values({ id: randomUUID(), userId, objection: objText, category: "other" });
            mined++;
          }
        }
      }
      res.json({ ok: true, mined });
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Enhanced call log: auto-enroll cadence + timeline event on outcome ─────────

  app.post("/api/dialer/calls/log-with-outcome", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = uid(req);
      const { leadId, leadName, leadPhone, twilioCallSid, durationSeconds, outcome, notes, scriptUsed } = req.body;
      if (!leadName || !leadPhone) return res.status(400).json({ message: "leadName and leadPhone required" });

      const [log] = await db.insert(dialerCallLogs).values({
        id: randomUUID(), userId, leadId: leadId || null, leadName, leadPhone,
        twilioCallSid, durationSeconds: durationSeconds || 0,
        outcome: outcome || "no_answer", notes, scriptUsed, endedAt: new Date(),
      }).returning();

      if (leadId) {
        // Update lead
        await db.update(dialerLeads).set({
          lastCallAt: new Date(), status: outcome || "called",
          callCount: sql`${dialerLeads.callCount} + 1`, updatedAt: new Date(),
        }).where(and(eq(dialerLeads.id, leadId), eq(dialerLeads.userId, userId)));

        // Timeline event
        await db.insert(dialerTimelineEvents).values({
          id: randomUUID(), userId, leadId,
          eventType: "call",
          title: `Call — ${outcome || "no_answer"} (${durationSeconds || 0}s)`,
          body: notes || null,
          occurredAt: new Date(),
        });

        // Auto-enroll in cadence if one matches this outcome
        const [matchingCadence] = await db.select().from(dialerCadences)
          .where(and(
            eq(dialerCadences.userId, userId),
            eq(dialerCadences.triggerOutcome, outcome || "no_answer"),
            eq(dialerCadences.isActive, true),
          )).limit(1);

        if (matchingCadence) {
          const [firstStep] = await db.select().from(dialerCadenceSteps)
            .where(eq(dialerCadenceSteps.cadenceId, matchingCadence.id))
            .orderBy(dialerCadenceSteps.stepOrder).limit(1);
          await db.insert(dialerCadenceEnrollments)
            .values({
              id: randomUUID(), cadenceId: matchingCadence.id, leadId, userId,
              nextRunAt: firstStep ? new Date(Date.now() + (firstStep.delayHours || 0) * 3600000) : null,
            })
            .onConflictDoNothing();
        }
      }

      res.json(log);
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
}
