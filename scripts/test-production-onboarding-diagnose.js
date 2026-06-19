require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");
const stamp = Date.now();
const email = `rfts-probe-${stamp}@example.invalid`;
const body = {
  planId: "platinum",
  skipPayment: false,
  email,
  password: "TestPass12!",
  goalIds: ["cd6817ed-61aa-46da-bca6-6a0a41b46490"],
  playsPerNight: 2,
  profile: {
    firstName: "Probe",
    lastName: "Test",
    gender: "",
    yearBorn: 1990,
    timeZone: "America/Los_Angeles",
    adultConsent: true,
    wantsPracticeGrowth: false,
    hadLgdSession: false,
    referralSource: "agent-probe"
  }
};

(async () => {
  const res = await fetch("https://reachforthestars.today/api/member/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
  const u = await pool.query(
    `SELECT s.status, s.stripe_customer_id FROM users u
     JOIN subscriptions s ON s.user_id = u.id WHERE u.email = $1`,
    [email]
  );
  await pool.query("DELETE FROM users WHERE email = $1", [email]);
  await pool.end();
  console.log("HTTP", res.status);
  console.log("url:", json.url || json.error);
  console.log("subscription after call:", u.rows[0] || "none");
  if (json.url?.includes("checkout.stripe.com")) console.log("PASS: Stripe Checkout");
  else if (json.url === "/play-options" && u.rows[0]?.status === "active")
    console.log("DIAG: play-options + active = DEMO_SKIP_STRIPE likely still true");
  else if (json.url === "/play-options" && u.rows[0]?.status === "inactive")
    console.log("DIAG: play-options + inactive = Checkout create FAILED (check STRIPE_MODE vs sk_live, price ID)");
})();
