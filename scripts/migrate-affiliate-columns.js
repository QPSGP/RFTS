/**
 * Add affiliate columns (safe to re-run).
 * Usage: node scripts/migrate-affiliate-columns.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const statements = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_code text",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_affiliate_code text",
  "CREATE UNIQUE INDEX IF NOT EXISTS users_affiliate_code_unique ON users (affiliate_code) WHERE affiliate_code IS NOT NULL",
  "ALTER TABLE affiliate_applications ADD COLUMN IF NOT EXISTS affiliate_code text",
  "ALTER TABLE affiliate_applications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL",
  "CREATE UNIQUE INDEX IF NOT EXISTS affiliate_applications_affiliate_code_unique ON affiliate_applications (affiliate_code) WHERE affiliate_code IS NOT NULL"
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
    console.log("OK:", stmt.slice(0, 70));
  }
  await pool.end();
  console.log("Affiliate migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
