import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { registerRoutes } from "./routes";
import { registerOAuthRoutes } from "./oauth";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { comparePassword } from "./auth";
import { startCronJobs } from "./cron";
import { startWebinarEmailScheduler } from "./jobs/webinar-email-scheduler";
import { startRtmpServer } from "./rtmp";
import { applySecurityMiddleware, getSecureSessionConfig, checkAccountLockout, recordFailedLogin, clearFailedLogins } from "./security";
import { initAuditLog, initSessionManager, initSuspiciousLoginDetection, initWsAuth, registerCspReportingEndpoint, writeAuditLog, AuditActions, checkLoginDevice, sendSuspiciousLoginAlert } from "./security/index";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ─── Security Middleware (must be applied early) ────────────────────────────
applySecurityMiddleware(app);

app.use(
  express.json({
    limit: "10mb", // Reduced from 50mb to prevent payload DoS attacks
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());

// Required for Render/any reverse-proxy: makes req.secure, req.ip, req.protocol correct
app.set("trust proxy", 1);

const PgSession = connectPgSimple(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Secure Session Configuration ──────────────────────────────────────────
const sessionConfig = getSecureSessionConfig();
app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    ...sessionConfig,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Track session metadata (IP + User-Agent) for session management ────
app.use((req, _res, next) => {
  if (req.session && req.isAuthenticated()) {
    (req.session as any)._ip = req.ip || req.socket.remoteAddress;
    (req.session as any)._userAgent = req.get("user-agent");
    if (!(req.session as any)._createdAt) {
      (req.session as any)._createdAt = new Date().toISOString();
    }
  }
  next();
});

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      // ─── Account Lockout Check ──────────────────────────────────────────
      const lockout = checkAccountLockout(email);
      if (lockout.locked) {
        const minutes = Math.ceil((lockout.remainingMs || 0) / 60000);
        return done(null, false, { message: `Account locked. Try again in ${minutes} minutes.` });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        recordFailedLogin(email);
        return done(null, false, { message: "NO_ACCOUNT" });
      }
      // Google-only accounts have no real password — direct them to Google sign-in
      if (user.googleId && !user.password) return done(null, false, { message: "GOOGLE_ACCOUNT" });
      const valid = await comparePassword(password, user.password || "");
      // If password fails and they have a googleId, their account is Google-linked
      if (!valid && user.googleId) return done(null, false, { message: "GOOGLE_ACCOUNT" });
      if (!valid) {
        recordFailedLogin(email);
        return done(null, false, { message: "Invalid email or password" });
      }
      // Successful login — clear failed attempts
      clearFailedLogins(email);
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

const baseUrl = (
  process.env.APP_URL ||
  process.env.SITE_URL ||
  process.env.PUBLIC_BASE_URL ||
  `http://localhost:${process.env.PORT || "5000"}`
).replace(/\/$/, "");
const GOOGLE_CALLBACK_URL = `${baseUrl}/api/auth/google/callback`;

console.log("[google-oauth] callbackURL:", GOOGLE_CALLBACK_URL);

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          console.error("[google-oauth] No email in profile");
          return done(null, false);
        }
        let user = await storage.getUserByGoogleId(profile.id);
        if (!user) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // Link Google ID to existing account
            const updateData: any = { googleId: profile.id, avatar: user.avatar || profile.photos?.[0]?.value };
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
            name: profile.displayName || email.split("@")[0],
            role: "client",
            avatar: profile.photos?.[0]?.value,
            googleId: profile.id,
            planConfirmed: false,
            phoneVerified: true,
            surveyCompleted: false,
            hasVideoMarketingAddon: false,
          } as any);
          (user as any)._isNewGoogleUser = true;
        }
        return done(null, user!);
      } catch (err) {
        console.error("[google-oauth] strategy error:", err);
        return done(err as Error);
      }
    }
  ));
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user || false);
  } catch (err) {
    done(err);
  }
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE content_posts
        ADD COLUMN IF NOT EXISTS shares INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS content_style TEXT,
        ADD COLUMN IF NOT EXISTS shares_2w INTEGER,
        ADD COLUMN IF NOT EXISTS shares_4w INTEGER
    `);
    console.log("[migration] content_posts columns ensured");
  } catch (e: any) {
    console.warn("[migration] content_posts skipped:", e.message);
  }

  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS has_video_marketing BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("[migration] users.has_video_marketing ensured");
  } catch (e: any) {
    console.warn("[migration] users.has_video_marketing skipped:", e.message);
  }

  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS has_video_marketing_addon BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("[migration] users.has_video_marketing_addon ensured");
  } catch (e: any) {
    console.warn("[migration] users.has_video_marketing_addon skipped:", e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        channel TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
        is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      )
    `);
    console.log("[migration] community tables ensured");
  } catch (e: any) {
    console.warn("[migration] community tables skipped:", e.message);
  }

  // ── Video Marketing platform: video_events extended columns (Wistia-style features) ──
  try {
    await pool.query(`
      ALTER TABLE video_events
        ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS animated_thumbnail_url TEXT,
        ADD COLUMN IF NOT EXISTS seo_title TEXT,
        ADD COLUMN IF NOT EXISTS seo_description TEXT,
        ADD COLUMN IF NOT EXISTS edit_metadata TEXT
    `);
    console.log("[migration] video_events Wistia-style columns ensured");
  } catch (e: any) {
    console.warn("[migration] video_events extended columns skipped:", e.message);
  }

  // ── Video Marketing: feature tables (templates, interactive elements, A/B, channels, dubbing, collab) ──
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webinar_templates (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        thumbnail_url TEXT,
        usage_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_webinar_templates_user ON webinar_templates(user_id);

      CREATE TABLE IF NOT EXISTS video_interactive_elements (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        video_event_id VARCHAR NOT NULL REFERENCES video_events(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        end_timestamp INTEGER,
        text TEXT,
        url TEXT,
        require_email BOOLEAN DEFAULT TRUE,
        require_name BOOLEAN DEFAULT FALSE,
        skip_allowed BOOLEAN DEFAULT FALSE,
        cta_type TEXT,
        cta_text TEXT,
        cta_button_text TEXT,
        cta_button_url TEXT,
        cta_image_url TEXT,
        cta_html TEXT,
        cta_position TEXT DEFAULT 'center',
        impressions INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_video_interactive_video ON video_interactive_elements(video_event_id);

      CREATE TABLE IF NOT EXISTS video_ab_tests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        test_type TEXT NOT NULL DEFAULT 'video',
        video_a_id VARCHAR REFERENCES video_events(id) ON DELETE CASCADE,
        video_b_id VARCHAR REFERENCES video_events(id) ON DELETE CASCADE,
        variant_a_config TEXT,
        variant_b_config TEXT,
        split_ratio INTEGER NOT NULL DEFAULT 50,
        status TEXT NOT NULL DEFAULT 'running',
        plays_a INTEGER NOT NULL DEFAULT 0,
        plays_b INTEGER NOT NULL DEFAULT 0,
        conversions_a INTEGER NOT NULL DEFAULT 0,
        conversions_b INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_video_ab_user ON video_ab_tests(user_id);

      CREATE TABLE IF NOT EXISTS video_channels (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT UNIQUE,
        theme TEXT NOT NULL DEFAULT 'dark',
        accent_color TEXT DEFAULT '#d4b461',
        cover_url TEXT,
        logo_url TEXT,
        subscribable BOOLEAN NOT NULL DEFAULT TRUE,
        subscriber_count INTEGER NOT NULL DEFAULT 0,
        is_public BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE video_channels
        ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
      CREATE INDEX IF NOT EXISTS idx_video_channels_user ON video_channels(user_id);

      CREATE TABLE IF NOT EXISTS video_channel_episodes (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR NOT NULL REFERENCES video_channels(id) ON DELETE CASCADE,
        video_event_id VARCHAR NOT NULL REFERENCES video_events(id) ON DELETE CASCADE,
        section TEXT DEFAULT 'Episodes',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_video_channel_episodes_channel ON video_channel_episodes(channel_id);

      CREATE TABLE IF NOT EXISTS video_channel_subscribers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id VARCHAR NOT NULL REFERENCES video_channels(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        name TEXT,
        subscribed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(channel_id, email)
      );

      CREATE TABLE IF NOT EXISTS video_dubbing_jobs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        video_event_id VARCHAR NOT NULL REFERENCES video_events(id) ON DELETE CASCADE,
        job_type TEXT NOT NULL,
        target_language TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        output_url TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_video_dubbing_jobs_video ON video_dubbing_jobs(video_event_id);

      CREATE TABLE IF NOT EXISTS video_collab_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        video_event_id VARCHAR NOT NULL REFERENCES video_events(id) ON DELETE CASCADE,
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        author_name TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp INTEGER NOT NULL DEFAULT 0,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_video_collab_comments_video ON video_collab_comments(video_event_id);
    `);
    console.log("[migration] video marketing feature tables ensured");
  } catch (e: any) {
    console.warn("[migration] video marketing feature tables skipped:", e.message);
  }

  // ── SMS Marketing tables (sequences, enrollments, logs, templates, tags) ──
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_sequences (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        trigger TEXT NOT NULL DEFAULT 'manual',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE sms_sequences
        ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

      CREATE TABLE IF NOT EXISTS sms_sequence_steps (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence_id VARCHAR NOT NULL REFERENCES sms_sequences(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        delay_minutes INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_enrollments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        phone TEXT NOT NULL,
        sequence_id VARCHAR NOT NULL REFERENCES sms_sequences(id) ON DELETE CASCADE,
        current_step INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,
        enrolled_at TIMESTAMP DEFAULT NOW(),
        next_send_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sms_enrollments_phone ON sms_enrollments(phone);
      CREATE INDEX IF NOT EXISTS idx_sms_enrollments_next ON sms_enrollments(next_send_at) WHERE NOT completed AND NOT unsubscribed;

      CREATE TABLE IF NOT EXISTS sms_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        to_phone TEXT NOT NULL,
        message TEXT NOT NULL,
        sequence_step_id VARCHAR,
        broadcast_id VARCHAR,
        sent_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_broadcasts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        segment TEXT NOT NULL DEFAULT 'all',
        recipients_count INTEGER,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_unsubscribes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        phone TEXT NOT NULL UNIQUE,
        unsubscribed_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_templates (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_contact_tags (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#d4b461',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_contact_tag_assignments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        phone TEXT NOT NULL,
        tag_id VARCHAR NOT NULL REFERENCES sms_contact_tags(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_step_variants (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        step_id VARCHAR NOT NULL REFERENCES sms_sequence_steps(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_control BOOLEAN NOT NULL DEFAULT FALSE,
        opens INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_carrier_gateways (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        phone TEXT NOT NULL UNIQUE,
        carrier_name TEXT NOT NULL DEFAULT 'unknown',
        gateway_domain TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[migration] SMS marketing tables ensured");
  } catch (e: any) {
    console.warn("[migration] SMS marketing tables skipped:", e.message);
  }
}

(async () => {
  await runMigrations();

  // ─── Initialize Security Modules ────────────────────────────────────────
  await initAuditLog(pool);
  initSessionManager(pool);
  await initSuspiciousLoginDetection(pool);
  initWsAuth(pool);
  registerCspReportingEndpoint(app);

  // Start RTMP server for self-hosted HLS streaming
  if (process.env.DISABLE_RTMP !== "true") {
    try {
      startRtmpServer();
    } catch (err) {
      console.error("[rtmp] Failed to start:", err);
    }
  }

  await registerRoutes(httpServer, app);
  registerOAuthRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === "production" && status === 500
      ? "Internal Server Error"
      : err.message || "Internal Server Error";
    // Only log full error details server-side
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`Brandverse portal serving on port ${port}`);
    startCronJobs();
    startWebinarEmailScheduler();
  });
})();
