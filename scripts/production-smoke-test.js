/**
 * Production smoke tests (no member/admin credentials required).
 * Usage: node scripts/production-smoke-test.js [baseUrl]
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

async function testHealth() {
  const { res, json } = await fetchStatus(`${BASE}/api/health`);
  if (res.status !== 200 || !json?.ok) {
    fail("Health endpoint", `status ${res.status}`);
    return;
  }
  pass("Health endpoint", "ok:true");
  const s = json.stripe || {};
  if (s.secretKeyKind !== "sk_live") fail("Stripe live key", s.secretKeyKind);
  else pass("Stripe live key");
  if (!s.webhookSecretSet) fail("Stripe webhook secret");
  else pass("Stripe webhook secret");
  if (s.demoSkipStripe) fail("DEMO_SKIP_STRIPE", "should be false in production");
  else pass("DEMO_SKIP_STRIPE off");
  if (s.publicStripeMode !== "live") fail("NEXT_PUBLIC_STRIPE_MODE", s.publicStripeMode);
  else pass("NEXT_PUBLIC_STRIPE_MODE live");
  if (!s.postgresConfigured) fail("Postgres configured");
  else pass("Postgres configured");
  if (json.siteUrl !== BASE) fail("NEXT_PUBLIC_SITE_URL", json.siteUrl);
  else pass("Site URL", json.siteUrl);
}

async function testPages() {
  const paths = [
    "/",
    "/member/login",
    "/signup/step-1-subscription-selection",
    "/how-it-works",
    "/faqs",
    "/member/forgot-password",
    "/terms-and-conditions"
  ];
  for (const path of paths) {
    const { res } = await fetchStatus(`${BASE}${path}`);
    if (res.status === 200) pass(`Page ${path}`);
    else fail(`Page ${path}`, `status ${res.status}`);
  }
}

async function testWwwRedirect() {
  const { res } = await fetchStatus("https://www.reachforthestars.today/play-options");
  if (res.status === 308 || res.status === 301 || res.status === 302) {
    const loc = res.headers.get("location") || "";
    if (loc.includes("reachforthestars.today") && !loc.includes("www.")) {
      pass("www → apex redirect", loc);
    } else fail("www → apex redirect", loc || "no location");
  } else {
    fail("www → apex redirect", `status ${res.status}`);
  }
}

async function testSubscriptionPlans() {
  const { res, json } = await fetchStatus(`${BASE}/api/subscriptions`);
  if (res.status !== 200) {
    fail("GET /api/subscriptions", `status ${res.status}`);
    return;
  }
  const plans = json?.plans || [];
  if (!plans.length) {
    fail("Subscription plans", "empty");
    return;
  }
  pass("GET /api/subscriptions", `${plans.length} plan(s)`);
  const platinum = plans.find((p) => p.id === "platinum");
  const managed = plans.find((p) => p.id === "platinum_managed");
  if (!platinum?.priceId?.startsWith("price_")) fail("Gold (platinum) price ID", platinum?.priceId);
  else pass("Gold price ID", platinum.priceId);
  if (platinum?.trialDays !== 14) fail("Gold trial days", String(platinum?.trialDays));
  else pass("Gold 14-day trial");
  if (!managed?.priceId?.startsWith("price_")) fail("Platinum Managed price ID", managed?.priceId);
  else pass("Platinum Managed price ID", managed.priceId);
}

async function testAuthGuards() {
  const guarded = [
    { url: `${BASE}/api/user/me`, method: "GET" },
    { url: `${BASE}/api/user/schedule?nights=7`, method: "GET" },
    { url: `${BASE}/api/member/profile`, method: "GET" },
    { url: `${BASE}/api/member/billing-portal`, method: "POST", body: "{}" },
    { url: `${BASE}/api/member/report-issue`, method: "POST", body: JSON.stringify({ category: "Other", subject: "x", message: "x" }) },
    { url: `${BASE}/api/user/goals`, method: "GET" },
    { url: `${BASE}/api/admin/users`, method: "GET" },
    { url: `${BASE}/api/admin/affiliate-payouts`, method: "GET" }
  ];
  for (const g of guarded) {
    const { res } = await fetchStatus(g.url, {
      method: g.method,
      headers: g.body ? { "Content-Type": "application/json" } : undefined,
      body: g.body
    });
    if (res.status === 401 || res.status === 403) {
      pass(`Auth guard ${g.method} ${g.url.replace(BASE, "")}`, String(res.status));
    } else {
      fail(`Auth guard ${g.method} ${g.url.replace(BASE, "")}`, `expected 401/403, got ${res.status}`);
    }
  }
}

async function testLoginRejectsBadCreds() {
  const { res, json } = await fetchStatus(`${BASE}/api/user/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nobody@example.invalid", password: "wrongpassword" })
  });
  if (res.status === 401 && json?.error) pass("Login rejects bad credentials");
  else fail("Login rejects bad credentials", `status ${res.status}`);
}

async function testStripeWebhookGuard() {
  const { res, json } = await fetchStatus(`${BASE}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (res.status === 400 && (json?.error || "").includes("stripe-signature")) {
    pass("Stripe webhook rejects unsigned payload");
  } else {
    fail("Stripe webhook rejects unsigned payload", `status ${res.status}`);
  }
}

async function testBillingReturn() {
  const noToken = await fetchStatus(`${BASE}/member/billing-return`);
  const loc1 = noToken.res.headers.get("location") || "";
  if ((noToken.res.status === 307 || noToken.res.status === 302) && loc1.includes("/play-options")) {
    pass("Billing return (no token) → play-options");
  } else {
    fail("Billing return (no token)", `${noToken.res.status} → ${loc1}`);
  }

  const badToken = await fetchStatus(`${BASE}/member/billing-return?t=invalidtoken`);
  const loc2 = badToken.res.headers.get("location") || "";
  if (
    (badToken.res.status === 307 || badToken.res.status === 302) &&
    loc2.includes("/member/login")
  ) {
    pass("Billing return (bad token) → login");
  } else {
    fail("Billing return (bad token)", `${badToken.res.status} → ${loc2}`);
  }
}

async function testSignupRefParam() {
  const { res, text } = await fetchStatus(
    `${BASE}/signup/step-1-subscription-selection?ref=ABCD1234`
  );
  if (res.status === 200 && text.includes("ref=")) {
    pass("Signup page accepts ?ref= affiliate param");
  } else {
    fail("Signup page accepts ?ref= affiliate param", `status ${res.status}`);
  }
}

async function testOnboardingCheckoutPath() {
  const stamp = Date.now();
  const email = `rfts-smoke-${stamp}@example.invalid`;
  const body = {
    planId: "platinum",
    skipPayment: false,
    email,
    password: "SmokeTest12!",
    goalIds: ["cd6817ed-61aa-46da-bca6-6a0a41b46490"],
    playsPerNight: 2,
    profile: {
      firstName: "Smoke",
      lastName: "Test",
      gender: "",
      yearBorn: 1990,
      contactNumber: "",
      bestContactTimes: "",
      timeZone: "America/Los_Angeles",
      occupation: "",
      incomeGoal: "",
      adultConsent: true,
      isFirstResponder: false,
      wantsPracticeGrowth: false,
      wantsPolyamory: false,
      wantsLgdInfo: false,
      hadLgdSession: false,
      referralSource: "smoke-test"
    }
  };
  const { res, json } = await fetchStatus(`${BASE}/api/member/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const url = json?.url || "";
  if (res.status === 200 && url.includes("checkout.stripe.com")) {
    pass("Signup onboarding → Stripe Checkout", email);
    console.log(`       cleanup: node scripts/delete-test-user.js ${email}`);
  } else if (res.status === 200 && url.includes("billing.stripe.com")) {
    pass("Signup onboarding → billing portal (existing Stripe customer email collision unlikely)", url.slice(0, 60));
  } else {
    fail("Signup onboarding → Stripe Checkout", `status ${res.status}, url=${url.slice(0, 80)}`);
  }
}

async function main() {
  console.log(`Production smoke tests @ ${BASE}\n`);

  console.log("Infrastructure");
  await testHealth();
  await testWwwRedirect();

  console.log("\nPublic pages");
  await testPages();

  console.log("\nSubscriptions API");
  await testSubscriptionPlans();

  console.log("\nAuth & security");
  await testAuthGuards();
  await testLoginRejectsBadCreds();
  await testStripeWebhookGuard();
  await testBillingReturn();

  console.log("\nSignup flow");
  await testSignupRefParam();
  await testOnboardingCheckoutPath();

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("All automated smoke tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
