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

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());

const PgSession = connectPgSimple(session);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "brandverse-secret-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) return done(null, false, { message: "NO_ACCOUNT" });
      // Google-only accounts have no real password — direct them to Google sign-in
      if (user.googleId && !user.password) return done(null, false, { message: "GOOGLE_ACCOUNT" });
      const valid = await comparePassword(password, user.password || "");
      // If password fails and they have a googleId, their account is Google-linked
      if (!valid && user.googleId) return done(null, false, { message: "GOOGLE_ACCOUNT" });
      if (!valid) return done(null, false, { message: "Invalid email or password" });
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
    console.warn("[migration] skipped:", e.message);
  }
}

(async () => {
  await runMigrations();
  await registerRoutes(httpServer, app);
  registerOAuthRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
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
  });
})();
