/**
 * One-shot: dump all starter outreach + conversion email templates to a
 * plain-text file Terry can edit.
 *
 *   npx tsx scripts/export-outreach-templates-for-terry.ts
 */
import fs from "fs";
import path from "path";
import { STARTER_OUTREACH_EMAIL_TEMPLATES } from "../src/lib/marketing-reference";

const lines: string[] = [];
lines.push("Reach For The Stars - Outreach & conversion email templates");
lines.push("For Terry Brussel-Rogers to review and edit");
lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
lines.push("");
lines.push("Placeholders you can leave as-is (merged when sending):");
lines.push(
  "  {{name}}  {{firstName}}  {{lastName}}  {{contactName}}  {{organization}}  {{persona}}  {{siteUrl}}  {{yourName}}"
);
lines.push("");
lines.push(
  "Edit Subject and Body below. Keep the ===== separators so we can find each template."
);
lines.push("");

STARTER_OUTREACH_EMAIL_TEMPLATES.forEach((t, i) => {
  lines.push(
    "================================================================================"
  );
  lines.push(
    `TEMPLATE ${i + 1} of ${STARTER_OUTREACH_EMAIL_TEMPLATES.length}`
  );
  lines.push(`Name: ${t.name}`);
  lines.push(`Purpose tag: ${t.purpose}`);
  lines.push(
    "--------------------------------------------------------------------------------"
  );
  lines.push("Subject:");
  lines.push(t.subject);
  lines.push(
    "--------------------------------------------------------------------------------"
  );
  lines.push("Body:");
  lines.push(t.bodyText.trim());
  lines.push("");
});

lines.push(
  "================================================================================"
);
lines.push("END OF TEMPLATES");
lines.push("");

const out = path.join(process.cwd(), "docs", "OUTREACH_EMAIL_TEMPLATES_FOR_TERRY.txt");
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${out} (${STARTER_OUTREACH_EMAIL_TEMPLATES.length} templates)`);
