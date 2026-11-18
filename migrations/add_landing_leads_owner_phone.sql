-- landing_leads: store phone + owner, scope email uniqueness per owner.
-- ADDITIVE / non-destructive: no rows are deleted or rewritten.
-- Applied automatically on server start by runMigrations() in server/index.ts
-- ("landing_leads owner scope + phone"); this file mirrors that SQL for manual runs.
--
-- Why: POST /api/lp/:slug/lead inserted (name, email, phone, source) but the
-- table had no phone column (42703), and email was globally UNIQUE (23505), so
-- every marketing-landing-page lead insert failed and was swallowed by catch {}.

ALTER TABLE landing_leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE landing_leads ADD COLUMN IF NOT EXISTS owner_id VARCHAR;
CREATE INDEX IF NOT EXISTS idx_landing_leads_owner ON landing_leads (owner_id);

BEGIN;
-- owner_id IS NULL (Oravini platform leads) collapses to '' so platform emails stay unique,
-- exactly as before. Existing rows all have owner_id NULL and already-unique emails,
-- so this index always builds on existing data.
CREATE UNIQUE INDEX IF NOT EXISTS landing_leads_owner_email_uniq
  ON landing_leads ((COALESCE(owner_id, '')), email);
-- Replaced by the per-owner index above (drops only the constraint, not data).
ALTER TABLE landing_leads DROP CONSTRAINT IF EXISTS landing_leads_email_unique;
COMMIT;
