/**
 * Affiliate commission ledger for payout tracking (safe to re-run).
 * Usage: node scripts/migrate-affiliate-commissions.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const statements = [
  `CREATE TABLE IF NOT EXISTS affiliate_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_code text NOT NULL,
    affiliate_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    referred_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id text NOT NULL UNIQUE,
    stripe_event_id text,
    gross_amount_cents integer NOT NULL,
    commission_amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'usd',
    status text NOT NULL DEFAULT 'pending',
    paid_at timestamptz,
    payout_notes text,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS affiliate_commissions_affiliate_code_status_idx
    ON affiliate_commissions (affiliate_code, status)`,
  `CREATE INDEX IF NOT EXISTS affiliate_commissions_referred_user_id_idx
    ON affiliate_commissions (referred_user_id)`
];

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  for (const stmt of statements) {
    await pool.query(stmt);
    console.log("OK:", stmt.slice(0, 72).replace(/\s+/g, " "));
  }
  await pool.end();
  console.log("Affiliate commissions migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
