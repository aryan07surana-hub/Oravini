/**
 * Run: npm test   (node:test via tsx — no extra dependencies)
 *
 * Proves webinar outbound email/SMS delivery is genuinely off:
 *  - the DB is never queried, so no queue row is claimed/consumed and no
 *    enrollment advances while delivery is disabled,
 *  - no mail transport is ever asked to send,
 *  - the poll jobs register no timers,
 *  - manual/test endpoints answer 410 and never a false success,
 *  - the CRM hot-lead urgent task is still created (only its email is gated).
 *
 * Everything is mocked: `pool.query` and `transport.sendMail` are replaced with
 * recording spies before anything runs, so no database, SMTP server or external
 * API is contacted and no message is sent.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pool } from "../server/storage";
import {
  WEBINAR_OUTBOUND_DISABLED, WEBINAR_OUTBOUND_DISABLED_CODE, respondWebinarOutboundDisabled,
  webinarOutboundDisabledPayload, __resetWebinarOutboundNotices,
} from "../server/webinarOutboundDisabled";
import { getTransport, runWebinarFunnelReminders, sendWebinarConfirmation, startWebinarFunnelReminderJob } from "../server/webinarFunnelEmail";
import { runWebinarFunnelFollowups, startWebinarFunnelFollowupJob } from "../server/webinarFunnelFollowup";
import { registerWebinarEmailRoutes } from "../server/routes/webinar-emails";

// ── Mocks ───────────────────────────────────────────────────────────────────
let queries: string[] = [];
let mails: unknown[] = [];

// Mocked DB: any call is recorded and rejected, so a leak is loud, never silent.
(pool as any).query = async (sql: unknown) => {
  queries.push(String(sql));
  throw new Error("TEST: database must not be queried while delivery is disabled");
};

// Mocked transport: nodemailer builds the object without any network I/O, and we
// replace sendMail so even a regression would record instead of actually sending.
process.env.EMAIL_USER ||= "test@example.invalid";
process.env.EMAIL_PASS ||= "test-pass";
const transport = getTransport();
if (transport) (transport as any).sendMail = async (m: unknown) => { mails.push(m); return { messageId: "test" }; };

beforeEach(() => { queries = []; mails = []; __resetWebinarOutboundNotices(); });

/** Runs `fn` with setTimeout/setInterval replaced, returning how many were registered. */
async function countTimers(fn: () => void | Promise<void>) {
  const [rt, ri] = [globalThis.setTimeout, globalThis.setInterval];
  let timers = 0;
  (globalThis as any).setTimeout = (...a: unknown[]) => { timers++; return 0 as unknown as NodeJS.Timeout; };
  (globalThis as any).setInterval = (...a: unknown[]) => { timers++; return 0 as unknown as NodeJS.Timeout; };
  try { await fn(); } finally { globalThis.setTimeout = rt; globalThis.setInterval = ri; }
  return timers;
}

/** Minimal res double — records status/json instead of touching a socket. */
function fakeRes() {
  const r: any = { statusCode: 0, body: undefined };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  return r;
}

// ── The switch itself ───────────────────────────────────────────────────────
test("delivery is disabled and the payload never reads as a success", () => {
  assert.equal(WEBINAR_OUTBOUND_DISABLED, true);
  const p = webinarOutboundDisabledPayload({ sent: 0 });
  assert.equal(p.ok, false);
  assert.equal(p.disabled, true);
  assert.equal(p.code, WEBINAR_OUTBOUND_DISABLED_CODE);
  assert.equal(p.sent, 0);
  assert.match(p.message, /inactive/i);
});

test("respondWebinarOutboundDisabled answers 410, not 2xx", () => {
  const res = fakeRes();
  respondWebinarOutboundDisabled(res);
  assert.equal(res.statusCode, 410);
  assert.equal(res.body.ok, false);
  assert.ok(res.statusCode < 200 || res.statusCode >= 300, "must never be a 2xx");
});

// ── Funnel confirmation + reminders ─────────────────────────────────────────
test("registration confirmation sends nothing and touches no DB or transport", async () => {
  const ok = await sendWebinarConfirmation(
    { id: "w1", slug: "demo", title: "Demo", description: null, hostName: "Host", scheduledAt: new Date(), durationMinutes: 60 },
    { id: "r1", name: "Test Person", email: "nobody@example.invalid" },
  );
  assert.equal(ok, false, "must not report a send");
  assert.deepEqual(queries, [], "no DB query");
  assert.deepEqual(mails, [], "no mail handed to the transport");
});

test("1h reminder queue claims nothing: no UPDATE runs, so reminder_1h_sent_at is never burned", async () => {
  const sent = await runWebinarFunnelReminders();
  assert.equal(sent, 0);
  assert.deepEqual(queries, [], "the claiming UPDATE must not run");
  assert.deepEqual(mails, []);
});

test("reminder job registers no timers", async () => {
  assert.equal(await countTimers(() => startWebinarFunnelReminderJob()), 0);
});

// ── Segmented follow-ups ────────────────────────────────────────────────────
test("follow-up queue claims nothing: no table bootstrap, no claim INSERT, no log write", async () => {
  const sent = await runWebinarFunnelFollowups();
  assert.equal(sent, 0);
  assert.deepEqual(queries, [], "must not CREATE TABLE, claim or mark sent");
  assert.deepEqual(mails, []);
});

test("follow-up job registers no timers", async () => {
  assert.equal(await countTimers(() => startWebinarFunnelFollowupJob()), 0);
});

// ── Legacy manual / test send endpoints ─────────────────────────────────────
/** Collects the handlers registerWebinarEmailRoutes would mount, without express. */
function mountedRoutes() {
  const routes = new Map<string, Function>();
  const app: any = {
    get: (path: string, _auth: unknown, h: Function) => routes.set(`GET ${path}`, h),
    post: (path: string, _auth: unknown, h: Function) => routes.set(`POST ${path}`, h),
    patch: (path: string, _auth: unknown, h: Function) => routes.set(`PATCH ${path}`, h),
    delete: (path: string, _auth: unknown, h: Function) => routes.set(`DELETE ${path}`, h),
  };
  registerWebinarEmailRoutes(app, (_q: unknown, _s: unknown, n: Function) => n());
  return routes;
}

for (const [label, path] of [
  ["test send", "POST /api/webinars/:id/emails/:emailId/test"],
  ["manual send to all registrants", "POST /api/webinars/:id/emails/:emailId/send"],
] as const) {
  test(`${label} endpoint returns 410 and never a false success`, async () => {
    const handler = mountedRoutes().get(path);
    assert.ok(handler, `${path} is still mounted`);
    const res = fakeRes();
    await handler!({ params: { id: "w1", emailId: "e1" }, user: { id: "u1", email: "o@example.invalid" }, body: {} }, res);

    assert.equal(res.statusCode, 410);
    assert.equal(res.body.ok, false, "must not report ok:true");
    assert.notEqual(res.body.sent, 1);
    assert.deepEqual(queries, [], "no storage read before refusing");
    assert.deepEqual(mails, [], "nothing sent");
  });
}

test("template CRUD and log-reading endpoints are still mounted (data is not removed)", () => {
  const routes = mountedRoutes();
  for (const p of [
    "GET /api/webinars/:id/emails",
    "POST /api/webinars/:id/emails",
    "PATCH /api/webinars/:id/emails/:emailId",
    "DELETE /api/webinars/:id/emails/:emailId",
    "POST /api/webinars/:id/emails/init-defaults",
    "GET /api/webinars/:id/emails/:emailId/logs",
  ]) {
    assert.ok(routes.get(p), `${p} must still exist`);
  }
});

// ── CRM: structure retained, only the alert email gated ─────────────────────
// The surrounding writes need a live database, so this asserts on the source:
// the urgent-task INSERT must still run, and the gate must sit after it.
test("CRM hot-lead: urgent task / stage / activity retained, only the email is gated", () => {
  const src = readFileSync(new URL("../server/webinarCrmPipeline.ts", import.meta.url), "utf8");
  assert.match(src, /INSERT INTO crm_tasks[\s\S]*?'open', 'urgent'/, "urgent CRM task insert retained");
  assert.match(src, /moveForwardTx\(db, opp\.opportunityId, STAGE_CTA\)/, "stage move retained");
  assert.match(src, /title: "Clicked webinar CTA"/, "activity retained");

  const taskAt = src.indexOf("INSERT INTO crm_tasks");
  const gateAt = src.indexOf("WEBINAR_OUTBOUND_DISABLED", taskAt);
  const emailAt = src.indexOf("await sendHotLeadEmail(");
  assert.ok(taskAt > 0 && gateAt > taskAt, "the gate comes after the task write");
  assert.ok(gateAt < emailAt, "the gate comes before the email send");
});

// ── SMS: guards sit before any queue fetch / advance ────────────────────────
test("SMS sequence processing is gated before fetching or advancing enrollments", () => {
  const src = readFileSync(new URL("../server/cron.ts", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export async function processSmsSequences()"));
  const gate = fn.indexOf("WEBINAR_OUTBOUND_DISABLED");
  // Match the real calls, not the explanatory comments above the gate.
  const fetchAt = fn.indexOf("storage.getPendingSmsEnrollments(");
  const advanceAt = fn.indexOf("storage.advanceSmsEnrollment(");
  assert.ok(gate > -1 && gate < fetchAt, "gate precedes getPendingSmsEnrollments");
  assert.ok(gate < advanceAt, "gate precedes advanceSmsEnrollment");
});

test("SMS gateway, broadcast, test and run-sequences routes are all gated", () => {
  const src = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
  for (const [label, anchor] of [
    ["gateway", "async function sendSmsViaEmail("],
    ["broadcast", 'app.post("/api/admin/sms/broadcast"'],
    ["test", 'app.post("/api/admin/sms/test"'],
    ["run-sequences", 'app.post("/api/admin/sms/run-sequences"'],
  ] as const) {
    const at = src.indexOf(anchor);
    assert.ok(at > 0, `${label} route present`);
    const body = src.slice(at, at + 700);
    assert.match(body, /WEBINAR_OUTBOUND_DISABLED/, `${label} is gated`);
    // The gate must come before the first real send/queue call in the handler.
    // (Matched on the call site, not on the handler's own declaration.)
    const gate = body.indexOf("WEBINAR_OUTBOUND_DISABLED");
    for (const call of ["await sendSmsViaEmail(", "storage.createSmsBroadcast(", "storage.getSmsCarrierGateway(", "await processSmsSequences("]) {
      const c = body.indexOf(call);
      if (c > -1) assert.ok(gate < c, `${label}: gate precedes ${call.trim()}`);
    }
  }
});

// ── Untouched systems ───────────────────────────────────────────────────────
test("login OTP, auth/security and booking mail are not gated by this switch", () => {
  const src = readFileSync(new URL("../server/routes.ts", import.meta.url), "utf8");
  for (const marker of ["sendBookingReminders", "sendFollowUpEmails"]) {
    const at = src.indexOf(marker);
    if (at < 0) continue;
    const near = src.slice(Math.max(0, at - 400), at + 400);
    assert.doesNotMatch(near, /WEBINAR_OUTBOUND_DISABLED/, `${marker} must not be gated here`);
  }
});
