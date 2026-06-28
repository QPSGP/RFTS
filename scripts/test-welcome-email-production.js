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

const authHeaders = {
  Authorization: `Bearer ${secret}`
};

async function main() {
  const url = `${base}/api/admin/test-welcome-email`;
  console.log("Welcome email smoke test");
  console.log("  url:", url);
  console.log("  to:", to);

  const previewRes = await fetch(url, { headers: authHeaders });
  const preview = await previewRes.json().catch(() => ({}));
  if (!previewRes.ok) {
    console.error("Preview FAIL:", previewRes.status, preview.error || preview);
    process.exit(1);
  }
  if (!preview.platinumCopyOk) {
    console.error("Preview FAIL: production welcome email still has outdated Platinum copy.");
    console.error("  expected phrase containing: curated guided meditations");
    console.error("  deployed copy:", preview.platinumManagedCopy || "(missing)");
    process.exit(1);
  }
  console.log("Preview OK: Platinum Managed copy uses curated guided meditations.");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders
    },
    body: JSON.stringify({
      to,
      firstName: process.env.SIGNUP_EMAIL_TEST_FIRST_NAME || "Smoke",
      lastName: process.env.SIGNUP_EMAIL_TEST_LAST_NAME || "Test"
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Send FAIL:", res.status, data.error || data);
    process.exit(1);
  }
  if (!data.platinumCopyOk) {
    console.error("Send FAIL: email sent from outdated template.");
    process.exit(1);
  }
  console.log("OK:", JSON.stringify(data, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
