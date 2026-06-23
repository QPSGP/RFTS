/**
 * Facilitator flow smoke tests (no facilitator credentials required).
 * Usage: node scripts/facilitator-smoke-test.js [baseUrl]
 */
const BASE = (process.argv[2] || "https://reachforthestars.today").replace(/\/$/, "");

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  OK  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchStatus(url, opts = {}) {
  const res = await fetch(url, { redirect: "manual", ...opts });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { res, text, json };
}

async function testPublicPages() {
  const paths = ["/facilitator", "/facilitators/terry-brussel-rogers", "/login", "/moderator/console"];
  for (const path of paths) {
    const { res, text } = await fetchStatus(`${BASE}${path}`);
    if (res.status !== 200) {
      fail(`Page ${path}`, `status ${res.status}`);
      continue;
    }
    pass(`Page ${path}`);
    if (path === "/facilitator" && !text.includes("Apply to Become a Facilitator")) {
      fail("Facilitator application form", "missing heading");
    } else if (path === "/facilitator") {
      pass("Facilitator application form");
    }
    if (path === "/moderator/console" && !text.includes("Log Out")) {
      fail("Console page shell");
    } else if (path === "/moderator/console") {
      pass("Console page shell");
    }
    if (path === "/login" && !text.includes("Admin / Facilitator Login")) {
      fail("Shared admin/facilitator login form");
    } else if (path === "/login") {
      pass("Shared admin/facilitator login form");
    }
  }

  const moderation = await fetchStatus(`${BASE}/moderation`);
  const loc = moderation.res.headers.get("location") || "";
  if (
    (moderation.res.status === 307 || moderation.res.status === 302) &&
    loc.includes("/facilitator")
  ) {
    pass("/moderation redirect", loc);
  } else {
    fail("/moderation redirect", `${moderation.res.status} → ${loc}`);
  }
}

async function testAuthGuards() {
  const guarded = [
    { url: `${BASE}/api/moderator/me`, method: "GET" },
    { url: `${BASE}/api/moderator-admin`, method: "GET" },
    { url: `${BASE}/api/moderators`, method: "GET" },
    { url: `${BASE}/api/moderator/members`, method: "GET" },
    { url: `${BASE}/api/moderator/member-issues`, method: "GET" },
    { url: `${BASE}/api/moderator/members/schedule-preview?email=test@example.invalid`, method: "GET" },
    { url: `${BASE}/api/moderator/members/activity?email=test@example.invalid`, method: "GET" }
  ];
  for (const g of guarded) {
    const { res } = await fetchStatus(g.url, { method: g.method });
    if (res.status === 401) {
      pass(`Auth guard ${g.method} ${g.url.replace(BASE, "")}`, "401");
    } else {
      fail(`Auth guard ${g.method} ${g.url.replace(BASE, "")}`, `expected 401, got ${res.status}`);
    }
  }
}

async function testApplicationValidation() {
  const { res, json } = await fetchStatus(`${BASE}/api/moderators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x", email: "not-an-email", focusAreas: "a", experience: "short" })
  });
  if (res.status === 400 && json?.error) {
    pass("Application rejects invalid payload", "400");
  } else {
    fail("Application rejects invalid payload", `status ${res.status}`);
  }
}

async function testApplicationSubmit() {
  const stamp = Date.now();
  const email = `rfts-facilitator-smoke-${stamp}@example.invalid`;
  const body = {
    name: "Smoke Test Facilitator",
    email,
    focusAreas: "Sleep, motivation",
    experience: "Automated smoke test application for facilitator onboarding.",
    links: "https://example.invalid",
    phone: "555-0199",
    website: "https://example.invalid",
    socialLinks: "https://example.invalid/social"
  };
  const { res } = await fetchStatus(`${BASE}/api/moderators`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (res.status === 200) {
    pass("Application submit", email);
  } else {
    fail("Application submit", `status ${res.status}`);
  }
}

async function testStaffLoginRejectsBadCreds() {
  const { res, json } = await fetchStatus(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "facilitator@example.invalid", password: "wrongpassword" })
  });
  if (res.status === 401 && json?.error) {
    pass("Staff login rejects bad credentials");
  } else {
    fail("Staff login rejects bad credentials", `status ${res.status}`);
  }
}

async function main() {
  console.log(`Facilitator smoke tests @ ${BASE}\n`);

  console.log("Public pages");
  await testPublicPages();

  console.log("\nAuth guards");
  await testAuthGuards();

  console.log("\nApplication API");
  await testApplicationValidation();
  await testApplicationSubmit();

  console.log("\nStaff login");
  await testStaffLoginRejectsBadCreds();

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("All facilitator smoke tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
