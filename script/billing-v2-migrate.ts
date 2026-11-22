// Explicit billing v2 schema tool. Not invoked by the server or the build.
//   npx tsx script/billing-v2-migrate.ts status
//   npx tsx script/billing-v2-migrate.ts apply --confirm
//   npx tsx script/billing-v2-migrate.ts rollback --confirm-destroy-v2-ledger
import pg from "pg";
import { BILLING_V2_MIGRATION_SQL, BILLING_V2_ROLLBACK_SQL, billingV2SchemaReady } from "../server/billing/schema";

const [cmd, flag] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is required"); process.exit(2); }
const pool = new pg.Pool({ connectionString: url });
try {
  if (cmd === "status") console.log(`billing v2 schema ready: ${await billingV2SchemaReady(pool)}`);
  else if (cmd === "apply" && flag === "--confirm") {
    const c = await pool.connect();
    try { await c.query("BEGIN"); await c.query(BILLING_V2_MIGRATION_SQL); await c.query("COMMIT"); }
    catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
    console.log(`applied; ready: ${await billingV2SchemaReady(pool)}`);
  } else if (cmd === "rollback" && flag === "--confirm-destroy-v2-ledger") {
    const c = await pool.connect();
    try { await c.query("BEGIN"); await c.query(BILLING_V2_ROLLBACK_SQL); await c.query("COMMIT"); }
    catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
    console.log("rolled back billing v2 tables");
  } else { console.error("usage: status | apply --confirm | rollback --confirm-destroy-v2-ledger"); process.exitCode = 2; }
} finally { await pool.end(); }
