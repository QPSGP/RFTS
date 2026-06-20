/**
 * Assign affiliate_code to existing users missing one.
 * Usage: node scripts/backfill-affiliate-codes.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");
const crypto = require("crypto");

function generateAffiliateCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const { rows } = await pool.query(
    "SELECT id, email FROM users WHERE affiliate_code IS NULL OR TRIM(affiliate_code) = ''"
  );
  console.log(`Users needing affiliate codes: ${rows.length}`);
  let updated = 0;
  for (const row of rows) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateAffiliateCode();
      try {
        const result = await pool.query(
          "UPDATE users SET affiliate_code = $1 WHERE id = $2 AND affiliate_code IS NULL RETURNING id",
          [code, row.id]
        );
        if (result.rowCount) {
          updated += 1;
          console.log(`  ${row.email} → ${code}`);
          break;
        }
      } catch (e) {
        if (e.code !== "23505") throw e;
      }
    }
  }
  await pool.end();
  console.log(`Done. Assigned ${updated} code(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
