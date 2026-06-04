/**
 * Security Middleware Module
 * 
 * Implements comprehensive security measures:
 * - Helmet (security headers: CSP, HSTS, X-Frame-Options, etc.)
 * - CORS with strict origin control
 * - Rate limiting (global + auth-specific)
 * - HTTP Parameter Pollution protection
 * - Request sanitization (XSS prevention)
 * - CSRF protection via SameSite cookies + origin checking
 * - Secure session configuration
 * - Audit logging
 */

import type { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";
// @ts-ignore - no type declarations available
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
// @ts-ignore - no type declarations available
import hpp from "hpp";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getAllowedOrigins(): string[] {
  // Build the allow-list from any/all of the configured env vars so deployments
  // that only set one of APP_URL / SITE_URL / PUBLIC_BASE_URL / RENDER_EXTERNAL_URL
  // still match same-origin browser requests. We also auto-include the public
  // production domains so a missing env var can never lock the site out.
  const fromEnv = [
    process.env.APP_URL,
    process.env.SITE_URL,
    process.env.PUBLIC_BASE_URL,
    process.env.RENDER_EXTERNAL_URL,
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => v.replace(/\/$/, ""));

  const productionDefaults = [
    "https://oravini.com",
    "https://www.oravini.com",
  ];

  // De-duplicate while preserving order
  return Array.from(new Set([...fromEnv, ...productionDefaults]));
}

function getAppOrigin(): string {
  // Primary origin used for CSRF / referer checks. Prefer explicit env, fall
  // back to the first known production origin, then localhost for dev.
  const explicit = (
    process.env.APP_URL ||
    process.env.SITE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ""
  ).replace(/\/$/, "");
  if (explicit) return explicit;
  return isProduction() ? "https://oravini.com" : "http://localhost:5000";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

// ─── Security Headers (Helmet) ──────────────────────────────────────────────

function applyHelmet(app: Express) {
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com", "https://www.facebook.com", "https://connect.facebook.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          connectSrc: ["'self'", "https://api.anthropic.com", "https://graph.facebook.com", "https://api.linkedin.com", "https://api.twitter.com", "wss:", "ws:"],
          frameSrc: ["'self'", "https://accounts.google.com", "https://www.facebook.com"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'", "https://accounts.google.com", "https://www.facebook.com", "https://www.linkedin.com", "https://twitter.com"],
          frameAncestors: ["'self'"],
          reportUri: "/api/security/csp-report",
          upgradeInsecureRequests: isProduction() ? [] : null,
        },
      },
      // Strict Transport Security (HTTPS enforcement)
      strictTransportSecurity: isProduction()
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      // Prevent clickjacking
      frameguard: { action: "sameorigin" },
      // Prevent MIME type sniffing
      noSniff: true,
      // XSS filter (legacy browsers)
      xssFilter: true,
      // Hide X-Powered-By
      hidePoweredBy: true,
      // Referrer Policy
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      // Cross-Origin policies
      crossOriginEmbedderPolicy: false, // disabled to allow loading external images
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    })
  );
}

// ─── CORS ───────────────────────────────────────────────────────────────────

function applyCors(app: Express) {
  const allowedOrigins = new Set(getAllowedOrigins());

  // In development, also allow common local origins
  if (!isProduction()) {
    [
      "http://localhost:5000",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5000",
    ].forEach((o) => allowedOrigins.add(o));
  }

  // Only run CORS for /api requests. Static assets (HTML, JS, CSS, images) are
  // same-origin by construction and must NEVER be gated by CORS — gating them
  // turns any disallowed Origin into a 500 from the global error handler,
  // which produces a white screen.
  app.use("/api", (req, res, next) => {
    const corsMw = cors({
      origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no Origin header (mobile apps, curl, server-to-server, same-origin GETs)
        if (!requestOrigin) return callback(null, true);
        if (allowedOrigins.has(requestOrigin)) {
          return callback(null, true);
        }
        // Don't throw — CORS spec says simply omit the ACAO header for
        // disallowed origins. Throwing here would 500 the request.
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
      exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
      maxAge: 86400, // Cache preflight for 24 hours
    });
    return corsMw(req, res, next);
  });
}

// ─── Rate Limiting ──────────────────────────────────────────────────────────

function applyRateLimiting(app: Express) {
  // Global rate limit: 200 requests per minute per IP
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
    skip: (req) => {
      // Skip rate limiting for static assets
      return !req.path.startsWith("/api");
    },
  });

  // Strict rate limit for auth endpoints: 10 attempts per 15 minutes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts. Please try again in 15 minutes." },
    keyGenerator: (req) => {
      // Rate limit by IP + email combo to prevent distributed attacks.
      // Use ipKeyGenerator helper for IPv6-safe IP normalization.
      const email = req.body?.email || "";
      const ip = ipKeyGenerator(req.ip ?? "");
      return `${ip}-${email}`;
    },
  });

  // Rate limit for password reset / OTP: 5 per 15 minutes
  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many OTP requests. Please try again later." },
  });

  // Rate limit for AI endpoints: 30 per minute
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "AI rate limit reached. Please slow down." },
  });

  app.use("/api", globalLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/send-otp", otpLimiter);
  app.use("/api/auth/verify-otp", otpLimiter);
  app.use("/api/auth/forgot-password", otpLimiter);
  app.use("/api/auth/reset-password", otpLimiter);
  app.use("/api/ai", aiLimiter);
}

// ─── HTTP Parameter Pollution Protection ────────────────────────────────────

function applyHpp(app: Express) {
  app.use(hpp());
}

// ─── Input Sanitization (XSS Prevention) ────────────────────────────────────

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Strip common XSS vectors from string inputs
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/javascript\s*:/gi, "");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  return value;
}

function applySanitization(app: Express) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === "object") {
      for (const key of Object.keys(req.query)) {
        if (typeof req.query[key] === "string") {
          req.query[key] = sanitizeValue(req.query[key]) as string;
        }
      }
    }
    next();
  });
}

// ─── CSRF Protection (Origin/Referer Check for State-Changing Requests) ─────

function applyCsrfProtection(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Only check state-changing methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    // Skip for non-API routes
    if (!req.path.startsWith("/api")) {
      return next();
    }

    // Skip for OAuth callbacks (they come from external origins)
    if (req.path.includes("/oauth/") && req.path.includes("/callback")) {
      return next();
    }

    const origin = req.get("origin");
    const referer = req.get("referer");
    const allowedOrigins = new Set(getAllowedOrigins());

    // If origin header is present, validate it against the allow-list
    if (origin) {
      if (allowedOrigins.has(origin) || origin.startsWith("http://localhost")) {
        return next();
      }
      // In production, reject mismatched origins
      if (isProduction()) {
        return res.status(403).json({ message: "Forbidden: Invalid origin" });
      }
    }

    // If no origin but referer is present, validate referer host against any allowed origin
    if (!origin && referer) {
      try {
        const refererHost = new URL(referer).host;
        for (const allowed of allowedOrigins) {
          if (new URL(allowed).host === refererHost) {
            return next();
          }
        }
      } catch {
        // Invalid referer URL, continue
      }
    }

    // Allow requests without origin/referer (same-origin requests from some browsers, API clients)
    // In a stricter setup, you'd reject these in production
    next();
  });
}

// ─── Audit Logging ──────────────────────────────────────────────────────────

function applyAuditLogging(app: Express) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Log security-sensitive actions
    const sensitivePatterns = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/change-password",
      "/api/admin",
      "/api/oauth",
    ];

    const isSensitive = sensitivePatterns.some((p) => req.path.startsWith(p));

    if (isSensitive && req.method !== "GET") {
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress,
        userId: (req.user as any)?.id || "anonymous",
        userAgent: req.get("user-agent")?.substring(0, 100),
      };
      console.log(`[AUDIT] ${JSON.stringify(logEntry)}`);
    }

    next();
  });
}

// ─── Additional Security Headers for API Responses ──────────────────────────

function applyApiSecurityHeaders(app: Express) {
  app.use("/api", (_req: Request, res: Response, next: NextFunction) => {
    // Prevent caching of API responses with sensitive data
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    // Permissions Policy (restrict browser features)
    res.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()"
    );
    next();
  });
}

// ─── Main Export: Apply All Security Middleware ──────────────────────────────

export function applySecurityMiddleware(app: Express) {
  // Order matters: headers first, then CORS, then rate limiting, then body processing
  applyHelmet(app);
  applyCors(app);
  applyRateLimiting(app);
  applyHpp(app);
  applySanitization(app);
  applyCsrfProtection(app);
  applyAuditLogging(app);
  applyApiSecurityHeaders(app);

  console.log("[security] All security middleware applied");
}

// ─── Secure Session Configuration Helper ────────────────────────────────────

export function getSecureSessionConfig() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "change-me-to-a-long-random-secret") {
    if (isProduction()) {
      throw new Error(
        "SESSION_SECRET must be set to a strong random value in production!"
      );
    }
    console.warn(
      "[security] WARNING: Using default session secret. Set SESSION_SECRET env var!"
    );
  }

  return {
    secret: secret || "dev-only-insecure-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true, // Prevent XSS access to cookie
      secure: isProduction(), // HTTPS only in production
      sameSite: "lax" as const, // CSRF protection
      path: "/",
    },
    name: "__session", // Non-default name to avoid fingerprinting
  };
}

// ─── Password Strength Validation ───────────────────────────────────────────

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters");
  }
  // Optional: Add password strength recommendations (but don't enforce)
  // Users can choose simple passwords if they want

  return { valid: errors.length === 0, errors };
}

// ─── Account Lockout Helper ─────────────────────────────────────────────────

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkAccountLockout(email: string): {
  locked: boolean;
  remainingMs?: number;
} {
  const key = email.toLowerCase();
  const record = loginAttempts.get(key);

  if (!record) return { locked: false };

  if (record.lockedUntil > Date.now()) {
    return { locked: true, remainingMs: record.lockedUntil - Date.now() };
  }

  // Lockout expired, reset
  if (record.lockedUntil <= Date.now() && record.count >= MAX_LOGIN_ATTEMPTS) {
    loginAttempts.delete(key);
  }

  return { locked: false };
}

export function recordFailedLogin(email: string): void {
  const key = email.toLowerCase();
  const record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  loginAttempts.set(key, record);
}

export function clearFailedLogins(email: string): void {
  loginAttempts.delete(email.toLowerCase());
}
