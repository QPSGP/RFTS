/**
 * Wednesday morning tech brief helpers.
 * Usage: node scripts/wednesday-tech-brief.mjs [--covers-only] [--since=YYYY-MM-DD]
 *
 * Requires POSTGRES_URL (or DATABASE_URL) in .env.local / env.
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

/** Most recent prior Wednesday (on Wednesday morning, last week). */
function lastWednesdayIso(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay(); // 0 Sun … 3 Wed
  let diff = (day + 7 - 3) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function parseArgs(argv) {
  let since = null;
  let coversOnly = false;
  for (const a of argv) {
    if (a === "--covers-only") coversOnly = true;
    else if (a.startsWith("--since=")) since = a.slice("--since=".length);
  }
  return { since: since || lastWednesdayIso(), coversOnly };
}

async function queryMissingCovers() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("POSTGRES_URL or DATABASE_URL is not set.");
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    // "Public library" = general catalog, excluding CGMR / private custom titles.
    const publicFilter = `
      COALESCE(in_general_catalog, true) = true
      AND COALESCE(title, '') !~* 'CGMR|CGRM'
      AND (moderator_id IS NULL)
    `;
    const missingCover = `
      (cover_url IS NULL OR BTRIM(cover_url) = '' OR cover_url ILIKE '%placeholder%')
    `;
    const { rows } = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE ${publicFilter})::int AS public_total,
        COUNT(*) FILTER (WHERE ${publicFilter} AND ${missingCover})::int AS public_missing_cover,
        COUNT(*) FILTER (
          WHERE ${publicFilter}
            AND cover_url IS NOT NULL AND BTRIM(cover_url) <> ''
            AND cover_url NOT ILIKE '%placeholder%'
        )::int AS public_with_cover,
        COUNT(*) FILTER (
          WHERE COALESCE(in_general_catalog, true) = true AND ${missingCover}
        )::int AS catalog_missing_including_cgmr
      FROM library_items
    `);
    const samples = await client.query(`
      SELECT sku_code, title
      FROM library_items
      WHERE ${publicFilter} AND ${missingCover}
      ORDER BY order_index NULLS LAST, title
      LIMIT 40
    `);
    return { stats: rows[0], samples: samples.rows };
  } finally {
    await client.end();
  }
}

function gitCommitsSince(since) {
  try {
    const out = execSync(
      `git log --since="${since}" --pretty=format:"%h|%ad|%s" --date=short`,
      { cwd: root, encoding: "utf8" }
    );
    return out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [hash, date, ...rest] = line.split("|");
        return { hash, date, subject: rest.join("|") };
      });
  } catch {
    return [];
  }
}

function categorize(subject) {
  const s = subject.toLowerCase();
  if (s.startsWith("fix") || s.includes("fix ") || s.includes("harden") || s.includes("stop "))
    return "Fix";
  if (s.startsWith("add") || s.startsWith("create")) return "Feature";
  if (s.startsWith("update") || s.startsWith("rename") || s.startsWith("align"))
    return "Update";
  return "Other";
}

async function main() {
  loadEnvLocal();
  const { since, coversOnly } = parseArgs(process.argv.slice(2));
  const covers = await queryMissingCovers();

  if (coversOnly) {
    console.log(JSON.stringify(covers, null, 2));
    return;
  }

  const commits = gitCommitsSince(since);
  const byCat = { Feature: [], Fix: [], Update: [], Other: [] };
  for (const c of commits) {
    byCat[categorize(c.subject)].push(c);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    since,
    commitCount: commits.length,
    developedAndFixed: byCat,
    commits,
    publicLibraryCovers: {
      total: covers.stats.public_total,
      withCover: covers.stats.public_with_cover,
      missingCover: covers.stats.public_missing_cover,
      samples: covers.samples
    }
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
