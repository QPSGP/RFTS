require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
pool
  .query(`SELECT id, name, price_id, length(price_id) as len FROM subscription_plans WHERE id IN ('platinum','platinum_managed')`)
  .then((r) => {
    console.table(r.rows);
    return pool.end();
  });
