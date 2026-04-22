/**
 * CLI export (same output as Admin → Schedule algorithm (Gold vs Managed)).
 * For web UI, use the admin console; this script writes files under scripts/output/.
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

import {
  buildComparisonCsvString,
  buildComparisonHtmlString,
  buildScheduleAlgorithmComparison
} from "../src/lib/schedule-algorithm-comparison";

async function main() {
  const goldEmail = process.env.SCHEDULE_GOLD_EMAIL?.trim();
  const managedEmail = process.env.SCHEDULE_MANAGED_EMAIL?.trim();
  const nightsRaw = process.env.SCHEDULE_NIGHTS?.trim();
  const nights = Math.min(
    366,
    Math.max(1, nightsRaw ? parseInt(nightsRaw, 10) || 42 : 42)
  );

  if (!goldEmail || !managedEmail) {
    console.error(
      "Set SCHEDULE_GOLD_EMAIL and SCHEDULE_MANAGED_EMAIL (e.g. Craig Rogers Gold account and Terry & Craig Managed account)."
    );
    process.exit(1);
  }

  const result = await buildScheduleAlgorithmComparison(goldEmail, managedEmail, nights);
  for (const w of result.warnings) {
    console.warn("Warning:", w);
  }

  const csv = buildComparisonCsvString(result);
  const html = buildComparisonHtmlString(result);
  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const base = "schedule-algorithm-comparison";
  const csvPath = path.join(outDir, `${base}.csv`);
  const htmlPath = path.join(outDir, `${base}.html`);
  fs.writeFileSync(csvPath, csv, "utf8");
  fs.writeFileSync(htmlPath, html, "utf8");
  console.log(`Wrote:\n  ${csvPath}\n  ${htmlPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
