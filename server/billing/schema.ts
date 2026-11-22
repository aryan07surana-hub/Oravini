// Billing v2 schema. Explicit, repeat-safe migration — NEVER run on import or at
// server startup. Apply with `npx tsx script/billing-v2-migrate.ts apply --confirm`.
// Lock order used by every billing v2 transaction (see ledger.ts):
//   users -> billing_checkouts_v2 -> billing_payments_v2 -> billing_entitlements_v2
//   -> billing_period_grants_v2 / oravini_free_grants_v2 -> credit_balances
export const BILLING_V2_TABLES = [
  "billing_accounts_v2", "billing_checkouts_v2", "billing_payments_v2", "billing_entitlements_v2",
  "billing_period_grants_v2", "oravini_free_grants_v2", "billing_webhook_events_v2",
] as const;

export const BILLING_V2_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS billing_accounts_v2 (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id),
  source TEXT NOT NULL CHECK (source IN ('free_enrollment','prepaid_purchase','admin_migration')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS billing_checkouts_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  whop_plan_id TEXT NOT NULL,
  whop_checkout_id TEXT UNIQUE,
  offer_snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','fulfilled','rejected','abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS billing_checkouts_v2_user_idx ON billing_checkouts_v2(user_id);
CREATE TABLE IF NOT EXISTS billing_payments_v2 (
  whop_payment_id TEXT PRIMARY KEY,
  checkout_id UUID NOT NULL UNIQUE REFERENCES billing_checkouts_v2(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL,
  offer_snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('fulfilled','needs_review','refunded','disputed')),
  review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS billing_entitlements_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  whop_payment_id TEXT NOT NULL UNIQUE REFERENCES billing_payments_v2(whop_payment_id),
  plan_id TEXT NOT NULL CHECK (plan_id IN ('growth','pro','growth_video')),
  term_months INTEGER NOT NULL CHECK (term_months IN (1,3,6,12)),
  monthly_allowance INTEGER NOT NULL CHECK (monthly_allowance > 0),
  offer_snapshot JSONB NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','expired','revoked')),
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_entitlements_v2_one_active ON billing_entitlements_v2(user_id) WHERE status = 'active';
CREATE TABLE IF NOT EXISTS billing_period_grants_v2 (
  entitlement_id UUID NOT NULL REFERENCES billing_entitlements_v2(id),
  period_index INTEGER NOT NULL CHECK (period_index >= 0 AND period_index < 12),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entitlement_id, period_index)
);
CREATE TABLE IF NOT EXISTS oravini_free_grants_v2 (
  user_id VARCHAR NOT NULL REFERENCES users(id),
  period_key VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period_key)
);
CREATE TABLE IF NOT EXISTS billing_webhook_events_v2 (
  webhook_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  whop_payment_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('processing','processed','ignored','rejected','failed')),
  result TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION billing_v2_snapshot_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.offer_snapshot IS DISTINCT FROM OLD.offer_snapshot OR NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash THEN
    RAISE EXCEPTION 'billing v2 offer snapshots are immutable';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION billing_v2_entitlement_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.offer_snapshot IS DISTINCT FROM OLD.offer_snapshot OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.monthly_allowance IS DISTINCT FROM OLD.monthly_allowance
     OR NEW.plan_id IS DISTINCT FROM OLD.plan_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'billing v2 entitlement terms are immutable';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS billing_checkouts_v2_immutable ON billing_checkouts_v2;
CREATE TRIGGER billing_checkouts_v2_immutable BEFORE UPDATE ON billing_checkouts_v2 FOR EACH ROW EXECUTE FUNCTION billing_v2_snapshot_immutable();
DROP TRIGGER IF EXISTS billing_payments_v2_immutable ON billing_payments_v2;
CREATE TRIGGER billing_payments_v2_immutable BEFORE UPDATE ON billing_payments_v2 FOR EACH ROW EXECUTE FUNCTION billing_v2_snapshot_immutable();
DROP TRIGGER IF EXISTS billing_entitlements_v2_immutable ON billing_entitlements_v2;
CREATE TRIGGER billing_entitlements_v2_immutable BEFORE UPDATE ON billing_entitlements_v2 FOR EACH ROW EXECUTE FUNCTION billing_v2_entitlement_immutable();
`;

// Rollback drops ONLY v2 tables. It destroys the v2 purchase ledger: export first,
// and prefer the kill switches (BILLING_V2_*_ENABLED=false) for an operational rollback.
// Legacy tables (users, credit_balances, credit_transactions) are not touched.
export const BILLING_V2_ROLLBACK_SQL = `
DROP TABLE IF EXISTS billing_webhook_events_v2;
DROP TABLE IF EXISTS billing_period_grants_v2;
DROP TABLE IF EXISTS billing_entitlements_v2;
DROP TABLE IF EXISTS billing_payments_v2;
DROP TABLE IF EXISTS billing_checkouts_v2;
DROP TABLE IF EXISTS billing_accounts_v2;
DROP TABLE IF EXISTS oravini_free_grants_v2;
DROP FUNCTION IF EXISTS billing_v2_snapshot_immutable();
DROP FUNCTION IF EXISTS billing_v2_entitlement_immutable();
`;

export async function billingV2SchemaReady(q: { query(sql: string, v?: unknown[]): Promise<{ rows: any[] }> }): Promise<boolean> {
  try {
    const r = await q.query(`SELECT COUNT(*)::int AS n FROM unnest($1::text[]) t(name) WHERE to_regclass(t.name) IS NOT NULL`, [BILLING_V2_TABLES as unknown as string[]]);
    return r.rows[0]?.n === BILLING_V2_TABLES.length;
  } catch { return false; }
}
