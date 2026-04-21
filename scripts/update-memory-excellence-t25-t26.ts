/**
 * Sets display title + description for T-25 / T-26 after swapping underlying audio files.
 * Titles match member-facing labels; long copy comes from data/recording-descriptions.json.
 *
 * Usage (from rfts-platform, POSTGRES_URL in .env.local):
 *   npx tsx scripts/update-memory-excellence-t25-t26.ts
 */

import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

import { sql } from "@vercel/postgres";

const TITLES: Record<string, string> = {
  "T-25": "Memory Excellence, Life Long",
  "T-26": "Memory Excellence, Golden Years"
};

async function main() {
  const descPath = path.join(process.cwd(), "data", "recording-descriptions.json");
  const descriptions = JSON.parse(fs.readFileSync(descPath, "utf8")) as Record<string, string>;

  for (const sku of ["T-25", "T-26"] as const) {
    const title = TITLES[sku];
    const description = descriptions[sku] || "";
    const { rowCount, rows } = await sql`
      UPDATE library_items
      SET title = ${title}, description = ${description}
      WHERE UPPER(TRIM(sku_code)) = ${sku.toUpperCase()}
      RETURNING id, sku_code, title
    `;
    if (!rowCount) {
      console.warn(`No row found for SKU ${sku} (sku_code). Add the library item in admin or fix SKU.`);
    } else {
      console.log(`Updated ${sku}:`, rows);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
