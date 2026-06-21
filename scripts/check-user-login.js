/**
 * Diagnose member login for a given email (local ops only).
 * Usage: node scripts/check-user-login.js media14prod@gmail.com [passwordToTest]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const emailArg = process.argv[2];
const passwordArg = process.argv[3];

async function main() {
  if (!emailArg) {
    console.error("Usage: node scripts/check-user-login.js <email> [password]");
    process.exit(1);
  }
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const canonical = emailArg.trim().toLowerCase();

  const exact = await pool.query(
    "SELECT id, email, password_hash, created_at FROM users WHERE LOWER(email) = LOWER($1)",
    [canonical]
  );
  console.log("Exact email match:", exact.rows.length);
  for (const r of exact.rows) {
    const hash = r.password_hash || "";
    let passwordOk = null;
    if (passwordArg) {
      passwordOk = await bcrypt.compare(passwordArg, hash);
    }
    console.log({
      id: r.id,
      email: r.email,
      created_at: r.created_at,
      hashLooksBcrypt: hash.startsWith("$2"),
      passwordTest: passwordOk
    });
  }

  const fuzzy = await pool.query(
    "SELECT id, email, created_at FROM users WHERE email ILIKE $1 ORDER BY created_at DESC LIMIT 10",
    [`%${canonical.split("@")[0]}%`]
  );
  if (fuzzy.rows.length) {
    console.log("Similar emails:");
    for (const r of fuzzy.rows) console.log(" ", r.email, r.created_at);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
