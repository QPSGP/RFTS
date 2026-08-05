/**
 * End-to-end signup email test against production (or any base URL).
 * Creates a real member account - use a disposable email and delete via admin if needed.
 *
 *   node scripts/test-signup-onboarding-api.js https://reachforthestars.today
 */
const baseUrl = (process.argv[2] || "https://reachforthestars.today").replace(/\/$/, "");
const stamp = Date.now();
const testEmail = process.env.SIGNUP_TEST_EMAIL || `rfts-signup-test-${stamp}@example.invalid`;

const body = {
  planId: "platinum",
  skipPayment: true,
  email: testEmail,
  password: "TestPass12!",
  goalIds: ["cd6817ed-61aa-46da-bca6-6a0a41b46490"],
  playsPerNight: 2,
  profile: {
    firstName: "Signup",
    lastName: "EmailTest",
    gender: "",
    yearBorn: 1990,
    contactNumber: "",
    bestContactTimes: "",
    timeZone: "America/Los_Angeles",
    occupation: "",
    incomeGoal: "",
    adultConsent: true,
    isFirstResponder: false,
    wantsPracticeGrowth: true,
    wantsPolyamory: false,
    wantsLgdInfo: true,
    hadLgdSession: false,
    referralSource: "agent-email-test"
  }
};

async function main() {
  console.log("POST", `${baseUrl}/api/member/onboarding`);
  console.log("test email (TO):", testEmail);
  console.log("expect CC: terry_bg@msn.com, Richard@richardleeweatherman.com");
  console.log("expect 3 emails if Resend OK: Welcome, LGD, therapist/healer/coach");
  console.log("");

  const res = await fetch(`${baseUrl}/api/member/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }

  console.log("status:", res.status);
  console.log("response:", JSON.stringify(json, null, 2));

  if (res.status === 409) {
    console.log("\nMember already exists - set SIGNUP_TEST_EMAIL to a fresh address.");
    process.exit(1);
  }

  if (res.status !== 200) {
    console.log("\nOnboarding failed - emails may not have been sent.");
    process.exit(1);
  }

  console.log("\nOnboarding succeeded. Emails are sent before Stripe redirect.");
  console.log("Check Terry/Richard CC inboxes for Welcome + follow-ups.");
  console.log("Delete test user in Admin if this was a throwaway email.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
