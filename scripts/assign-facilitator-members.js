/**
 * Assign member emails to a facilitator (production ops).
 * Usage: node scripts/assign-facilitator-members.js <facilitator-email> <member-email> [more...]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const facilitatorEmail = process.argv[2];
const memberEmails = process.argv.slice(3).map((e) => e.trim().toLowerCase()).filter(Boolean);

async function main() {
  if (!facilitatorEmail || !memberEmails.length) {
    console.error(
      "Usage: node scripts/assign-facilitator-members.js <facilitator-email> <member-email> [more...]"
    );
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const pgArray = `{${memberEmails.map((e) => `"${e.replace(/"/g, '\\"')}"`).join(",")}}`;
  const result = await pool.query(
    `UPDATE moderators
     SET assigned_user_emails = $1::text[]
     WHERE LOWER(email) = LOWER($2)
     RETURNING email, assigned_user_emails`,
    [pgArray, facilitatorEmail]
  );
  if (!result.rows.length) {
    console.error("Facilitator not found:", facilitatorEmail);
    process.exit(1);
  }
  console.log("Updated:", JSON.stringify(result.rows[0], null, 2));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
