// "Continue with Whop": OAuth 2.1 + PKCE sign-in (docs.whop.com/developer/guides/oauth).
// Public OAuth client: only the client id is needed (no secret stored anywhere).
// Off unless WHOP_OAUTH_CLIENT_ID is set. Sandbox by default (WHOP_PLATFORM_ENV=production switches the host).
// Identity rules:
//  - A Whop user id is linked to one Oravini user in whop_logins (created on first sign-in).
//  - An existing Oravini account is only linked by email when Whop says that email is verified.
//  - state, nonce and the PKCE verifier live in the server session and are single use.
import type { Express } from "express";
import { createHash, randomBytes } from "crypto";
import { pool, storage } from "./storage";

const TIMEOUT_MS = 15_000;

function appBase(): string {
  const v = process.env.APP_URL || process.env.SITE_URL || process.env.PUBLIC_BASE_URL || process.env.PUBLIC_APP_URL;
  return (v ? v.replace(/\/$/, "") : `http://localhost:${process.env.PORT || "5000"}`);
}
function oauthBase(): string {
  const explicit = process.env.WHOP_OAUTH_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return process.env.WHOP_PLATFORM_ENV === "production" ? "https://api.whop.com" : "https://sandbox-api.whop.com";
}
const clientId = () => (process.env.WHOP_OAUTH_CLIENT_ID || "").trim();
const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function timedFetch(url: string, init: RequestInit) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

export async function registerWhopLogin(app: Express): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whop_logins (
        whop_user_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`);
  } catch { console.warn("[whop-login] could not ensure table"); }

  app.get("/api/auth/whop/enabled", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ enabled: !!clientId() });
  });

  app.get("/api/auth/whop", (req, res) => {
    if (!clientId()) return res.redirect("/login?error=whop_failed&msg=Whop+sign-in+is+not+switched+on");
    const verifier = b64url(randomBytes(32));
    const state = b64url(randomBytes(16));
    const nonce = b64url(randomBytes(16));
    (req.session as any).whopLogin = { verifier, state, nonce };
    const refCode = (req.cookies as any)?.referral_code || (req.query.ref as string) || null;
    if (refCode) (req.session as any).pendingReferralCode = refCode;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId(),
      redirect_uri: `${appBase()}/api/auth/whop/callback`,
      scope: "openid profile email",
      state, nonce,
      code_challenge: b64url(createHash("sha256").update(verifier).digest()),
      code_challenge_method: "S256",
    });
    req.session.save(() => res.redirect(`${oauthBase()}/oauth/authorize?${params}`));
  });

  app.get("/api/auth/whop/callback", async (req, res) => {
    const fail = (msg: string) => res.redirect(`/login?error=whop_failed&msg=${encodeURIComponent(msg)}`);
    try {
      const { code, state, error, error_description } = req.query as any;
      if (error) {
        console.warn("[whop-login] authorize error:", String(error).slice(0, 60));
        return fail(typeof error_description === "string" && error_description ? error_description.slice(0, 120) : "Whop sign-in was cancelled");
      }
      const saved = (req.session as any)?.whopLogin as { verifier: string; state: string; nonce: string } | undefined;
      delete (req.session as any).whopLogin;
      if (!code || typeof code !== "string" || !state || !saved || state !== saved.state) {
        return fail("Sign-in session expired. Please try again.");
      }
      const capturedRefCode = (req.session as any)?.pendingReferralCode || (req.cookies as any)?.referral_code || null;

      const tokenResp = await timedFetch(`${oauthBase()}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${appBase()}/api/auth/whop/callback`,
          client_id: clientId(),
          code_verifier: saved.verifier,
        }),
      });
      const tokens = (await tokenResp.json().catch(() => ({}))) as any;
      if (!tokenResp.ok || !tokens.access_token) {
        console.error("[whop-login] token exchange failed:", tokenResp.status, String(tokens?.error || "").slice(0, 80));
        return fail("Could not complete Whop sign-in");
      }
      const infoResp = await timedFetch(`${oauthBase()}/oauth/userinfo`, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      const info = (await infoResp.json().catch(() => ({}))) as any;
      const whopId = typeof info?.sub === "string" ? info.sub.slice(0, 64) : "";
      if (!infoResp.ok || !whopId) {
        console.error("[whop-login] userinfo failed:", infoResp.status);
        return fail("Could not read your Whop profile");
      }
      const email = typeof info.email === "string" ? info.email.trim().toLowerCase() : "";
      const emailVerified = info.email_verified === true;
      const name: string = (info.name || info.preferred_username || (email ? email.split("@")[0] : "Whop user")).toString().slice(0, 80);
      const avatar: string | undefined = typeof info.picture === "string" ? info.picture : undefined;

      let user: any = null;
      let isNewUser = false;
      const link = await pool.query("SELECT user_id FROM whop_logins WHERE whop_user_id = $1", [whopId]);
      if (link.rows[0]) user = await storage.getUser(link.rows[0].user_id);
      if (!user) {
        if (!email) return fail("Whop did not share an email address. Please use another sign-in method.");
        const existing = await storage.getUserByEmail(email);
        if (existing) {
          if (!emailVerified) return fail("Whop could not confirm this email. Sign in with your Oravini password, or verify your email on Whop first.");
          user = existing;
        } else {
          user = await storage.createUser({
            email,
            password: randomBytes(24).toString("hex"),
            name,
            role: "client",
            avatar,
            planConfirmed: false,
            phoneVerified: true,
            surveyCompleted: false,
            hasVideoMarketingAddon: false,
          } as any);
          isNewUser = true;
        }
        if (!user) return fail("Could not create your account");
        await pool.query("INSERT INTO whop_logins (whop_user_id, user_id) VALUES ($1, $2) ON CONFLICT (whop_user_id) DO NOTHING", [whopId, user.id]);
      }

      req.logIn(user, async (loginErr) => {
        if (loginErr) { console.error("[whop-login] login error:", loginErr); return fail("Could not sign in with Whop"); }
        if (isNewUser && capturedRefCode) {
          try { await storage.processReferralSignup(capturedRefCode, user.id, user.email || ""); }
          catch (e) { console.error("[whop-login] referral failed for", user.id); }
        }
        if (isNewUser) {
          storage.getEmailSequences().then((seqs: any[]) => {
            seqs.filter(s => s.trigger === "join" && s.active).forEach(s => storage.enrollUserInSequence(user.id, s.id).catch(() => {}));
          }).catch(() => {});
        }
        const dest = user.role === "admin" ? "/admin"
          : !user.surveyCompleted ? "/onboarding"
          : user.planConfirmed ? "/dashboard" : "/select-plan";
        return res.redirect(dest);
      });
    } catch (err: any) {
      console.error("[whop-login] callback error:", err?.message);
      return fail("Whop sign-in failed. Please try again.");
    }
  });
}
