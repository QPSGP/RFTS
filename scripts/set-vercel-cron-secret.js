/**
 * Upsert CRON_SECRET on Vercel (Production).
 *
 * Prerequisites:
 *   1. Create a token: https://vercel.com/account/tokens
 *   2. Set VERCEL_TOKEN in .env.local or the shell
 *
 * Usage:
 *   npm run vercel:set-cron-secret
 *   VERCEL_PROJECT=rfts npm run vercel:set-cron-secret
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.local") });

const crypto = require("crypto");

const token = process.env.VERCEL_TOKEN?.trim();
const project = process.env.VERCEL_PROJECT?.trim() || "rfts";
const secretFromEnv = process.env.CRON_SECRET?.trim();
const secret =
  secretFromEnv || crypto.randomBytes(32).toString("base64url");

async function main() {
  if (!token) {
    console.error(
      "VERCEL_TOKEN is not set. Add it to .env.local or export it, then re-run.\n" +
        "Create a token: https://vercel.com/account/tokens"
    );
    process.exit(1);
  }

  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/env?upsert=true`;
  const body = [
    {
      key: "CRON_SECRET",
      value: secret,
      type: "sensitive",
      target: ["production"]
    }
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Vercel API error:", res.status, text);
    if (res.status === 404) {
      console.error(
        `Project "${project}" not found. Set VERCEL_PROJECT to your Vercel project name (Dashboard → project → Settings → General).`
      );
    }
    process.exit(1);
  }

  console.log(`CRON_SECRET set on Vercel project "${project}" (production).`);
  if (!secretFromEnv) {
    console.log("Generated CRON_SECRET (add to .env.local if needed):");
    console.log(secret);
  }
  console.log("\nRedeploy production so the new env var is active:");
  console.log("  Vercel Dashboard → Deployments → Redeploy latest");
  console.log("Or push a commit / run: npm run deploy");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
