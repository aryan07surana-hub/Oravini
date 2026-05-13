/**
 * Content Security Policy Violation Reporting
 * 
 * Provides an endpoint that receives CSP violation reports from browsers
 * and logs them for security monitoring.
 */

import type { Express, Request, Response } from "express";
import { writeAuditLog, AuditActions } from "./auditLog";

interface CspReport {
  "csp-report"?: {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "original-policy"?: string;
    "blocked-uri"?: string;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
    disposition?: string;
  };
}

// Rate limit CSP reports to prevent flooding
const reportCounts = new Map<string, { count: number; resetAt: number }>();
const MAX_REPORTS_PER_IP = 50;
const REPORT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Register the CSP report endpoint.
 * This should be called after body parsing middleware is set up.
 */
export function registerCspReportingEndpoint(app: Express): void {
  // CSP reports are sent as application/csp-report or application/json
  app.post("/api/security/csp-report", (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    // Rate limit reports per IP
    const now = Date.now();
    const record = reportCounts.get(ip) || { count: 0, resetAt: now + REPORT_WINDOW_MS };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + REPORT_WINDOW_MS;
    }
    record.count++;
    reportCounts.set(ip, record);

    if (record.count > MAX_REPORTS_PER_IP) {
      return res.status(429).end();
    }

    try {
      const report = req.body as CspReport;
      const violation = report?.["csp-report"];

      if (!violation) {
        return res.status(400).end();
      }

      // Log the violation
      const logEntry = {
        documentUri: violation["document-uri"],
        violatedDirective: violation["violated-directive"],
        effectiveDirective: violation["effective-directive"],
        blockedUri: violation["blocked-uri"],
        sourceFile: violation["source-file"],
        lineNumber: violation["line-number"],
        disposition: violation.disposition,
      };

      console.warn(`[CSP-VIOLATION] ${JSON.stringify(logEntry)}`);

      // Write to audit log
      writeAuditLog({
        userId: "system",
        action: AuditActions.CSP_VIOLATION,
        details: logEntry,
        ip,
        severity: "warning",
      }).catch(() => {});

      res.status(204).end();
    } catch {
      res.status(400).end();
    }
  });

  // Clean up old rate limit entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of reportCounts.entries()) {
      if (now > record.resetAt) {
        reportCounts.delete(ip);
      }
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}
