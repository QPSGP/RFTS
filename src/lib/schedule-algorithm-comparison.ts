/**
 * Build side-by-side schedule rows (Gold goal-based vs Platinum Managed assigned order).
 * Shared by `scripts/schedule-spreadsheet-export.ts` and `POST /api/admin/schedule-algorithm-comparison`.
 */
import type { LibraryItem } from "@/lib/types";
import { buildSchedulePreview, type ScheduleNight } from "@/lib/scheduler";
import {
  getMemberAudioOrder,
  getMemberProfileByUserId,
  getPlaybackSettings,
  getUserProfile,
  listInterests,
  listLibrary
} from "@/lib/db";

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

function rotationStartText(n: ScheduleNight | undefined): string {
  if (!n) return "";
  const parts: string[] = [];
  if (n.rotationAdded?.length) parts.push(...n.rotationAdded);
  if (n.rotationSessionDrop?.length) parts.push(...n.rotationSessionDrop);
  return parts.join(" | ");
}

function rotationAfterText(n: ScheduleNight | undefined): string {
  if (!n?.rotationRemovedAfterPlays?.length) return "";
  return n.rotationRemovedAfterPlays.join(" | ");
}

export function hasRotationHighlight(n: ScheduleNight | undefined): boolean {
  return !!(
    n?.rotationAdded?.length ||
    n?.rotationSessionDrop?.length ||
    n?.rotationRemovedAfterPlays?.length
  );
}

export function csvEscapeCell(cell: string): string {
  if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function escapeHtmlForDoc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HEADER = [
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
] as const;

export type ScheduleAlgorithmComparisonResult = {
  header: readonly string[];
  /** Data rows only (not including header). */
  rows: string[][];
  rowHighlight: boolean[];
  goldEmail: string;
  managedEmail: string;
  goldLabel: string;
  managedLabel: string;
  nights: number;
  maxN: number;
  settings: Awaited<ReturnType<typeof getPlaybackSettings>>;
  goldProfile: Awaited<ReturnType<typeof getUserProfile>>;
  managedProfile: Awaited<ReturnType<typeof getUserProfile>>;
  assignedAudioCount: number;
  warnings: string[];
  goldSchedule: ReturnType<typeof buildSchedulePreview>;
  managedSchedule: ReturnType<typeof buildSchedulePreview>;
};

export async function buildScheduleAlgorithmComparison(
  goldEmail: string,
  managedEmail: string,
  nightsIn: number
): Promise<ScheduleAlgorithmComparisonResult> {
  const nights = Math.min(366, Math.max(1, nightsIn));
  const [library, settings, interestRecords] = await Promise.all([
    listLibrary(),
    getPlaybackSettings(),
    listInterests()
  ]);

  const goldProfile = await getUserProfile(goldEmail.trim());
  const managedProfile = await getUserProfile(managedEmail.trim());
  if (!goldProfile) {
    throw new Error(`No user found for Gold account: ${goldEmail}`);
  }
  if (!managedProfile) {
    throw new Error(`No user found for Managed account: ${managedEmail}`);
  }

  const goldMember = await getMemberProfileByUserId(goldProfile.id);
  const managedMember = await getMemberProfileByUserId(managedProfile.id);

  const goldLower = goldProfile.email?.toLowerCase() ?? "";
  const managedLower = managedProfile.email?.toLowerCase() ?? "";

  const goldLibrary = filterLibraryForMember(library, goldMember);
  const managedLibrary = filterLibraryForMember(library, managedMember);

  const managedOrder = await getMemberAudioOrder(managedProfile.email || "");
  const assignedAudioIds =
    managedProfile.subscriptionTier === "platinum_managed" && managedOrder.length > 0
      ? managedOrder
      : undefined;

  const warnings: string[] = [];
  if (managedProfile.subscriptionTier === "platinum_managed" && !assignedAudioIds?.length) {
    warnings.push(
      "Managed account is platinum_managed but has no member_audio_assignments; managed column may not match production."
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

  const goldLabel = `Gold (non-managed): ${goldProfile.email || goldEmail}`;
  const managedLabel = `Platinum Managed: ${managedProfile.email || managedEmail}`;

  const dataRows: string[][] = [];
  const rowHighlight: boolean[] = [];
  const maxN = Math.max(goldSchedule.length, managedSchedule.length, nights);

  for (let i = 0; i < maxN; i++) {
    const g = goldSchedule[i];
    const m = managedSchedule[i];
    const gTracks = g?.tracks ?? [];
    const mTracks = m?.tracks ?? [];
    dataRows.push([
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
    rowHighlight.push(hasRotationHighlight(g) || hasRotationHighlight(m));
  }

  return {
    header: HEADER,
    rows: dataRows,
    rowHighlight,
    goldEmail: goldProfile.email || goldEmail,
    managedEmail: managedProfile.email || managedEmail,
    goldLabel,
    managedLabel,
    nights,
    maxN,
    settings,
    goldProfile,
    managedProfile,
    assignedAudioCount: assignedAudioIds?.length ?? 0,
    warnings,
    goldSchedule,
    managedSchedule
  };
}

export function buildComparisonCsvString(result: ScheduleAlgorithmComparisonResult): string {
  const { settings, goldLabel, managedLabel, goldProfile, managedProfile, assignedAudioCount, warnings } = result;
  const metaLines = [
    "# RFTS schedule algorithm export",
    `# Generated: ${new Date().toISOString()}`,
    ...warnings.map((w) => `# WARNING: ${w}`),
    `# Playback settings: playsPerRecording=${settings.playsPerRecording}, nightlyGapHours=${settings.nightlyGapHours}, addNewTrackEveryNights=${settings.addNewTrackEveryNights}, initialTracks=${settings.initialTracks}, cgmrTrackId=${settings.cgmrTrackId ?? ""}, fallbackTrackId=${settings.fallbackTrackId ?? ""}`,
    `# ${goldLabel} | tier=${goldProfile?.subscriptionTier ?? "?"} | playsPerNight=${goldProfile?.playsPerNight ?? 2} | goals=${(goldProfile?.goalIds || []).length}`,
    `# ${managedLabel} | tier=${managedProfile?.subscriptionTier ?? "?"} | playsPerNight=${managedProfile?.playsPerNight ?? 2} | assignedAudios=${assignedAudioCount}`,
    ""
  ];
  const allRows = [Array.from(result.header), ...result.rows];
  const csvBody = allRows.map((r) => r.map(csvEscapeCell).join(",")).join("\r\n");
  return metaLines.join("\r\n") + csvBody;
}

export function buildComparisonHtmlString(result: ScheduleAlgorithmComparisonResult): string {
  const { goldEmail, managedEmail, goldProfile, maxN, assignedAudioCount, warnings } = result;
  const rows: string[][] = [Array.from(result.header), ...result.rows];
  return `<!DOCTYPE html>
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
    .warn { color: #b45309; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>Schedule algorithm comparison</h1>
  <div class="meta">
    ${warnings.map((w) => `<div class="warn">${escapeHtmlForDoc(w)}</div>`).join("")}
    <div><strong>Gold (non-managed):</strong> ${escapeHtmlForDoc(goldEmail)} — goals: ${(goldProfile?.goalIds || []).length}</div>
    <div><strong>Platinum Managed:</strong> ${escapeHtmlForDoc(managedEmail)} — assigned audios: ${assignedAudioCount}</div>
    <div><strong>Nights generated:</strong> ${maxN}</div>
    <div>Rows with a <span style="background:#fef08a;padding:2px 6px;border-radius:4px">yellow</span> background mark a night where something enters or leaves the active rotation.</div>
  </div>
  <table>
    <thead>
      <tr>${rows[0].map((c) => `<th>${escapeHtmlForDoc(c)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows
        .slice(1)
        .map(
          (r, i) =>
            `<tr${result.rowHighlight[i] ? ' style="background:#fef9c3"' : ""}>${r
              .map((c) => `<td>${escapeHtmlForDoc(c)}</td>`)
              .join("")}</tr>`
        )
        .join("\n")}
    </tbody>
  </table>
</body>
</html>`;
}
