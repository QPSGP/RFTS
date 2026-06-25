/**
 * Send welcome email smoke test via production (uses production Resend).
 *
 *   node scripts/test-welcome-email-production.js
 *   node scripts/test-welcome-email-production.js https://reachforthestars.today
 *
 * Requires CRON_SECRET in .env.local (same value as Vercel production).
 */
const fs = require("fs");
const path = require("path");

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

loadEnvLocal();

const base = (process.argv[2] || "https://reachforthestars.today").replace(/\/$/, "");
const secret = process.env.CRON_SECRET?.trim();
const to = process.env.SIGNUP_EMAIL_TEST_TO?.trim() || "Richard@richardleeweatherman.com";

if (!secret) {
  console.error("CRON_SECRET missing (set in .env.local or environment).");
  process.exit(1);
}

async function main() {
  const url = `${base}/api/admin/test-welcome-email`;
  console.log("Welcome email smoke test");
  console.log("  url:", url);
  console.log("  to:", to);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`
    },
    body: JSON.stringify({
      to,
      firstName: process.env.SIGNUP_EMAIL_TEST_FIRST_NAME || "Smoke",
      lastName: process.env.SIGNUP_EMAIL_TEST_LAST_NAME || "Test"
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("FAIL:", res.status, data.error || data);
    process.exit(1);
  }
  console.log("OK:", JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
