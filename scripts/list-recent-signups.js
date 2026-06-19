require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool
  .query(
    `SELECT u.email, u.created_at, s.status, s.tier,
            s.stripe_customer_id, s.stripe_subscription_id
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     ORDER BY u.created_at DESC
     LIMIT 10`
  )
  .then((r) => {
    console.table(r.rows);
    return pool.end();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
