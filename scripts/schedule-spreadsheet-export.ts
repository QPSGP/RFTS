/**
 * CLI: export one member’s schedule to scripts/output/ (same as Admin → Schedule algorithm).
 *
 *   SCHEDULE_EMAIL=member@example.com SCHEDULE_NIGHTS=42 npm run schedule:spreadsheet
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

import {
  buildMemberExportCsvString,
  buildMemberExportHtmlString,
  buildScheduleAlgorithmForMember
} from "../src/lib/schedule-algorithm-export";

async function main() {
  const email = process.env.SCHEDULE_EMAIL?.trim() || process.env.SCHEDULE_GOLD_EMAIL?.trim();
  if (!email) {
    console.error("Set SCHEDULE_EMAIL (member login email), e.g. SCHEDULE_EMAIL=you@example.com");
    process.exit(1);
  }
  const nightsRaw = process.env.SCHEDULE_NIGHTS?.trim();
  const nights = Math.min(
    732,
    Math.max(1, nightsRaw ? parseInt(nightsRaw, 10) || 42 : 42)
  );

  const result = await buildScheduleAlgorithmForMember(email, nights);
  for (const w of result.warnings) {
    console.warn("Warning:", w);
  }

  const csv = buildMemberExportCsvString(result);
  const html = buildMemberExportHtmlString(result);
  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const base = "schedule-algorithm";
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
