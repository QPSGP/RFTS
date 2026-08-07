/**
 * Batch-extract lead fields from Expo card previews via OpenAI vision.
 *
 * Requires OPENAI_API_KEY in .env.local.
 *
 * Usage:
 *   npx tsx scripts/extract-lead-card-scans.ts
 *   npx tsx scripts/extract-lead-card-scans.ts --limit 10
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const PREVIEW_DIR = path.join(
  "docs",
  "lead-card-scans",
  "long-beach-2026-08",
  "preview"
);
const OUT_PATH = path.join(
  "docs",
  "lead-card-scans",
  "long-beach-2026-08",
  "extracts-openai.json"
);
const EXISTING_PATH = path.join(
  "docs",
  "lead-card-scans",
  "long-beach-2026-08",
  "extracts.json"
);

const SYSTEM = `You extract lead-card data from Success Center expo scans.
Return ONLY valid JSON (no markdown) with this shape:
{
  "formType": "practice_survey" | "consumer_lead",
  "fullName": string|null,
  "email": string|null,
  "phoneMobile": string|null,
  "smsOk": boolean,
  "city": string|null,
  "state": string|null,
  "zip": string|null,
  "statusHint": "new" | "paused",
  "notes": string,
  "practice": object|null,
  "consumer": object|null,
  "staffFlags": string[]
}
Rules:
- Green Hypnotherapy Business Practice Survey → practice_survey
- Yellow general interests card → consumer_lead
- Normalize email (remove spaces around @ and .)
- If staff wrote DN, No Deal, No deals → statusHint paused and include in staffFlags
- smsOk true only if TXT checked or explicit text OK
- Keep notes concise`;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error("OPENAI_API_KEY missing in .env.local - cannot run vision extract.");
    process.exit(1);
  }

  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const existing = fs.existsSync(EXISTING_PATH)
    ? JSON.parse(fs.readFileSync(EXISTING_PATH, "utf8"))
    : { leads: [] };
  const done = new Set((existing.leads || []).map((l: { scanId: string }) => l.scanId));

  const files = fs
    .readdirSync(PREVIEW_DIR)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()
    .filter((f) => !done.has(f.replace(/\.jpe?g$/i, "")))
    .slice(0, Number.isFinite(limit) ? limit : undefined);

  console.log(`To extract: ${files.length} (already have ${done.size})`);

  const leads = [...(existing.leads || [])];
  for (const file of files) {
    const scanId = file.replace(/\.jpe?g$/i, "");
    const abs = path.join(PREVIEW_DIR, file);
    const b64 = fs.readFileSync(abs).toString("base64");
    console.log(`Extracting ${scanId}...`);

    let res: Response | null = null;
    let detail = "";
    for (let attempt = 1; attempt <= 6; attempt++) {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.LEAD_CARD_VISION_MODEL || "gpt-4o-mini",
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Extract lead fields from scan ${scanId} (Holistic Healing Expo Long Beach Aug 2026).`
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${b64}` }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });
      if (res.ok) break;
      detail = await res.text();
      if (res.status === 429) {
        const waitMs = Math.min(30000, 1500 * attempt * attempt);
        console.warn(`Rate limited ${scanId} attempt ${attempt}; waiting ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }

    if (!res || !res.ok) {
      console.error(`FAIL ${scanId}`, res?.status, detail.slice(0, 300));
      continue;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error(`BAD JSON ${scanId}`);
      continue;
    }
    leads.push({
      scanId,
      eventKey: "holistic-healing-expo-long-beach-2026-08",
      eventName: "Holistic Healing Expo - Long Beach",
      eventDates: "2026-08-01 / 2026-08-02",
      sourceScanPath: `docs/lead-card-scans/long-beach-2026-08/jpg/${scanId}.jpg`,
      persona:
        parsed.formType === "practice_survey"
          ? "Chris - Spiritual Entrepreneur"
          : "Alex - Burned-Out Professional",
      category:
        parsed.formType === "practice_survey"
          ? "Coaches, studios & practitioners"
          : "Individuals & influencers",
      interest:
        parsed.formType === "practice_survey"
          ? "Facilitator / managed memberships"
          : "Personal membership",
      entryPath: parsed.formType === "practice_survey" ? "Facilitator / Managed" : "Direct",
      ...parsed
    });
    fs.writeFileSync(
      OUT_PATH,
      JSON.stringify(
        {
          eventKey: "holistic-healing-expo-long-beach-2026-08",
          updatedAt: new Date().toISOString(),
          leads
        },
        null,
        2
      )
    );
    // also merge into extracts.json progressively
    fs.writeFileSync(
      EXISTING_PATH,
      JSON.stringify(
        {
          eventKey: "holistic-healing-expo-long-beach-2026-08",
          eventName: "Holistic Healing Expo - Long Beach",
          eventDates: "2026-08-01 / 2026-08-02",
          sourceFolder:
            "docs/lead-card-scans/20260806 Leads from Long Beach Holistic Health Expo",
          updatedAt: new Date().toISOString().slice(0, 10),
          leads
        },
        null,
        2
      )
    );
    // Pace requests to stay under TPM limits on image inputs.
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log(`Done. Total leads in file: ${leads.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
