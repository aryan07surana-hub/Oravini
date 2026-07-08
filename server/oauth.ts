import type { Express, Request, Response } from "express";
import { pool } from "./storage";
import { encryptToken, decryptToken } from "./security/tokenEncryption";

// Helper to require authentication
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export function registerOAuthRoutes(app: Express) {
  const getAppBase = () => {
    return process.env.APP_URL || process.env.SITE_URL || process.env.PUBLIC_BASE_URL || "http://localhost:5000";
  };

  // ── Meta (Instagram/Facebook) OAuth ──────────────────────────────────────
  app.get("/api/oauth/meta/connect", requireAuth, (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const clientId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
    if (!clientId) return res.status(500).json({ message: "Meta OAuth not configured" });
    
    const redirectUri = `${getAppBase()}/api/oauth/meta/callback`;
    const scope = "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_messages";
    const state = Buffer.from(JSON.stringify({ userId })).toString("base64");
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;
    res.redirect(authUrl);
  });

  app.get("/api/oauth/meta/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.redirect("/dashboard?error=meta_auth_failed");

      const { userId } = JSON.parse(Buffer.from(state as string, "base64").toString());
      const clientId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
      const clientSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
      if (!clientId || !clientSecret) return res.redirect("/dashboard?error=meta_not_configured");

      const redirectUri = `${getAppBase()}/api/oauth/meta/callback`;
      
      // Exchange code for access token
      const tokenResp = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      const tokenData = await tokenResp.json();
      
      if (!tokenData.access_token) return res.redirect("/dashboard?error=meta_token_failed");

      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 5184000; // 60 days default
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Get user's Facebook pages
      const pagesResp = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`);
      const pagesData = await pagesResp.json();
      
      let igAccountId = null;
      let igUsername = null;
      let fbPageId = null;
      let fbPageName = null;

      // Get Instagram Business Account from first page
      if (pagesData.data && pagesData.data.length > 0) {
        const page = pagesData.data[0];
        fbPageId = page.id;
        fbPageName = page.name;

        const igResp = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
        const igData = await igResp.json();
        
        if (igData.instagram_business_account) {
          igAccountId = igData.instagram_business_account.id;
          
          // Get Instagram username
          const profileResp = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}?fields=username&access_token=${accessToken}`);
          const profileData = await profileResp.json();
          igUsername = profileData.username;
        }
      }

      // Save to database (encrypt token at rest)
      const encryptedToken = encryptToken(accessToken);
      await pool.query(
        `INSERT INTO meta_tokens (user_id, access_token, expires_at, scope, ig_account_id, ig_username, fb_page_id, fb_page_name, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           expires_at = EXCLUDED.expires_at,
           scope = EXCLUDED.scope,
           ig_account_id = EXCLUDED.ig_account_id,
           ig_username = EXCLUDED.ig_username,
           fb_page_id = EXCLUDED.fb_page_id,
           fb_page_name = EXCLUDED.fb_page_name,
           updated_at = NOW()`,
        [userId, encryptedToken, expiresAt, "instagram_basic,pages_show_list", igAccountId, igUsername, fbPageId, fbPageName]
      );

      res.redirect("/dashboard?connected=instagram");
    } catch (err: any) {
      console.error("[meta-oauth] callback error:", err);
      res.redirect("/dashboard?error=meta_callback_failed");
    }
  });

  app.post("/api/oauth/meta/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await pool.query("DELETE FROM meta_tokens WHERE user_id = $1", [userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/oauth/meta/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const result = await pool.query("SELECT * FROM meta_tokens WHERE user_id = $1", [userId]);
      const token = result.rows[0];
      
      if (!token) return res.json({ connected: false });
      
      const now = new Date();
      const expired = token.expires_at && new Date(token.expires_at) < now;
      
      res.json({
        connected: true,
        expired,
        igUsername: token.ig_username,
        fbPageName: token.fb_page_name,
        expiresAt: token.expires_at,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Meta Ads OAuth (ads_read scope — per-client token for ad account access) ──
  app.get("/api/oauth/meta-ads/connect", requireAuth, (req: Request, res: Response) => {
    const clientId = (req.query.clientId as string) || (req.user as any).id;
    const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
    if (!appId) return res.status(500).json({ message: "Meta App not configured (META_APP_ID missing)" });

    const redirectUri = `${getAppBase()}/api/oauth/meta-ads/callback`;
    const scope = "ads_read,business_management,pages_show_list";
    const state = Buffer.from(JSON.stringify({ clientId })).toString("base64");
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;
    res.redirect(authUrl);
  });

  app.get("/api/oauth/meta-ads/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.redirect("/admin/tracking?error=meta_ads_auth_failed");

      const { clientId } = JSON.parse(Buffer.from(state as string, "base64").toString());
      const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET;
      if (!appId || !appSecret) return res.redirect("/admin/tracking?error=meta_ads_not_configured");

      const redirectUri = `${getAppBase()}/api/oauth/meta-ads/callback`;
      const tokenResp = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      const tokenData = await tokenResp.json() as any;
      if (!tokenData.access_token) return res.redirect("/admin/tracking?error=meta_ads_token_failed");

      // Exchange for long-lived token (60 days)
      let accessToken = tokenData.access_token;
      try {
        const llResp = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
        );
        const llData = await llResp.json() as any;
        if (llData.access_token) accessToken = llData.access_token;
      } catch { /* use short-lived if exchange fails */ }

      // Fetch first ad account
      const acctResp = await fetch(
        `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status&access_token=${accessToken}`
      );
      const acctData = await acctResp.json() as any;
      const firstAccount = acctData?.data?.[0];
      if (!firstAccount) return res.redirect("/admin/tracking?error=no_ad_accounts_found");

      const { encryptToken } = await import("./security/tokenEncryption");
      const encryptedToken = encryptToken(accessToken);
      await pool.query(
        `INSERT INTO client_meta_ads_connections
           (client_id, access_token, ad_account_id, ad_account_name, is_active, connected_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW())
         ON CONFLICT (client_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           ad_account_id = EXCLUDED.ad_account_id,
           ad_account_name = EXCLUDED.ad_account_name,
           is_active = TRUE,
           connected_at = NOW()`,
        [clientId, encryptedToken, firstAccount.id, firstAccount.name]
      );

      res.redirect(`/admin/tracking?ads_connected=${clientId}`);
    } catch (err: any) {
      console.error("[meta-ads-oauth] callback error:", err);
      res.redirect("/admin/tracking?error=meta_ads_callback_failed");
    }
  });

  // ── LinkedIn OAuth ────────────────────────────────────────────────────────
  app.get("/api/oauth/linkedin/connect", requireAuth, (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) return res.status(500).json({ message: "LinkedIn OAuth not configured" });
    
    const redirectUri = `${getAppBase()}/api/oauth/linkedin/callback`;
    const scope = "openid profile email w_member_social";
    const state = Buffer.from(JSON.stringify({ userId })).toString("base64");
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    res.redirect(authUrl);
  });

  app.get("/api/oauth/linkedin/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.redirect("/dashboard?error=linkedin_auth_failed");

      const { userId } = JSON.parse(Buffer.from(state as string, "base64").toString());
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.redirect("/dashboard?error=linkedin_not_configured");

      const redirectUri = `${getAppBase()}/api/oauth/linkedin/callback`;
      
      // Exchange code for access token
      const tokenResp = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenResp.json();
      
      if (!tokenData.access_token) return res.redirect("/dashboard?error=linkedin_token_failed");

      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in || 5184000;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Get user profile
      const profileResp = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = await profileResp.json();

      // Check if token already exists
      const existing = await pool.query("SELECT id FROM linkedin_tokens WHERE user_id = $1", [userId]);
      const encryptedLinkedinToken = encryptToken(accessToken);
      
      if (existing.rows.length > 0) {
        await pool.query(
          "UPDATE linkedin_tokens SET access_token = $1, expires_at = $2, linkedin_name = $3 WHERE user_id = $4",
          [encryptedLinkedinToken, expiresAt, profileData.name || profileData.given_name, userId]
        );
      } else {
        await pool.query(
          "INSERT INTO linkedin_tokens (user_id, access_token, expires_at, linkedin_user_id, linkedin_name) VALUES ($1, $2, $3, $4, $5)",
          [userId, encryptedLinkedinToken, expiresAt, profileData.sub, profileData.name || profileData.given_name]
        );
      }

      res.redirect("/dashboard?connected=linkedin");
    } catch (err: any) {
      console.error("[linkedin-oauth] callback error:", err);
      res.redirect("/dashboard?error=linkedin_callback_failed");
    }
  });

  app.post("/api/oauth/linkedin/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await pool.query("DELETE FROM linkedin_tokens WHERE user_id = $1", [userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── X/Twitter OAuth ───────────────────────────────────────────────────────
  app.get("/api/oauth/twitter/connect", requireAuth, (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const clientId = process.env.TWITTER_CLIENT_ID;
    if (!clientId) return res.status(500).json({ message: "Twitter OAuth not configured" });
    
    const redirectUri = `${getAppBase()}/api/oauth/twitter/callback`;
    const scope = "tweet.read tweet.write users.read offline.access";
    const state = Buffer.from(JSON.stringify({ userId })).toString("base64");
    const codeChallenge = "challenge"; // In production, use PKCE properly
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=plain`;
    res.redirect(authUrl);
  });

  app.get("/api/oauth/twitter/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.redirect("/dashboard?error=twitter_auth_failed");

      const { userId } = JSON.parse(Buffer.from(state as string, "base64").toString());
      const clientId = process.env.TWITTER_CLIENT_ID;
      const clientSecret = process.env.TWITTER_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.redirect("/dashboard?error=twitter_not_configured");

      const redirectUri = `${getAppBase()}/api/oauth/twitter/callback`;
      
      // Exchange code for access token
      const tokenResp = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
          code_verifier: "challenge",
        }),
      });
      const tokenData = await tokenResp.json();
      
      if (!tokenData.access_token) return res.redirect("/dashboard?error=twitter_token_failed");

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 7200;
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Get user profile
      const profileResp = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = await profileResp.json();
      const twitterUserId = profileData.data?.id;
      const twitterHandle = profileData.data?.username;

      // Check if token already exists
      const existing = await pool.query("SELECT id FROM twitter_tokens WHERE user_id = $1", [userId]);
      const encryptedTwitterToken = encryptToken(accessToken);
      const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : null;
      
      if (existing.rows.length > 0) {
        await pool.query(
          "UPDATE twitter_tokens SET access_token = $1, refresh_token = $2, expires_at = $3, twitter_user_id = $4, twitter_handle = $5 WHERE user_id = $6",
          [encryptedTwitterToken, encryptedRefreshToken, expiresAt, twitterUserId, twitterHandle, userId]
        );
      } else {
        await pool.query(
          "INSERT INTO twitter_tokens (user_id, access_token, refresh_token, expires_at, twitter_user_id, twitter_handle) VALUES ($1, $2, $3, $4, $5, $6)",
          [userId, encryptedTwitterToken, encryptedRefreshToken, expiresAt, twitterUserId, twitterHandle]
        );
      }

      res.redirect("/dashboard?connected=twitter");
    } catch (err: any) {
      console.error("[twitter-oauth] callback error:", err);
      res.redirect("/dashboard?error=twitter_callback_failed");
    }
  });

  app.post("/api/oauth/twitter/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await pool.query("DELETE FROM twitter_tokens WHERE user_id = $1", [userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Gmail OAuth ───────────────────────────────────────────────────────────────
  app.get("/api/oauth/gmail/connect", requireAuth, (req: Request, res: Response) => {
    const userId = (req.user as any).id;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ message: "Gmail OAuth not configured" });

    const redirectUri = `${getAppBase()}/api/oauth/gmail/callback`;
    const scope = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ");
    const state = Buffer.from(JSON.stringify({ userId })).toString("base64");

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=consent`;
    res.redirect(authUrl);
  });

  app.get("/api/oauth/gmail/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) return res.redirect("/dashboard?error=gmail_auth_failed");

      const { userId } = JSON.parse(Buffer.from(state as string, "base64").toString());
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.redirect("/dashboard?error=gmail_not_configured");

      const redirectUri = `${getAppBase()}/api/oauth/gmail/callback`;

      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      });
      const tokenData = await tokenResp.json() as any;
      if (!tokenData.access_token) return res.redirect("/dashboard?error=gmail_token_failed");

      const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

      const profileResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileResp.json() as any;

      const encAccessToken = encryptToken(tokenData.access_token);
      const encRefreshToken = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : null;

      await pool.query(
        `INSERT INTO gmail_tokens (user_id, access_token, refresh_token, expires_at, gmail_address, gmail_name, scope, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = COALESCE(EXCLUDED.refresh_token, gmail_tokens.refresh_token),
           expires_at = EXCLUDED.expires_at,
           gmail_address = EXCLUDED.gmail_address,
           gmail_name = EXCLUDED.gmail_name,
           scope = EXCLUDED.scope,
           updated_at = NOW()`,
        [userId, encAccessToken, encRefreshToken, expiresAt, profile.email, profile.name,
          "gmail.send gmail.readonly"]
      );

      res.redirect("/dashboard?connected=gmail");
    } catch (err: any) {
      console.error("[gmail-oauth] callback error:", err);
      res.redirect("/dashboard?error=gmail_callback_failed");
    }
  });

  app.post("/api/oauth/gmail/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      await pool.query("DELETE FROM gmail_tokens WHERE user_id = $1", [userId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/oauth/gmail/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const result = await pool.query("SELECT * FROM gmail_tokens WHERE user_id = $1", [userId]);
      const token = result.rows[0];
      if (!token) return res.json({ connected: false });
      res.json({
        connected: true,
        gmailAddress: token.gmail_address,
        gmailName: token.gmail_name,
        expired: token.expires_at && new Date(token.expires_at) < new Date(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });
}
