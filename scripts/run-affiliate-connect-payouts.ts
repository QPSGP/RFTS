/**
 * Run Stripe Connect payouts for all eligible affiliates (same logic as monthly cron).
 * Usage: npm run affiliates:run-connect-payouts
 */
import { config } from "dotenv";
import path from "path";

config({ path: path.join(process.cwd(), ".env.local") });

import { runAllReadyStripeConnectPayouts } from "../src/lib/stripe-connect";

async function main() {
  const results = await runAllReadyStripeConnectPayouts();
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const totalPaidCents = succeeded.reduce((sum, r) => sum + (r.amountCents ?? 0), 0);

  console.log("Affiliate Connect payout run complete.");
  console.log(`Attempted: ${results.length}`);
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Total paid (cents): ${totalPaidCents}`);

  for (const r of succeeded) {
    console.log(
      `  OK ${r.affiliateCode}: $${((r.amountCents ?? 0) / 100).toFixed(2)} transfer ${r.transferId}`
    );
  }
  for (const r of failed) {
    console.log(`  FAIL ${r.affiliateCode}: ${r.error}`);
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
