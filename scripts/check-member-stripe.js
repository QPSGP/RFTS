/**
 * Check member subscription / Stripe IDs (local ops).
 * Usage: node scripts/check-member-stripe.js <email>
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const emailArg = process.argv[2];
if (!emailArg) {
  console.error("Usage: node scripts/check-member-stripe.js <email>");
  process.exit(1);
}

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const email = emailArg.trim();

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.created_at,
      s.status, s.tier, s.stripe_customer_id, s.stripe_subscription_id, s.current_period_end
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );

  if (!rows.length) {
    console.log("No user found for:", email);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
