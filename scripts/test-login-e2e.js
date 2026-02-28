const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const TEST_EMAIL = "test@rfts-test.local";
const TEST_PASSWORD = "testpass12";

async function test() {
  console.log("1. POST login (form)...");
  const loginRes = await fetch(`${BASE}/api/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}`,
    redirect: "manual"
  });

  if (loginRes.status !== 200) {
    console.log("   FAIL: expected 200, got", loginRes.status);
    return false;
  }
  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie || !setCookie.includes("rfts_user_session=")) {
    console.log("   FAIL: no Set-Cookie rfts_user_session");
    return false;
  }
  console.log("   OK: 200 + Set-Cookie");

  const cookie = setCookie.split(";")[0].trim();
  console.log("2. GET play-options with cookie...");
  const playRes = await fetch(`${BASE}/play-options`, {
    headers: { Cookie: cookie },
    redirect: "manual"
  });
  const html = await playRes.text();
  if (html.includes("Go to member login") || html.includes("Please log in")) {
    console.log("   FAIL: play-options shows login prompt (cookie not accepted)");
    return false;
  }
  console.log("   OK: play-options shows content");
  return true;
}

test()
  .then((ok) => {
    console.log(ok ? "\nLogin E2E: PASS" : "\nLogin E2E: FAIL");
    process.exit(ok ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
