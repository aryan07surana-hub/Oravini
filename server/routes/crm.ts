import type { Express, Request, Response } from "express";

/**
 * Oravini CRM ⇄ GoHighLevel bridge
 *
 * Exposes a public lead-capture endpoint that the Brandverse landing page
 * (and any other public surface) can post to. The endpoint forwards the
 * lead into GoHighLevel using an API key stored in env.
 *
 * Required env vars:
 *   GHL_API_KEY      — GoHighLevel Private Integration / Location API key
 *   GHL_LOCATION_ID  — (optional) Sub-account / location ID for v2 API
 *   GHL_PIPELINE_ID  — (optional) Pipeline to drop new leads into
 *   GHL_STAGE_ID     — (optional) Stage within that pipeline
 */

type LeadPayload = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
  notes?: string;
  // Anything else the form sends — passed through as customFields
  [k: string]: any;
};

function splitName(full?: string): { firstName: string; lastName: string } {
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ") || "",
  };
}

async function pushLeadToGHL(lead: LeadPayload): Promise<{ ok: boolean; status: number; ghl?: any; error?: string }> {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 503, error: "GHL_API_KEY not configured" };
  }

  // GoHighLevel API v1 (location-scoped key) supports POST /v1/contacts/
  // v2 uses /contacts/ with Version + locationId. We support both.
  const useV2 = !!process.env.GHL_LOCATION_ID;
  const url = useV2
    ? "https://services.leadconnectorhq.com/contacts/"
    : "https://rest.gohighlevel.com/v1/contacts/";

  const { firstName: fn, lastName: ln } = splitName(lead.name);
  const firstName = lead.firstName || fn;
  const lastName = lead.lastName || ln;

  const body: Record<string, any> = {
    firstName,
    lastName,
    email: lead.email,
    phone: lead.phone,
    source: lead.source || "Brandverse Landing Page",
    tags: lead.tags && lead.tags.length ? lead.tags : ["brandverse-lead"],
  };

  if (useV2) body.locationId = process.env.GHL_LOCATION_ID;

  // Pass any extra form fields through as customField blob (best effort)
  const reserved = new Set([
    "name", "firstName", "lastName", "email", "phone",
    "source", "tags", "notes", "locationId",
  ]);
  const extras = Object.entries(lead).filter(([k, v]) => !reserved.has(k) && v != null && v !== "");
  if (extras.length) {
    body.customField = Object.fromEntries(extras);
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (useV2) {
      headers["Version"] = "2021-07-28";
      headers["Accept"] = "application/json";
    }

    const r = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await r.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    if (!r.ok) {
      return { ok: false, status: r.status, error: parsed?.message || text || "GHL request failed", ghl: parsed };
    }

    // Optionally drop into a pipeline/stage as an opportunity
    const pipelineId = process.env.GHL_PIPELINE_ID;
    const stageId = process.env.GHL_STAGE_ID;
    const contactId = parsed?.contact?.id || parsed?.id;
    if (pipelineId && stageId && contactId) {
      const oppUrl = useV2
        ? "https://services.leadconnectorhq.com/opportunities/"
        : `https://rest.gohighlevel.com/v1/pipelines/${pipelineId}/opportunities/`;
      const oppBody: Record<string, any> = useV2
        ? {
            locationId: process.env.GHL_LOCATION_ID,
            pipelineId,
            pipelineStageId: stageId,
            contactId,
            name: `${firstName} ${lastName}`.trim() || lead.email || "New Brandverse Lead",
            status: "open",
          }
        : {
            title: `${firstName} ${lastName}`.trim() || lead.email || "New Brandverse Lead",
            stageId,
            status: "open",
            contactId,
          };
      try {
        await fetch(oppUrl, { method: "POST", headers, body: JSON.stringify(oppBody) });
      } catch {
        // Non-fatal — contact is created either way
      }
    }

    return { ok: true, status: r.status, ghl: parsed };
  } catch (err: any) {
    return { ok: false, status: 502, error: err?.message || "Network error reaching GoHighLevel" };
  }
}

export function registerCrmRoutes(app: Express) {
  // Public — landing page lead capture
  app.post("/api/crm/lead", async (req: Request, res: Response) => {
    try {
      const lead = (req.body || {}) as LeadPayload;
      if (!lead.email && !lead.phone) {
        return res.status(400).json({ ok: false, message: "Email or phone is required" });
      }
      const result = await pushLeadToGHL(lead);
      if (!result.ok) {
        // Don't bubble GHL secrets up; log server-side and return a clean error
        console.error("[CRM] Failed to push lead to GHL:", result.status, result.error);
        return res.status(result.status === 503 ? 503 : 502).json({
          ok: false,
          message: result.status === 503
            ? "CRM is not configured yet. Set GHL_API_KEY in env."
            : "Could not sync lead to CRM right now.",
        });
      }
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[CRM] Unexpected error in /api/crm/lead:", err);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  });

  // Health check — does NOT leak the key, just whether it's set
  app.get("/api/crm/status", (_req: Request, res: Response) => {
    res.json({
      configured: !!process.env.GHL_API_KEY,
      mode: process.env.GHL_LOCATION_ID ? "v2" : "v1",
      pipeline: !!process.env.GHL_PIPELINE_ID,
      stage: !!process.env.GHL_STAGE_ID,
    });
  });
}
