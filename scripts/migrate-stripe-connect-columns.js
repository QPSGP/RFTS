/**
 * Stripe Connect columns on users (safe to re-run).
 * Usage: node scripts/migrate-stripe-connect-columns.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const statements = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id text",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted boolean NOT NULL DEFAULT false",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean NOT NULL DEFAULT false",
  "CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_connect_account_id_unique ON users (stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL"
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
    console.log("OK:", stmt.slice(0, 72));
  }
  await pool.end();
  console.log("Stripe Connect migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
