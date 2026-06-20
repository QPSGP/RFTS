/**
 * Add affiliate payout method columns (safe to re-run).
 * Usage: node scripts/migrate-affiliate-payout-columns.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const statements = [
  "ALTER TABLE affiliate_applications ADD COLUMN IF NOT EXISTS payout_method text",
  "ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS affiliate_payout_method text",
  "ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS affiliate_payout_detail text",
  "UPDATE affiliate_applications SET payout_method = 'crypto' WHERE payout_method IS NULL AND payout_address IS NOT NULL AND TRIM(payout_address) <> ''"
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
  console.log("Affiliate payout migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
