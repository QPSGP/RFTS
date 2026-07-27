/**
 * Produce hypnotic CGMR audio for the three LGD demo members and put each
 * on their playlist + share listen access with richard@visimon.app.
 *
 *   npx tsx scripts/produce-lgd-demo-cgmrs.ts
 *
 * Requires OPENAI_API_KEY (+ BLOB_READ_WRITE_TOKEN, POSTGRES_URL) in .env.local
 * or a pulled Vercel env file loaded below.
 */
import path from "path";
import fs from "fs";
import { config } from "dotenv";

const root = process.cwd();
config({ path: path.join(root, ".env.local") });
for (const extra of [".env.openai.tmp", ".env.vercel", ".env.production.local"]) {
  const p = path.join(root, extra);
  if (fs.existsSync(p)) config({ path: p, override: false });
}

import { sql } from "@vercel/postgres";
import { getLibraryItem, updateLibraryItem } from "../src/lib/db";
import { produceLgdCgmrForIntake } from "../src/lib/lgd-cgmr-produce";

const DEMO_EMAILS = [
  "lgd-demo-chris@rfts.demo",
  "lgd-demo-jordan@rfts.demo",
  "lgd-demo-morgan@rfts.demo"
] as const;

const LISTENER_EMAILS = ["richard@visimon.app", ...DEMO_EMAILS];

/** Ensure the three demos use three different catalog voices. */
const VOICE_BY_EMAIL: Record<string, string> = {
  "lgd-demo-chris@rfts.demo": "terry",
  "lgd-demo-jordan@rfts.demo": "associate_warm",
  "lgd-demo-morgan@rfts.demo": "associate_deep"
};

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error(
      "OPENAI_API_KEY is missing. Add it to .env.local (same key as Vercel) and re-run."
    );
    process.exit(1);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    console.error("BLOB_READ_WRITE_TOKEN missing — needed to store generated audio.");
    process.exit(1);
  }

  console.log("Updating demo voices + producing CGMR audios…\n");

  for (const email of DEMO_EMAILS) {
    const voiceId = VOICE_BY_EMAIL[email];
    const { rows } = await sql<{
      id: string;
      voice_id: string | null;
      status: string;
      library_item_id: string | null;
    }>`
      SELECT i.id, i.voice_id, i.status, i.library_item_id
      FROM lgd_intakes i
      JOIN users u ON u.id = i.user_id
      WHERE lower(u.email) = ${email}
      ORDER BY i.updated_at DESC
      LIMIT 1
    `;
    const intake = rows[0];
    if (!intake) {
      console.error(`  ✗ ${email} — no intake (run npm run lgd:seed-demos first)`);
      continue;
    }
    if (intake.status === "draft" || intake.status === "cancelled") {
      console.error(`  ✗ ${email} — intake status ${intake.status}; need submitted+`);
      continue;
    }

    await sql`
      UPDATE lgd_intakes
      SET
        voice_id = ${voiceId},
        answers = jsonb_set(COALESCE(answers, '{}'::jsonb), '{voiceId}', to_jsonb(${voiceId}::text), true),
        updated_at = now()
      WHERE id = ${intake.id}
    `;
    console.log(`  ${email}: voice → ${voiceId}, producing…`);

    const result = await produceLgdCgmrForIntake({
      intakeId: intake.id,
      mode: "generate"
    });
    if (!result.ok) {
      console.error(`  ✗ ${email}: ${result.error}`);
      continue;
    }

    const item = await getLibraryItem(result.libraryItemId);
    if (item) {
      const allowed = Array.from(
        new Set(
          [...(item.allowedUserEmails || []), ...LISTENER_EMAILS].map((e) =>
            e.trim().toLowerCase()
          )
        )
      );
      await updateLibraryItem({
        id: item.id,
        title: item.title,
        description: item.description,
        skuCode: item.skuCode || "",
        fileName: item.fileName || "",
        categories: item.categories?.length ? item.categories : ["CGMR"],
        coverUrl: item.coverUrl || "",
        audioUrl: item.audioUrl,
        interestIds: item.interestIds || [],
        allowedUserEmails: allowed,
        order: item.order,
        isAdult: item.isAdult,
        inGeneralCatalog: false
      });
    }

    console.log(
      `  ✓ ${email}: ${result.voiceLabel} → library ${result.libraryItemId}` +
        (result.regenerated ? " (updated)" : " (new)")
    );
    console.log(`    audio: ${result.audioUrl}`);
  }

  console.log("\nDone.");
  console.log("Listen as richard@visimon.app → Library / Play options (personalized CGMR).");
  console.log("Or Admin → Content / Members personalized audio for each lgd-demo-* user.");
  console.log("Demo login password: DemoLgd2026!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
