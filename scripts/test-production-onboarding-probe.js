/**
 * Probe production onboarding: does signup return Stripe Checkout or skip to play-options?
 * Usage: node scripts/test-production-onboarding-probe.js
 */
const stamp = Date.now();
const testEmail = process.env.SIGNUP_TEST_EMAIL || `rfts-probe-${stamp}@example.invalid`;

const body = {
  planId: "platinum",
  skipPayment: true,
  email: testEmail,
  password: "TestPass12!",
  goalIds: ["cd6817ed-61aa-46da-bca6-6a0a41b46490"],
  playsPerNight: 2,
  profile: {
    firstName: "Probe",
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
    hadLgdSession: false,
    referralSource: "agent-probe"
  }
};

async function main() {
  const base = "https://reachforthestars.today";
  console.log("Production onboarding probe");
  console.log("email:", testEmail);
  console.log("");

  const res = await fetch(`${base}/api/member/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }

  console.log("HTTP", res.status);
  console.log("response:", JSON.stringify(json, null, 2));

  const url = json.url || "";
  if (url.includes("checkout.stripe.com")) {
    console.log("\nRESULT: Stripe Checkout URL returned — live/test checkout path OK");
  } else if (url === "/play-options" || url.endsWith("/play-options")) {
    console.log("\nRESULT: Skipped Stripe — went straight to play-options (DEMO_SKIP or demo mode)");
  } else if (url.includes("billing.stripe.com")) {
    console.log("\nRESULT: Billing portal URL returned");
  } else {
    console.log("\nRESULT: Other redirect:", url || "(none)");
  }

  if (res.status === 200 && url.includes("checkout.stripe.com")) {
    console.log("\nCleanup: delete test user if created:");
    console.log(`  node scripts/delete-test-user.js ${testEmail}`);
  } else if (res.status === 200) {
    console.log("\nCleanup: delete test user:");
    console.log(`  node scripts/delete-test-user.js ${testEmail}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
