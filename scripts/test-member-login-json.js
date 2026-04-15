/**
 * Tests the same path as the browser (JSON POST /api/user/login).
 * Run: node scripts/test-member-login-json.js http://localhost:3011
 * With DB user: LOGIN_TEST_EMAIL=... LOGIN_TEST_PASSWORD=... node ...
 */
const baseUrl = process.argv[2] || "http://localhost:3000";
const testEmail = process.env.LOGIN_TEST_EMAIL;
const testPassword = process.env.LOGIN_TEST_PASSWORD;

function cookieHeaderFromResponse(res) {
  const h = res.headers;
  if (typeof h.getSetCookie === "function") {
    const all = h.getSetCookie();
    const line = all.find((c) => c.startsWith("rfts_user_session="));
    return line ? line.split(";")[0].trim() : null;
  }
  const raw = h.get("set-cookie");
  if (!raw) return null;
  const parts = raw.split(/,(?=[^;]+=)/);
  const line = parts.find((p) => p.trim().startsWith("rfts_user_session="));
  return line ? line.split(";")[0].trim() : null;
}

async function main() {
  console.log("JSON login tests @", baseUrl);

  const bad = await fetch(`${baseUrl}/api/user/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@example.com", password: "wrongpw" })
  });
  if (bad.status !== 401) {
    console.error("FAIL: bad JSON login should be 401, got", bad.status);
    process.exit(1);
  }
  const badBody = await bad.json().catch(() => ({}));
  if (!badBody.error) {
    console.error("FAIL: bad JSON login should include error field");
    process.exit(1);
  }
  console.log("OK: bad JSON login → 401 JSON");

  if (!testEmail || !testPassword) {
    console.log("Skip good-login tests (set LOGIN_TEST_EMAIL and LOGIN_TEST_PASSWORD)");
    return;
  }

  const loginRes = await fetch(`${baseUrl}/api/user/login`, {
    method: "POST",
    redirect: "manual",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      next: "/play-options"
    })
  });
  const data = await loginRes.json().catch(() => ({}));
  if (loginRes.status !== 200 || !data.ok) {
    console.error("FAIL: good JSON login", loginRes.status, data);
    process.exit(1);
  }
  const cookieHeader = cookieHeaderFromResponse(loginRes);
  if (!cookieHeader || !cookieHeader.startsWith("rfts_user_session=")) {
    console.error("FAIL: no rfts_user_session Set-Cookie on JSON login");
    process.exit(1);
  }
  console.log("OK: good JSON login → 200 + Set-Cookie");

  const meRes = await fetch(`${baseUrl}/api/user/me`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store"
  });
  if (meRes.status !== 200) {
    console.error("FAIL: /api/user/me", meRes.status, await meRes.text());
    process.exit(1);
  }
  const me = await meRes.json();
  if (!me.profile?.email) {
    console.error("FAIL: /api/user/me no profile.email", me);
    process.exit(1);
  }
  console.log("OK: /api/user/me with cookie →", me.profile.email);

  const debug = await fetch(`${baseUrl}/api/user/debug-session`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store"
  });
  const dbg = await debug.json().catch(() => ({}));
  if (!dbg.sessionValid) {
    console.error("FAIL: debug-session should be true", dbg);
    process.exit(1);
  }
  console.log("OK: /api/user/debug-session → sessionValid");

  console.log("All JSON login tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
