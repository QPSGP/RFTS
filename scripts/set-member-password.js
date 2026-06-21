/**
 * Set a member password (ops / support). Requires POSTGRES_URL in .env.local.
 * Usage: node scripts/set-member-password.js <email> <newPassword>
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  if (!email || !password || password.length < 6) {
    console.error("Usage: node scripts/set-member-password.js <email> <password-min-6-chars>");
    process.exit(1);
  }
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, email",
    [hash, email]
  );
  await pool.end();
  if (!rows.length) {
    console.error("No user found for", email);
    process.exit(1);
  }
  console.log("Password updated for", rows[0].email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
