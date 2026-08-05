/**
 * Test login → cookie → /api/user/me → play-options flow.
 * Run dev server first (npm run dev), then: npm run test:login
 * Or with credentials: LOGIN_TEST_EMAIL=... LOGIN_TEST_PASSWORD=... node scripts/test-login-flow.js [baseUrl]
 * Without credentials, tests only bad-login response. With credentials, tests full flow.
 * Seed test user: node scripts/seed-test-user.js (creates test@rfts-test.local / testpass12)
 */
const baseUrl = process.argv[2] || "http://localhost:3000";
const testEmail = process.env.LOGIN_TEST_EMAIL;
const testPassword = process.env.LOGIN_TEST_PASSWORD;

async function main() {
  console.log("Testing login flow at", baseUrl);

  if (!testEmail || !testPassword) {
    console.log("No LOGIN_TEST_EMAIL/LOGIN_TEST_PASSWORD set - testing bad login only.");
    const badRes = await fetch(`${baseUrl}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "email=bad@test.com&password=badpass",
      redirect: "manual",
    });
    if (badRes.status === 302 && badRes.headers.get("location")?.includes("error=invalid")) {
      console.log("OK: bad login returns 302 to login?error=invalid");
    } else {
      console.log("FAIL: bad login returned", badRes.status, badRes.headers.get("location"));
      process.exit(1);
    }
    return;
  }

  const loginRes = await fetch(`${baseUrl}/api/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `email=${encodeURIComponent(testEmail)}&password=${encodeURIComponent(testPassword)}`,
    redirect: "manual",
  });

  if (loginRes.status !== 200) {
    const body = await loginRes.text();
    console.log("FAIL: login returned", loginRes.status, "expected 200");
    if (body) console.log("Body:", body.slice(0, 500));
    process.exit(1);
  }

  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie || !setCookie.includes("rfts_user_session=")) {
    console.log("FAIL: no Set-Cookie rfts_user_session in login response");
    process.exit(1);
  }
  console.log("OK: login returned 200 with Set-Cookie");

  const cookieValue = setCookie.split(";")[0].trim();
  const cookieHeader = cookieValue;
  const meRes = await fetch(`${baseUrl}/api/user/me`, {
    headers: { Cookie: cookieHeader },
  });

  if (meRes.status !== 200) {
    const body = await meRes.text();
    console.log("FAIL: /api/user/me returned", meRes.status, "expected 200");
    if (body) console.log("Body:", body.slice(0, 500));
    process.exit(1);
  }

  const data = await meRes.json();
  if (!data?.profile?.email) {
    console.log("FAIL: /api/user/me response has no profile.email");
    process.exit(1);
  }
  console.log("OK: /api/user/me returns profile for", data.profile.email);

  const playRes = await fetch(`${baseUrl}/play-options`, {
    headers: { Cookie: cookieHeader },
    redirect: "manual",
  });
  const playHtml = await playRes.text();
  if (playHtml.includes("Go to member login") || playHtml.includes("Please log in")) {
    console.log("FAIL: play-options shows login prompt when cookie is set");
    process.exit(1);
  }
  console.log("OK: play-options shows content (no login prompt)");
  console.log("Login flow test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
