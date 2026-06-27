/**
 * Delete automated smoke-test member accounts from Postgres.
 * Matches: rfts-smoke-*@example.invalid, *@example.invalid, referral_source smoke-test, or name Smoke Test.
 *
 * Production also runs daily cron: GET /api/cron/cleanup-smoke-test-users (accounts older than 1 day).
 *
 * Usage:
 *   node scripts/delete-smoke-test-users.js                    # list all matches
 *   node scripts/delete-smoke-test-users.js --delete             # delete matches older than 1 day
 *   node scripts/delete-smoke-test-users.js --delete --now       # delete all matches immediately
 *   node scripts/delete-smoke-test-users.js --delete --min-age-days 7
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const deleteMode = process.argv.includes("--delete");
const nowMode = process.argv.includes("--now");
const minAgeArg = process.argv.find((arg) => arg.startsWith("--min-age-days="));
const minAgeDays = nowMode
  ? 0
  : minAgeArg
    ? Number(minAgeArg.split("=")[1])
    : deleteMode
      ? 1
      : 0;

if (Number.isNaN(minAgeDays) || minAgeDays < 0) {
  console.error("Invalid --min-age-days value.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
});

const cutoff = new Date(Date.now() - minAgeDays * 24 * 60 * 60 * 1000);

const SELECT_SQL = `
  SELECT u.id, u.email, mp.first_name, mp.last_name, mp.referral_source, u.created_at
  FROM users u
  LEFT JOIN member_profiles mp ON mp.user_id = u.id
  WHERE
    u.created_at < $1
    AND (
      u.email ILIKE 'rfts-smoke-%'
      OR u.email ILIKE '%@example.invalid'
      OR mp.referral_source = 'smoke-test'
      OR (mp.first_name ILIKE 'Smoke' AND mp.last_name ILIKE 'Test')
    )
  ORDER BY u.email
`;

(async () => {
  const { rows } = await pool.query(SELECT_SQL, [cutoff.toISOString()]);
  if (!rows.length) {
    console.log(
      minAgeDays > 0
        ? `No smoke-test users older than ${minAgeDays} day(s).`
        : "No smoke-test users found."
    );
    await pool.end();
    return;
  }

  console.log(
    `Found ${rows.length} smoke-test user(s)${minAgeDays > 0 ? ` older than ${minAgeDays} day(s)` : ""}:`
  );
  for (const r of rows) {
    console.log(`  ${r.email} (created ${r.created_at})`);
  }

  if (!deleteMode) {
    console.log("\nDry run only. Re-run with --delete to remove (default: older than 1 day).");
    await pool.end();
    return;
  }

  const ids = rows.map((r) => r.id);
  const del = await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [ids]);
  console.log(`\nDeleted ${del.rowCount} user(s).`);
  await pool.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
