// Run with: npm test
// BYOK WhatsApp: fail-closed encryption, owner isolation, token never returned, opt-in + cost gates.
// No network: `fetch` is a fake that records calls. Tokens are dummy strings, never real credentials.
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "crypto";
import {
  createWhatsappService, normalizeWhatsappNumber, ENCRYPTION_UNAVAILABLE_MESSAGE, COST_ACK_MESSAGE,
  type WhatsappRepo, type SettingsRow, type RegistrationForSend,
} from "../server/whatsappByok";
import {
  encryptToken, encryptTokenStrict, decryptTokenStrict, isTokenEncryptionConfigured, TokenEncryptionUnavailableError,
} from "../server/security/tokenEncryption";

const TOKEN_A = "DUMMY-token-for-owner-A-not-real-aaaa1111";
const TOKEN_B = "DUMMY-token-for-owner-B-not-real-bbbb2222";

function memoryRepo() {
  const settings = new Map<string, SettingsRow>();
  const phones = new Map<string, string | null>();
  const regs = new Map<string, RegistrationForSend>();
  let upserts = 0;
  const repo: WhatsappRepo = {
    async getSettings(u) { const s = settings.get(u); return s ? { ...s } : null; },
    async upsertSettings(u, v) {
      upserts++;
      const prev = settings.get(u);
      settings.set(u, {
        phone_number_id: v.phoneNumberId, access_token_encrypted: v.accessTokenEncrypted, display_number: v.displayNumber,
        template_name: v.templateName, enabled: v.enabled,
        cost_acknowledged_at: prev?.cost_acknowledged_at ?? (v.costAcknowledged ? new Date() : null),
      });
    },
    async getUserPhone(u) { return phones.get(u) ?? null; },
    async getRegistrationForSend(id) { return regs.get(id) ?? null; },
  };
  return { repo, settings, phones, regs, upserts: () => upserts };
}

type Call = { url: string; auth: string; body: any };
function fakeFetch(respond: (c: Call) => { status: number; body: any } = () => ({ status: 200, body: { messages: [{ id: "wamid.TEST" }] } })) {
  const calls: Call[] = [];
  const fn = (async (url: any, init: any) => {
    const c = { url: String(url), auth: String(init?.headers?.Authorization ?? ""), body: JSON.parse(init?.body ?? "{}") };
    calls.push(c);
    const r = respond(c);
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { fn, calls };
}

function setup(respond?: Parameters<typeof fakeFetch>[0]) {
  const mem = memoryRepo();
  const f = fakeFetch(respond);
  const logs: string[] = [];
  const svc = createWhatsappService({
    repo: mem.repo, fetch: f.fn, encrypt: encryptTokenStrict, decrypt: decryptTokenStrict,
    encryptionReady: isTokenEncryptionConfigured, log: (m) => logs.push(m),
  });
  return { svc, mem, calls: f.calls, logs };
}

const savedEnv = process.env.TOKEN_ENCRYPTION_KEY;
const validKey = () => { process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex"); };
afterEach(() => { if (savedEnv === undefined) delete process.env.TOKEN_ENCRYPTION_KEY; else process.env.TOKEN_ENCRYPTION_KEY = savedEnv; });

const base = { phoneNumberId: "106540352242922", templateName: "hello_world" };

describe("fail-closed token encryption", () => {
  for (const [label, key] of [
    ["missing", undefined],
    ["too short (63 hex)", "a".repeat(63)],
    ["64 chars but not hex", "z".repeat(64)],
  ] as const) {
    test(`rejects saving when TOKEN_ENCRYPTION_KEY is ${label}, and stores nothing`, async () => {
      if (key === undefined) delete process.env.TOKEN_ENCRYPTION_KEY; else process.env.TOKEN_ENCRYPTION_KEY = key;
      const { svc, mem } = setup();
      const r = await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: false });
      assert.equal(r.status, 503);
      assert.equal(r.body.message, ENCRYPTION_UNAVAILABLE_MESSAGE);
      assert.equal(mem.upserts(), 0);
      assert.equal(mem.settings.size, 0);
      assert.ok(!JSON.stringify(r.body).includes(TOKEN_A));
      assert.throws(() => encryptTokenStrict(TOKEN_A), TokenEncryptionUnavailableError);
    });
  }

  test("legacy encryptToken behaviour is unchanged for existing integrations (plaintext fallback without key)", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    assert.equal(encryptToken("legacy-value"), "legacy-value");
  });

  test("saves only the encrypted form with a valid key; it decrypts back", async () => {
    validKey();
    const { svc, mem } = setup();
    const r = await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: false });
    assert.equal(r.status, 200);
    const stored = mem.settings.get("A")!.access_token_encrypted!;
    assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/);
    assert.notEqual(stored, TOKEN_A);
    assert.ok(!stored.includes(TOKEN_A));
    assert.equal(decryptTokenStrict(stored), TOKEN_A);
    assert.equal(r.body.configured, true);
    assert.equal(r.body.enabled, false);
  });

  test("keeps the stored token when accessToken is omitted on update", async () => {
    validKey();
    const { svc, mem } = setup();
    await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: false });
    const before = mem.settings.get("A")!.access_token_encrypted;
    const r = await svc.save("A", { ...base, displayNumber: "+91 90000 00000", enabled: false });
    assert.equal(r.status, 200);
    assert.equal(mem.settings.get("A")!.access_token_encrypted, before);
  });

  test("a plaintext (unencrypted) stored token is never used or reported as configured", async () => {
    validKey();
    const { svc, mem, calls } = setup();
    mem.settings.set("A", { ...{ phone_number_id: base.phoneNumberId, display_number: null, template_name: "hello_world" }, access_token_encrypted: TOKEN_A, enabled: true, cost_acknowledged_at: new Date() });
    mem.phones.set("A", "9876543210");
    mem.regs.set("r1", { ownerUserId: "A", phone: "9876543210", whatsappOptIn: true });
    assert.equal((await svc.getView("A")).body.configured, false);
    assert.equal((await svc.sendTest("A")).status, 400);
    assert.deepEqual(await svc.sendForRegistration("r1", "reminder_1h"), { sent: false, reason: "not_configured" });
    assert.equal(calls.length, 0);
  });
});

describe("token is never returned", () => {
  test("GET / PUT / test responses and failure logs never contain the token", async () => {
    validKey();
    const { svc, mem, logs } = setup(() => ({ status: 401, body: { error: { message: "Invalid OAuth access token - Cannot parse access token" } } }));
    mem.phones.set("A", "9876543210");
    const bodies = [
      (await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: false })).body,
      (await svc.getView("A")).body,
      (await svc.sendTest("A")).body,
    ];
    for (const b of bodies) {
      const s = JSON.stringify(b);
      assert.ok(!s.includes(TOKEN_A), "response leaked token");
      assert.ok(!s.includes(mem.settings.get("A")!.access_token_encrypted!), "response leaked ciphertext");
    }
    assert.equal(bodies[1].tokenLast4, TOKEN_A.slice(-4));
    assert.ok(logs.length > 0 && logs.every((l) => !l.includes(TOKEN_A)));
  });

  test("Meta's error message is surfaced verbatim; a Meta 401 becomes HTTP 400", async () => {
    validKey();
    const { svc, mem } = setup(() => ({ status: 401, body: { error: { message: "Invalid OAuth access token - Cannot parse access token" } } }));
    mem.phones.set("A", "+91 98765 43210");
    await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: false });
    const r = await svc.sendTest("A");
    assert.equal(r.status, 400);
    assert.equal(r.body.metaStatus, 401);
    assert.equal(r.body.message, "Invalid OAuth access token - Cannot parse access token");
  });
});

describe("owner isolation", () => {
  test("each account only sees and uses its own credentials", async () => {
    validKey();
    const { svc, mem, calls } = setup();
    await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: true, costAcknowledged: true });
    // B has nothing configured
    const vb = await svc.getView("B");
    assert.equal(vb.body.configured, false);
    assert.equal(vb.body.tokenLast4, undefined);
    mem.phones.set("B", "9000000000");
    assert.equal((await svc.sendTest("B")).status, 400);
    // B's opted-in registrant must not be sent with A's credentials
    mem.regs.set("regB", { ownerUserId: "B", phone: "9111111111", whatsappOptIn: true });
    assert.deepEqual(await svc.sendForRegistration("regB", "confirmation"), { sent: false, reason: "disabled" });
    assert.equal(calls.length, 0);
    // B configures its own; A's registrant uses A's token + phone ID, B's uses B's
    await svc.save("B", { phoneNumberId: "222222222222", accessToken: TOKEN_B, enabled: true, costAcknowledged: true });
    mem.regs.set("regA", { ownerUserId: "A", phone: "9222222222", whatsappOptIn: true });
    assert.equal((await svc.sendForRegistration("regA", "confirmation")).sent, true);
    assert.equal((await svc.sendForRegistration("regB", "confirmation")).sent, true);
    assert.equal(calls[0].auth, `Bearer ${TOKEN_A}`);
    assert.ok(calls[0].url.endsWith(`/${base.phoneNumberId}/messages`));
    assert.equal(calls[1].auth, `Bearer ${TOKEN_B}`);
    assert.ok(calls[1].url.endsWith("/222222222222/messages"));
    assert.equal(mem.settings.get("A")!.phone_number_id, base.phoneNumberId);
  });
});

describe("automatic sends: consent, defaults, cost acknowledgement", () => {
  test("a phone number alone is not consent: no opt-in → nothing sent", async () => {
    validKey();
    const { svc, mem, calls } = setup();
    await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: true, costAcknowledged: true });
    mem.regs.set("r1", { ownerUserId: "A", phone: "9876543210", whatsappOptIn: false });
    assert.deepEqual(await svc.sendForRegistration("r1", "reminder_1h"), { sent: false, reason: "no_opt_in" });
    assert.equal(calls.length, 0);
  });

  test("opted in but no usable phone → nothing sent", async () => {
    validKey();
    const { svc, mem, calls } = setup();
    await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: true, costAcknowledged: true });
    mem.regs.set("r1", { ownerUserId: "A", phone: "12", whatsappOptIn: true });
    assert.deepEqual(await svc.sendForRegistration("r1", "reminder_1h"), { sent: false, reason: "no_phone" });
    assert.equal(calls.length, 0);
  });

  test("automatic sends are off by default even for opted-in registrants", async () => {
    validKey();
    const { svc, mem, calls } = setup();
    const r = await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: false });
    assert.equal(r.body.enabled, false);
    mem.regs.set("r1", { ownerUserId: "A", phone: "9876543210", whatsappOptIn: true });
    assert.deepEqual(await svc.sendForRegistration("r1", "confirmation"), { sent: false, reason: "disabled" });
    assert.equal(calls.length, 0);
    assert.equal(await svc.isActiveForOwner("A"), false);
  });

  test("enabling requires acknowledging Meta billing", async () => {
    validKey();
    const { svc, mem } = setup();
    const r = await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: true });
    assert.equal(r.status, 400);
    assert.equal(r.body.message, COST_ACK_MESSAGE);
    assert.equal(mem.settings.size, 0);
    const ok = await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: true, costAcknowledged: true });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.costAcknowledged, true);
    assert.equal(await svc.isActiveForOwner("A"), true);
  });

  test("opted-in + enabled + acknowledged → one fixed no-parameter template (no event details claimed)", async () => {
    validKey();
    const { svc, mem, calls } = setup();
    await svc.save("A", { ...base, accessToken: TOKEN_A, enabled: true, costAcknowledged: true });
    mem.regs.set("r1", { ownerUserId: "A", phone: "98765 43210", whatsappOptIn: true });
    assert.deepEqual(await svc.sendForRegistration("r1", "reminder_1h"), { sent: true });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].body, {
      messaging_product: "whatsapp", to: "919876543210", type: "template",
      template: { name: "hello_world", language: { code: "en_US" } },
    });
    assert.equal((await svc.getView("A")).body.isTestTemplate, true);
  });

  test("Meta failure on an automatic send is logged (without token) and never throws", async () => {
    validKey();
    const { svc, mem, logs } = setup(() => ({ status: 400, body: { error: { message: "Template name does not exist in the translation" } } }));
    await svc.save("A", { ...base, templateName: "webinar_reminder", accessToken: TOKEN_A, enabled: true, costAcknowledged: true });
    mem.regs.set("r1", { ownerUserId: "A", phone: "9876543210", whatsappOptIn: true });
    assert.deepEqual(await svc.sendForRegistration("r1", "confirmation"), { sent: false, reason: "meta_error" });
    assert.ok(logs.some((l) => l.includes("Template name does not exist")));
    assert.ok(logs.every((l) => !l.includes(TOKEN_A)));
  });
});

describe("normalizeWhatsappNumber", () => {
  test("E.164 digits with +91 default for 10-digit numbers", () => {
    assert.equal(normalizeWhatsappNumber("98765 43210"), "919876543210");
    assert.equal(normalizeWhatsappNumber("09876543210"), "919876543210");
    assert.equal(normalizeWhatsappNumber("+91 98765-43210"), "919876543210");
    assert.equal(normalizeWhatsappNumber("+1 (415) 555-0100"), "14155550100");
    assert.equal(normalizeWhatsappNumber("0044 20 7946 0958"), "442079460958");
    assert.equal(normalizeWhatsappNumber("123"), null);
    assert.equal(normalizeWhatsappNumber(null), null);
  });
});
