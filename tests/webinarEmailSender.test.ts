// Run with: npm test
// Per-account Webinar Funnel email sending: validation, SSRF guard, encryption, transport
// resolution order, send logging, settings + template routes. No network, no real DB
// (pool.query is mocked per test).
import { test, describe, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "net";

// Test-only key (random, not a real secret) + a platform sender, set before modules read env.
process.env.TOKEN_ENCRYPTION_KEY = "0f".repeat(32);
process.env.EMAIL_USER = "platform@example.com";
process.env.EMAIL_PASS = "platform-pass";

const { pool } = await import("../server/storage");
const { encryptToken, isEncrypted } = await import("../server/security/tokenEncryption");
const sender = await import("../server/webinarEmailSender");
const email = await import("../server/webinarFunnelEmail");
const { registerEmailSenderRoutes } = await import("../server/routes/email-sender");
const tpl = await import("../shared/webinarEmailTemplates");

type Q = { sql: string; params: any[] };
let queries: Q[] = [];
/** Routes pool.query by SQL text; unknown statements return no rows. */
function mockPool(handler: (sql: string, params: any[]) => any = () => undefined) {
  queries = [];
  return mock.method(pool, "query", async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    return handler(sql, params) ?? { rows: [], rowCount: 0 };
  });
}

const senderRow = (over: Record<string, any> = {}) => ({
  user_id: "u_1", provider: "gmail_app_password", from_name: "Acme Coaching", from_email: "host@gmail.com",
  smtp_host: null, smtp_port: null, smtp_secure: true, smtp_user: "host@gmail.com",
  smtp_pass_encrypted: encryptToken("abcdefghijklmnop"), pass_last4: "mnop",
  last_verified_at: null, last_error: null, updated_at: null, ...over,
});

afterEach(() => { mock.restoreAll(); });

describe("SMTP host guard", () => {
  test("isPrivateAddress flags private, loopback, link-local, CGNAT, mapped and v6-local", () => {
    for (const ip of ["10.0.0.5", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:10.0.0.1"]) {
      assert.equal(sender.isPrivateAddress(ip), true, ip);
    }
    for (const ip of ["8.8.8.8", "142.250.4.108", "172.32.0.1", "2607:f8b0:4004:c07::6c"]) {
      assert.equal(sender.isPrivateAddress(ip), false, ip);
    }
  });

  test("resolvePublicSmtpHost pins a public IPv4 and refuses private / IP-literal hosts", async () => {
    const lookup = (addrs: string[]) => (async () => addrs.map(address => ({ address, family: address.includes(":") ? 6 : 4 }))) as any;
    assert.equal(await sender.resolvePublicSmtpHost("smtp.example.com", lookup(["2607:f8b0::1", "203.0.113.9"])), "203.0.113.9");
    await assert.rejects(sender.resolvePublicSmtpHost("evil.example.com", lookup(["8.8.8.8", "10.0.0.1"])), /private network/);
    await assert.rejects(sender.resolvePublicSmtpHost("10.0.0.1", lookup([])), /hostname, not an IP/);
    await assert.rejects(sender.resolvePublicSmtpHost("nx.example.com", (async () => { throw new Error("ENOTFOUND"); }) as any), /Couldn't find/);
  });
});

describe("sender input + merge", () => {
  test("gmail app password: spaces stripped, wrong length rejected", () => {
    const ok = sender.senderInputSchema.parse({ provider: "gmail_app_password", gmailAddress: "Host@Gmail.com", appPassword: "abcd efgh ijkl mnop" });
    assert.equal(ok.provider === "gmail_app_password" && ok.appPassword, "abcdefghijklmnop");
    assert.equal(ok.provider === "gmail_app_password" && ok.gmailAddress, "host@gmail.com");
    assert.equal(sender.senderInputSchema.safeParse({ provider: "gmail_app_password", gmailAddress: "a@b.co", appPassword: "short" }).success, false);
  });

  test("smtp: only mail ports, hostname required, from-name header chars stripped", () => {
    const base = { provider: "smtp", fromEmail: "hi@acme.com", host: "smtp.acme.com", username: "hi@acme.com", password: "pw" };
    assert.equal(sender.senderInputSchema.safeParse({ ...base, port: 5432 }).success, false);
    assert.equal(sender.senderInputSchema.safeParse({ ...base, port: 587, host: "localhost" }).success, false);
    const ok = sender.senderInputSchema.parse({ ...base, port: "465", fromName: 'Evil" <x@y>\r\nBcc: z' });
    assert.equal(ok.provider === "smtp" && ok.port, 465);
    assert.doesNotMatch(String(ok.fromName), /["<>\r\n]/);
  });

  test("stored password is kept only for the same account + server", () => {
    const existing = senderRow({ provider: "smtp", smtp_host: "smtp.acme.com", smtp_port: 587, smtp_user: "hi@acme.com", from_email: "hi@acme.com" }) as any;
    const input = sender.senderInputSchema.parse({ provider: "smtp", fromEmail: "hi@acme.com", host: "smtp.acme.com", port: 587, username: "hi@acme.com" });
    assert.equal(sender.mergeSenderInput(input, existing).password, "abcdefghijklmnop");
    const otherHost = sender.senderInputSchema.parse({ provider: "smtp", fromEmail: "hi@acme.com", host: "smtp.attacker.com", port: 587, username: "hi@acme.com" });
    assert.throws(() => sender.mergeSenderInput(otherHost, existing), /Enter the SMTP password/);
    const gmail = sender.senderInputSchema.parse({ provider: "gmail_app_password", gmailAddress: "host@gmail.com" });
    assert.throws(() => sender.mergeSenderInput(gmail, existing), /app password/); // provider changed
  });

  test("canEncryptSecrets follows TOKEN_ENCRYPTION_KEY", () => {
    assert.equal(sender.canEncryptSecrets(), true);
    const k = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    try { assert.equal(sender.canEncryptSecrets(), false); } finally { process.env.TOKEN_ENCRYPTION_KEY = k; }
  });

  test("publicSenderView never exposes the password or ciphertext", () => {
    const view = JSON.stringify(sender.publicSenderView(senderRow() as any));
    assert.doesNotMatch(view, /abcdefghijklmnop/);
    assert.doesNotMatch(view, /smtp_pass_encrypted|smtpPass/);
    assert.match(view, /"passLast4":"mnop"/);
  });

  test("describeSmtpError explains Gmail auth failures and quota", () => {
    assert.match(sender.describeSmtpError({ code: "EAUTH", message: "Invalid login: 535-5.7.8 Username and Password not accepted" }), /app password/);
    assert.match(sender.describeSmtpError({ message: "550 5.4.5 Daily user sending limit exceeded" }), /Daily sending limit/);
  });
});

describe("transport resolution order", () => {
  beforeEach(() => { sender.invalidateAccountTransport("u_1"); sender.invalidateAccountTransport("u_2"); });

  test("platform config: Gmail pair wins over SMTP_*, then SMTP_*, else none", () => {
    assert.equal(email.platformConfigFromEnv({ EMAIL_USER: "a", EMAIL_PASS: "b", SMTP_HOST: "h", SMTP_USER: "u" } as any)?.via, "platform_gmail");
    const smtp = email.platformConfigFromEnv({ SMTP_HOST: "smtp.x.com", SMTP_USER: "u", SMTP_PASS: "p", SMTP_PORT: "465", SMTP_SECURE: "true" } as any);
    assert.equal(smtp?.via, "platform_smtp");
    assert.equal(smtp?.options.port, 465);
    assert.equal(smtp?.options.secure, true);
    assert.equal(email.platformConfigFromEnv({} as any), null);
  });

  test("account sender first; its from-name and address are used", async () => {
    mockPool(sql => (sql.includes("FROM user_email_senders") ? { rows: [senderRow()] } : undefined));
    const r = await email.getTransport("u_1");
    assert.equal(r?.via, "account");
    assert.equal(r?.fromEmail, "host@gmail.com");
    assert.equal(r?.from("Webinar Host"), '"Acme Coaching" <host@gmail.com>');
  });

  test("no account sender → platform Gmail, From uses the funnel host name", async () => {
    mockPool();
    const r = await email.getTransport("u_2");
    assert.equal(r?.via, "platform_gmail");
    assert.equal(r?.from("Jane Host"), '"Jane Host" <platform@example.com>');
  });

  test("a DB failure loading the account sender falls back instead of throwing", async () => {
    mockPool(() => { throw new Error("db down"); });
    const r = await email.getTransport("u_2");
    assert.equal(r?.via, "platform_gmail");
  });
});

describe("sendWebinarMail records every attempt", () => {
  const base = { accountId: "u_1", webinarId: "wf_1", registrationId: "r_1", type: "confirmation" as const, to: "a@b.co", subject: "Hi", hostName: null, html: "<p>x</p>", text: "x" };
  const insertParams = () => queries.find(q => q.sql.includes("INSERT INTO webinar_email_sends"))?.params;
  const fake = (sendMail: () => Promise<any>) => ({ transport: { sendMail } as any, via: "account" as const, fromEmail: "host@gmail.com", from: () => '"X" <host@gmail.com>' });

  test("sent", async () => {
    mockPool();
    const out = await email.sendWebinarMail({ ...base, resolved: fake(async () => ({})) });
    assert.equal(out.status, "sent");
    assert.deepEqual(insertParams()?.slice(0, 8), ["u_1", "wf_1", "r_1", "confirmation", "a@b.co", "Hi", "sent", "account"]);
  });

  test("failed — error is human-readable and noted on the sender", async () => {
    mockPool();
    const out = await email.sendWebinarMail({ ...base, resolved: fake(async () => { throw Object.assign(new Error("535 auth"), { code: "EAUTH" }); }) });
    assert.equal(out.status, "failed");
    assert.equal(insertParams()?.[6], "failed");
    assert.match(String(insertParams()?.[8]), /app password/);
    await new Promise(r => setImmediate(r));
    assert.ok(queries.some(q => q.sql.startsWith("UPDATE user_email_senders SET last_error")));
  });

  test("skipped when no transport", async () => {
    mockPool();
    const out = await email.sendWebinarMail({ ...base, resolved: null });
    assert.equal(out.status, "skipped");
    assert.equal(insertParams()?.[6], "skipped");
    assert.equal(insertParams()?.[7], "none");
  });

  test("a send-log write failure never throws", async () => {
    mockPool(sql => { if (sql.includes("INSERT INTO webinar_email_sends")) throw new Error("db down"); });
    const out = await email.sendWebinarMail({ ...base, resolved: fake(async () => ({})) });
    assert.equal(out.status, "sent");
  });
});

describe("follow-up templates", () => {
  test("render: {{#if}} blocks and HTML-escaped values", () => {
    const html = tpl.renderFollowupTemplate("{{#if ctaUrl}}<a href=\"{{ctaUrl}}\">go</a>{{/if}}Hi {{name}}", { name: "<b>P</b>", ctaUrl: "" });
    assert.equal(html, "Hi &lt;b&gt;P&lt;/b&gt;");
    assert.equal(tpl.renderFollowupTemplate("Hi {{name}}", { name: "A&B" }, false), "Hi A&B");
  });

  test("overrides fall back to defaults when missing / empty / malformed", () => {
    assert.equal(tpl.resolveFollowupTemplate("followup_no_show", null).isCustom, false);
    assert.equal(tpl.resolveFollowupTemplate("followup_no_show", { followup_no_show: { subject: " ", bodyHtml: "x" } }).isCustom, false);
    const custom = tpl.resolveFollowupTemplate("followup_no_show", { followup_no_show: { subject: "S", bodyHtml: "B" }, junk: 1 });
    assert.deepEqual(custom, { subject: "S", bodyHtml: "B", isCustom: true });
  });
});

describe("routes", () => {
  async function serve(deps: any = {}, user: any = { id: "u_1", email: "owner@acme.com" }) {
    const app = express();
    app.use(express.json());
    const requireAuth = (req: any, _res: any, next: any) => { req.user = user; next(); };
    registerEmailSenderRoutes(app, requireAuth as any, deps);
    const server = app.listen(0);
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    return { url, close: () => new Promise<void>(r => server.close(() => r())) };
  }
  const put = (url: string, path: string, body: unknown) => fetch(url + path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  test("PUT sender: invalid input → 400, no DB writes", async () => {
    mockPool();
    const s = await serve();
    try {
      const r = await put(s.url, "/api/settings/email-sender", { provider: "smtp", fromEmail: "x@y.co", host: "smtp.y.co", port: 6379, username: "u", password: "p" });
      assert.equal(r.status, 400);
      assert.match((await r.json()).message, /Port must be/);
      assert.equal(queries.length, 0);
    } finally { await s.close(); }
  });

  test("PUT sender: refused when the encryption key is missing", async () => {
    mockPool();
    const k = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const s = await serve();
    try {
      const r = await put(s.url, "/api/settings/email-sender", { provider: "gmail_app_password", gmailAddress: "h@gmail.com", appPassword: "abcdefghijklmnop" });
      assert.equal(r.status, 503);
      assert.equal(queries.length, 0);
    } finally { process.env.TOKEN_ENCRYPTION_KEY = k; await s.close(); }
  });

  test("PUT sender: bad credentials → 400 with explanation, nothing saved", async () => {
    mockPool();
    const s = await serve({ buildTransport: async () => ({ verify: async () => { throw Object.assign(new Error("535"), { code: "EAUTH" }); } }) });
    try {
      const r = await put(s.url, "/api/settings/email-sender", { provider: "gmail_app_password", gmailAddress: "h@gmail.com", appPassword: "abcd efgh ijkl mnop" });
      assert.equal(r.status, 400);
      assert.match((await r.json()).message, /app password/);
      assert.ok(!queries.some(q => q.sql.includes("INSERT INTO user_email_senders")));
    } finally { await s.close(); }
  });

  test("PUT sender: verified credentials are saved encrypted and never echoed", async () => {
    mockPool(sql => (sql.includes("INSERT INTO user_email_senders") ? { rows: [senderRow({ user_id: "u_1", from_email: "h@gmail.com", smtp_user: "h@gmail.com" })] } : undefined));
    let verified = false;
    const s = await serve({ buildTransport: async (p: any) => { assert.equal(p.password, "abcdefghijklmnop"); return { verify: async () => { verified = true; } }; } });
    try {
      const r = await put(s.url, "/api/settings/email-sender", { provider: "gmail_app_password", gmailAddress: "h@gmail.com", appPassword: "abcd efgh ijkl mnop" });
      assert.equal(r.status, 200);
      const text = await r.text();
      assert.ok(verified);
      assert.doesNotMatch(text, /abcdefghijklmnop/);
      const ins = queries.find(q => q.sql.includes("INSERT INTO user_email_senders"))!;
      assert.equal(ins.params[0], "u_1");
      assert.ok(isEncrypted(ins.params[8]), "password stored as ciphertext");
      assert.ok(!ins.params.includes("abcdefghijklmnop"));
    } finally { await s.close(); }
  });

  test("templates: other accounts' funnels are 404; defaults saved verbatim store no override", async () => {
    mockPool(sql => {
      if (sql.startsWith("SELECT id, email_templates FROM webinar_funnels")) return { rows: [] };
    });
    let s = await serve();
    try {
      const r = await put(s.url, "/api/webinar-funnels/wf_other/email-templates", { templates: { followup_no_show: { subject: "S", bodyHtml: "B" } } });
      assert.equal(r.status, 404);
      assert.ok(queries.find(q => q.sql.startsWith("SELECT id, email_templates"))!.params.includes("u_1"));
    } finally { await s.close(); }

    mockPool(sql => {
      if (sql.startsWith("SELECT id, email_templates FROM webinar_funnels")) return { rows: [{ id: "wf_1", email_templates: { followup_clicked: { subject: "Old", bodyHtml: "Old" } } }] };
    });
    s = await serve();
    try {
      const def = tpl.WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES.followup_attended;
      const r = await put(s.url, "/api/webinar-funnels/wf_1/email-templates", {
        templates: { followup_no_show: { subject: "Missed you {{name}}", bodyHtml: "<p>Replay: {{replayUrl}}</p>" }, followup_attended: { subject: def.subject, bodyHtml: def.bodyHtml }, followup_clicked: null },
      });
      assert.equal(r.status, 200);
      const upd = queries.find(q => q.sql.startsWith("UPDATE webinar_funnels SET email_templates"))!;
      assert.deepEqual(JSON.parse(upd.params[0]), { followup_no_show: { subject: "Missed you {{name}}", bodyHtml: "<p>Replay: {{replayUrl}}</p>" } });
      assert.deepEqual(upd.params.slice(1), ["wf_1", "u_1"]);
    } finally { await s.close(); }
  });

  test("templates: oversized body rejected", async () => {
    mockPool();
    const s = await serve();
    try {
      const r = await put(s.url, "/api/webinar-funnels/wf_1/email-templates", { templates: { followup_no_show: { subject: "S", bodyHtml: "x".repeat(tpl.TEMPLATE_BODY_MAX + 1) } } });
      assert.equal(r.status, 400);
    } finally { await s.close(); }
  });
});
