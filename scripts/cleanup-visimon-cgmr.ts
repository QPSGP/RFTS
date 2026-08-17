/**
 * Keep only the newest CGMR for richard@visimon.app as current personalized CGMR.
 * Removes his email from older CGMR allow-lists and CGMR assignment rows.
 *
 *   npx tsx scripts/cleanup-visimon-cgmr.ts
 */
import path from "path";
import { config } from "dotenv";
config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const email = "richard@visimon.app";
  const {
    listPersonalizedLibraryForUser,
    revokeOtherMemberCgmrAllowListEntries
  } = await import("../src/lib/db");
  const { pickNewestMemberCgmr } = await import("../src/lib/library-access");

  const items = await listPersonalizedLibraryForUser(email);
  const newest = pickNewestMemberCgmr(items, email);
  if (!newest) {
    console.error("No CGMR found for", email);
    process.exit(1);
  }
  console.log("Keeping:", newest.id, newest.title, newest.createdAt);
  const revoked = await revokeOtherMemberCgmrAllowListEntries(email, newest.id);
  console.log(`Revoked older CGMR allow-list entries: ${revoked}`);

  const after = await listPersonalizedLibraryForUser(email);
  const remaining = after.filter((i) =>
    (i.categories || []).some((c) => c.toLowerCase() === "cgmr")
  );
  console.log(
    "Remaining CGMRs for member:",
    remaining.map((r) => `${r.title} (${r.id})`).join("; ") || "(none)"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
