/**
 * Ensure a test user exists for E2E login tests.
 * Usage: node scripts/seed-test-user.js
 * Requires: POSTGRES_URL in .env.local
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const TEST_EMAIL = "test@rfts-test.local";
const TEST_PASSWORD = "testpass12";

async function run() {
  const connectionString =
    process.env.POSTGRES_URL || process.env.POSTGRES_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Set POSTGRES_URL in .env.local");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  try {
    const insertUser = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      [TEST_EMAIL, hash]
    );
    const userId = insertUser.rows[0].id;

    await pool.query(
      `INSERT INTO member_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    console.log("Test user ready:", TEST_EMAIL, "/", TEST_PASSWORD);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
