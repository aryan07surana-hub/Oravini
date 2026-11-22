// Whop webhook signature verification (Standard Webhooks scheme: headers
// webhook-id / webhook-timestamp / webhook-signature = "v1,<base64 HMAC-SHA256>"
// over `${id}.${timestamp}.${rawBody}`). Whop HMACs with the literal UTF-8 bytes
// of the issued secret, prefix included — the official @whop/sdk helper only
// base64-encodes the secret to cancel standardwebhooks' own base64 decode. Never
// strip a prefix or base64-decode the secret: the base64 is the signature value.
import { createHmac, timingSafeEqual } from "crypto";

export const WEBHOOK_TOLERANCE_SECONDS = 300;

function keyBytes(secret: string): Buffer {
  return Buffer.from(secret, "utf8");
}

export type WebhookCheck = { ok: true; id: string } | { ok: false; reason: "missing-headers" | "stale-timestamp" | "bad-signature" | "missing-secret" | "missing-body" };

export function verifyWhopWebhook(
  secret: string | null, headers: Record<string, string | string[] | undefined>, rawBody: Buffer | string | undefined, nowMs = Date.now(),
): WebhookCheck {
  if (!secret) return { ok: false, reason: "missing-secret" };
  if (rawBody === undefined || rawBody === null) return { ok: false, reason: "missing-body" };
  const h = (n: string) => { const v = headers[n]; return Array.isArray(v) ? v[0] : v; };
  const id = h("webhook-id"), ts = h("webhook-timestamp"), sig = h("webhook-signature");
  if (!id || !ts || !sig || !/^\d{1,12}$/.test(ts)) return { ok: false, reason: "missing-headers" };
  if (Math.abs(nowMs / 1000 - Number(ts)) > WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: "stale-timestamp" };
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = createHmac("sha256", keyBytes(secret)).update(`${id}.${ts}.${body}`).digest();
  for (const part of sig.split(" ")) {
    const [ver, b64] = part.split(",");
    if (ver !== "v1" || !b64) continue;
    const given = Buffer.from(b64, "base64");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return { ok: true, id };
  }
  return { ok: false, reason: "bad-signature" };
}

export function signWhopWebhookForTest(secret: string, id: string, ts: number, body: string): string {
  return `v1,${createHmac("sha256", keyBytes(secret)).update(`${id}.${ts}.${body}`).digest("base64")}`;
}
