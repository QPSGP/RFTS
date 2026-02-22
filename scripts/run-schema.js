/**
 * Run scripts/schema.sql against the Postgres database.
 * Loads .env.local for POSTGRES_URL (or POSTGRES_URL_UNPOOLED).
 * No psql required: npm run db:schema
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const schemaPath = path.join(__dirname, "schema.sql");
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_UNPOOLED ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing Postgres URL. Set POSTGRES_URL in .env.local (or pull from Vercel: vercel env pull).");
  process.exit(1);
}

async function run() {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString });
  const sql = fs.readFileSync(schemaPath, "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter((s) => s.length > 0);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ";";
    try {
      await pool.query(stmt);
      console.log("OK:", stmt.slice(0, 50).replace(/\n/g, " ") + "...");
    } catch (err) {
      if (err.code === "42710") {
        console.log("SKIP (already exists):", stmt.slice(0, 50).replace(/\n/g, " ") + "...");
      } else if (err.code === "23505" || (err.message && err.message.includes("could not create unique index"))) {
        console.warn("SKIP (duplicate data or index exists):", stmt.slice(0, 50).replace(/\n/g, " ") + "...");
      } else {
        console.error("Error running statement:", stmt.slice(0, 80));
        console.error(err.message);
        process.exit(1);
      }
    }
  }
  await pool.end();
  console.log("Schema applied.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
