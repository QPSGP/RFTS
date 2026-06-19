require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");
const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/delete-test-user.js <email>");
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
(async () => {
  const u = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (!u.rows.length) {
    console.log("No user found for", email);
    await pool.end();
    return;
  }
  await pool.query("DELETE FROM users WHERE id = $1", [u.rows[0].id]);
  console.log("Deleted user", u.rows[0].id, email);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
