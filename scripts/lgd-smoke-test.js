/**
 * Life Guidance Discovery (LGD) smoke tests - no credentials required.
 * Usage: node scripts/lgd-smoke-test.js [baseUrl]
 *
 * Three checks:
 *  1. Terry facilitator page (Seven Keys uniqueness content)
 *  2. LGD API auth guards (unauthenticated)
 *  3. LGD page surfaces (public / member / admin) under current mode
 */
const BASE = (process.argv[2] || "https://reachforthestars.today").replace(/\/$/, "");

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`  OK  ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
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

/** 1 - Terry facilitator profile carries Seven Keys uniqueness copy. */
async function smokeTerrySevenKeysPage() {
  console.log("\n1) Terry facilitator / Seven Keys page");
  const { res, text } = await fetchStatus(`${BASE}/facilitators/terry-brussel-rogers`);
  if (res.status !== 200) {
    fail("Terry facilitator page", `status ${res.status}`);
    return;
  }
  pass("Terry facilitator page", "HTTP 200");
  const needles = [
    "Seven Keys",
    "What makes Terry unique",
    "Bronze",
    "Life Guidance Discovery"
  ];
  const missing = needles.filter((n) => !text.includes(n));
  if (missing.length) {
    fail("Seven Keys uniqueness content", `missing: ${missing.join(", ")}`);
  } else {
    pass("Seven Keys uniqueness content", needles.join("; "));
  }
}

/** 2 - LGD APIs reject unauthenticated callers. */
async function smokeLgdApiGuards() {
  console.log("\n2) LGD API auth guards");
  const checks = [
    {
      name: "GET /api/member/lgd-intake",
      url: `${BASE}/api/member/lgd-intake`,
      expect: (status) => status === 401 || status === 403
    },
    {
      name: "GET /api/member/lgd-access",
      url: `${BASE}/api/member/lgd-access`,
      expect: (status) => status === 401 || status === 403
    },
    {
      name: "GET /api/admin/lgd-intake",
      url: `${BASE}/api/admin/lgd-intake?memberEmail=smoke@example.invalid`,
      expect: (status) => status === 401 || status === 403
    },
    {
      name: "GET /api/admin/lgd-intakes",
      url: `${BASE}/api/admin/lgd-intakes`,
      expect: (status) => status === 401 || status === 403
    }
  ];
  for (const c of checks) {
    const { res, json } = await fetchStatus(c.url);
    if (c.expect(res.status)) {
      pass(c.name, `status ${res.status}${json?.adminOnly ? " adminOnly" : ""}`);
    } else {
      fail(c.name, `unexpected status ${res.status}`);
    }
  }
}

/**
 * 3 - LGD HTML surfaces respond sanely.
 * Public LGD may redirect home when LGD_ADMIN_ONLY; member/admin require login.
 */
async function smokeLgdPageSurfaces() {
  console.log("\n3) LGD page surfaces");

  const publicPage = await fetchStatus(`${BASE}/life-guidance-discovery`);
  if (publicPage.res.status === 200 && publicPage.text.includes("Life Guidance Discovery")) {
    pass("Public /life-guidance-discovery", "open with LGD content");
  } else if (
    (publicPage.res.status === 307 ||
      publicPage.res.status === 302 ||
      publicPage.res.status === 308) &&
    (publicPage.res.headers.get("location") || "").includes("/")
  ) {
    pass(
      "Public /life-guidance-discovery",
      `gated redirect ${publicPage.res.status} → ${publicPage.res.headers.get("location")}`
    );
  } else {
    fail(
      "Public /life-guidance-discovery",
      `status ${publicPage.res.status} loc=${publicPage.res.headers.get("location") || ""}`
    );
  }

  const memberPage = await fetchStatus(`${BASE}/member/lgd`);
  const memberLoc = memberPage.res.headers.get("location") || "";
  if (
    (memberPage.res.status === 307 ||
      memberPage.res.status === 302 ||
      memberPage.res.status === 308) &&
    (memberLoc.includes("/member/login") || memberLoc.includes("/play-options") || memberLoc.includes("/admin/lgd"))
  ) {
    pass("Member /member/lgd", `redirect ${memberPage.res.status} → ${memberLoc}`);
  } else if (memberPage.res.status === 200 && memberPage.text.includes("Life Guidance Discovery")) {
    pass("Member /member/lgd", "HTTP 200 (session cookie present in environment)");
  } else {
    fail("Member /member/lgd", `status ${memberPage.res.status} loc=${memberLoc}`);
  }

  const adminPage = await fetchStatus(`${BASE}/admin/lgd`);
  const adminLoc = adminPage.res.headers.get("location") || "";
  if (
    (adminPage.res.status === 307 ||
      adminPage.res.status === 302 ||
      adminPage.res.status === 308) &&
    (adminLoc.includes("/admin/setup") || adminLoc.includes("/login"))
  ) {
    pass("Admin /admin/lgd", `redirect ${adminPage.res.status} → ${adminLoc}`);
  } else if (adminPage.res.status === 200 && adminPage.text.includes("Life Guidance Discovery")) {
    pass("Admin /admin/lgd", "HTTP 200 (admin session present)");
  } else {
    fail("Admin /admin/lgd", `status ${adminPage.res.status} loc=${adminLoc}`);
  }
}

async function main() {
  console.log(`LGD smoke tests → ${BASE}`);
  await smokeTerrySevenKeysPage();
  await smokeLgdApiGuards();
  await smokeLgdPageSurfaces();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("All LGD smoke tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
