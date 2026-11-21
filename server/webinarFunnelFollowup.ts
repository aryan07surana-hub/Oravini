/**
 * Webinar Funnel segmented follow-ups (YouTube-Live funnels at /w/:slug).
 *
 * One hour after a funnel ends (scheduled_at + duration_minutes + 60 min), every
 * registrant gets exactly ONE follow-up matched to what they did:
 *   - clicked   — registration id or email appears in webinar_cta_clicks
 *   - attended  — appears in webinar_attendance (and did not click)
 *   - no_show   — everyone else
 *
 * Idempotency: each send is claimed first by inserting a row into
 * webinar_funnel_followup_log, unique on (webinar_id, registration_id) and on
 * (webinar_id, email_norm), with INSERT … ON CONFLICT DO NOTHING RETURNING. Only
 * rows this instance inserted are sent, so multiple app instances / overlapping
 * ticks can never double-send. A claimed send that fails is NOT retried (at most
 * once); the failure is recorded in the log's `error` column.
 *
 * Runs on the same 1-minute poll cadence as the 1h reminder job and reuses its
 * mail transport. Funnels with reminders_enabled = false and drafts are skipped.
 */
import { pool } from "./storage";
import { getTransport, fromAddress, appBaseUrl } from "./webinarFunnelEmail";
import { WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES } from "./routes/webinar-emails";

export type FollowupSegment = "clicked" | "attended" | "no_show";

/** Only follow up on funnels whose follow-up became due within this window, so a
 *  deploy never mass-mails registrants of webinars that ended long ago. */
const LOOKBACK = "3 days";
/** Max registrants claimed per tick (the next tick picks up the rest). */
const BATCH = 200;

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const safeUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : "");

/** {{#if var}}…{{/if}} then {{var}} substitution; values are HTML-escaped. */
export function renderFollowupTemplate(template: string, vars: Record<string, string>, html = true): string {
  return template
    .replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, k, content) => (vars[k] ? content : ""))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => (html ? esc(vars[k] ?? "") : (vars[k] ?? "")));
}

export function followupReplayUrl(f: { slug: string; replay_url: string | null }) {
  return safeUrl(f.replay_url) || `${appBaseUrl()}/w/${f.slug}`;
}

let tableReady: Promise<void> | null = null;
function ensureFollowupTable() {
  // Mirrors runMigrations in server/index.ts so the job works even if it runs first.
  tableReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS webinar_funnel_followup_log (
      id SERIAL PRIMARY KEY,
      webinar_id VARCHAR NOT NULL,
      registration_id VARCHAR NOT NULL,
      email_norm TEXT NOT NULL,
      segment TEXT NOT NULL,
      claimed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMP,
      error TEXT,
      CONSTRAINT webinar_funnel_followup_log_webinar_id_webinar_funnels_id_fk FOREIGN KEY (webinar_id) REFERENCES webinar_funnels(id) ON DELETE CASCADE,
      CONSTRAINT uq_webinar_followup_registration UNIQUE (webinar_id, registration_id)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_webinar_followup_email ON webinar_funnel_followup_log(webinar_id, email_norm);
  `).then(() => undefined, (e) => { tableReady = null; throw e; });
  return tableReady;
}

type ClaimedRow = {
  log_id: number; segment: FollowupSegment;
  name: string; email: string;
  f_id: string; slug: string; title: string; host_name: string | null;
  cta_url: string | null; cta_text: string | null; replay_url: string | null;
};

/**
 * Atomically claims follow-ups for all due registrants (segmenting in the same
 * statement) and returns the rows this call won. A registrant who signed up after
 * the follow-up became due (e.g. a replay sign-up) is never included.
 */
async function claimDueFollowups(): Promise<ClaimedRow[]> {
  const { rows } = await pool.query(`
    WITH due AS (
      SELECT f.id, f.scheduled_at + ((COALESCE(f.duration_minutes, 60) + 60) * INTERVAL '1 minute') AS due_at
        FROM webinar_funnels f
       WHERE f.status IN ('published', 'ended')
         AND f.reminders_enabled = TRUE
         AND f.scheduled_at + ((COALESCE(f.duration_minutes, 60) + 60) * INTERVAL '1 minute') <= NOW()
         AND f.scheduled_at + ((COALESCE(f.duration_minutes, 60) + 60) * INTERVAL '1 minute') > NOW() - INTERVAL '${LOOKBACK}'
    ),
    candidates AS (
      SELECT DISTINCT ON (r.webinar_id, LOWER(TRIM(r.email)))
             r.webinar_id, r.id AS registration_id, LOWER(TRIM(r.email)) AS email_norm,
             CASE
               WHEN EXISTS (SELECT 1 FROM webinar_cta_clicks c
                             WHERE c.webinar_id = r.webinar_id
                               AND (c.registration_id = r.id OR LOWER(TRIM(c.email)) = LOWER(TRIM(r.email))))
                 THEN 'clicked'
               WHEN EXISTS (SELECT 1 FROM webinar_attendance a
                             WHERE a.webinar_id = r.webinar_id
                               AND (a.registration_id = r.id OR LOWER(TRIM(a.email)) = LOWER(TRIM(r.email))))
                 THEN 'attended'
               ELSE 'no_show'
             END AS segment
        FROM webinar_funnel_registrations r
        JOIN due d ON d.id = r.webinar_id
       WHERE r.email IS NOT NULL AND TRIM(r.email) <> ''
         AND COALESCE(r.created_at, d.due_at) <= d.due_at
         AND NOT EXISTS (SELECT 1 FROM webinar_funnel_followup_log l
                          WHERE l.webinar_id = r.webinar_id
                            AND (l.registration_id = r.id OR l.email_norm = LOWER(TRIM(r.email))))
       ORDER BY r.webinar_id, LOWER(TRIM(r.email)), r.created_at
       LIMIT ${BATCH}
    ),
    claimed AS (
      INSERT INTO webinar_funnel_followup_log (webinar_id, registration_id, email_norm, segment)
      SELECT webinar_id, registration_id, email_norm, segment FROM candidates
      ON CONFLICT DO NOTHING
      RETURNING id, webinar_id, registration_id, segment
    )
    SELECT cl.id AS log_id, cl.segment, r.name, r.email,
           f.id AS f_id, f.slug, f.title, f.host_name, f.cta_url, f.cta_text, f.replay_url
      FROM claimed cl
      JOIN webinar_funnel_registrations r ON r.id = cl.registration_id
      JOIN webinar_funnels f ON f.id = cl.webinar_id
  `);
  return rows;
}

const TEMPLATE_KEY: Record<FollowupSegment, keyof typeof WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES> = {
  clicked: "followup_clicked",
  attended: "followup_attended",
  no_show: "followup_no_show",
};

async function sendFollowup(row: ClaimedRow): Promise<boolean> {
  const transport = getTransport();
  if (!transport) return false;
  const tpl = WEBINAR_FUNNEL_FOLLOWUP_TEMPLATES[TEMPLATE_KEY[row.segment]];
  const replayUrl = followupReplayUrl(row);
  const ctaUrl = safeUrl(row.cta_url);
  const vars = {
    name: (row.name || "").trim().split(/\s+/)[0] || "there",
    webinarTitle: row.title,
    replayUrl,
    ctaUrl,
    ctaText: (row.cta_text || "").trim() || "Claim the offer",
  };
  const text = [
    `Hi ${vars.name},`,
    "",
    row.segment === "no_show" ? `Sorry we missed you at ${row.title}. Watch the replay: ${replayUrl}`
      : row.segment === "attended" ? `Thanks for coming to ${row.title}! Replay: ${replayUrl}`
      : `Last chance on the offer from ${row.title}.`,
    ...(row.segment !== "no_show" && ctaUrl ? [`${vars.ctaText}: ${ctaUrl}`] : []),
    ...(row.segment === "clicked" ? [`Replay: ${replayUrl}`] : []),
  ].join("\n");
  try {
    await transport.sendMail({
      from: fromAddress(row.host_name),
      to: row.email.trim(),
      subject: renderFollowupTemplate(tpl.subject, vars, false),
      html: renderFollowupTemplate(tpl.bodyHtml, vars),
      text,
    });
    await pool.query(`UPDATE webinar_funnel_followup_log SET sent_at = NOW() WHERE id = $1`, [row.log_id]);
    return true;
  } catch (e: any) {
    console.error(`[webinar-followup] ${row.segment} send failed:`, e.message);
    await pool.query(`UPDATE webinar_funnel_followup_log SET error = $2 WHERE id = $1`, [row.log_id, String(e.message || e).slice(0, 500)]).catch(() => {});
    return false;
  }
}

export async function runWebinarFunnelFollowups(): Promise<number> {
  // Without a transport nothing is claimed, so follow-ups go out once mail is configured.
  if (!getTransport()) return 0;
  await ensureFollowupTable();
  const rows = await claimDueFollowups();
  let sent = 0;
  const bySegment: Record<FollowupSegment, number> = { clicked: 0, attended: 0, no_show: 0 };
  for (const row of rows) {
    if (await sendFollowup(row)) { sent++; bySegment[row.segment]++; }
  }
  if (rows.length) {
    console.log(`[webinar-followup] ${sent}/${rows.length} sent (clicked ${bySegment.clicked}, attended ${bySegment.attended}, no-show ${bySegment.no_show})`);
  }
  return sent;
}

let started = false;
let running = false;
export function startWebinarFunnelFollowupJob() {
  if (started) return;
  started = true;
  const tick = async () => {
    if (running) return; // a slow batch never overlaps the next tick in-process
    running = true;
    try { await runWebinarFunnelFollowups(); }
    catch (e: any) { console.error("[webinar-followup] job error:", e.message); }
    finally { running = false; }
  };
  setTimeout(tick, 20_000);
  setInterval(tick, 60_000);
}
