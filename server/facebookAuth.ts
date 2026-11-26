import type { Express } from "express";
import { randomBytes } from "crypto";
import { storage } from "./storage";

export function registerFacebookAuth(app: Express) {
  const getAppBase = () => {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
    return `http://localhost:${process.env.PORT || "5000"}`;
  };

  // ── Facebook Login ───────────────────────────────────────────────────────────
  // Dedicated login app via FACEBOOK_LOGIN_APP_ID / FACEBOOK_LOGIN_APP_SECRET,
  // kept separate from META_APP_ID (DM automation) so the two never interfere.
  const getFacebookLoginConfig = () => ({
    appId: process.env.FACEBOOK_LOGIN_APP_ID || "",
    appSecret: process.env.FACEBOOK_LOGIN_APP_SECRET || "",
  });

  app.get("/api/auth/facebook", (req, res) => {
    const { appId, appSecret } = getFacebookLoginConfig();
    if (!appId || !appSecret) {
      return res.redirect("/login?error=facebook_failed&msg=Facebook+sign-in+not+configured");
    }
    const state = randomBytes(16).toString("hex");
    (req.session as any).fbLoginState = state;
    const refCode = (req.cookies as any)?.referral_code || (req.query.ref as string) || null;
    if (refCode) {
      (req.session as any).pendingReferralCode = refCode;
    }
    const redirectUri = `${getAppBase()}/api/auth/facebook/callback`;
    const authUrl =
      `https://www.facebook.com/v21.0/dialog/oauth` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&scope=${encodeURIComponent("email,public_profile")}` +
      `&response_type=code`;
    // Save session BEFORE redirecting to Facebook so state + referral survive the round-trip.
    req.session.save(() => {
      res.redirect(authUrl);
    });
  });

  app.get("/api/auth/facebook/callback", async (req, res) => {
    const fail = (msg: string) =>
      res.redirect(`/login?error=facebook_failed&msg=${encodeURIComponent(msg)}`);
    try {
      const { code, state, error, error_description } = req.query as any;
      if (error) {
        console.warn("[facebook-oauth] dialog error:", error, error_description);
        return fail(typeof error_description === "string" && error_description
          ? String(error_description).slice(0, 120)
          : "Facebook sign-in was cancelled");
      }
      const expectedState = (req.session as any)?.fbLoginState;
      delete (req.session as any).fbLoginState;
      if (!code || !state || !expectedState || state !== expectedState) {
        console.warn("[facebook-oauth] state mismatch or missing code");
        return fail("Sign-in session expired. Please try again.");
      }
      const { appId, appSecret } = getFacebookLoginConfig();
      if (!appId || !appSecret) return fail("Facebook sign-in not configured");

      // Passport v0.6+ regenerates the session inside req.logIn, wiping anything
      // stored earlier. Capture the referral code NOW (same as the Google flow).
      const capturedRefCode =
        (req.session as any)?.pendingReferralCode ||
        (req.cookies as any)?.referral_code ||
        null;

      const redirectUri = `${getAppBase()}/api/auth/facebook/callback`;
      const tokenResp = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?client_id=${encodeURIComponent(appId)}` +
        `&client_secret=${encodeURIComponent(appSecret)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${encodeURIComponent(code as string)}`
      );
      const tokenData = (await tokenResp.json()) as any;
      if (!tokenData.access_token) {
        console.error("[facebook-oauth] token exchange failed:", JSON.stringify(tokenData));
        return fail("Could not complete Facebook sign-in");
      }

      const profileResp = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(tokenData.access_token)}`
      );
      const profile = (await profileResp.json()) as any;
      if (!profile.id) {
        console.error("[facebook-oauth] profile fetch failed:", JSON.stringify(profile));
        return fail("Could not read your Facebook profile");
      }
      const email = profile.email as string | undefined;
      if (!email) {
        return fail("Facebook did not share an email address. Please use Google or email sign-up instead.");
      }
      const avatar: string | undefined = profile.picture?.data?.url || undefined;

      let user = await storage.getUserByFacebookId(profile.id);
      let isNewUser = false;
      if (!user) {
        user = await storage.getUserByEmail(email);
        if (user) {
          // Link Facebook ID to the existing account
          const updateData: any = { facebookId: profile.id, avatar: user.avatar || avatar };
          // If no survey record exists, reset surveyCompleted so the user goes through onboarding
          const hasSurvey = await storage.getOnboardingSurvey(user.id);
          if (!hasSurvey) updateData.surveyCompleted = false;
          await storage.updateUser(user.id, updateData);
          user = await storage.getUser(user.id);
        }
      }
      if (!user) {
        user = await storage.createUser({
          email,
          password: Math.random().toString(36),
          name: profile.name || email.split("@")[0],
          role: "client",
          avatar,
          facebookId: profile.id,
          planConfirmed: false,
          phoneVerified: true,
          surveyCompleted: false,
          hasVideoMarketingAddon: false,
        } as any);
        isNewUser = true;
      }
      if (!user) return fail("Could not create your account");

      req.logIn(user, async (loginErr) => {
        if (loginErr) {
          console.error("[facebook-oauth] login error:", loginErr);
          return fail("Could not sign in with Facebook");
        }
        if (isNewUser && capturedRefCode) {
          try {
            await storage.processReferralSignup(capturedRefCode, user.id, user.email || "");
            console.log("[referral] facebook signup: referrer credited, new user credited. code:", capturedRefCode, "user:", user.id);
          } catch (refErr) {
            console.error("[referral] facebook signup referral failed for", user.id, "code:", capturedRefCode, refErr);
          }
        }
        // Auto-enroll new Facebook users in "join" sequences
        if (isNewUser) {
          storage.getEmailSequences().then(seqs => {
            seqs.filter(s => s.trigger === "join" && s.active).forEach(s => storage.enrollUserInSequence(user.id, s.id).catch(() => { }));
          }).catch(() => { });
        }
        const dest = user.role === "admin"
          ? "/admin"
          : !(user as any).surveyCompleted
            ? "/onboarding"
            : user.planConfirmed
              ? "/dashboard"
              : "/select-plan";
        return res.redirect(dest);
      });
    } catch (err: any) {
      console.error("[facebook-oauth] callback error:", err);
      return fail(err?.message || "unknown");
    }
  });
}
