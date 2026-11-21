// Integration test for the WhatsApp BYOK storage layer. Needs a THROWAWAY Postgres in
// TEST_DATABASE_URL (skipped otherwise): it drops/creates users, webinar_funnels,
// webinar_funnel_registrations and user_whatsapp_settings. No network, dummy tokens only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "crypto";

const url = process.env.TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

test("WhatsApp BYOK storage (opt-in defaults, encrypted at rest, owner-scoped)", { skip: !url && "TEST_DATABASE_URL not set" }, async (t) => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const { pool } = await import("../server/storage");
  const wa = await import("../server/routes/webinar-whatsapp");
  t.after(() => pool.end());

  // Pre-change shape of the tables (as server/index.ts created them before this PR)
  await pool.query(`
    DROP TABLE IF EXISTS user_whatsapp_settings, webinar_funnel_registrations, webinar_funnels, users CASCADE;
    CREATE TABLE users (id VARCHAR PRIMARY KEY, email TEXT, phone TEXT);
    CREATE TABLE webinar_funnels (id VARCHAR PRIMARY KEY, user_id VARCHAR NOT NULL REFERENCES users(id));
    CREATE TABLE webinar_funnel_registrations (
      id VARCHAR PRIMARY KEY, webinar_id VARCHAR NOT NULL REFERENCES webinar_funnels(id),
      name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, created_at TIMESTAMP DEFAULT NOW());
    INSERT INTO users VALUES ('ua', 'a@example.test', '9000000001'), ('ub', 'b@example.test', NULL);
    INSERT INTO webinar_funnels VALUES ('fa', 'ua'), ('fb', 'ub');
    INSERT INTO webinar_funnel_registrations (id, webinar_id, name, email, phone) VALUES
      ('old-with-phone', 'fa', 'Old', 'old@example.test', '9876543210'),
      ('new-reg', 'fa', 'New', 'new@example.test', '9876543211'),
      ('no-phone', 'fa', 'NoPhone', 'np@example.test', NULL),
      ('b-reg', 'fb', 'B', 'b1@example.test', '9876543212');
  `);

  await wa.ensureWhatsappSchema();

  await t.test("existing registrations default to NOT opted in (phone alone is not consent)", async () => {
    const { rows } = await pool.query(`SELECT id, whatsapp_opt_in, whatsapp_opt_in_at FROM webinar_funnel_registrations ORDER BY id`);
    for (const r of rows) { assert.equal(r.whatsapp_opt_in, false); assert.equal(r.whatsapp_opt_in_at, null); }
    assert.deepEqual(await wa.pgWhatsappRepo.getRegistrationForSend("old-with-phone"), { ownerUserId: "ua", phone: "9876543210", whatsappOptIn: false });
  });

  await t.test("explicit opt-in is persisted; it can't be set without a phone; unticked withdraws", async () => {
    await wa.recordWhatsappOptIn("new-reg", true);
    await wa.recordWhatsappOptIn("no-phone", true);
    const { rows } = await pool.query(`SELECT id, whatsapp_opt_in, whatsapp_opt_in_at FROM webinar_funnel_registrations WHERE id IN ('new-reg','no-phone') ORDER BY id`);
    assert.equal(rows[0].id, "new-reg"); assert.equal(rows[0].whatsapp_opt_in, true); assert.ok(rows[0].whatsapp_opt_in_at);
    assert.equal(rows[1].id, "no-phone"); assert.equal(rows[1].whatsapp_opt_in, false);
    await wa.recordWhatsappOptIn("new-reg", false);
    assert.equal((await wa.pgWhatsappRepo.getRegistrationForSend("new-reg"))!.whatsappOptIn, false);
    await wa.recordWhatsappOptIn("new-reg", true);
  });

  await t.test("settings: token stored only encrypted, never returned, scoped per owner; sends default off", async () => {
    const TOKEN = "DUMMY-integration-token-not-real-9z9z";
    const saved = await wa.whatsappService.save("ua", { phoneNumberId: "123456789", accessToken: TOKEN, enabled: false });
    assert.equal(saved.status, 200);
    assert.ok(!JSON.stringify(saved.body).includes(TOKEN));
    const { rows } = await pool.query(`SELECT user_id, access_token_encrypted, enabled, cost_acknowledged_at FROM user_whatsapp_settings`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, "ua");
    assert.match(rows[0].access_token_encrypted, /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/);
    assert.ok(!rows[0].access_token_encrypted.includes(TOKEN));
    assert.equal(rows[0].enabled, false);
    assert.equal(rows[0].cost_acknowledged_at, null);
    assert.equal((await wa.whatsappService.getView("ub")).body.configured, false);
    // Opted-in registrant of an owner whose sends are off → skipped before any network call
    assert.equal(await wa.sendWebinarWhatsApp("new-reg", "confirmation"), false);
    assert.equal(await wa.isWhatsappActiveForOwner("ua"), false);
  });

  await t.test("fails closed: with no encryption key nothing is written", async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    const r = await wa.whatsappService.save("ub", { phoneNumberId: "987654321", accessToken: "DUMMY-other-token", enabled: false });
    assert.equal(r.status, 503);
    const { rows } = await pool.query(`SELECT 1 FROM user_whatsapp_settings WHERE user_id = 'ub'`);
    assert.equal(rows.length, 0);
  });
});
