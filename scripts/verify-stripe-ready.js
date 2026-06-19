/**
 * Verify Stripe-related config before go-live.
 * Loads .env.local and checks subscription_plans price IDs in Postgres.
 *
 *   npm run stripe:verify
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });
const { Pool } = require("pg");

const SIGNUP_PLANS = ["platinum", "platinum_managed"];

function checkKey() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key || key === "sk_test_replace") {
    return { ok: false, msg: "STRIPE_SECRET_KEY missing or placeholder" };
  }
  const live = key.startsWith("sk_live");
  const test = key.startsWith("sk_test");
  if (!live && !test) return { ok: false, msg: "STRIPE_SECRET_KEY format unrecognized" };
  return { ok: true, live, test, msg: live ? "live key" : "test key" };
}

function checkWebhook() {
  const wh = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!wh) return { ok: false, msg: "STRIPE_WEBHOOK_SECRET not set" };
  return { ok: true, msg: "set" };
}

function checkDemoSkip() {
  const skip = process.env.DEMO_SKIP_STRIPE === "true";
  return { ok: !skip, msg: skip ? "DEMO_SKIP_STRIPE=true (signup will skip payment)" : "off" };
}

function checkPublicMode(liveKey) {
  const mode = (process.env.NEXT_PUBLIC_STRIPE_MODE || "").toLowerCase();
  if (liveKey && mode === "demo") {
    return { ok: false, msg: "NEXT_PUBLIC_STRIPE_MODE=demo but secret key is live" };
  }
  return { ok: true, msg: mode || "(unset)" };
}

function checkPriceId(id, planId) {
  if (!id || !id.trim()) {
    return { ok: false, msg: `${planId}: empty price_id` };
  }
  if (id.startsWith("prod_")) {
    return { ok: false, msg: `${planId}: ${id} is a Product ID — use Price ID (price_…)` };
  }
  if (!id.startsWith("price_")) {
    return { ok: false, msg: `${planId}: ${id} does not look like price_…` };
  }
  return { ok: true, msg: id };
}

async function main() {
  console.log("Stripe go-live verification\n");

  const key = checkKey();
  console.log("STRIPE_SECRET_KEY:", key.ok ? `OK (${key.msg})` : `FAIL — ${key.msg}`);

  const wh = checkWebhook();
  console.log("STRIPE_WEBHOOK_SECRET:", wh.ok ? "OK" : `WARN — ${wh.msg}`);

  const skip = checkDemoSkip();
  console.log("DEMO_SKIP_STRIPE:", skip.ok ? "OK (off)" : `FAIL — ${skip.msg}`);

  if (key.ok) {
    const pub = checkPublicMode(key.live);
    console.log(
      "NEXT_PUBLIC_STRIPE_MODE:",
      pub.ok ? `OK (${pub.msg})` : `FAIL — ${pub.msg}`
    );
  }

  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.log("\nPOSTGRES_URL: missing — cannot check plan price IDs");
    process.exit(key.ok && skip.ok ? 0 : 1);
  }

  const pool = new Pool({ connectionString: url });
  const { rows } = await pool.query(
    "SELECT id, name, price_id, trial_days FROM subscription_plans ORDER BY id"
  );
  await pool.end();

  console.log("\nSubscription plans (signup uses platinum + platinum_managed):\n");
  let plansOk = true;
  for (const planId of SIGNUP_PLANS) {
    const row = rows.find((r) => r.id === planId);
    if (!row) {
      console.log(`  ${planId}: FAIL — row missing in subscription_plans`);
      plansOk = false;
      continue;
    }
    const pid = checkPriceId(row.price_id, planId);
    console.log(
      `  ${planId} (${row.name}):`,
      pid.ok ? `OK ${pid.msg}, trial ${row.trial_days}d` : `FAIL — ${pid.msg}`
    );
    if (!pid.ok) plansOk = false;
  }

  const legacy = rows.filter((r) => !SIGNUP_PLANS.includes(r.id));
  if (legacy.length) {
    console.log("\nOther plan rows (not used for current signup):");
    for (const row of legacy) {
      const pid = checkPriceId(row.price_id, row.id);
      console.log(`  ${row.id}:`, pid.ok ? pid.msg : `WARN — ${pid.msg}`);
    }
  }

  const allOk = key.ok && skip.ok && plansOk && (key.live ? checkPublicMode(true).ok : true);
  console.log(allOk ? "\nReady for Stripe checkout." : "\nFix items above before go-live.");
  console.log("See docs/STRIPE_GO_LIVE_NOW.md for Vercel + Stripe Dashboard steps.");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
