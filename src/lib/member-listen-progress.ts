import {
  INTRO_RELAXATION_MUSIC_LABEL,
  isIntroRelaxationMusicLogLabel
} from "@/lib/intro-relaxation-music";

export type MemberActivityRow = {
  action: string;
  details: string | null;
  createdAt: string;
};

export type ListenTrackStat = {
  title: string;
  source: "library" | "session" | "both";
  timesStarted: number;
  timesCompleted: number;
  lastCompletedAt: string | null;
};

export type ListenProgressRecent = {
  title: string;
  source: "library" | "session" | "other";
  at: string;
  completed: boolean;
};

export type ListenProgressReport = {
  tracks: ListenTrackStat[];
  recentPlays: ListenProgressRecent[];
  totalStarts: number;
  totalCompletions: number;
  scheduleStepsCompleted: number;
};

const PLAYED_AUDIO_LOC_SEP = /^\s*[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D\-]+\s*/;

function normalizeActivityDetailsString(raw: string): string {
  return raw
    .trim()
    .replace(/^\uFEFF/, "")
    .normalize("NFKC")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ");
}

export function activityDetailsBaseLine(details: string | null | undefined): string {
  if (!details?.trim()) return "";
  const t = String(details);
  const sep = t.indexOf(" | ");
  return sep === -1 ? t.trim() : t.slice(0, sep).trim();
}

export function outcomeTextFromActivityDetails(details: string | null | undefined): string {
  if (!details?.trim()) return "";
  const t = String(details);
  const sep = t.indexOf(" | ");
  if (sep === -1) return "";
  return t.slice(sep + 3).trim();
}

function playedAudioAfterLocationPrefix(
  details: string
): { where: "library" | "play_options"; rest: string } | null {
  const t = normalizeActivityDetailsString(details);
  const playHead = t.match(/^(?:Play\s+Options|Sessions)\b/i);
  if (playHead) {
    let rest = t.slice(playHead[0].length);
    rest = rest.replace(PLAYED_AUDIO_LOC_SEP, "");
    return { where: "play_options", rest };
  }
  const libHead = t.match(/^Library\b/i);
  if (libHead) {
    let rest = t.slice(libHead[0].length);
    rest = rest.replace(PLAYED_AUDIO_LOC_SEP, "");
    return { where: "library", rest };
  }
  return null;
}

function extractTitleFromBaseLine(base: string): {
  title: string;
  source: "library" | "session" | "other";
  isIntro: boolean;
} | null {
  const d = normalizeActivityDetailsString(base);
  if (!d) return null;
  const loc = playedAudioAfterLocationPrefix(d);
  if (loc?.where === "library") {
    const libTitle = loc.rest.trim().replace(/\s+/g, " ");
    if (!libTitle) return null;
    const isIntro =
      isIntroRelaxationMusicLogLabel(libTitle) || /^Starting music$/i.test(libTitle);
    return {
      title: isIntro ? INTRO_RELAXATION_MUSIC_LABEL : libTitle,
      source: "library",
      isIntro
    };
  }
  if (loc?.where === "play_options") {
    const rest = loc.rest.trim();
    if (isIntroRelaxationMusicLogLabel(rest)) {
      return { title: INTRO_RELAXATION_MUSIC_LABEL, source: "session", isIntro: true };
    }
    const fs = /^(First|Second)\s*[:：]\s*(.+)$/is.exec(rest);
    if (fs) {
      const title = (fs[2] || "").trim().replace(/\s+/g, " ");
      if (!title) return null;
      return { title, source: "session", isIntro: false };
    }
    const tail = rest.replace(/\s+/g, " ").trim();
    if (!tail) return null;
    return {
      title: tail,
      source: "session",
      isIntro: isIntroRelaxationMusicLogLabel(tail)
    };
  }
  return { title: d.replace(/\s+/g, " ").trim(), source: "other", isIntro: false };
}

/** Parse a play/outcome log line into a member-facing audio title (skips intro music). */
export function parseMemberListenTitle(
  action: string,
  details: string | null | undefined
): { title: string; source: "library" | "session" | "other" } | null {
  if (action !== "played_audio" && action !== "audio_playback_outcome") return null;
  const base = activityDetailsBaseLine(details);
  const parsed = extractTitleFromBaseLine(base);
  if (!parsed || parsed.isIntro) return null;
  return { title: parsed.title, source: parsed.source };
}

export function isCompletedFullListenOutcome(details: string | null | undefined): boolean {
  const outcome = outcomeTextFromActivityDetails(details).toLowerCase();
  return outcome.includes("completed full listen");
}

/**
 * Build listen progress from activity rows (played_audio + audio_playback_outcome).
 * Intro / starting music is excluded from counts.
 */
export function buildListenProgressReport(
  rows: MemberActivityRow[],
  scheduleStepsCompleted = 0
): ListenProgressReport {
  type Acc = {
    title: string;
    sources: Set<"library" | "session" | "other">;
    timesStarted: number;
    timesCompleted: number;
    lastCompletedAt: string | null;
    lastPlayedAt: string | null;
  };
  const byKey = new Map<string, Acc>();
  const recentPlays: ListenProgressRecent[] = [];
  const unmatchedStartIndexes = new Map<string, number[]>();

  const touchLastPlayed = (acc: Acc, at: string) => {
    if (!acc.lastPlayedAt || at > acc.lastPlayedAt) acc.lastPlayedAt = at;
  };

  const chronological = [...rows].sort((a, b) => {
    const byTime = a.createdAt.localeCompare(b.createdAt);
    if (byTime !== 0) return byTime;
    return 0;
  });

  for (const row of chronological) {
    const parsed = parseMemberListenTitle(row.action, row.details);
    if (!parsed) continue;
    const key = parsed.title.toLowerCase();
    let acc = byKey.get(key);
    if (!acc) {
      acc = {
        title: parsed.title,
        sources: new Set(),
        timesStarted: 0,
        timesCompleted: 0,
        lastCompletedAt: null,
        lastPlayedAt: null
      };
      byKey.set(key, acc);
    }
    acc.sources.add(parsed.source);

    if (row.action === "played_audio") {
      acc.timesStarted += 1;
      touchLastPlayed(acc, row.createdAt);
      recentPlays.push({
        title: parsed.title,
        source: parsed.source,
        at: row.createdAt,
        completed: false
      });
      const pending = unmatchedStartIndexes.get(key) ?? [];
      pending.push(recentPlays.length - 1);
      unmatchedStartIndexes.set(key, pending);
    } else if (row.action === "audio_playback_outcome" && isCompletedFullListenOutcome(row.details)) {
      acc.timesCompleted += 1;
      touchLastPlayed(acc, row.createdAt);
      if (!acc.lastCompletedAt || row.createdAt > acc.lastCompletedAt) {
        acc.lastCompletedAt = row.createdAt;
      }
      const pending = unmatchedStartIndexes.get(key);
      if (pending?.length) {
        const idx = pending.pop();
        if (idx != null) recentPlays[idx].completed = true;
      } else {
        recentPlays.push({
          title: parsed.title,
          source: parsed.source,
          at: row.createdAt,
          completed: true
        });
      }
    }
  }

  recentPlays.reverse();
  recentPlays.sort((a, b) => {
    const byDate = b.at.localeCompare(a.at);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });

  const tracks: ListenTrackStat[] = [...byKey.values()]
    .sort((a, b) => {
      const dateA = a.lastPlayedAt || "";
      const dateB = b.lastPlayedAt || "";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    })
    .map((acc) => {
      const sources = [...acc.sources].filter((s) => s === "library" || s === "session") as (
        | "library"
        | "session"
      )[];
      let source: ListenTrackStat["source"] = "session";
      if (sources.includes("library") && sources.includes("session")) source = "both";
      else if (sources.includes("library")) source = "library";
      else if (sources.includes("session")) source = "session";
      return {
        title: acc.title,
        source,
        timesStarted: acc.timesStarted,
        timesCompleted: acc.timesCompleted,
        lastCompletedAt: acc.lastCompletedAt
      };
    });

  return {
    tracks,
    recentPlays,
    totalStarts: tracks.reduce((n, t) => n + t.timesStarted, 0),
    totalCompletions: tracks.reduce((n, t) => n + t.timesCompleted, 0),
    scheduleStepsCompleted
  };
}
