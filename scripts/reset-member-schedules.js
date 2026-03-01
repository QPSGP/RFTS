/**
 * Reset schedule start to today (UTC) for all members so rotation restarts from night 1.
 * Use for test members or when you want everyone to get a fresh schedule.
 * Usage: node scripts/reset-member-schedules.js
 * Requires: POSTGRES_URL in .env.local
 */
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

  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query(`
      UPDATE member_profiles
      SET schedule_started_at = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
          updated_at = now()
      RETURNING user_id
    `);
    const count = result.rowCount ?? 0;
    console.log("Reset schedule start to today (UTC) for", count, "member(s). They will see night 1 today and rotation will advance each day.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
