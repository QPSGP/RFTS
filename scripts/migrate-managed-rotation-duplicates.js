/**
 * Allows duplicate library_item_id rows in Platinum Managed rotation (same audio multiple nights).
 * Usage: npm run managed-rotation:migrate
 *
 * Fixes legacy PRIMARY KEY (user_email, library_item_id) that blocked duplicate slots.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }
  const sqlPath = path.join(__dirname, "fix-managed-rotation-duplicate-slots.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = new Pool({ connectionString: url });
  await pool.query(sql);
  const { rows } = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'member_audio_assignments'::regclass AND contype = 'p'
  `);
  console.log("Primary key after migration:", rows[0]?.def ?? "(none)");
  await pool.end();
  console.log("Managed rotation duplicate-slots migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
