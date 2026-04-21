/**
 * Smoke test: member session can POST played_audio (same path as real playback).
 * Usage: node scripts/verify-member-activity-post.js
 * Requires: dev server on TEST_BASE_URL, POSTGRES_URL, seeded test user (seed-test-user.js)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const TEST_EMAIL = "test@rfts-test.local";
const TEST_PASSWORD = "testpass12";

async function main() {
  const loginRes = await fetch(`${BASE}/api/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}`,
    redirect: "manual"
  });
  if (loginRes.status !== 200) {
    console.error("Login failed:", loginRes.status);
    process.exit(1);
  }
  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie || !setCookie.includes("rfts_user_session=")) {
    console.error("No session cookie from login");
    process.exit(1);
  }
  const cookie = setCookie.split(";")[0].trim();

  const details = "Library — smoke test track (verify-member-activity-post)";
  const actRes = await fetch(`${BASE}/api/user/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ action: "played_audio", details })
  });
  const bodyText = await actRes.text();
  if (!actRes.ok) {
    console.error("POST /api/user/activity failed:", actRes.status, bodyText);
    process.exit(1);
  }
  console.log("OK: played_audio accepted for", TEST_EMAIL);
  console.log("   Admin → Members →", TEST_EMAIL, "→ Refresh activity — expect Audio + Detail for Played audio.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
