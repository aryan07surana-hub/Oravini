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
import { registerMetaAdsRoutes } from "./metaAdsRoutes";
import { registerMetaAdsManagerRoutes } from "./metaAdsManagerRoutes";
import { registerMetaAdsCreationRoutes } from "./metaAdsCreationRoutes";
import { registerMetaAdsAgentRoutes } from "./metaAdsAgentRoutes";
import { runAgentForAllClients } from "./metaAdsAgent";
import { registerMetaAdsBatchRoutes } from "./metaAdsBatchRoutes";
import { registerMetaAdsAnalyticsRoutes } from "./metaAdsAnalyticsRoutes";
import { registerMetaAdsCampaignManagerRoutes } from "./metaAdsCampaignManagerRoutes";
import { registerMetaAdsMyRoutes } from "./metaAdsMyRoutes";
import { registerMetaAdsAIAdvisorRoutes } from "./metaAdsAIAdvisorRoutes";
import cron from "node-cron";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { comparePassword } from "./auth";
import { startCronJobs } from "./cron";
import { startWebinarEmailScheduler } from "./jobs/webinar-email-scheduler";
import { startSchedulingCronJobs } from "./schedulingCron";
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

  try {
    await pool.query(`
      ALTER TABLE video_events
        ADD COLUMN IF NOT EXISTS end_screen_config TEXT,
        ADD COLUMN IF NOT EXISTS social_share_enabled BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log("[migration] video_events end_screen + social_share ensured");
  } catch (e: any) {
    console.warn("[migration] video_events end_screen/social_share skipped:", e.message);
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

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dialer_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        twilio_account_sid TEXT, twilio_auth_token TEXT, twilio_phone_number TEXT,
        twilio_twiml_app_sid TEXT, default_script TEXT, sms_template TEXT,
        record_calls BOOLEAN NOT NULL DEFAULT TRUE, ai_provider TEXT NOT NULL DEFAULT 'vapi',
        vapi_api_key TEXT, vapi_assistant_id TEXT, bland_api_key TEXT, bland_voice_id TEXT,
        ai_system_prompt TEXT, updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_leads (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, company TEXT, notes TEXT,
        tags JSONB DEFAULT '[]'::jsonb, source_type TEXT NOT NULL DEFAULT 'manual',
        source_webinar_id VARCHAR, source_webinar_title TEXT,
        engagement_score INTEGER NOT NULL DEFAULT 0, priority TEXT NOT NULL DEFAULT 'normal',
        webinar_behavior JSONB, status TEXT NOT NULL DEFAULT 'pending',
        last_call_at TIMESTAMP, call_count INTEGER NOT NULL DEFAULT 0, next_call_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_call_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_id VARCHAR, lead_name TEXT NOT NULL, lead_phone TEXT NOT NULL,
        twilio_call_sid TEXT, duration_seconds INTEGER NOT NULL DEFAULT 0,
        outcome TEXT NOT NULL DEFAULT 'no_answer', notes TEXT, script_used TEXT,
        recording_url TEXT, started_at TIMESTAMP DEFAULT NOW(), ended_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS dialer_ai_campaigns (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'vapi', system_prompt TEXT,
        first_message TEXT, objective TEXT NOT NULL DEFAULT 'book_meeting',
        source_webinar_id VARCHAR, source_webinar_title TEXT,
        max_calls_per_hour INTEGER NOT NULL DEFAULT 10, concurrent_calls INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'draft', total_leads INTEGER NOT NULL DEFAULT 0,
        called_count INTEGER NOT NULL DEFAULT 0, answered_count INTEGER NOT NULL DEFAULT 0,
        booked_count INTEGER NOT NULL DEFAULT 0, not_interested_count INTEGER NOT NULL DEFAULT 0,
        started_at TIMESTAMP, completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_ai_call_results (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id VARCHAR, lead_id VARCHAR, lead_name TEXT NOT NULL, lead_phone TEXT NOT NULL,
        provider TEXT NOT NULL, provider_call_id TEXT, status TEXT NOT NULL DEFAULT 'initiated',
        outcome TEXT, duration_seconds INTEGER, transcript TEXT, summary TEXT, sentiment TEXT,
        appointment_booked BOOLEAN NOT NULL DEFAULT FALSE, appointment_time TEXT,
        hot_lead BOOLEAN NOT NULL DEFAULT FALSE, needs_human_followup BOOLEAN NOT NULL DEFAULT FALSE,
        recording_url TEXT, key_points JSONB DEFAULT '[]'::jsonb, objections JSONB DEFAULT '[]'::jsonb,
        started_at TIMESTAMP DEFAULT NOW(), ended_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS dialer_voicemails (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL, recording_url TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0, is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_local_numbers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone_number TEXT NOT NULL, area_code TEXT NOT NULL, state TEXT, city TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_sms_conversations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_id VARCHAR, lead_name TEXT NOT NULL, lead_phone TEXT NOT NULL,
        last_message TEXT, last_message_at TIMESTAMP DEFAULT NOW(),
        unread_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS dialer_sms_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id VARCHAR NOT NULL REFERENCES dialer_sms_conversations(id) ON DELETE CASCADE,
        direction TEXT NOT NULL, body TEXT NOT NULL, twilio_sid TEXT,
        status TEXT NOT NULL DEFAULT 'sent', sent_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_cadences (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL, trigger_outcome TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_cadence_steps (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        cadence_id VARCHAR NOT NULL REFERENCES dialer_cadences(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL DEFAULT 0, delay_hours INTEGER NOT NULL DEFAULT 0,
        action TEXT NOT NULL, template TEXT
      );
      CREATE TABLE IF NOT EXISTS dialer_cadence_enrollments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        cadence_id VARCHAR NOT NULL REFERENCES dialer_cadences(id) ON DELETE CASCADE,
        lead_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        next_run_at TIMESTAMP, enrolled_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cadence_id, lead_id)
      );
      CREATE TABLE IF NOT EXISTS dialer_callbacks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_id VARCHAR, lead_name TEXT NOT NULL, lead_phone TEXT NOT NULL,
        scheduled_for TIMESTAMP NOT NULL, notes TEXT, status TEXT NOT NULL DEFAULT 'pending'
      );
      CREATE TABLE IF NOT EXISTS dialer_goals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        daily_call_target INTEGER NOT NULL DEFAULT 50, daily_sms_target INTEGER NOT NULL DEFAULT 20,
        daily_booking_target INTEGER NOT NULL DEFAULT 5, weekly_call_target INTEGER NOT NULL DEFAULT 250,
        streak_days INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_objections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        objection TEXT NOT NULL, response TEXT, category TEXT NOT NULL DEFAULT 'other',
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT NOW(), created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dialer_timeline_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lead_id VARCHAR NOT NULL, event_type TEXT NOT NULL, title TEXT NOT NULL,
        body TEXT, metadata JSONB, occurred_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("[migration] dialer tables ensured");
  } catch (e: any) {
    console.warn("[migration] dialer tables skipped:", e.message);
  }

  try {
    await pool.query(`
      ALTER TABLE dialer_settings
        ADD COLUMN IF NOT EXISTS retell_api_key TEXT,
        ADD COLUMN IF NOT EXISTS retell_agent_id TEXT
    `);
    console.log("[migration] dialer_settings retell columns ensured");
  } catch (e: any) {
    console.warn("[migration] dialer_settings retell skipped:", e.message);
  }

  try {
    await pool.query(`
      ALTER TABLE dialer_settings
        ADD COLUMN IF NOT EXISTS open_ai_api_key TEXT,
        ADD COLUMN IF NOT EXISTS auto_sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS auto_sms_booked_template TEXT,
        ADD COLUMN IF NOT EXISTS auto_sms_no_answer_template TEXT,
        ADD COLUMN IF NOT EXISTS auto_sms_hot_lead_template TEXT
    `);
    console.log("[migration] dialer_settings ai-analysis columns ensured");
  } catch (e: any) {
    console.warn("[migration] dialer_settings ai-analysis skipped:", e.message);
  }

  try {
    await pool.query(`
      ALTER TABLE dialer_cadence_steps
        ADD COLUMN IF NOT EXISTS ai_personalize BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await pool.query(`
      ALTER TABLE dialer_cadence_enrollments
        ADD COLUMN IF NOT EXISTS current_step_index INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    `);
    console.log("[migration] dialer cadence sequence columns ensured");
  } catch (e: any) {
    console.warn("[migration] dialer cadence sequence skipped:", e.message);
  }

  try {
    await pool.query(`
      ALTER TABLE dialer_settings
        ADD COLUMN IF NOT EXISTS inbound_agent_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS inbound_agent_id TEXT
    `);
    await pool.query(`
      ALTER TABLE dialer_ai_call_results
        ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound'
    `);
    console.log("[migration] dialer inbound columns ensured");
  } catch (e: any) {
    console.warn("[migration] dialer inbound skipped:", e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dialer_ai_call_quota (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        calls_used INTEGER NOT NULL DEFAULT 0,
        bonus_calls_balance INTEGER NOT NULL DEFAULT 0,
        period_month TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`
      ALTER TABLE dialer_ai_call_quota
        ADD COLUMN IF NOT EXISTS bonus_calls_balance INTEGER NOT NULL DEFAULT 0
    `);
    console.log("[migration] dialer_ai_call_quota ensured");
  } catch (e: any) {
    console.warn("[migration] dialer_ai_call_quota skipped:", e.message);
  }

  // ── Coach Agent: persistent profiles + score history ─────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coach_profiles (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        niche TEXT,
        platform TEXT NOT NULL DEFAULT 'instagram',
        goal TEXT,
        follower_tier TEXT NOT NULL DEFAULT 'nano',
        content_style TEXT,
        avg_hook_score REAL NOT NULL DEFAULT 0,
        avg_clarity REAL NOT NULL DEFAULT 0,
        avg_persuasion REAL NOT NULL DEFAULT 0,
        avg_cta REAL NOT NULL DEFAULT 0,
        avg_brand_voice REAL NOT NULL DEFAULT 0,
        avg_overall REAL NOT NULL DEFAULT 0,
        total_sessions INTEGER NOT NULL DEFAULT 0,
        top_weakness TEXT,
        top_strength TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coach_profiles_user ON coach_profiles(user_id)`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coach_score_history (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        script_preview TEXT,
        overall_score INTEGER NOT NULL DEFAULT 0,
        clarity INTEGER NOT NULL DEFAULT 0,
        persuasion INTEGER NOT NULL DEFAULT 0,
        cta_strength INTEGER NOT NULL DEFAULT 0,
        brand_voice INTEGER NOT NULL DEFAULT 0,
        mode TEXT NOT NULL DEFAULT 'breakdown',
        goal TEXT,
        verdict TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coach_score_history_user ON coach_score_history(user_id, created_at DESC)`);
    console.log("[migration] coach agent tables ensured");
  } catch (e: any) {
    console.warn("[migration] coach agent tables skipped:", e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competitor_detected_posts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        watchlist_id VARCHAR NOT NULL REFERENCES competitor_watchlist(id) ON DELETE CASCADE,
        handle VARCHAR NOT NULL,
        post_url TEXT NOT NULL,
        short_code VARCHAR,
        caption TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        post_type VARCHAR NOT NULL DEFAULT 'reel',
        thumbnail TEXT,
        posted_at TIMESTAMP,
        detected_at TIMESTAMP DEFAULT NOW(),
        ai_analysis JSONB,
        ideas_generated BOOLEAN NOT NULL DEFAULT false
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cdp_user ON competitor_detected_posts(user_id, detected_at DESC)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cdp_url ON competitor_detected_posts(watchlist_id, post_url)`);
    await pool.query(`ALTER TABLE competitor_detected_posts ADD COLUMN IF NOT EXISTS is_seen BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competitor_content_ideas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_post_id VARCHAR REFERENCES competitor_detected_posts(id) ON DELETE SET NULL,
        competitor_handle VARCHAR NOT NULL,
        topic TEXT NOT NULL,
        hook TEXT NOT NULL,
        format VARCHAR NOT NULL DEFAULT 'reel',
        structure TEXT,
        cta TEXT,
        rationale TEXT,
        status VARCHAR NOT NULL DEFAULT 'idea',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cci_user ON competitor_content_ideas(user_id, created_at DESC)`);
    console.log("[migration] competitor intelligence feed tables ensured");
  } catch (e: any) {
    console.warn("[migration] competitor intelligence feed skipped:", e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_meta_ads_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token TEXT,
        ad_account_id TEXT NOT NULL,
        ad_account_name TEXT,
        connected_at TIMESTAMP DEFAULT NOW(),
        last_synced_at TIMESTAMP,
        token_expires_at TIMESTAMP,
        fb_user_id TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(client_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_campaigns_cache (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id TEXT NOT NULL,
        campaign_name TEXT,
        status TEXT,
        objective TEXT,
        budget_daily BIGINT,
        budget_lifetime BIGINT,
        spend TEXT DEFAULT '0',
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        cpm TEXT DEFAULT '0',
        cpc TEXT DEFAULT '0',
        ctr TEXT DEFAULT '0',
        reach INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        roas TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        synced_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_macc_client ON meta_ads_campaigns_cache(client_id, synced_at DESC)`);
    console.log("[migration] meta ads tables ensured");
  } catch (e: any) {
    console.warn("[migration] meta ads tables skipped:", e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_scaling_rules (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        condition_metric TEXT NOT NULL,
        condition_operator TEXT NOT NULL,
        condition_value NUMERIC NOT NULL,
        condition_window_days INTEGER NOT NULL DEFAULT 3,
        action_type TEXT NOT NULL,
        action_value NUMERIC,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_daily_snapshots (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id TEXT NOT NULL,
        campaign_name TEXT,
        snapshot_date DATE NOT NULL,
        spend NUMERIC DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        ctr NUMERIC DEFAULT 0,
        cpc NUMERIC DEFAULT 0,
        roas NUMERIC,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id, campaign_id, snapshot_date)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_cogs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_name TEXT NOT NULL,
        selling_price NUMERIC NOT NULL,
        cogs_amount NUMERIC NOT NULL,
        currency TEXT DEFAULT 'USD',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(client_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_reports (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_date DATE NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        ai_summary TEXT,
        metrics_snapshot JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_masr_client ON meta_ads_scaling_rules(client_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mads_client ON meta_ads_daily_snapshots(client_id, snapshot_date DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_maar_client ON meta_ads_reports(client_id, report_date DESC)`);
    console.log("[migration] meta ads manager tables ensured");
  } catch (e: any) {
    console.warn("[migration] meta ads manager tables skipped:", e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admin_doc_files (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        parent_id VARCHAR REFERENCES super_admin_doc_files(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admin_docs (
        id VARCHAR PRIMARY KEY,
        file_id VARCHAR NOT NULL REFERENCES super_admin_doc_files(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        type VARCHAR NOT NULL DEFAULT 'link',
        url TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[migration] super_admin_doc tables ensured");
  } catch (e: any) {
    console.warn("[migration] super_admin_doc tables skipped:", e.message);
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS super_admin_inspiration_images (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    console.log("[migration] super_admin_inspiration_images ensured");
  } catch (e: any) {
    console.warn("[migration] super_admin_inspiration_images skipped:", e.message);
  }

  // ── Skills System ─────────────────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Skill" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'content',
        platforms TEXT[] NOT NULL DEFAULT '{}',
        instructions TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '⚡',
        tags TEXT[] NOT NULL DEFAULT '{}',
        "isSystem" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdBy" TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT FALSE,
        "usageCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "UserSkill" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "skillId" TEXT NOT NULL REFERENCES "Skill"(id) ON DELETE CASCADE,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "installedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "lastUsedAt" TIMESTAMPTZ,
        UNIQUE("userId", "skillId")
      )
    `);
    await pool.query(`
      ALTER TABLE "UserSkill" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMPTZ
    `);
    await pool.query(`
      ALTER TABLE "UserSkill" ADD COLUMN IF NOT EXISTS "useCount" INTEGER NOT NULL DEFAULT 0
    `);
    console.log("[migration] skills tables ensured");
  } catch (e: any) {
    console.warn("[migration] skills tables skipped:", e.message);
  }

  // ── Meta Ads Launch Log ───────────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_launch_log (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        launched_at TIMESTAMPTZ DEFAULT NOW(),
        instruction TEXT,
        campaigns_created JSONB,
        status TEXT DEFAULT 'success'
      )
    `);
    console.log("[migration] meta_ads_launch_log ensured");
  } catch (e: any) {
    console.warn("[migration] meta_ads_launch_log skipped:", e.message);
  }

  // ── Meta Ads Agent Logs ───────────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_agent_logs (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        type TEXT NOT NULL,
        ai_summary TEXT,
        raw_data JSONB,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_logs_client ON meta_ads_agent_logs(client_id, created_at DESC)`);
    console.log("[migration] meta_ads_agent_logs ensured");
  } catch (e: any) {
    console.warn("[migration] meta_ads_agent_logs skipped:", e.message);
  }

  // ── Meta Ads Ad-Level Cache ───────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_ads_cache (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        ad_id TEXT NOT NULL,
        ad_name TEXT NOT NULL,
        campaign_id TEXT,
        campaign_name TEXT,
        adset_id TEXT,
        adset_name TEXT,
        status TEXT,
        creative_id TEXT,
        creative_name TEXT,
        thumbnail_url TEXT,
        spend NUMERIC DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        ctr NUMERIC DEFAULT 0,
        cpc NUMERIC DEFAULT 0,
        cpm NUMERIC DEFAULT 0,
        roas NUMERIC,
        frequency NUMERIC DEFAULT 0,
        synced_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(client_id, ad_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ads_cache_client ON meta_ads_ads_cache(client_id, spend DESC)`);
    console.log("[migration] meta_ads_ads_cache ensured");
  } catch (e: any) {
    console.warn("[migration] meta_ads_ads_cache skipped:", e.message);
  }

  // ── Meta Ads Ad-Level Time-Series Snapshots ───────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_ad_snapshots (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        ad_id TEXT NOT NULL,
        ad_name TEXT,
        campaign_id TEXT,
        campaign_name TEXT,
        adset_id TEXT,
        adset_name TEXT,
        snapshot_date DATE NOT NULL,
        spend NUMERIC DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        ctr NUMERIC DEFAULT 0,
        cpc NUMERIC DEFAULT 0,
        cpm NUMERIC DEFAULT 0,
        roas NUMERIC,
        UNIQUE(client_id, ad_id, snapshot_date)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ad_snapshots_client ON meta_ads_ad_snapshots(client_id, snapshot_date DESC)`);
    console.log("[migration] meta_ads_ad_snapshots ensured");
  } catch (e: any) {
    console.warn("[migration] meta_ads_ad_snapshots skipped:", e.message);
  }

  // ── Meta Ads Bulk Jobs ────────────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_bulk_jobs (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        job_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        total_count INTEGER DEFAULT 0,
        completed_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        config JSONB,
        results JSONB,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ
      )
    `);
    console.log("[migration] meta_ads_bulk_jobs ensured");
  } catch (e: any) {
    console.warn("[migration] meta_ads_bulk_jobs skipped:", e.message);
  }

  // ── Meta Ads Campaign Templates ───────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meta_ads_templates (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        structure JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[migration] meta_ads_templates ensured");
  } catch (e: any) {
    console.warn("[migration] meta_ads_templates skipped:", e.message);
  }

  // ── DM AI Brain (BYOK) ───────────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dm_ai_configs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(20) NOT NULL DEFAULT 'claude',
        api_key_encrypted TEXT NOT NULL,
        system_prompt TEXT NOT NULL DEFAULT '',
        voice_description TEXT NOT NULL DEFAULT '',
        example_conversations JSONB DEFAULT '[]',
        auto_tag_rules JSONB DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS dm_ai_configs_user_id_idx ON dm_ai_configs(user_id)`);
    console.log("[migration] dm_ai_configs ensured");
  } catch (e: any) {
    console.warn("[migration] dm_ai_configs skipped:", e.message);
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
  registerMetaAdsRoutes(app);
  registerMetaAdsManagerRoutes(app);
  registerMetaAdsCreationRoutes(app);
  registerMetaAdsAgentRoutes(app);
  registerMetaAdsBatchRoutes(app);
  registerMetaAdsAnalyticsRoutes(app);
  registerMetaAdsCampaignManagerRoutes(app);
  registerMetaAdsMyRoutes(app);
  await registerMetaAdsAIAdvisorRoutes(app);

  // ── Meta Ads AI Agent — scheduled runs ───────────────────────────────────
  // 24h update: every day at 8:00 AM
  cron.schedule("0 8 * * *", () => {
    runAgentForAllClients("24h_update").catch(err =>
      console.error("[meta-ads-agent] cron 24h failed:", err)
    );
  });
  // 72h creative alert: every 3 days at 9:00 AM (Mon, Thu)
  cron.schedule("0 9 * * 1,4", () => {
    runAgentForAllClients("72h_creative_alert").catch(err =>
      console.error("[meta-ads-agent] cron 72h failed:", err)
    );
  });
  console.log("[meta-ads-agent] Scheduled: 24h updates @ 8am daily, 72h creative alerts Mon+Thu @ 9am");

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
    startSchedulingCronJobs();
  });
})();
