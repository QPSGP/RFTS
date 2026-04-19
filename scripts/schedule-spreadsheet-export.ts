/**
 * Exports a side-by-side CSV (spreadsheet) comparing schedule algorithm output for two members:
 * typically Gold (non-managed / goal-based) vs Platinum Managed (assigned-audio order).
 *
 * Uses the same inputs as GET /api/user/schedule: listLibrary, playback settings, interests,
 * member profile filters, goal IDs or member_audio_assignments order, and buildSchedulePreview.
 *
 * Usage (from rfts-platform, with POSTGRES_URL in .env.local):
 *   npx tsx scripts/schedule-spreadsheet-export.ts
 *
 * Env (required):
 *   SCHEDULE_GOLD_EMAIL       — e.g. Craig Rogers (non-managed Gold)
 *   SCHEDULE_MANAGED_EMAIL    — e.g. Terry & Craig Rogers (Platinum Managed)
 *
 * Optional:
 *   SCHEDULE_NIGHTS=42        — how many schedule nights to generate (1–366)
 *
 * Output: scripts/output/schedule-algorithm-comparison.csv (+ .html for Excel-friendly view)
 */

import fs from "fs";
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

import type { LibraryItem } from "../src/lib/types";
import { buildSchedulePreview, type ScheduleNight } from "../src/lib/scheduler";
import {
  getMemberProfileByUserId,
  getMemberAudioOrder,
  getPlaybackSettings,
  getUserProfile,
  listInterests,
  listLibrary
} from "../src/lib/db";

function hasCategory(item: { categories?: string[] }, cat: string): boolean {
  return (item.categories || []).some((c) => c.toLowerCase() === cat.toLowerCase());
}

function filterLibraryForMember(
  library: LibraryItem[],
  memberProfile: Awaited<ReturnType<typeof getMemberProfileByUserId>>
): LibraryItem[] {
  const yearBornRaw = memberProfile?.yearBorn ?? null;
  const yearBorn =
    yearBornRaw != null
      ? typeof yearBornRaw === "number"
        ? yearBornRaw
        : parseInt(String(yearBornRaw), 10)
      : null;
  const yearBornNum =
    yearBorn != null && !Number.isNaN(yearBorn) && yearBorn >= 1900 && yearBorn <= 2100
      ? yearBorn
      : null;
  const hasVerifiedAge =
    yearBornNum != null && new Date().getFullYear() - yearBornNum >= 18;
  const canAccessAdult = (memberProfile?.adultConsent ?? false) && hasVerifiedAge;
  const wantsPracticeGrowth = memberProfile?.wantsPracticeGrowth ?? false;

  return library.filter((item) => {
    if (item.isAdult && !canAccessAdult) return false;
    if (hasCategory(item, "special") && !wantsPracticeGrowth) return false;
    return true;
  });
}

function resolveUserAssignedTrack(
  filteredLibrary: LibraryItem[],
  emailLower: string,
  assignedAudioIds: string[] | undefined
): LibraryItem | null {
  const cgmrForMember =
    filteredLibrary.find(
      (item) =>
        (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower) &&
        hasCategory(item, "cgmr")
    ) ?? null;
  const anyAllowListMatch =
    filteredLibrary.find((item) =>
      (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower)
    ) ?? null;
  return cgmrForMember ?? (assignedAudioIds?.length ? null : anyAllowListMatch);
}

function csvEscape(cell: string): string {
  if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

/** Night start: new goal/audio in rotation, and (Gold only) session-drop removals. */
function rotationStartText(n: ScheduleNight | undefined): string {
  if (!n) return "";
  const parts: string[] = [];
  if (n.rotationAdded?.length) parts.push(...n.rotationAdded);
  if (n.rotationSessionDrop?.length) parts.push(...n.rotationSessionDrop);
  return parts.join(" | ");
}

/** After this night’s plays: play-cap removals. */
function rotationAfterText(n: ScheduleNight | undefined): string {
  if (!n?.rotationRemovedAfterPlays?.length) return "";
  return n.rotationRemovedAfterPlays.join(" | ");
}

function hasRotationHighlight(n: ScheduleNight | undefined): boolean {
  return !!(
    n?.rotationAdded?.length ||
    n?.rotationSessionDrop?.length ||
    n?.rotationRemovedAfterPlays?.length
  );
}

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

  const [library, settings, interestRecords] = await Promise.all([
    listLibrary(),
    getPlaybackSettings(),
    listInterests()
  ]);

  const goldProfile = await getUserProfile(goldEmail);
  const managedProfile = await getUserProfile(managedEmail);
  if (!goldProfile) {
    console.error(`No user found for SCHEDULE_GOLD_EMAIL=${goldEmail}`);
    process.exit(1);
  }
  if (!managedProfile) {
    console.error(`No user found for SCHEDULE_MANAGED_EMAIL=${managedEmail}`);
    process.exit(1);
  }

  const goldMember = await getMemberProfileByUserId(goldProfile.id);
  const managedMember = await getMemberProfileByUserId(managedProfile.id);

  const goldLower = goldProfile.email?.toLowerCase() ?? "";
  const managedLower = managedProfile.email?.toLowerCase() ?? "";

  const goldLibrary = filterLibraryForMember(library, goldMember);
  const managedLibrary = filterLibraryForMember(library, managedMember);

  const managedOrder = await getMemberAudioOrder(managedEmail);
  const assignedAudioIds =
    managedProfile.subscriptionTier === "platinum_managed" && managedOrder.length > 0
      ? managedOrder
      : undefined;

  if (managedProfile.subscriptionTier === "platinum_managed" && !assignedAudioIds?.length) {
    console.warn(
      "Warning: SCHEDULE_MANAGED_EMAIL is platinum_managed but has no rows in member_audio_assignments; managed column may not match production."
    );
  }

  const goldAssigned = resolveUserAssignedTrack(goldLibrary, goldLower, undefined);
  const managedAssigned = resolveUserAssignedTrack(managedLibrary, managedLower, assignedAudioIds);

  const goldSchedule = buildSchedulePreview({
    interests: goldProfile.goalIds || [],
    library: goldLibrary,
    interestRecords,
    settings,
    tier: (goldProfile.subscriptionTier as "platinum" | "platinum_managed") || "platinum",
    nights,
    playsPerNight: goldProfile.playsPerNight === 1 ? 1 : 2,
    userAssignedTrack: goldAssigned ?? undefined,
    assignedAudioIds: undefined
  });

  const managedSchedule = buildSchedulePreview({
    interests: [],
    library: managedLibrary,
    interestRecords,
    settings,
    tier: "platinum_managed",
    nights,
    playsPerNight: managedProfile.playsPerNight === 1 ? 1 : 2,
    userAssignedTrack: managedAssigned ?? undefined,
    assignedAudioIds
  });

  const goldLabel = `Gold (non-managed): ${goldEmail}`;
  const managedLabel = `Platinum Managed: ${managedEmail}`;

  const header = [
    "Schedule night",
    "Algorithm note (Gold)",
    "Gold — play 1 (title)",
    "Gold — play 2 (title)",
    "Gold — SKU play 1",
    "Gold — SKU play 2",
    "Gold — rotation (night start: new audio / session drop)",
    "Gold — rotation (after plays: play-cap drop)",
    "Algorithm note (Managed)",
    "Managed — play 1 (title)",
    "Managed — play 2 (title)",
    "Managed — SKU play 1",
    "Managed — SKU play 2",
    "Managed — rotation (night start: new audio)",
    "Managed — rotation (after plays: play-cap drop)"
  ];

  const rows: string[][] = [header];
  const maxN = Math.max(goldSchedule.length, managedSchedule.length, nights);

  for (let i = 0; i < maxN; i++) {
    const g = goldSchedule[i];
    const m = managedSchedule[i];
    const gTracks = g?.tracks ?? [];
    const mTracks = m?.tracks ?? [];
    rows.push([
      String(i + 1),
      g?.note ?? "",
      gTracks[0]?.title ?? "",
      gTracks[1]?.title ?? "",
      gTracks[0]?.skuCode ?? "",
      gTracks[1]?.skuCode ?? "",
      rotationStartText(g),
      rotationAfterText(g),
      m?.note ?? "",
      mTracks[0]?.title ?? "",
      mTracks[1]?.title ?? "",
      mTracks[0]?.skuCode ?? "",
      mTracks[1]?.skuCode ?? "",
      rotationStartText(m),
      rotationAfterText(m)
    ]);
  }

  const metaLines = [
    "# RFTS schedule algorithm export",
    `# Generated: ${new Date().toISOString()}`,
    `# Playback settings: playsPerRecording=${settings.playsPerRecording}, nightlyGapHours=${settings.nightlyGapHours}, addNewTrackEveryNights=${settings.addNewTrackEveryNights}, initialTracks=${settings.initialTracks}, cgmrTrackId=${settings.cgmrTrackId ?? ""}, fallbackTrackId=${settings.fallbackTrackId ?? ""}`,
    `# ${goldLabel} | tier=${goldProfile.subscriptionTier ?? "?"} | playsPerNight=${goldProfile.playsPerNight ?? 2} | goals=${(goldProfile.goalIds || []).length}`,
    `# ${managedLabel} | tier=${managedProfile.subscriptionTier ?? "?"} | playsPerNight=${managedProfile.playsPerNight ?? 2} | assignedAudios=${assignedAudioIds?.length ?? 0}`,
    ""
  ];

  const csvBody = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });
  const base = "schedule-algorithm-comparison";
  const csvPath = path.join(outDir, `${base}.csv`);
  fs.writeFileSync(csvPath, metaLines.join("\r\n") + csvBody, "utf8");

  const htmlPath = path.join(outDir, `${base}.html`);
  fs.writeFileSync(
    htmlPath,
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Schedule algorithm — Gold vs Managed</title>
  <style>
    body { font-family: Calibri, Segoe UI, sans-serif; margin: 16px; }
    table { border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    .meta { color: #374151; margin-bottom: 16px; font-size: 13px; }
    h1 { font-size: 18px; }
  </style>
</head>
<body>
  <h1>Schedule algorithm comparison</h1>
  <div class="meta">
    <div><strong>Gold (non-managed):</strong> ${escapeHtml(goldEmail)} — goals: ${(goldProfile.goalIds || []).length}</div>
    <div><strong>Platinum Managed:</strong> ${escapeHtml(managedEmail)} — assigned audios: ${assignedAudioIds?.length ?? 0}</div>
    <div><strong>Nights generated:</strong> ${maxN}</div>
    <div>Rows with a <span style="background:#fef08a;padding:2px 6px;border-radius:4px">yellow</span> background mark a night where something enters or leaves the active rotation (new audio, session drop for Gold, or play-cap removal).</div>
    <div>Use the .csv in Excel or Google Sheets; apply conditional formatting on the rotation columns if you like.</div>
  </div>
  <table>
    <thead>
      <tr>${rows[0].map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .slice(1)
        .map((r, i) => {
          const g = goldSchedule[i];
          const m = managedSchedule[i];
          const hi = hasRotationHighlight(g) || hasRotationHighlight(m);
          return `<tr${hi ? ' style="background:#fef9c3"' : ""}>${r
            .map((c) => `<td>${escapeHtml(c)}</td>`)
            .join("")}</tr>`;
        })
        .join("\n")}
    </tbody>
  </table>
</body>
</html>`,
    "utf8"
  );

  console.log(`Wrote:\n  ${csvPath}\n  ${htmlPath}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
