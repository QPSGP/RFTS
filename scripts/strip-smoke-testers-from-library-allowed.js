/**
 * Remove smoke-test emails from library_items.allowed_user_emails.
 *
 * Matches the same email patterns as src/lib/smoke-test-users.ts
 * (plus any *@example.invalid).
 *
 * Usage:
 *   node scripts/strip-smoke-testers-from-library-allowed.js           # dry run
 *   node scripts/strip-smoke-testers-from-library-allowed.js --apply  # write updates
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const apply = process.argv.includes("--apply");

function isSmokeTestEmail(email) {
  const lower = String(email || "").trim().toLowerCase();
  return (
    lower.endsWith("@example.invalid") ||
    lower.startsWith("rfts-smoke-") ||
    lower.startsWith("rfts-probe-") ||
    lower.startsWith("rfts-signup-test-") ||
    lower.startsWith("rfts-facilitator-smoke-") ||
    lower.startsWith("smoke-test-")
  );
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const { rows } = await pool.query(`
    SELECT id, sku_code, title, COALESCE(allowed_user_emails, ARRAY[]::text[]) AS allowed
    FROM library_items
    WHERE allowed_user_emails IS NOT NULL
      AND cardinality(allowed_user_emails) > 0
    ORDER BY order_index NULLS LAST, title
  `);

  let itemsTouched = 0;
  let emailsRemoved = 0;
  const sampleRemovals = [];

  for (const row of rows) {
    const allowed = row.allowed || [];
    const kept = allowed.filter((e) => !isSmokeTestEmail(e));
    const removed = allowed.filter((e) => isSmokeTestEmail(e));
    if (!removed.length) continue;

    itemsTouched += 1;
    emailsRemoved += removed.length;
    if (sampleRemovals.length < 40) {
      sampleRemovals.push({
        sku: row.sku_code || "-",
        title: row.title,
        removed,
        keptCount: kept.length
      });
    }

    if (apply) {
      await pool.query(
        `UPDATE library_items SET allowed_user_emails = $1::text[] WHERE id = $2`,
        [kept, row.id]
      );
    }
  }

  console.log(
    apply
      ? `Updated ${itemsTouched} library item(s); removed ${emailsRemoved} smoke-test email(s) from allowed lists.`
      : `Dry run: ${itemsTouched} library item(s) have ${emailsRemoved} smoke-test email(s) to remove.`
  );
  for (const s of sampleRemovals) {
    console.log(
      `  ${s.sku} | ${s.title}\n    remove: ${s.removed.join(", ")}\n    remaining allowed: ${s.keptCount}`
    );
  }
  if (sampleRemovals.length < itemsTouched) {
    console.log(`  …and ${itemsTouched - sampleRemovals.length} more item(s).`);
  }
  if (!apply && itemsTouched > 0) {
    console.log("\nRe-run with --apply to write changes.");
  }

  await pool.end();
})().catch(async (err) => {
  console.error(err.message || err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
