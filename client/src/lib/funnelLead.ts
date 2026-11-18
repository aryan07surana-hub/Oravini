/**
 * Funnel step opt-in. Posts to the same /api/f/:slug/:stepSlug/lead endpoint as every
 * other funnel step's form, so the server-side capture (funnel_contacts, step conversions,
 * lead_captured automations, CRM sync) is identical for all step types.
 */
export type FunnelLeadInput = { name: string; email: string; phone?: string };
export type FunnelLeadResult = { ok: boolean; nextSlug: string | null; funnelSlug: string };

export async function submitFunnelLead(funnelSlug: string, stepSlug: string, input: FunnelLeadInput): Promise<FunnelLeadResult> {
  const r = await fetch(`/api/f/${encodeURIComponent(funnelSlug)}/${encodeURIComponent(stepSlug)}/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data as FunnelLeadResult;
}
