/**
 * Migrate all members to main-audio progress (schedule_progress_model = 1).
 * Usage: node scripts/migrate-schedule-progress-main-audios.js
 * Requires: POSTGRES_URL in .env.local
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

async function run() {
  const connectionString =
    process.env.POSTGRES_URL || process.env.POSTGRES_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Set POSTGRES_URL in .env.local");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "migrate-schedule-progress-main-audios.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const pool = new Pool({ connectionString });
  try {
    await pool.query(sql);
    const { rows } = await pool.query(`
      SELECT COUNT(*)::text AS n FROM member_profiles WHERE schedule_progress_model = 1
    `);
    console.log(
      "Migration complete. Members on main-audio progress model:",
      rows[0]?.n ?? "?"
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
