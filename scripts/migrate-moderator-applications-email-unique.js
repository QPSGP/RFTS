/**
 * Ensure moderator_applications.email is unique (required for ON CONFLICT upsert).
 * Deduplicates by keeping the newest row per email, then adds UNIQUE constraint.
 *
 * Usage: node scripts/migrate-moderator-applications-email-unique.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });

  const dupes = await pool.query(`
    SELECT LOWER(email) AS email, COUNT(*)::int AS count
    FROM moderator_applications
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  `);
  if (dupes.rows.length) {
    console.log("Removing duplicate applications (keep newest per email):");
    for (const row of dupes.rows) {
      console.log(" ", row.email, "count=", row.count);
      await pool.query(
        `DELETE FROM moderator_applications a
         USING moderator_applications b
         WHERE LOWER(a.email) = LOWER(b.email)
           AND a.submitted_at < b.submitted_at
           AND LOWER(a.email) = LOWER($1)`,
        [row.email]
      );
    }
  } else {
    console.log("No duplicate application emails found.");
  }

  const indexes = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'moderator_applications'
  `);
  const hasUniqueEmail = indexes.rows.some(
    (row) =>
      row.indexdef.includes("(email)") &&
      row.indexdef.toLowerCase().includes("unique")
  );
  if (hasUniqueEmail) {
    console.log("Unique email constraint already exists.");
  } else {
    await pool.query(`
      ALTER TABLE moderator_applications
      ADD CONSTRAINT moderator_applications_email_key UNIQUE (email)
    `);
    console.log("Added UNIQUE constraint on moderator_applications.email");
  }

  await pool.end();
  console.log("Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
