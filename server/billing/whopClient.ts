// Minimal Whop API v1 client pinned to the authoritative 2026-11-20 contract.
// Uses the server's own key and a whitelisted environment base; injected fetch
// for tests. No catalog writes: only creates per-purchase checkout configurations
// for EXISTING one-time variants listed in the finalized catalog, and reads payments.
import { WHOP_API_BASES, type WhopEnvironment } from "./config";

const API_VERSION_DATE = "2026-11-20";

export class WhopApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export interface WhopClient {
  getPayment(paymentId: string): Promise<unknown>;
  createCheckout(input: { accountId: string; whopPlanId: string; checkoutId: string; catalogVersion: string; redirectUrl: string | null }): Promise<{ id: string; purchaseUrl: string }>;
}

export function createWhopClient(apiKey: string, environment: WhopEnvironment = "production", fetchImpl: typeof fetch = fetch): WhopClient {
  const apiBase = WHOP_API_BASES[environment];
  if (!apiBase) throw new Error("invalid-whop-environment");
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetchImpl(`${apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Api-Version-Date": API_VERSION_DATE,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new WhopApiError(res.status, `Whop API ${res.status}`);
    return res.json();
  };
  return {
    getPayment: (id) => call(`/payments/${encodeURIComponent(id)}`),
    async createCheckout({ accountId, whopPlanId, checkoutId, catalogVersion, redirectUrl }) {
      // account_id + an EXISTING variant_id only: never send an inline `variant`,
      // which would create catalog records and break the server-owned price binding.
      const body: any = {
        account_id: accountId,
        variant_id: whopPlanId,
        metadata: { oravini_checkout_id: checkoutId, oravini_catalog_version: catalogVersion },
      };
      if (redirectUrl) body.redirect_url = redirectUrl;
      // The server checkout UUID is the idempotency key: a retry cannot create a
      // second Whop checkout configuration for the same purchase.
      const r: any = await call("/checkout_configurations", {
        method: "POST",
        headers: { "Idempotency-Key": checkoutId },
        body: JSON.stringify(body),
      });
      const url = r?.purchase_url;
      if (typeof r?.id !== "string" || typeof url !== "string" || !/^https:\/\/([a-z0-9-]+\.)*whop\.com\//i.test(url)) {
        throw new WhopApiError(502, "Unexpected Whop checkout response");
      }
      return { id: r.id, purchaseUrl: url };
    },
  };
}
