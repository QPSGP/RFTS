/**
 * Single-member schedule table (same inputs as GET /api/user/schedule and buildSchedulePreview).
 * Used by the admin tool and the CLI script.
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
import { SCHEDULE_MAX_NIGHTS } from "@/lib/schedule-limits";
import { pickNewestMemberCgmr } from "@/lib/library-access";

function hasCategory(item: { categories?: string[] }, cat: string): boolean {
  return (item.categories || []).some((c) => c.toLowerCase() === cat.toLowerCase());
}

export function filterLibraryForMember(
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

export function resolveUserAssignedTrack(
  filteredLibrary: LibraryItem[],
  emailLower: string,
  assignedAudioIds: string[] | undefined
): LibraryItem | null {
  const cgmrForMember = pickNewestMemberCgmr(filteredLibrary, emailLower);
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

const MEMBER_HEADER = [
  "Schedule night",
  "Algorithm note",
  "Play 1 (title)",
  "Play 2 (title)",
  "SKU play 1",
  "SKU play 2",
  "Rotation (night start: new audio / session drop)",
  "Rotation (after plays: play-cap drop)"
] as const;

export type ScheduleAlgorithmMemberResult = {
  header: readonly string[];
  rows: string[][];
  rowHighlight: boolean[];
  email: string;
  label: string;
  subscriptionTier: string | null;
  goalsCount: number;
  assignedAudioCount: number;
  playsPerNight: 1 | 2;
  nights: number;
  maxN: number;
  settings: Awaited<ReturnType<typeof getPlaybackSettings>>;
  profile: NonNullable<Awaited<ReturnType<typeof getUserProfile>>>;
  warnings: string[];
  schedule: ReturnType<typeof buildSchedulePreview>;
};

export async function buildScheduleAlgorithmForMember(
  emailIn: string,
  nightsIn: number
): Promise<ScheduleAlgorithmMemberResult> {
  const nights = Math.min(SCHEDULE_MAX_NIGHTS, Math.max(1, nightsIn));
  const [library, settings, interestRecords] = await Promise.all([
    listLibrary(),
    getPlaybackSettings(),
    listInterests()
  ]);

  const profile = await getUserProfile(emailIn.trim());
  if (!profile) {
    throw new Error(`No user found: ${emailIn}`);
  }

  const member = await getMemberProfileByUserId(profile.id);
  const emailLower = profile.email?.toLowerCase() ?? "";
  const filtered = filterLibraryForMember(library, member);

  const isPlatinumManaged = profile.subscriptionTier === "platinum_managed";
  const assignedOrder = isPlatinumManaged ? await getMemberAudioOrder(profile.email || "") : [];
  const assignedAudioIds =
    isPlatinumManaged && assignedOrder.length > 0 ? assignedOrder : undefined;

  const warnings: string[] = [];
  if (isPlatinumManaged && !assignedAudioIds?.length) {
    warnings.push(
      "This account is Platinum Managed but has no member_audio_assignments; the schedule may not match what members see after assignments are saved."
    );
  }

  const userAssigned = resolveUserAssignedTrack(filtered, emailLower, assignedAudioIds);

  const schedule = buildSchedulePreview(
    isPlatinumManaged
      ? {
          interests: [],
          library: filtered,
          interestRecords,
          settings,
          tier: "platinum_managed",
          nights,
          playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
          userAssignedTrack: userAssigned ?? undefined,
          assignedAudioIds
        }
      : {
          interests: profile.goalIds || [],
          library: filtered,
          interestRecords,
          settings,
          tier: (profile.subscriptionTier as "platinum" | "platinum_managed") || "platinum",
          nights,
          playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
          userAssignedTrack: userAssigned ?? undefined,
          assignedAudioIds: undefined
        }
  );

  const rowHighlight: boolean[] = [];
  const rows: string[][] = [];
  const maxN = Math.max(schedule.length, nights);
  for (let i = 0; i < maxN; i++) {
    const s = schedule[i];
    const tracks = s?.tracks ?? [];
    rows.push([
      String(i + 1),
      s?.note ?? "",
      tracks[0]?.title ?? "",
      tracks[1]?.title ?? "",
      tracks[0]?.skuCode ?? "",
      tracks[1]?.skuCode ?? "",
      rotationStartText(s),
      rotationAfterText(s)
    ]);
    rowHighlight.push(hasRotationHighlight(s));
  }

  const tier = profile.subscriptionTier ?? null;
  const label = `${profile.email} · ${isPlatinumManaged ? "Platinum Managed" : "Gold (goals)"}`;

  return {
    header: MEMBER_HEADER,
    rows,
    rowHighlight,
    email: profile.email,
    label,
    subscriptionTier: tier,
    goalsCount: (profile.goalIds || []).length,
    assignedAudioCount: assignedAudioIds?.length ?? 0,
    playsPerNight: profile.playsPerNight === 1 ? 1 : 2,
    nights,
    maxN,
    settings,
    profile,
    warnings,
    schedule
  };
}

export function buildMemberExportCsvString(result: ScheduleAlgorithmMemberResult): string {
  const { settings, profile, warnings, assignedAudioCount, goalsCount } = result;
  const metaLines = [
    "# RFTS schedule algorithm export (single member)",
    `# Generated: ${new Date().toISOString()}`,
    ...warnings.map((w) => `# WARNING: ${w}`),
    `# Playback settings: playsPerRecording=${settings.playsPerRecording}, nightlyGapHours=${settings.nightlyGapHours}, addNewTrackEveryNights=${settings.addNewTrackEveryNights}, initialTracks=${settings.initialTracks}, cgmrTrackId=${settings.cgmrTrackId ?? ""}, fallbackTrackId=${settings.fallbackTrackId ?? ""}`,
    `# Member: ${result.email} | tier=${result.subscriptionTier ?? "?"} | playsPerNight=${result.playsPerNight} | goals=${goalsCount} | assignedAudios=${assignedAudioCount}`,
    ""
  ];
  const allRows = [Array.from(result.header), ...result.rows];
  const csvBody = allRows.map((r) => r.map(csvEscapeCell).join(",")).join("\r\n");
  return metaLines.join("\r\n") + csvBody;
}

export function buildMemberExportHtmlString(result: ScheduleAlgorithmMemberResult): string {
  const { email, maxN, warnings, goalsCount, assignedAudioCount } = result;
  const rows: string[][] = [Array.from(result.header), ...result.rows];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Schedule - ${escapeHtmlForDoc(email)}</title>
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
  <h1>Schedule algorithm</h1>
  <div class="meta">
    ${warnings.map((w) => `<div class="warn">${escapeHtmlForDoc(w)}</div>`).join("")}
    <div><strong>Member:</strong> ${escapeHtmlForDoc(email)}</div>
    <div>Goals: ${goalsCount} · Assigned audios: ${assignedAudioCount} · Nights: ${maxN}</div>
    <div>Rows with a <span style="background:#fef08a;padding:2px 6px;border-radius:4px">yellow</span> background mark a rotation change that night.</div>
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
