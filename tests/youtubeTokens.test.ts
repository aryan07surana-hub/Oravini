// Run with: npm test
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "crypto";

describe("YouTube token encryption at rest", () => {
  before(() => { process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex"); });

  test("encrypts access + refresh tokens and decrypts them back", async () => {
    const { encryptYoutubeTokenFields, decryptYoutubeTokenRow } = await import("../server/youtubeTokenCrypto");
    const row = { accessToken: "ya29.access", refreshToken: "1//refresh", channelTitle: "C" };
    const enc = encryptYoutubeTokenFields(row);
    assert.notEqual(enc.accessToken, row.accessToken);
    assert.notEqual(enc.refreshToken, row.refreshToken);
    assert.match(enc.accessToken, /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]+$/);
    assert.equal(enc.channelTitle, "C");
    assert.deepEqual(decryptYoutubeTokenRow(enc), row);
  });

  test("legacy plaintext rows are read unchanged (backward compatible)", async () => {
    const { decryptYoutubeTokenRow } = await import("../server/youtubeTokenCrypto");
    const legacy = { accessToken: "ya29.plain", refreshToken: null };
    assert.deepEqual(decryptYoutubeTokenRow(legacy), legacy);
  });
});

describe("YouTube OAuth state", () => {
  test("round-trips user + return path, rejects tampering and open redirects", async () => {
    const { signYoutubeState, verifyYoutubeState, safeReturnPath, YOUTUBE_OAUTH_SCOPES } = await import("../server/youtubeOAuthState");
    const st = signYoutubeState("u_1", "/tools/webinars/new");
    assert.deepEqual(verifyYoutubeState(st), { userId: "u_1", returnTo: "/tools/webinars/new" });
    assert.equal(verifyYoutubeState(st.replace(/.$/, (c) => (c === "A" ? "B" : "A"))), null);
    assert.equal(verifyYoutubeState("u_1"), null); // old unsigned state format is rejected
    assert.equal(verifyYoutubeState(signYoutubeState("u_1", null, Date.now() - 60 * 60 * 1000)), null); // expired
    assert.equal(safeReturnPath("//evil.com"), null);
    assert.equal(safeReturnPath("https://evil.com"), null);
    assert.equal(verifyYoutubeState(signYoutubeState("u_1", "//evil.com"))?.returnTo, "/youtube-scheduler");
    assert.ok(YOUTUBE_OAUTH_SCOPES.includes("https://www.googleapis.com/auth/youtube.force-ssl"));
    assert.ok(YOUTUBE_OAUTH_SCOPES.includes("https://www.googleapis.com/auth/youtube.upload"));
  });
});

 test("Google consent without a YouTube channel cannot be reported as connected",async()=>{const {requireYoutubeChannel}=await import("../server/youtubeConnectionValidation");for(const channel of [undefined,null,{}, {id:null},{id:""}])assert.throws(()=>requireYoutubeChannel(channel),/No YouTube channel/);const valid={id:"channel-test",snippet:{title:"Test"}};assert.equal(requireYoutubeChannel(valid),valid);});
