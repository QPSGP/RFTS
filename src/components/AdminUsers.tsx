"use client";

import { put } from "@vercel/blob/client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { MEMBER_AUDIO_NONLINEAR_OUTCOME_MARKER } from "@/lib/member-audio-activity";
import { MANAGED_MAX_SLOTS_PER_AUDIO } from "@/lib/managed-rotation-limits";
import type { LibraryItem } from "@/lib/types";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";

type MemberAdminSection =
  | "profile"
  | "notes"
  | "facilitator"
  | "activity"
  | "membership"
  | "addFile"
  | "scheduledAudios"
  | "goals"
  | "rotation";

type FacilitatorOption = {
  id: string;
  name: string;
  email: string;
  status: string;
};

function sanitizePathSegment(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || "audio";
}

type Interest = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  goalIds: string[];
  subscriptionStatus: "inactive" | "active" | "past_due" | "canceled" | null;
  subscriptionTier: "platinum" | "platinum_managed" | null;
  playsPerNight: number;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  affiliateCode?: string | null;
  referredByAffiliateCode?: string | null;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

/** Platinum Managed rotation list persisted to member_audio_assignments (order may repeat IDs). */

function countAudioSlotsInOrder(order: string[], itemId: string): number {
  return order.filter((id) => id === itemId).length;
}

/** Aligns with Postgres `member_audio_assignments.user_email` (lowercase). */
function memberAudioEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

function memberRotationOrder(orderMap: Record<string, string[]>, emailRaw: string): string[] {
  const key = memberAudioEmailKey(emailRaw);
  const raw = emailRaw.trim();
  return orderMap[key] ?? orderMap[raw] ?? [];
}

function memberAudioAssignmentsMap(
  assignMap: Record<string, Record<string, boolean>>,
  emailRaw: string
): Record<string, boolean> {
  const key = memberAudioEmailKey(emailRaw);
  const raw = emailRaw.trim();
  return assignMap[key] ?? assignMap[raw] ?? {};
}

function memberHasRotationSlot(orderMap: Record<string, string[]>, emailRaw: string): boolean {
  const key = memberAudioEmailKey(emailRaw);
  const raw = emailRaw.trim();
  return key in orderMap || raw in orderMap;
}

function patchMemberOrderKeys(
  prev: MemberAudioSnapshot,
  emailRaw: string,
  nextList: string[]
): MemberAudioSnapshot {
  const key = memberAudioEmailKey(emailRaw);
  const raw = emailRaw.trim();
  const nextOrder = { ...prev.order };
  delete nextOrder[raw];
  for (const k of Object.keys(nextOrder)) {
    if (k !== key && memberAudioEmailKey(k) === key) delete nextOrder[k];
  }
  nextOrder[key] = nextList;
  return { ...prev, order: nextOrder };
}

function patchMemberAssignmentsKeys(
  prev: MemberAudioSnapshot,
  emailRaw: string,
  nextAssign: Record<string, boolean>
): MemberAudioSnapshot {
  const key = memberAudioEmailKey(emailRaw);
  const raw = emailRaw.trim();
  const nextAssignments = { ...prev.assignments };
  delete nextAssignments[raw];
  for (const k of Object.keys(nextAssignments)) {
    if (k !== key && memberAudioEmailKey(k) === key) delete nextAssignments[k];
  }
  nextAssignments[key] = nextAssign;
  return { ...prev, assignments: nextAssignments };
}

type MemberAudioSnapshot = {
  order: Record<string, string[]>;
  assignments: Record<string, Record<string, boolean>>;
};

function computeManagedRotationAppend(
  prev: MemberAudioSnapshot,
  emailRaw: string,
  itemId: string
): { next: MemberAudioSnapshot; outcome: "added" | "per_audio" } {
  const key = memberAudioEmailKey(emailRaw);
  const raw = emailRaw.trim();
  const cur = prev.order[key] ?? prev.order[raw] ?? [];
  const n = countAudioSlotsInOrder(cur, itemId);
  if (n >= MANAGED_MAX_SLOTS_PER_AUDIO) {
    return { next: prev, outcome: "per_audio" };
  }
  const prevAssign = prev.assignments[key] ?? prev.assignments[raw] ?? {};
  let next = patchMemberOrderKeys(prev, emailRaw, [...cur, itemId]);
  next = patchMemberAssignmentsKeys(next, emailRaw, { ...prevAssign, [itemId]: true });
  return { next, outcome: "added" };
}

const timeZones = [
  "Pacific Time",
  "Mountain Time",
  "Central Time",
  "Eastern Time",
  "Alaska Time",
  "Hawaii Time",
  "Other"
];

type ProfileDraft = {
  firstName: string;
  lastName: string;
  gender: string;
  yearBorn: string;
  birthDate: string;
  contactNumber: string;
  bestContactTimes: string;
  timeZone: string;
  occupation: string;
  incomeGoal: string;
  incomeGoalYear: string;
  incomeGoalRelation: string;
  isFirstResponder: boolean;
  wantsPracticeGrowth: boolean;
  adultConsent: boolean;
  wantsPolyamory: boolean;
  hadLgdSession: boolean;
  referralSource: string;
  notes: string;
};

type NewAudioDraft = {
  title: string;
  description: string;
  audioUrl: string;
  coverUrl: string;
  skuCode: string;
  categories: string;
};

type MemberActivityRow = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
};

type MemberActivityViewFilter = "all" | "library" | "session" | "other";
type MemberActivityPageSize = 20 | 50 | 100;

/** First separator after "Library" / "Play Options" (any unicode dash + ASCII hyphen + spaces). */
const PLAYED_AUDIO_LOC_SEP = /^\s*[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D\-]+\s*/;

/** Strip BOM / zero-width chars that break ^-anchored parsing of session lines. */
function normalizeActivityDetailsString(raw: string): string {
  return raw
    .trim()
    .replace(/^\uFEFF/, "")
    .normalize("NFKC")
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ");
}

/**
 * Play Options lines look like `Play Options - First: SKU – Title` (SessionPlayer).
 * Strip the location prefix first so `First:` / `Second:` inside the recording title cannot
 * steal the match (older code used `\\bFirst` on the full string).
 */
function extractPlayOptionsAudioTitle(d: string): string | null {
  const t = normalizeActivityDetailsString(d);
  if (!/^Play\s+Options\b/i.test(t)) return null;
  let rest = t.replace(/^Play\s+Options\s*/i, "").trim();
  rest = rest.replace(PLAYED_AUDIO_LOC_SEP, "").trim();
  if (/^Preparation audio$/i.test(rest)) return "Preparation audio";
  const fs = /^(First|Second)\s*[:：]\s*(.+)$/is.exec(rest);
  if (fs) {
    const title = (fs[2] || "").trim().replace(/\s+/g, " ");
    if (title.length > 0) return title;
    return `${fs[1]} recording`;
  }
  return null;
}

function playedAudioLocation(details: string): "library" | "play_options" | null {
  const t = normalizeActivityDetailsString(details);
  if (/^Play\s+Options\b/i.test(t)) return "play_options";
  if (/^Library\b/i.test(t)) return "library";
  return null;
}

/**
 * Text after "Library …" or "Play Options …" (strips keyword + first dash run).
 * Uses slice-after-prefix (not a single rigid "^Play Options ") so NBSP / multiple spaces
 * between words still match — session logs use `Play Options — First: …` from SessionPlayer.
 * Play Options is checked before Library so odd titles cannot confuse the parser.
 */
function playedAudioAfterLocationPrefix(details: string): { where: "library" | "play_options"; rest: string } | null {
  const t = normalizeActivityDetailsString(details);
  const playHead = t.match(/^Play\s+Options\b/i);
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

/** Base line before ` | outcome` in some rows (e.g. audio_playback_outcome). */
function activityDetailsBaseLine(details: string | null | undefined): string {
  if (!details?.trim()) return "";
  const t = String(details);
  const sep = t.indexOf(" | ");
  return sep === -1 ? t.trim() : t.slice(0, sep).trim();
}

function outcomeTextFromActivityDetails(details: string | null | undefined): string {
  if (!details?.trim()) return "";
  const t = String(details);
  const sep = t.indexOf(" | ");
  if (sep === -1) return "";
  return t.slice(sep + 3).trim();
}

function activityDetailsNonLinearPlayback(details: string | null | undefined): boolean {
  if (!details?.trim()) return false;
  return details.includes(MEMBER_AUDIO_NONLINEAR_OUTCOME_MARKER);
}

/** Library vs Play Options session vs everything else (for admin activity filters). */
function classifyMemberActivityRow(row: MemberActivityRow): "library" | "session" | "other" {
  if (row.action === "session_gap" && row.details?.trim()) return "session";
  if (row.action === "audio_playback_outcome" && row.details?.trim()) {
    const t = String(row.details).trim();
    if (/^Play\s+Options/i.test(t)) return "session";
    if (/^Library\b/i.test(t)) return "library";
    return "other";
  }
  if (row.action !== "played_audio" || !row.details?.trim()) return "other";
  const loc = playedAudioLocation(String(row.details).trim());
  if (loc === "library") return "library";
  if (loc === "play_options") return "session";
  return "other";
}

function formatActivityAction(action: string): string {
  switch (action) {
    case "login":
      return "Signed in";
    case "logout":
      return "Signed out";
    case "page_view":
      return "Page view";
    case "viewed_console":
      return "Opened Play Options";
    case "viewed_library":
      return "Opened Audio Library";
    case "updated_goals":
      return "Updated goals";
    case "updated_plays_per_night":
      return "Updated audios per night (1 or 2)";
    case "played_audio":
      return "Played audio";
    case "audio_playback_outcome":
      return "Playback result";
    case "session_gap":
      return "Play Options · gap";
    case "admin_schedule_adjusted":
      return "Admin: schedule progress";
    default:
      return action.replace(/_/g, " ");
  }
}

/** Track / recording title for activity table (from `played_audio` details). */
function formatPlayedAudioTitle(action: string, details: string | null | undefined): string {
  if (action !== "played_audio") return "";
  const d = normalizeActivityDetailsString(details == null ? "" : String(details));
  if (!d) return "";
  const sessionLineTitle = extractPlayOptionsAudioTitle(d);
  if (sessionLineTitle) return sessionLineTitle;
  const loc = playedAudioAfterLocationPrefix(d);
  if (!loc) {
    return d.replace(/\s+/g, " ").trim();
  }
  if (loc.where === "library") {
    const libTitle = loc.rest.trim().replace(/\s+/g, " ");
    if (libTitle.length > 0) return libTitle;
    return d.replace(/\s+/g, " ").trim();
  }
  const rest = loc.rest.trim();
  if (/^Preparation audio\s*$/i.test(rest)) {
    return "Preparation audio";
  }
  /* ASCII or fullwidth colon after First/Second (some titles use Unicode punctuation). */
  const fs = /^(First|Second)\s*[:：]\s*([\s\S]+)$/i.exec(rest);
  if (fs) {
    const title = (fs[2] || "").trim().replace(/\s+/g, " ");
    if (title.length > 0) return title;
    return `${fs[1]} recording`;
  }
  const tail = rest.replace(/\s+/g, " ").trim();
  if (tail.length > 0) return tail;
  return d.replace(/\s+/g, " ").trim();
}

/** Where they played (library vs Play Options, first/second/prep). */
function formatPlayedAudioContext(action: string, details: string | null): string {
  if (action !== "played_audio" || !details?.trim()) return "";
  const d = normalizeActivityDetailsString(details);
  const loc = playedAudioAfterLocationPrefix(d);
  if (loc) {
    if (loc.where === "library") return "Audio library";
    const rest = loc.rest.trim();
    if (/^Preparation audio\s*$/i.test(rest)) return "Play Options · preparation";
    const fs = /^(First|Second)\s*:/i.exec(rest);
    if (fs) return `Play Options · ${fs[1].toLowerCase()} recording`;
    return "Play Options";
  }
  if (/^Library\b/i.test(d)) return "Audio library";
  if (/^Play\s+Options\b/i.test(d)) return "Play Options";
  return "Playback";
}

/**
 * Audio column: title + SKU when present (from Play Options / Library line), for start + outcome rows.
 */
function playedAudioTitleForAdminCell(action: string, details: string | null | undefined): string {
  if (action !== "played_audio" && action !== "audio_playback_outcome") return "";
  const base = activityDetailsBaseLine(details);
  if (!base) {
    return details?.trim().replace(/\s+/g, " ") || "";
  }
  const parsed = formatPlayedAudioTitle("played_audio", base);
  if (parsed) return parsed;
  return base.replace(/\s+/g, " ").trim();
}

/** When older rows have no `details`, still show a short explanation in the Detail column. */
function activityDetailFallback(action: string): string | null {
  switch (action) {
    case "logout":
      return "Play Options ended";
    case "viewed_console":
      return "Play Options page";
    case "viewed_library":
      return "Audio library index";
    case "login":
      return "Sign-in (no destination captured)";
    default:
      return null;
  }
}

function formatActivityDetails(action: string, details: string | null): string {
  if (action === "played_audio" && (!details || !details.trim())) {
    return "— (nothing was stored — plays log only when a member is signed in at /member/login)";
  }
  if (!details?.trim()) {
    return activityDetailFallback(action) ?? "—";
  }
  if (action === "audio_playback_outcome") {
    const o = outcomeTextFromActivityDetails(details);
    return o || "—";
  }
  if (action === "played_audio") {
    const ctx = formatPlayedAudioContext(action, details);
    return ctx || "—";
  }
  if (action === "login" && details.startsWith("to:")) {
    return `First destination: ${details.slice(3)}`;
  }
  return details;
}

function formatActivityTime(iso: string): string {
  try {
    const raw = String(iso).trim();
    let d = new Date(raw);
    if (Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
      d = new Date(raw.replace(" ", "T") + "Z");
    }
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

/** 1 or 2 — how many main rotation recordings count as one finished “schedule night”. */
function memberPlaysPerNight(user: { playsPerNight?: number }): 1 | 2 {
  return user.playsPerNight === 1 ? 1 : 2;
}

type PlaybackSettingsState = { fallbackTrackId: string; cgmrTrackId?: string } | null;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettingsState>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createTier, setCreateTier] = useState<UserRow["subscriptionTier"]>("platinum");
  const [createStatus, setCreateStatus] =
    useState<UserRow["subscriptionStatus"]>("inactive");
  const [createPlaysPerNight, setCreatePlaysPerNight] = useState<1 | 2>(2);
  const [updates, setUpdates] = useState<Record<string, Partial<UserRow>>>({});
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [stripeEdits, setStripeEdits] = useState<
    Record<string, { stripeCustomerId?: string; stripeSubscriptionId?: string }>
  >({});
  const [paymentLinkLoading, setPaymentLinkLoading] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState<Record<string, boolean>>({});
  const [memberSectionOpen, setMemberSectionOpen] = useState<
    Record<string, Partial<Record<MemberAdminSection, boolean>>>
  >({});
  const [profileDrafts, setProfileDrafts] = useState<Record<string, ProfileDraft>>({});
  /** Single atom for library access flags + rotation order (managed edits stay one commit). */
  const [memberAudio, setMemberAudio] = useState<{
    order: Record<string, string[]>;
    assignments: Record<string, Record<string, boolean>>;
  }>({ order: {}, assignments: {} });
  const audioOrder = memberAudio.order;
  const audioAssignments = memberAudio.assignments;
  /** Platinum Managed: pending library item id for “Add at end of rotation” dropdown (per member email). */
  const [managedRotationPicker, setManagedRotationPicker] = useState<Record<string, string>>({});
  /** While true, rotation edits must not run — async hydrate would overwrite them (race with saved order). */
  const [memberAudioHydrating, setMemberAudioHydrating] = useState<Record<string, boolean>>({});
  const memberAudioHydratingRef = useRef<Record<string, boolean>>({});
  /** Avoid re-fetching server order when toggling profile — preserves unsaved rotation edits. */
  const memberAudioServerLoadedRef = useRef<Record<string, boolean>>({});
  /** Scroll newly appended rotation rows into view (one list per member email). */
  const managedRotationOlRefs = useRef<Record<string, HTMLOListElement | null>>({});
  const [audioSaveStatus, setAudioSaveStatus] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [personalizedAudioUploading, setPersonalizedAudioUploading] = useState<Record<string, boolean>>({});
  const [newAudioDrafts, setNewAudioDrafts] = useState<Record<string, NewAudioDraft>>({});
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberTierFilter, setMemberTierFilter] = useState<"all" | "platinum" | "platinum_managed">("all");
  const [addNewMemberOpen, setAddNewMemberOpen] = useState(false);
  const [memberActivity, setMemberActivity] = useState<Record<string, MemberActivityRow[]>>({});
  const [memberActivityLoading, setMemberActivityLoading] = useState<Record<string, boolean>>({});
  const [memberActivityError, setMemberActivityError] = useState<Record<string, string | null>>({});
  const [memberActivityFilter, setMemberActivityFilter] = useState<
    Record<string, MemberActivityViewFilter>
  >({});
  const [memberActivityPageSize, setMemberActivityPageSize] = useState<
    Record<string, MemberActivityPageSize>
  >({});
  /** Last fetch metadata so we can confirm the list matches the database (and refetch on tab focus). */
  const [memberActivitySnapshot, setMemberActivitySnapshot] = useState<
    Record<
      string,
      {
        serverTime: string;
        newestActivityAt: string | null;
        loadedAt: string;
        rowCount: number;
        targetUserId?: string;
      }
    >
  >({});
  const [memberScheduleProgress, setMemberScheduleProgress] = useState<
    Record<
      string,
      | {
          completedScheduleNights: number;
          scheduleStartedAt: string | null;
          currentNight: number;
        }
      | undefined
    >
  >({});
  const [memberScheduleDraft, setMemberScheduleDraft] = useState<Record<string, string>>({});
  const [facilitatorOptions, setFacilitatorOptions] = useState<FacilitatorOption[]>([]);
  const [facilitatorDrafts, setFacilitatorDrafts] = useState<Record<string, string>>({});
  const [facilitatorLoading, setFacilitatorLoading] = useState<Record<string, boolean>>({});
  const [facilitatorSaving, setFacilitatorSaving] = useState<Record<string, boolean>>({});
  const [facilitatorMultipleWarning, setFacilitatorMultipleWarning] = useState<
    Record<string, boolean>
  >({});
  const [memberScheduleSaving, setMemberScheduleSaving] = useState<Record<string, boolean>>({});
  const [memberScheduleResetting, setMemberScheduleResetting] = useState<Record<string, boolean>>({});
  const [memberGoalSearch, setMemberGoalSearch] = useState<Record<string, string>>({});
  /** Non-fatal: interests/library failed but member list may still have loaded */
  const [dataLoadNotice, setDataLoadNotice] = useState<string | null>(null);

  const sortedInterests = useMemo(
    () => interests.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [interests]
  );

  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    // Filter by search term (name or email)
    if (memberSearchTerm.trim()) {
      const searchLower = memberSearchTerm.toLowerCase().trim();
      filtered = filtered.filter((user) => {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").toLowerCase();
        const email = user.email.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }
    
    // Filter by membership tier
    if (memberTierFilter !== "all") {
      filtered = filtered.filter((user) => {
        const tier = user.subscriptionTier || "platinum";
        return tier === memberTierFilter;
      });
    }
    
    return filtered;
  }, [users, memberSearchTerm, memberTierFilter]);

  const resolveGoalNames = (goalIds: string[]) => {
    return goalIds
      .map((id) => interests.find((goal) => goal.id === id)?.name)
      .filter((n) => Boolean(n)) as string[];
  };


  const load = async () => {
    setDataLoadNotice(null);
    const fetchOpts = { credentials: "include" as const };
    const [usersRes, interestsRes, libraryRes, settingsRes] = await Promise.all([
      fetch("/api/admin/users", fetchOpts),
      fetch("/api/interests", fetchOpts),
      fetch("/api/library", fetchOpts),
      fetch("/api/playback-settings", fetchOpts)
    ]);

    if (!usersRes.ok) {
      setUsers([]);
      setInterests([]);
      setLibrary([]);
      setStatus(
        usersRes.status === 401
          ? "Admin session required. Sign in again at /login."
          : `Could not load member list (HTTP ${usersRes.status}).`
      );
      return;
    }

    const usersData = await usersRes.json();
    setUsers(Array.isArray(usersData.users) ? usersData.users : []);

    const partial: string[] = [];
    if (!interestsRes.ok) {
      setInterests([]);
      partial.push("goals list");
    } else {
      const interestsData = await interestsRes.json();
      setInterests(Array.isArray(interestsData.interests) ? interestsData.interests : []);
    }

    if (!libraryRes.ok) {
      setLibrary([]);
      partial.push("audio library");
    } else {
      const libraryData = await libraryRes.json();
      setLibrary(Array.isArray(libraryData.library) ? libraryData.library : []);
    }

    if (partial.length > 0) {
      setDataLoadNotice(
        `Could not load ${partial.join(" and ")}. Member accounts are still listed below; refresh the page or try again. If this persists, check server logs.`
      );
    }

    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      const s = settingsData.settings;
      setPlaybackSettings({
        fallbackTrackId: s?.fallbackTrackId ?? "T-18",
        cgmrTrackId: typeof s?.cgmrTrackId === "string" ? s.cgmrTrackId : ""
      });
    } else {
      setPlaybackSettings({ fallbackTrackId: "T-18", cgmrTrackId: "" });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async () => {
    setStatus(null);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createEmail,
        password: createPassword,
        firstName: createFirstName.trim() || undefined,
        lastName: createLastName.trim() || undefined,
        tier: createTier,
        status: createStatus,
        playsPerNight: createPlaysPerNight
      })
    });
    if (response.ok) {
      setStatus("User created.");
      setCreateEmail("");
      setCreatePassword("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreatePlaysPerNight(2);
      await load();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(
      data?.error ||
        `Create failed. Email may already exist. (status ${response.status})`
    );
  };

  const setMemberStatus = async (email: string, status: "active" | "inactive") => {
    const user = users.find((u) => u.email === email);
    if (!user) return;
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        tier: user.subscriptionTier ?? "platinum",
        status,
        goalIds: user.goalIds,
        playsPerNight: user.playsPerNight
      })
    });
    if (response.ok) {
      setStatus(`Member ${status === "inactive" ? "deactivated" : "activated"}.`);
      await load();
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "Update failed.");
    }
  };

  const deleteUser = async (email: string) => {
    if (!window.confirm(`Delete member ${email}? This cannot be undone.`)) {
      return;
    }
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    if (response.ok) {
      setStatus("Member deleted.");
      await load();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || `Delete failed.`);
  };

  const openPaymentLink = async (email: string) => {
    const user = users.find((u) => u.email === email);
    if (!user) return;
    setPaymentLinkLoading(email);
    setStatus(null);
    const tier =
      updates[email]?.subscriptionTier ?? user.subscriptionTier ?? "platinum_managed";
    const response = await fetch("/api/admin/member-payment-link", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        tier,
        cancelReturnPath: `${window.location.pathname}${window.location.search}`
      })
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    } else {
      setStatus(data?.error || "Could not open payment link.");
    }
    setPaymentLinkLoading(null);
  };

  const memberHasStripeOnFile = (user: UserRow) => {
    const stripeCustomerDraft =
      stripeEdits[user.email]?.stripeCustomerId ?? user.stripeCustomerId ?? "";
    const stripeSubscriptionDraft =
      stripeEdits[user.email]?.stripeSubscriptionId ?? user.stripeSubscriptionId ?? "";
    return (
      stripeCustomerDraft.trim().length > 0 || stripeSubscriptionDraft.trim().length > 0
    );
  };

  const renderMemberPaymentLinkBlock = (user: UserRow) => {
    if (memberHasStripeOnFile(user)) return null;
    const paymentTier =
      updates[user.email]?.subscriptionTier ?? user.subscriptionTier ?? "platinum";
    return (
      <div className="callout-accent">
        <p>
          <strong>New member billing:</strong> open a Stripe Checkout link for{" "}
          {paymentTier === "platinum_managed"
            ? "Platinum Managed ($39.95/mo)"
            : "Gold Member ($19.95/mo)"}
          . When the member pays, Stripe IDs link automatically.
        </p>
        <button
          type="button"
          className="button"
          disabled={paymentLinkLoading === user.email}
          onClick={() => openPaymentLink(user.email)}
        >
          {paymentLinkLoading === user.email ? "Opening…" : "Payment Link"}
        </button>
      </div>
    );
  };

  const updateUser = async (email: string) => {
    const user = users.find((u) => u.email === email);
    if (!user) {
      return;
    }
    const update = updates[email];
    const newPassword = (resetPasswords[email] || "").trim();
    const hasPasswordChange = newPassword.length >= 6;
    const stripeDraft = stripeEdits[email];
    const hasStripeEdit =
      stripeDraft?.stripeCustomerId !== undefined ||
      stripeDraft?.stripeSubscriptionId !== undefined;
    if (!update && !hasPasswordChange && !hasStripeEdit) {
      setStatus("Change tier/status, Stripe IDs, or enter a new password (6+ characters), then Save.");
      return;
    }
    const body: Record<string, unknown> = {
      email,
      tier: update?.subscriptionTier ?? user.subscriptionTier ?? "platinum",
      status: update?.subscriptionStatus ?? user.subscriptionStatus ?? "inactive",
      goalIds: update?.goalIds ?? user.goalIds,
      playsPerNight: update?.playsPerNight ?? user.playsPerNight ?? 2
    };
    if (hasPasswordChange) {
      body.resetPassword = newPassword;
    }
    if (stripeDraft?.stripeCustomerId !== undefined) {
      body.stripeCustomerId = stripeDraft.stripeCustomerId.trim();
    }
    if (stripeDraft?.stripeSubscriptionId !== undefined) {
      body.stripeSubscriptionId = stripeDraft.stripeSubscriptionId.trim();
    }
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      setStatus(hasPasswordChange ? "Password updated (and membership saved)." : "User updated.");
      setResetPasswords((prev) => ({ ...prev, [email]: "" }));
      setStripeEdits((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
      await load();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || `Update failed. (status ${response.status})`);
  };

  const loadProfile = async (email: string) => {
    const response = await fetch(`/api/admin/member-profile?email=${encodeURIComponent(email)}`, {
      credentials: "include"
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || `Unable to load profile. (status ${response.status})`);
      return;
    }
    const data = await response.json();
    const profile = data.profile || {};
    setProfileDrafts((prev) => ({
      ...prev,
      [email]: {
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        gender: profile.gender || "",
        yearBorn: profile.yearBorn ? String(profile.yearBorn) : "",
        birthDate: profile.birthDate?.trim() || (profile.yearBorn ? `${profile.yearBorn}-01-01` : ""),
        contactNumber: profile.contactNumber || "",
        bestContactTimes: profile.bestContactTimes || "",
        timeZone: profile.timeZone || "Pacific Time",
        occupation: profile.occupation || "",
        incomeGoal: profile.incomeGoal || "",
        incomeGoalYear: profile.incomeGoalYear ? String(profile.incomeGoalYear) : "",
        incomeGoalRelation: profile.incomeGoalRelation || "",
        isFirstResponder: !!profile.isFirstResponder,
        wantsPracticeGrowth: !!profile.wantsPracticeGrowth,
        adultConsent: !!profile.adultConsent,
        wantsPolyamory: !!profile.wantsPolyamory,
        hadLgdSession: !!profile.hadLgdSession,
        referralSource: profile.referralSource || "",
        notes: profile.notes ?? ""
      }
    }));
  };

  const loadMemberFacilitator = async (email: string) => {
    setFacilitatorLoading((prev) => ({ ...prev, [email]: true }));
    try {
      const response = await fetch(
        `/api/admin/member-facilitator?email=${encodeURIComponent(email)}`,
        { credentials: "include" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(typeof data?.error === "string" ? data.error : "Unable to load facilitator assignment.");
        return;
      }
      const assignedIds: string[] = data.assignedModeratorIds ?? [];
      setFacilitatorDrafts((prev) => ({ ...prev, [email]: assignedIds[0] ?? "" }));
      setFacilitatorMultipleWarning((prev) => ({
        ...prev,
        [email]: assignedIds.length > 1
      }));
      if (Array.isArray(data.moderators)) {
        setFacilitatorOptions(data.moderators);
      }
    } finally {
      setFacilitatorLoading((prev) => ({ ...prev, [email]: false }));
    }
  };

  const saveMemberFacilitator = async (email: string) => {
    setFacilitatorSaving((prev) => ({ ...prev, [email]: true }));
    setStatus(null);
    try {
      const moderatorId = facilitatorDrafts[email]?.trim() || null;
      const response = await fetch("/api/admin/member-facilitator", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberEmail: email, moderatorId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(typeof data?.error === "string" ? data.error : "Could not save facilitator assignment.");
        return;
      }
      const assignedIds: string[] = data.assignedModeratorIds ?? [];
      setFacilitatorDrafts((prev) => ({ ...prev, [email]: assignedIds[0] ?? "" }));
      setFacilitatorMultipleWarning((prev) => ({ ...prev, [email]: false }));
      const name =
        data.assignedFacilitators?.[0]?.name ||
        facilitatorOptions.find((m) => m.id === moderatorId)?.name;
      setStatus(
        moderatorId && name
          ? `Facilitator assignment saved: ${name} can access ${email} in their console.`
          : `Facilitator assignment cleared for ${email}.`
      );
    } finally {
      setFacilitatorSaving((prev) => ({ ...prev, [email]: false }));
    }
  };

  const loadMemberActivity = async (email: string) => {
    setMemberActivityLoading((prev) => ({ ...prev, [email]: true }));
    setMemberActivityError((prev) => ({ ...prev, [email]: null }));
    try {
      const res = await fetch(
        `/api/admin/member-activity?email=${encodeURIComponent(
          email
        )}&limit=500&_t=${Date.now()}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache"
          }
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        const msg =
          res.status === 401
            ? "Could not load activity (sign in as admin)."
            : typeof data?.error === "string"
              ? data.error
              : `Could not load activity (HTTP ${res.status}).`;
        setMemberActivityError((prev) => ({ ...prev, [email]: msg }));
        setMemberActivity((prev) => ({ ...prev, [email]: [] }));
        return;
      }
      const data = await res.json();
      setMemberActivityError((prev) => ({ ...prev, [email]: null }));
      setMemberActivity((prev) => ({
        ...prev,
        [email]: Array.isArray(data.activityLog) ? data.activityLog : []
      }));
      const rows = Array.isArray(data.activityLog) ? data.activityLog : [];
      setMemberActivitySnapshot((prev) => ({
        ...prev,
        [email]: {
          serverTime: typeof data.serverTime === "string" ? data.serverTime : new Date().toISOString(),
          newestActivityAt:
            typeof data.newestActivityAt === "string" || data.newestActivityAt === null
              ? data.newestActivityAt
              : rows[0]?.createdAt ?? null,
          loadedAt: new Date().toISOString(),
          rowCount: rows.length,
          targetUserId: typeof data.targetUserId === "string" ? data.targetUserId : undefined
        }
      }));
      const sp = data.scheduleProgress;
      if (
        sp &&
        typeof sp.completedScheduleNights === "number" &&
        typeof sp.currentNight === "number"
      ) {
        setMemberScheduleProgress((prev) => ({
          ...prev,
          [email]: {
            completedScheduleNights: sp.completedScheduleNights,
            scheduleStartedAt:
              typeof sp.scheduleStartedAt === "string" || sp.scheduleStartedAt === null
                ? sp.scheduleStartedAt
                : sp.scheduleStartedAt != null
                  ? String(sp.scheduleStartedAt).slice(0, 10)
                  : null,
            currentNight: sp.currentNight
          }
        }));
        setMemberScheduleDraft((prev) => ({
          ...prev,
          [email]: String(sp.completedScheduleNights)
        }));
      }
    } finally {
      setMemberActivityLoading((prev) => ({ ...prev, [email]: false }));
    }
  };

  const loadMemberActivityRef = useRef(loadMemberActivity);
  loadMemberActivityRef.current = loadMemberActivity;

  useEffect(() => {
    let deb: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (deb) clearTimeout(deb);
      deb = setTimeout(() => {
        for (const e of Object.keys(profileOpen)) {
          if (profileOpen[e]) void loadMemberActivityRef.current(e);
        }
      }, 400);
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      if (deb) clearTimeout(deb);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [profileOpen]);

  const memberSectionIsOpen = (email: string, section: MemberAdminSection) =>
    !!memberSectionOpen[email]?.[section];

  const toggleMemberSection = (email: string, section: MemberAdminSection) => {
    const opening = !memberSectionOpen[email]?.[section];
    setMemberSectionOpen((prev) => ({
      ...prev,
      [email]: opening
        ? { [section]: true }
        : { ...prev[email], [section]: false }
    }));
    if (opening) {
      if (section === "activity") void loadMemberActivity(email);
      if (section === "profile" && !profileDrafts[email]) void loadProfile(email);
      if (section === "facilitator") void loadMemberFacilitator(email);
      if (
        section === "rotation" ||
        section === "addFile" ||
        section === "scheduledAudios"
      ) {
        void loadMemberAudioFromServer(email);
      }
    }
  };

  const saveMemberScheduleProgress = async (email: string, completedScheduleNights: number) => {
    const clamped = Math.max(0, Math.min(366, Math.floor(completedScheduleNights)));
    setMemberScheduleSaving((prev) => ({ ...prev, [email]: true }));
    setStatus(null);
    try {
      const res = await fetch("/api/admin/member-schedule-progress", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, completedScheduleNights: clamped })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data?.error === "string" ? data.error : "Could not update schedule progress.");
        return;
      }
      {
        const nextStep = Math.min(366, Math.max(1, clamped + 1));
        setStatus(
          `Schedule updated for ${email}: ${clamped} step(s) complete · next step #${nextStep}.`
        );
      }
      await loadMemberActivity(email);
    } finally {
      setMemberScheduleSaving((prev) => ({ ...prev, [email]: false }));
    }
  };

  const resetMemberScheduleForInternalTesting = async (email: string) => {
    if (
      !window.confirm(
        `Reset schedule testing state for ${email}?\n\n` +
          "This clears completed schedule progress and the rotation start date so they begin again at audio 1. " +
          "It also sets global Playback “Initial tracks” to 4 if it is still below 4 (three rotation slots + T-18/CGMR cadence). " +
          "Goals, rotation order, and subscription are unchanged."
      )
    ) {
      return;
    }
    setMemberScheduleResetting((prev) => ({ ...prev, [email]: true }));
    setStatus(null);
    try {
      const res = await fetch("/api/admin/member-schedule-reset-testing", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(typeof data?.error === "string" ? data.error : "Could not reset schedule testing state.");
        return;
      }
      const pb = data?.playback as { initialTracks?: number; changed?: boolean } | undefined;
      setStatus(
        `Schedule testing reset for ${email}: next night #1. ` +
          (pb && typeof pb.initialTracks === "number"
            ? pb.changed
              ? `Global initial tracks set to ${pb.initialTracks}. `
              : `Global initial tracks unchanged (${pb.initialTracks}). `
            : "") +
          "Have them open Play Options once to anchor the rotation date."
      );
      await loadMemberActivity(email);
    } finally {
      setMemberScheduleResetting((prev) => ({ ...prev, [email]: false }));
    }
  };

  const buildAudioAssignment = (email: string) => {
    const emailLower = email.toLowerCase();
    return library.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] =
        item.allowedUserEmails?.some((allowed) => allowed.toLowerCase() === emailLower) ||
        false;
      return acc;
    }, {});
  };

  const buildAudioOrder = async (email: string) => {
    const response = await fetch(`/api/admin/member-audio-order?email=${encodeURIComponent(email)}`, {
      credentials: "include"
    });
    if (response.ok) {
      const data = await response.json();
      return data.order || [];
    }
    // Fallback: build order from current assignments
    const emailLower = email.toLowerCase();
    const assigned = library
      .filter((item) =>
        item.allowedUserEmails?.some((allowed) => allowed.toLowerCase() === emailLower)
      )
      .map((item) => item.id);
    return assigned;
  };

  const startMemberAudioHydration = (email: string) => {
    const key = memberAudioEmailKey(email);
    memberAudioHydratingRef.current = { ...memberAudioHydratingRef.current, [key]: true };
    setMemberAudioHydrating((p) => ({ ...p, [key]: true }));
  };

  const finishMemberAudioHydration = (email: string) => {
    const key = memberAudioEmailKey(email);
    memberAudioHydratingRef.current = { ...memberAudioHydratingRef.current, [key]: false };
    setMemberAudioHydrating((p) => ({ ...p, [key]: false }));
  };

  const loadMemberAudioFromServer = async (email: string, opts?: { force?: boolean }) => {
    const key = memberAudioEmailKey(email);
    if (!opts?.force && memberAudioServerLoadedRef.current[key]) {
      return;
    }
    startMemberAudioHydration(email);
    const hydrateTimeout = window.setTimeout(() => {
      finishMemberAudioHydration(email);
      setStatus("Rotation load timed out — you can still edit rotation below.");
    }, 12000);
    try {
      const assignments = buildAudioAssignment(email);
      const order = await buildAudioOrder(email);
      setMemberAudio((prev) => {
        let next = patchMemberOrderKeys(prev, email, order);
        next = patchMemberAssignmentsKeys(next, email, assignments);
        return next;
      });
      memberAudioServerLoadedRef.current[key] = true;
    } catch {
      setStatus("Could not load saved rotation. Refresh the page and try again.");
    } finally {
      window.clearTimeout(hydrateTimeout);
      finishMemberAudioHydration(email);
    }
  };

  const persistManagedRotationOrder = async (
    email: string,
    orderList: string[]
  ): Promise<boolean> => {
    const response = await fetch("/api/admin/member-audio-order", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, order: orderList })
    });
    if (!response.ok) {
      const errPayload = await response.json().catch(() => ({} as { error?: string }));
      const detail =
        typeof errPayload?.error === "string" ? errPayload.error : `HTTP ${response.status}`;
      setAudioSaveStatus((prev) => ({
        ...prev,
        [email]: `Rotation save failed: ${detail}`
      }));
      setStatus(detail);
      return false;
    }
    setAudioSaveStatus((prev) => ({
      ...prev,
      [email]:
        orderList.length === 1
          ? "Saved 1 rotation step to the server."
          : `Saved ${orderList.length} rotation steps to the server.`
    }));
    return true;
  };

  const managedTierForEmail = (email: string): UserRow["subscriptionTier"] =>
    updates[email]?.subscriptionTier ??
    users.find((u) => u.email.toLowerCase() === email.toLowerCase())?.subscriptionTier ??
    "platinum";

  const autoSaveManagedRotationIfNeeded = async (email: string, orderList: string[]) => {
    if (managedTierForEmail(email) !== "platinum_managed") return;
    await persistManagedRotationOrder(email, orderList);
  };

  /** Managed: remove every rotation slot for this item and revoke library assignment. */
  const clearManagedAudioForItem = (email: string, itemId: string) => {
    const key = memberAudioEmailKey(email);
    if (memberAudioHydratingRef.current[key]) {
      setStatus("Still loading saved rotation for this member — try again in a second.");
      return;
    }
    setMemberAudio((prev) => {
      const cur = memberRotationOrder(prev.order, email).filter((id) => id !== itemId);
      const prevAssign = memberAudioAssignmentsMap(prev.assignments, email);
      let next = patchMemberOrderKeys(prev, email, cur);
      next = patchMemberAssignmentsKeys(next, email, { ...prevAssign, [itemId]: false });
      return next;
    });
  };

  const toggleAudioAssignment = (
    email: string,
    itemId: string,
    tier: UserRow["subscriptionTier"]
  ) => {
    if (tier === "platinum_managed") {
      /** Managed library uses its own checkbox handler — rotation is edited only in the rotation card. */
      return;
    }

    setMemberAudio((prev) => {
      const mapAssign = memberAudioAssignmentsMap(prev.assignments, email);
      const current = mapAssign[itemId] ?? false;
      const newValue = !current;
      const assignNext = { ...mapAssign, [itemId]: newValue };
      const currentOrder = memberRotationOrder(prev.order, email);
      let nextList = currentOrder;
      if (newValue) {
        if (!currentOrder.includes(itemId)) {
          nextList = [...currentOrder, itemId];
        }
      } else {
        nextList = currentOrder.filter((id) => id !== itemId);
      }
      let next = patchMemberAssignmentsKeys(prev, email, assignNext);
      next = patchMemberOrderKeys(next, email, nextList);
      return next;
    });
  };

  /** Append one rotation slot (order + assignment flag in one state commit). Returns whether a row was added. */
  const incrementManagedAudioSlot = (email: string, itemId: string): boolean => {
    const key = memberAudioEmailKey(email);
    if (memberAudioHydratingRef.current[key]) {
      setStatus("Still loading saved rotation for this member — try again in a second.");
      return false;
    }
    let computed!: { next: MemberAudioSnapshot; outcome: "added" | "per_audio" };
    let nextOrder: string[] = [];
    flushSync(() => {
      setMemberAudio((prev) => {
        computed = computeManagedRotationAppend(prev, email, itemId);
        nextOrder = memberRotationOrder(computed.next.order, email);
        return computed.next;
      });
    });
    const outcome = computed.outcome;
    if (outcome === "per_audio") {
      setStatus(
        `This audio is already in the rotation ${MANAGED_MAX_SLOTS_PER_AUDIO} times (maximum). Remove a slot or pick another track.`
      );
      return false;
    }
    void autoSaveManagedRotationIfNeeded(email, nextOrder);
    return true;
  };

  const removeManagedSlotAtIndex = (email: string, slotIndex: number) => {
    const key = memberAudioEmailKey(email);
    if (memberAudioHydratingRef.current[key]) return;
    let nextOrder: string[] = [];
    let changed = false;
    flushSync(() => {
      setMemberAudio((prev) => {
        const cur = memberRotationOrder(prev.order, email);
        if (slotIndex < 0 || slotIndex >= cur.length) return prev;
        const removedId = cur[slotIndex];
        const nextOrderArr = cur.filter((_, i) => i !== slotIndex);
        nextOrder = nextOrderArr;
        changed = true;
        const remaining = countAudioSlotsInOrder(nextOrderArr, removedId) > 0;
        const prevAssign = memberAudioAssignmentsMap(prev.assignments, email);
        let next = patchMemberOrderKeys(prev, email, nextOrderArr);
        next = patchMemberAssignmentsKeys(next, email, { ...prevAssign, [removedId]: remaining });
        return next;
      });
    });
    if (changed) {
      void autoSaveManagedRotationIfNeeded(email, nextOrder);
    }
  };

  /** Swap slot with neighbor so repeats can sit apart (e.g. same SKU in positions 1 and 10). */
  const moveManagedSlot = (email: string, slotIndex: number, direction: "up" | "down") => {
    const key = memberAudioEmailKey(email);
    if (memberAudioHydratingRef.current[key]) return;
    let nextOrder: string[] = [];
    let changed = false;
    flushSync(() => {
      setMemberAudio((prev) => {
        const cur = [...memberRotationOrder(prev.order, email)];
        const j = direction === "up" ? slotIndex - 1 : slotIndex + 1;
        if (slotIndex < 0 || slotIndex >= cur.length || j < 0 || j >= cur.length) return prev;
        const t = cur[slotIndex];
        cur[slotIndex] = cur[j];
        cur[j] = t;
        nextOrder = cur;
        changed = true;
        return patchMemberOrderKeys(prev, email, cur);
      });
    });
    if (changed) {
      void autoSaveManagedRotationIfNeeded(email, nextOrder);
    }
  };

  const updateAudioOrder = (email: string, itemId: string, orderValue: string) => {
    const parsed = Number(orderValue);
    if (!orderValue || Number.isNaN(parsed) || parsed <= 0) {
      setMemberAudio((prev) => {
        const currentOrder = memberRotationOrder(prev.order, email);
        return patchMemberOrderKeys(prev, email, currentOrder.filter((id) => id !== itemId));
      });
      return;
    }
    setMemberAudio((prev) => {
      const currentOrder = memberRotationOrder(prev.order, email);
      const without = currentOrder.filter((id) => id !== itemId);
      const next = [...without];
      next.splice(Math.min(parsed - 1, next.length), 0, itemId);
      return patchMemberOrderKeys(prev, email, next);
    });
  };

  const getAudioOrder = (email: string, itemId: string, fallback: string[]) => {
    const list = memberHasRotationSlot(audioOrder, email)
      ? memberRotationOrder(audioOrder, email)
      : fallback;
    const index = list.indexOf(itemId);
    return index === -1 ? "" : String(index + 1);
  };

  const saveAudioAssignments = async (email: string) => {
    const assignKey = memberAudioEmailKey(email);
    const assignRaw = email.trim();
    const current =
      audioAssignments[assignKey] ??
      audioAssignments[assignRaw] ??
      buildAudioAssignment(email);
    const emailLower = email.toLowerCase();
    /** Library rows whose allowed-email list must be PATCHed (not the same as `updates` member-row draft state). */
    const libraryAssignmentChanges = library.filter((item) => {
      const shouldHave = !!current[item.id];
      const hasEmail =
        item.allowedUserEmails?.some((allowed) => allowed.toLowerCase() === emailLower) ||
        false;
      return shouldHave !== hasEmail;
    });
    /** Must match admin dropdown (`updates`) so rotation persists before “Save” on the member row. */
    const tierForSave: UserRow["subscriptionTier"] =
      updates[email]?.subscriptionTier ??
      users.find((u) => u.email.toLowerCase() === emailLower)?.subscriptionTier ??
      "platinum";
    const hasRotationKey = memberHasRotationSlot(audioOrder, email);

    if (
      libraryAssignmentChanges.length === 0 &&
      !memberHasRotationSlot(audioOrder, email) &&
      !(tierForSave === "platinum_managed" && hasRotationKey)
    ) {
      setAudioSaveStatus((prev) => ({ ...prev, [email]: "No changes to save." }));
      return;
    }
    
    // Save assignments
    await Promise.all(
      libraryAssignmentChanges.map((item) => {
        const allowed = item.allowedUserEmails || [];
        const shouldHave = !!current[item.id];
        const nextAllowed = shouldHave
          ? Array.from(new Set([...allowed, email]))
          : allowed.filter((allowedEmail) => allowedEmail.toLowerCase() !== emailLower);
        return fetch("/api/library", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            title: item.title,
            description: item.description,
            skuCode: item.skuCode || "",
            categories: item.categories || [],
            coverUrl: item.coverUrl || "",
            audioUrl: item.audioUrl || "",
            interestIds: item.interestIds || [],
            allowedUserEmails: nextAllowed,
            isAdult: item.isAdult || false
          })
        });
      })
    );

    // Save order (managed: always persist when state exists, including empty rotation)
    const orderArr = memberHasRotationSlot(audioOrder, email)
      ? memberRotationOrder(audioOrder, email)
      : undefined;
    let orderToSave: string[] | null = null;
    if (tierForSave === "platinum_managed" && hasRotationKey) {
      orderToSave = Array.isArray(orderArr) ? orderArr : [];
    } else if (tierForSave !== "platinum_managed") {
      const o = orderArr || [];
      if (o.length > 0) orderToSave = o;
    }
    if (orderToSave !== null) {
      const orderResponse = await fetch("/api/admin/member-audio-order", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          order: orderToSave
        })
      });
      if (!orderResponse.ok) {
        const errPayload = await orderResponse.json().catch(() => ({} as { error?: string }));
        const detail =
          typeof errPayload?.error === "string" ? errPayload.error : `HTTP ${orderResponse.status}`;
        setAudioSaveStatus((prev) => ({
          ...prev,
          [email]: `Saved ${libraryAssignmentChanges.length} assignment(s), but order save failed: ${detail}`
        }));
        await load();
        return;
      }
    }

    const patchCount = libraryAssignmentChanges.length;
    const savedRotationOrder = orderToSave !== null;
    const stepsSaved = savedRotationOrder ? (orderToSave ?? []).length : 0;
    const stepsPhrase =
      stepsSaved === 1 ? "1 rotation step" : `${stepsSaved} rotation steps`;
    let saveMsg: string;
    if (patchCount > 0 && savedRotationOrder) {
      saveMsg = `Saved ${patchCount} library access update(s) and ${stepsPhrase} to the server.`;
    } else if (patchCount > 0 && !savedRotationOrder) {
      saveMsg = `Saved ${patchCount} library access update(s).`;
    } else if (savedRotationOrder) {
      saveMsg =
        tierForSave === "platinum_managed"
          ? `Saved ${stepsPhrase} to the server. The checklist did not need updates — those recordings already included this member for library access (that is separate from rotation).`
          : `Saved ${stepsPhrase} to the server (library access unchanged).`;
    } else {
      saveMsg = "Saved.";
    }
    setAudioSaveStatus((prev) => ({ ...prev, [email]: saveMsg }));
    await load();
  };

  const getAudioDraft = (email: string) =>
    newAudioDrafts[email] || {
      title: "",
      description: "",
      audioUrl: "",
      coverUrl: "",
      skuCode: "",
      categories: "CGMR"
    };

  const updateAudioDraft = (email: string, patch: Partial<NewAudioDraft>) => {
    setNewAudioDrafts((prev) => ({
      ...prev,
      [email]: {
        ...getAudioDraft(email),
        ...patch
      }
    }));
  };

  const addPersonalizedAudio = async (email: string) => {
    const draft = getAudioDraft(email);
    if (!draft.title.trim() || !draft.description.trim() || !draft.audioUrl.trim()) {
      setAudioSaveStatus((prev) => ({
        ...prev,
        [email]: "Add a title, description, and audio URL (or upload a file first)."
      }));
      return;
    }
    const categories = draft.categories
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const response = await fetch("/api/library", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        skuCode: draft.skuCode || "",
        fileName: "",
        categories,
        coverUrl: draft.coverUrl || "",
        audioUrl: draft.audioUrl,
        interestIds: [],
        allowedUserEmails: [email]
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAudioSaveStatus((prev) => ({
        ...prev,
        [email]: data?.error || "Unable to add audio. Check the fields and try again."
      }));
      return;
    }
    setAudioSaveStatus((prev) => ({
      ...prev,
      [email]: "Personalized audio added."
    }));
    setNewAudioDrafts((prev) => ({
      ...prev,
      [email]: {
        title: "",
        description: "",
        audioUrl: "",
        coverUrl: "",
        skuCode: "",
        categories: "CGMR"
      }
    }));
    await load();
  };

  const uploadPersonalizedAudioFile = async (email: string, fileInput: HTMLInputElement | null) => {
    const file = fileInput?.files?.[0];
    if (!file) {
      setUploadStatus((prev) => ({ ...prev, [email]: "Choose a file first." }));
      return;
    }
    setPersonalizedAudioUploading((prev) => ({ ...prev, [email]: true }));
    setUploadStatus((prev) => ({ ...prev, [email]: "" }));
    const pathname = `audios/${sanitizePathSegment(file.name.replace(/\.[^.]+$/, "") || "audio")}${file.name.match(/\.[^.]+$/)?.[0] || ".mp3"}`;
    const useMultipart = file.size > 5 * 1024 * 1024;
    try {
      const tokenRes = await fetch("/api/admin/upload-audio-handler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: { pathname, clientPayload: null, multipart: useMultipart }
        }),
        credentials: "include"
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        setUploadStatus((prev) => ({
          ...prev,
          [email]:
            tokenRes.status === 401
              ? "Upload failed: Log in as admin and try again."
              : `Upload failed: ${tokenData?.error || tokenRes.statusText}. Check BLOB_READ_WRITE_TOKEN in Vercel if deployed.`
        }));
        return;
      }
      const clientToken = tokenData?.clientToken;
      if (!clientToken) {
        setUploadStatus((prev) => ({ ...prev, [email]: "Upload failed: No token from server." }));
        return;
      }
      const blob = await put(pathname, file, {
        access: "public",
        token: clientToken,
        multipart: useMultipart
      });
      const url = blob?.url || "";
      updateAudioDraft(email, { audioUrl: url });
      setUploadStatus((prev) => ({
        ...prev,
        [email]: url
          ? "Success. URL is in the Audio URL field below. Add title and description, then click Add Personalized Audio."
          : "Upload completed but no URL returned. Paste a URL manually if needed."
      }));
      if (fileInput) fileInput.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadStatus((prev) => ({
        ...prev,
        [email]: `Upload failed: ${msg}. Ensure you're logged in as admin and BLOB_READ_WRITE_TOKEN is set.`
      }));
    } finally {
      setPersonalizedAudioUploading((prev) => ({ ...prev, [email]: false }));
    }
  };

  const toYear = (v: string): number | undefined => {
    if (!v || !v.trim()) return undefined;
    const n = Number(v.trim());
    if (Number.isNaN(n) || n < 1900 || n > 2100) return undefined;
    return n;
  };

  const saveProfile = async (email: string) => {
    const draft = profileDrafts[email];
    if (!draft) {
      return;
    }
    const response = await fetch("/api/admin/member-profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        profile: {
          firstName: draft.firstName,
          lastName: draft.lastName,
          gender: draft.gender,
          yearBorn: toYear(draft.yearBorn),
          birthDate: draft.birthDate?.trim() || undefined,
          contactNumber: draft.contactNumber,
          bestContactTimes: draft.bestContactTimes,
          timeZone: draft.timeZone,
          occupation: draft.occupation,
          incomeGoal: draft.incomeGoal,
          incomeGoalYear: toYear(draft.incomeGoalYear),
          incomeGoalRelation: draft.incomeGoalRelation,
          isFirstResponder: draft.isFirstResponder,
          wantsPracticeGrowth: draft.wantsPracticeGrowth,
          adultConsent: draft.adultConsent,
          wantsPolyamory: draft.wantsPolyamory,
          hadLgdSession: draft.hadLgdSession,
          referralSource: draft.referralSource,
          notes: draft.notes
        }
      })
    });
    if (response.ok) {
      setStatus("Member profile saved.");
      setProfileOpen((prev) => ({ ...prev, [email]: false }));
      await load();
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || `Profile save failed. (status ${response.status})`);
  };

  const saveClientNotes = async (email: string) => {
    const notes = profileDrafts[email]?.notes ?? "";
    const response = await fetch("/api/admin/member-profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        profile: { notes }
      })
    });
    if (response.ok) {
      setStatus("Client notes saved.");
      await loadProfile(email);
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || "Could not save client notes.");
  };

  const ensureProfileDraftForNotes = async (email: string) => {
    if (profileDrafts[email]) return;
    await loadProfile(email);
  };

  const getMemberGoalIds = (email: string, fallback: string[]) =>
    updates[email]?.goalIds ?? fallback ?? [];

  const toggleMemberGoal = (email: string, fallback: string[], goalId: string) => {
    setUpdates((prev) => {
      const current = prev[email]?.goalIds ?? fallback ?? [];
      if (current.includes(goalId)) {
        return {
          ...prev,
          [email]: { ...prev[email], goalIds: current.filter((id) => id !== goalId) }
        };
      }
      if (current.length >= 10) {
        return prev;
      }
      return {
        ...prev,
        [email]: { ...prev[email], goalIds: [...current, goalId] }
      };
    });
  };

  const moveMemberGoal = (
    email: string,
    fallback: string[],
    fromIndex: number,
    toIndex: number
  ) => {
    setUpdates((prev) => {
      const current = prev[email]?.goalIds ?? fallback ?? [];
      if (toIndex < 0 || toIndex >= current.length) {
        return prev;
      }
      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return {
        ...prev,
        [email]: { ...prev[email], goalIds: next }
      };
    });
  };

  const getDerivedAudios = (goalIds: string[]) => {
    if (!goalIds || goalIds.length === 0) {
      return [];
    }
    return library.filter((item) => item.interestIds?.some((id) => goalIds.includes(id)));
  };

  return React.createElement(
    "div",
    { className: "card" },
    <>
      <div style={{ marginBottom: addNewMemberOpen ? 8 : 0 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            marginBottom: 8
          }}
        >
          <h2 style={{ margin: 0 }}>Member Accounts</h2>
          <button
            type="button"
            className={adminSectionToggleClass(addNewMemberOpen)}
            onClick={() => setAddNewMemberOpen((open) => !open)}
            aria-expanded={addNewMemberOpen}
            aria-controls="admin-add-new-member-panel"
          >
            {addNewMemberOpen ? "Hide add new member" : "Add new member"}
          </button>
        </div>
        {!addNewMemberOpen && (
          <p style={{ color: "#4b5563", margin: 0 }}>
            Search and manage members below, or use <strong>Add new member</strong> to create an
            account.
          </p>
        )}
      </div>
      {addNewMemberOpen && (
        <p style={{ color: "#4b5563", marginTop: 0 }}>
          Create member accounts, assign tiers, and activate subscriptions. Member passwords are
          stored as a secure hash; you cannot view an existing password—enter a new one below or in
          the expanded profile to reset login for any member.
        </p>
      )}
      {dataLoadNotice && (
        <p style={{ color: "#b45309", marginTop: 8, marginBottom: 0 }} role="status">
          {dataLoadNotice}
        </p>
      )}
      {status && <p>{status}</p>}
      {addNewMemberOpen && (
        <div id="admin-add-new-member-panel" className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Create member</h3>
          <div className="grid">
            <input
              style={inputStyle}
              value={createEmail}
              onChange={(event) => setCreateEmail(event.target.value)}
              placeholder="Email"
            />
            <input
              style={inputStyle}
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
              placeholder="Temporary password"
              type="password"
            />
            <input
              style={inputStyle}
              value={createFirstName}
              onChange={(event) => setCreateFirstName(event.target.value)}
              placeholder="First name"
            />
            <input
              style={inputStyle}
              value={createLastName}
              onChange={(event) => setCreateLastName(event.target.value)}
              placeholder="Last name"
            />
            <select
              style={inputStyle}
              value={createTier || "platinum"}
              onChange={(event) =>
                setCreateTier(event.target.value as UserRow["subscriptionTier"])
              }
            >
              <option value="platinum">Gold Member ($19.95/mo)</option>
              <option value="platinum_managed">Platinum Managed Member ($39.95/mo)</option>
            </select>
            <select
              style={inputStyle}
              value={createStatus || "inactive"}
              onChange={(event) =>
                setCreateStatus(
                  event.target.value as UserRow["subscriptionStatus"]
                )
              }
            >
              <option value="inactive">Inactive</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
            <select
              style={inputStyle}
              value={createPlaysPerNight}
              onChange={(event) =>
                setCreatePlaysPerNight(Number(event.target.value) as 1 | 2)
              }
            >
              <option value={2}>2 audios per night (default)</option>
              <option value={1}>1 audio per step</option>
            </select>
            <button className="button" type="button" onClick={createUser}>
              Create Member
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
          <h3>Existing Members</h3>
          {users.length === 0 ? (
            <p>No member accounts yet.</p>
          ) : (
            <>
              <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  style={{ ...inputStyle, maxWidth: 300, flex: "1 1 200px" }}
                  placeholder="Search by name or email..."
                  value={memberSearchTerm}
                  onChange={(event) => setMemberSearchTerm(event.target.value)}
                />
                <select
                  style={{ ...inputStyle, maxWidth: 200, flex: "0 0 auto" }}
                  value={memberTierFilter}
                  onChange={(event) => setMemberTierFilter(event.target.value as "all" | "platinum" | "platinum_managed")}
                >
                  <option value="all">All Memberships</option>
                  <option value="platinum">Gold Member</option>
                  <option value="platinum_managed">Platinum Managed Member</option>
                </select>
                {filteredUsers.length !== users.length && (
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Showing {filteredUsers.length} of {users.length} members
                  </span>
                )}
              </div>
              {filteredUsers.length === 0 ? (
                <p style={{ color: "#64748b" }}>
                  No members match your search or membership filter. Try clearing the search box or
                  setting membership to &quot;All Memberships.&quot;
                </p>
              ) : (
                <div className="grid">
                  {filteredUsers.map((user) => {
                  const rawActivity = memberActivity[user.email] || [];
                  const actFilter = memberActivityFilter[user.email] ?? "all";
                  const actPageSize = memberActivityPageSize[user.email] ?? 20;
                  const filteredActivity =
                    actFilter === "all"
                      ? rawActivity
                      : rawActivity.filter((row) => classifyMemberActivityRow(row) === actFilter);
                  const displayedActivity = filteredActivity.slice(0, actPageSize);
                  /** Pending tier in membership dropdown (saved on Save) — drives managed rotation UI. */
                  const effectiveTier =
                    updates[user.email]?.subscriptionTier ?? user.subscriptionTier ?? "platinum";
                  const audioKey = memberAudioEmailKey(user.email);
                  const rotationOrder = memberRotationOrder(audioOrder, user.email);
                  const audioHydrating = !!memberAudioHydrating[audioKey];

                  return (
                <div key={user.id} className="card">
                  <strong>
                    {user.firstName || user.lastName
                      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
                      : user.email}
                  </strong>
                  {user.firstName != null || user.lastName != null ? (
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.9em", color: "#6b7280" }}>
                      {user.email}
                    </p>
                  ) : null}
                  {!profileOpen[user.email] && (
                    <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      Goals: {user.goalIds?.length || 0} · {effectiveTier === "platinum_managed" ? "Platinum Managed Member" : "Gold Member"} · {user.subscriptionStatus ?? "inactive"} ·{" "}
                      {memberPlaysPerNight(user) === 2 ? "2 audios/night" : "1 audio/step"}
                    </p>
                  )}
                  {!profileOpen[user.email] && (
                    <>
                      <button
                        className={adminSectionToggleClass(false)}
                        type="button"
                        onClick={async () => {
                          setProfileOpen({ ...profileOpen, [user.email]: true });
                          setStatus(null);
                          await loadMemberAudioFromServer(user.email);
                          if (!profileDrafts[user.email]) {
                            void loadProfile(user.email);
                          }
                          void loadMemberActivity(user.email);
                        }}
                      >
                        View / Edit member
                      </button>
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: "1px solid #e5e7eb"
                        }}
                      >
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px 0" }}>
                          <strong>Member login password:</strong> hashed in the database (cannot be displayed). Set a new
                          password so they can sign in at /member/login.
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                          <label htmlFor={`member-pw-${user.email}`} className="sr-only">
                            New password for {user.email}
                          </label>
                          <input
                            id={`member-pw-${user.email}`}
                            style={{ ...inputStyle, flex: "1 1 200px", maxWidth: 280 }}
                            placeholder="New password (min 6 characters)"
                            type="password"
                            autoComplete="new-password"
                            value={resetPasswords[user.email] || ""}
                            onChange={(event) =>
                              setResetPasswords({
                                ...resetPasswords,
                                [user.email]: event.target.value
                              })
                            }
                          />
                          <button className="button" type="button" onClick={() => updateUser(user.email)}>
                            Set password
                          </button>
                        </div>
                      </div>
                      {renderMemberPaymentLinkBlock(user)}
                    </>
                  )}
                  {profileOpen[user.email] && (
                    <>
                      <button
                        className={adminSectionToggleClass(true)}
                        type="button"
                        aria-expanded={true}
                        onClick={async () => {
                          const next = !profileOpen[user.email];
                          setProfileOpen({ ...profileOpen, [user.email]: next });
                          if (next) {
                            setStatus(null);
                            await loadMemberAudioFromServer(user.email);
                            if (!profileDrafts[user.email]) {
                              void loadProfile(user.email);
                            }
                            void loadMemberActivity(user.email);
                          }
                        }}
                      >
                        {profileOpen[user.email] ? "Hide member editor" : "View member editor"}
                      </button>
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "notes"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "notes")}
                        onClick={() => {
                          toggleMemberSection(user.email, "notes");
                          void ensureProfileDraftForNotes(user.email);
                        }}
                      >
                        {memberSectionIsOpen(user.email, "notes") ? "▼" : "▶"} Client notes
                      </button>
                      {memberSectionIsOpen(user.email, "notes") && (
                        <div className="card" style={{ marginTop: 8 }}>
                          <p style={{ color: "#64748b", fontSize: 13, marginTop: 0, lineHeight: 1.5 }}>
                            Internal notes for this member — visible to admins and assigned facilitators.
                            Not shown to the member.
                          </p>
                          <textarea
                            style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                            placeholder="Coaching notes, follow-ups, context for the team…"
                            value={profileDrafts[user.email]?.notes ?? ""}
                            onChange={(event) =>
                              setProfileDrafts((prev) => {
                                const row = prev[user.email];
                                if (!row) return prev;
                                return {
                                  ...prev,
                                  [user.email]: { ...row, notes: event.target.value }
                                };
                              })
                            }
                          />
                          <button
                            type="button"
                            className="button"
                            style={{ marginTop: 12 }}
                            onClick={() => void saveClientNotes(user.email)}
                          >
                            Save client notes
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "profile"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "profile")}
                        onClick={() => toggleMemberSection(user.email, "profile")}
                      >
                        {memberSectionIsOpen(user.email, "profile") ? "▼" : "▶"} Member Profile
                      </button>
                      {memberSectionIsOpen(user.email, "profile") && (
                        <div className="card" style={{ marginTop: 8 }}>
                      {profileDrafts[user.email] ? (
                        <>
                          <p style={{ color: "#4b5563", marginTop: 4 }}>
                            Same fields and order as new member signup (Personal Details step).
                          </p>
                          <div className="section-heading" style={{ marginTop: 16, marginBottom: 4 }}>
                            Personal Details
                          </div>
                          <p style={{ color: "#4b5563", fontSize: 14, marginBottom: 12 }}>
                            Before selecting your goals we need some basic information to start your customization and better service you.
                          </p>
                          <div className="grid grid-2">
                            <input
                              style={inputStyle}
                              placeholder="First Name *"
                              value={profileDrafts[user.email].firstName}
                              onChange={(event) =>
                                setProfileDrafts({
                                  ...profileDrafts,
                                  [user.email]: { ...profileDrafts[user.email], firstName: event.target.value }
                                })
                              }
                            />
                            <input
                              style={inputStyle}
                              placeholder="Last Name *"
                              value={profileDrafts[user.email].lastName}
                              onChange={(event) =>
                                setProfileDrafts({
                                  ...profileDrafts,
                                  [user.email]: { ...profileDrafts[user.email], lastName: event.target.value }
                                })
                              }
                            />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 4 }}>
                                Birthdate (optional). Required for mature content access 18+.
                              </p>
                              <input
                                type="date"
                                style={inputStyle}
                                value={profileDrafts[user.email].birthDate}
                                onChange={(event) => {
                                  const v = event.target.value;
                                  setProfileDrafts({
                                    ...profileDrafts,
                                    [user.email]: {
                                      ...profileDrafts[user.email],
                                      birthDate: v,
                                      yearBorn: v ? v.slice(0, 4) : ""
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 4 }}>
                                Helps with customization.
                              </p>
                              <input
                                style={inputStyle}
                                placeholder="Gender (optional)"
                                value={profileDrafts[user.email].gender}
                                onChange={(event) =>
                                  setProfileDrafts({
                                    ...profileDrafts,
                                    [user.email]: { ...profileDrafts[user.email], gender: event.target.value }
                                  })
                                }
                              />
                            </div>
                            <input
                              style={inputStyle}
                              placeholder="Occupation (optional)"
                              value={profileDrafts[user.email].occupation}
                              onChange={(event) =>
                                setProfileDrafts({
                                  ...profileDrafts,
                                  [user.email]: { ...profileDrafts[user.email], occupation: event.target.value }
                                })
                              }
                            />
                            <input
                              style={inputStyle}
                              placeholder="Best Contact Number (optional)"
                              value={profileDrafts[user.email].contactNumber}
                              onChange={(event) =>
                                setProfileDrafts({
                                  ...profileDrafts,
                                  [user.email]: { ...profileDrafts[user.email], contactNumber: event.target.value }
                                })
                              }
                            />
                            <input
                              style={inputStyle}
                              placeholder="Best Time(s) Reached (optional)"
                              value={profileDrafts[user.email].bestContactTimes}
                              onChange={(event) =>
                                setProfileDrafts({
                                  ...profileDrafts,
                                  [user.email]: { ...profileDrafts[user.email], bestContactTimes: event.target.value }
                                })
                              }
                            />
                            <select
                              style={inputStyle}
                              value={profileDrafts[user.email].timeZone}
                              onChange={(event) =>
                                setProfileDrafts({
                                  ...profileDrafts,
                                  [user.email]: { ...profileDrafts[user.email], timeZone: event.target.value }
                                })
                              }
                            >
                              {timeZones.map((zone) => (
                                <option key={zone} value={zone}>{zone}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid" style={{ marginTop: 16 }}>
                            <label className="card" style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <input
                                type="checkbox"
                                checked={profileDrafts[user.email].hadLgdSession}
                                onChange={(event) =>
                                  setProfileDrafts({
                                    ...profileDrafts,
                                    [user.email]: { ...profileDrafts[user.email], hadLgdSession: event.target.checked }
                                  })
                                }
                                style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
                              />
                              <span>
                                I am interested in more information on a &quot;Life Guidance Discovery Session&quot;
                                to receive a customized &quot;Goal Manifestation&quot; audio specific for me!
                              </span>
                            </label>
                            {(() => {
                              const y = profileDrafts[user.email].yearBorn;
                              const yearNum = typeof y === "string" ? parseInt(String(y).trim(), 10) : y;
                              const showAdult = Number.isInteger(yearNum) && yearNum >= 1900 && yearNum <= 2100 && new Date().getFullYear() - yearNum >= 18;
                              return showAdult ? (
                                <div className="card">
                                  <p style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>Adult content</p>
                                  <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                                    You are 18 or older. You may opt in to audios with mature content below.
                                  </p>
                                  <label style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                                    <input
                                      type="checkbox"
                                      checked={profileDrafts[user.email].adultConsent}
                                      onChange={(event) =>
                                        setProfileDrafts({
                                          ...profileDrafts,
                                          [user.email]: { ...profileDrafts[user.email], adultConsent: event.target.checked }
                                        })
                                      }
                                      style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
                                    />
                                    <span>I consent to hear audios with mature content.</span>
                                  </label>
                                  <div style={{ marginLeft: 28, paddingLeft: 12, borderLeft: "2px solid #e5e7eb" }}>
                                    <label style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
                                      <input
                                        type="checkbox"
                                        checked={profileDrafts[user.email].wantsPolyamory}
                                        onChange={(event) =>
                                          setProfileDrafts({
                                            ...profileDrafts,
                                            [user.email]: { ...profileDrafts[user.email], wantsPolyamory: event.target.checked }
                                          })
                                        }
                                        style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
                                      />
                                      <span>I would like to hear audios related to polyamory.</span>
                                    </label>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                            <label className="card" style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <input
                                type="checkbox"
                                checked={profileDrafts[user.email].wantsPracticeGrowth}
                                onChange={(event) =>
                                  setProfileDrafts({
                                    ...profileDrafts,
                                    [user.email]: { ...profileDrafts[user.email], wantsPracticeGrowth: event.target.checked }
                                  })
                                }
                                style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
                              />
                              <span>
                                I am interested in building my practice as a Hypnotherapist, Healer, or Life/Business Coach
                                using the tools offered here.
                              </span>
                            </label>
                            <input
                              style={inputStyle}
                              placeholder="How did you find us?"
                              value={profileDrafts[user.email].referralSource}
                              onChange={(event) =>
                                setProfileDrafts({
                                  ...profileDrafts,
                                  [user.email]: { ...profileDrafts[user.email], referralSource: event.target.value }
                                })
                              }
                            />
                          </div>
                          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Additional (admin)</p>
                            <div className="grid grid-2" style={{ gap: 8 }}>
                              <input
                                style={inputStyle}
                                placeholder="Annual income goal"
                                value={profileDrafts[user.email].incomeGoal}
                                onChange={(event) =>
                                  setProfileDrafts({
                                    ...profileDrafts,
                                    [user.email]: { ...profileDrafts[user.email], incomeGoal: event.target.value }
                                  })
                                }
                              />
                              <input
                                style={inputStyle}
                                placeholder="Goal year"
                                value={profileDrafts[user.email].incomeGoalYear}
                                onChange={(event) =>
                                  setProfileDrafts({
                                    ...profileDrafts,
                                    [user.email]: { ...profileDrafts[user.email], incomeGoalYear: event.target.value }
                                  })
                                }
                              />
                              <input
                                style={inputStyle}
                                placeholder="Goal vs current income"
                                value={profileDrafts[user.email].incomeGoalRelation}
                                onChange={(event) =>
                                  setProfileDrafts({
                                    ...profileDrafts,
                                    [user.email]: { ...profileDrafts[user.email], incomeGoalRelation: event.target.value }
                                  })
                                }
                              />
                              <label className="card" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={profileDrafts[user.email].isFirstResponder}
                                  onChange={(event) =>
                                    setProfileDrafts({
                                      ...profileDrafts,
                                      [user.email]: { ...profileDrafts[user.email], isFirstResponder: event.target.checked }
                                    })
                                  }
                                />
                                First responder / healthcare
                              </label>
                            </div>
                          </div>
                          <button
                            className="button"
                            type="button"
                            style={{ marginTop: 12 }}
                            onClick={() => saveProfile(user.email)}
                          >
                            Save Profile
                          </button>
                        </>
                      ) : (
                        <p style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>
                          Loading member profile…
                        </p>
                      )}
                        </div>
                      )}
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "facilitator"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "facilitator")}
                        onClick={() => toggleMemberSection(user.email, "facilitator")}
                      >
                        {memberSectionIsOpen(user.email, "facilitator") ? "▼" : "▶"} Facilitator
                        Assignment
                      </button>
                      {memberSectionIsOpen(user.email, "facilitator") && (
                        <div className="card" style={{ marginTop: 8 }}>
                          <p style={{ color: "#4b5563", fontSize: 14, marginTop: 0 }}>
                            Choose which facilitator can access this member in their console. This
                            updates the same assignment list used in{" "}
                            <strong>Facilitators Section → Active Facilitators</strong>.
                          </p>
                          {facilitatorMultipleWarning[user.email] && (
                            <p
                              style={{
                                color: "#92400e",
                                fontSize: 13,
                                background: "#fffbeb",
                                border: "1px solid #fcd34d",
                                borderRadius: 8,
                                padding: "8px 12px"
                              }}
                            >
                              This member was assigned to more than one facilitator. Saving will
                              keep only the facilitator selected below.
                            </p>
                          )}
                          {facilitatorLoading[user.email] ? (
                            <p style={{ color: "#64748b", fontSize: 14 }}>Loading facilitator assignment…</p>
                          ) : (
                            <>
                              <label
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: "block",
                                  marginBottom: 6,
                                  marginTop: 8
                                }}
                              >
                                Assigned facilitator
                              </label>
                              <select
                                style={inputStyle}
                                value={facilitatorDrafts[user.email] ?? ""}
                                onChange={(event) =>
                                  setFacilitatorDrafts({
                                    ...facilitatorDrafts,
                                    [user.email]: event.target.value
                                  })
                                }
                              >
                                <option value="">No facilitator</option>
                                {facilitatorOptions.map((moderator) => (
                                  <option key={moderator.id} value={moderator.id}>
                                    {moderator.name} ({moderator.email})
                                    {moderator.status !== "active" ? " — inactive" : ""}
                                  </option>
                                ))}
                              </select>
                              {facilitatorOptions.length === 0 && (
                                <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
                                  No facilitator accounts yet. Approve one in Facilitators Section
                                  first.
                                </p>
                              )}
                              <button
                                className="button"
                                type="button"
                                style={{ marginTop: 12 }}
                                disabled={facilitatorSaving[user.email]}
                                onClick={() => void saveMemberFacilitator(user.email)}
                              >
                                {facilitatorSaving[user.email]
                                  ? "Saving…"
                                  : "Save facilitator assignment"}
                              </button>
                              <div
                                style={{
                                  marginTop: 16,
                                  paddingTop: 12,
                                  borderTop: "1px solid #e5e7eb",
                                  fontSize: 13,
                                  color: "#4b5563"
                                }}
                              >
                                <p style={{ margin: "0 0 6px" }}>
                                  <strong>Member affiliate code:</strong>{" "}
                                  {user.affiliateCode?.trim() || "—"}
                                </p>
                                <p style={{ margin: 0 }}>
                                  <strong>Referred by affiliate:</strong>{" "}
                                  {user.referredByAffiliateCode?.trim() || "—"}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "activity"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "activity")}
                        onClick={() => toggleMemberSection(user.email, "activity")}
                      >
                        {memberSectionIsOpen(user.email, "activity") ? "▼" : "▶"} Member Activity
                      </button>
                      {memberSectionIsOpen(user.email, "activity") && (
                        <div className="card" style={{ marginTop: 8 }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              marginBottom: 8
                            }}
                          >
                            <h4 style={{ margin: 0 }}>Member activity</h4>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                gap: 10
                              }}
                            >
                              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                Filter
                                <select
                                  style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                                  value={actFilter}
                                  onChange={(e) =>
                                    setMemberActivityFilter((prev) => ({
                                      ...prev,
                                      [user.email]: e.target.value as MemberActivityViewFilter
                                    }))
                                  }
                                >
                                  <option value="all">All activity</option>
                                  <option value="library">Library plays</option>
                                  <option value="session">Play Options plays</option>
                                  <option value="other">Other</option>
                                </select>
                              </label>
                              <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                Rows
                                <select
                                  style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                                  value={actPageSize}
                                  onChange={(e) =>
                                    setMemberActivityPageSize((prev) => ({
                                      ...prev,
                                      [user.email]: Number(e.target.value) as MemberActivityPageSize
                                    }))
                                  }
                                >
                                  <option value={20}>20</option>
                                  <option value={50}>50</option>
                                  <option value={100}>100</option>
                                </select>
                              </label>
                              <button
                                type="button"
                                className="button button-secondary"
                                style={{ fontSize: 13, padding: "6px 12px" }}
                                disabled={!!memberActivityLoading[user.email]}
                                onClick={() => void loadMemberActivity(user.email)}
                              >
                                {memberActivityLoading[user.email] ? "Loading…" : "Refresh activity"}
                              </button>
                            </div>
                          </div>
                          <p style={{ color: "#64748b", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
                            Sign-ins (with first page they head to), sign-outs, page views, played audio (library
                            and Play Options — each row lists the recording name), goal and console updates, and
                            admin schedule changes. Use <strong>Filter</strong> for library vs Play Options playback vs
                            everything else; <strong>Rows</strong> caps how many matching rows appear (newest first).
                            Refresh loads up to 500 recent events. Rows with a <strong style={{ color: "#b91c1c" }}>red</strong>{" "}
                            background indicate the member jumped ahead in the player (seek / fast-forward), not
                            continuous playback.
                          </p>
                          <p
                            style={{
                              color: "#92400e",
                              fontSize: 12,
                              marginTop: -8,
                              marginBottom: 12,
                              padding: "8px 10px",
                              background: "#fffbeb",
                              borderRadius: 8,
                              border: "1px solid #fde68a"
                            }}
                          >
                            Plays are saved for the member who was signed in at <strong>/member/login</strong> when
                            audio ran, not for the admin viewing this screen. (This note is always shown here; it does
                            not mean your current setup is wrong.)
                          </p>
                          {rawActivity.length > 0 && !memberActivityLoading[user.email] && (
                            <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px" }}>
                              Loaded <strong>{rawActivity.length}</strong> newest events.
                              {actFilter !== "all" ? (
                                <>
                                  {" "}
                                  <strong>{filteredActivity.length}</strong> match this filter.
                                </>
                              ) : null}
                              {filteredActivity.length > actPageSize ? (
                                <>
                                  {" "}
                                  Showing the <strong>{actPageSize}</strong> newest of{" "}
                                  <strong>{filteredActivity.length}</strong> in the table.
                                </>
                              ) : null}
                            </p>
                          )}
                          {rawActivity.length > 0 &&
                            !memberActivityLoading[user.email] &&
                            memberActivitySnapshot[user.email] && (
                            <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 10px" }}>
                              <strong>DB snapshot (this request):</strong>{" "}
                              {memberActivitySnapshot[user.email].newestActivityAt ? (
                                <>
                                  top row <strong>
                                    {formatActivityTime(
                                      memberActivitySnapshot[user.email].newestActivityAt as string
                                    )}
                                  </strong>{" "}
                                </>
                              ) : (
                                "no rows · "
                              )}
                              ({memberActivitySnapshot[user.email].rowCount} rows) · server{" "}
                              {formatActivityTime(memberActivitySnapshot[user.email].serverTime)} · this page
                              loaded {formatActivityTime(memberActivitySnapshot[user.email].loadedAt)}. If new
                              plays are missing, they are not in the database for this account yet, or a filter
                              is hiding them.
                            </p>
                          )}
                          {memberScheduleProgress[user.email] != null && (
                            <div
                              style={{
                                marginBottom: 16,
                                padding: 12,
                                background: "#f8fafc",
                                borderRadius: 8,
                                border: "1px solid #e2e8f0"
                              }}
                            >
                              <h5 style={{ margin: "0 0 8px", fontSize: 14 }}>Schedule progress (manual)</h5>
                              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569" }}>
                                <strong>Steps completed:</strong>{" "}
                                {memberScheduleProgress[user.email]!.completedScheduleNights}
                                {" · "}
                                <strong>Next step:</strong> #{memberScheduleProgress[user.email]!.currentNight}
                                {memberScheduleProgress[user.email]!.scheduleStartedAt ? (
                                  <>
                                    {" "}
                                    · <strong>Rotation anchor (UTC):</strong>{" "}
                                    {String(memberScheduleProgress[user.email]!.scheduleStartedAt).slice(0, 10)}
                                  </>
                                ) : null}
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  alignItems: "center"
                                }}
                              >
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  style={{ fontSize: 13, padding: "6px 12px" }}
                                  title="Subtract one completed step"
                                  disabled={!!memberScheduleSaving[user.email]}
                                  onClick={() =>
                                    void saveMemberScheduleProgress(
                                      user.email,
                                      memberScheduleProgress[user.email]!.completedScheduleNights - 1
                                    )
                                  }
                                >
                                  −1 step
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  style={{ fontSize: 13, padding: "6px 12px" }}
                                  title="Add one completed step"
                                  disabled={!!memberScheduleSaving[user.email]}
                                  onClick={() =>
                                    void saveMemberScheduleProgress(
                                      user.email,
                                      memberScheduleProgress[user.email]!.completedScheduleNights + 1
                                    )
                                  }
                                >
                                  +1 step
                                </button>
                                <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                  Set completed steps (0–366)
                                  <input
                                    type="number"
                                    min={0}
                                    max={366}
                                    style={{ width: 72, padding: 6, borderRadius: 6, border: "1px solid #cbd5e1" }}
                                    value={memberScheduleDraft[user.email] ?? ""}
                                    onChange={(e) =>
                                      setMemberScheduleDraft((prev) => ({
                                        ...prev,
                                        [user.email]: e.target.value
                                      }))
                                    }
                                  />
                                </label>
                                <button
                                  type="button"
                                  className="button"
                                  style={{ fontSize: 13, padding: "6px 12px" }}
                                  disabled={!!memberScheduleSaving[user.email]}
                                  onClick={() => {
                                    const raw = memberScheduleDraft[user.email] ?? "0";
                                    const n = parseInt(raw, 10);
                                    if (Number.isNaN(n)) {
                                      setStatus("Enter a number between 0 and 366 for completed steps.");
                                      return;
                                    }
                                    void saveMemberScheduleProgress(user.email, n);
                                  }}
                                >
                                  {memberScheduleSaving[user.email] ? "Saving…" : "Apply"}
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  style={{ fontSize: 13, padding: "6px 12px" }}
                                  title="Clears steps completed and rotation anchor; bumps global initial tracks to 4 if still low"
                                  disabled={
                                    !!memberScheduleSaving[user.email] ||
                                    !!memberScheduleResetting[user.email]
                                  }
                                  onClick={() => void resetMemberScheduleForInternalTesting(user.email)}
                                >
                                  {memberScheduleResetting[user.email]
                                    ? "Resetting…"
                                    : "Reset for internal testing"}
                                </button>
                              </div>
                              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                                Each main audio in the rotation is one step; order always moves forward whether the
                                member plays 1 or 2 audios per night. This updates stored step count only — not goals,
                                audios-per-night setting, or rotation start date.
                              </p>
                              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
                                <strong>Reset for internal testing</strong> clears progress and the rotation anchor
                                (they show as audio 1 again), and sets global Playback initial tracks to{" "}
                                <strong>4</strong> if the database still has{" "}
                                <strong>3</strong>.{" "}
                                {effectiveTier === "platinum_managed" ? (
                                  <>
                                    For <strong>Platinum Managed</strong>, build at least{" "}
                                    <strong>three rotation steps</strong> in <strong>Rotation order</strong> below
                                    (three assigned audios in the list, plus T-18/CGMR every 4th main play). Goals are
                                    not used.
                                  </>
                                ) : (
                                  <>
                                    For <strong>Gold</strong>, they still need at least{" "}
                                    <strong>three selected goals</strong> for three goal audios plus the T-18/CGMR
                                    cadence.
                                  </>
                                )}
                              </p>
                            </div>
                          )}
                          {displayedActivity.length > 0 ? (
                            <div style={{ overflowX: "auto", marginBottom: 16 }}>
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 13
                                }}
                              >
                                <thead>
                                  <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                                    <th style={{ padding: "8px 6px", color: "#64748b" }}>When</th>
                                    <th style={{ padding: "8px 6px", color: "#64748b" }}>What</th>
                                    <th style={{ padding: "8px 6px", color: "#64748b" }}>Audio</th>
                                    <th style={{ padding: "8px 6px", color: "#64748b" }}>Detail</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {displayedActivity.map((row: MemberActivityRow) => {
                                    const nonlinear = activityDetailsNonLinearPlayback(row.details);
                                    const gapDiag =
                                      row.action === "session_gap" &&
                                      String(row.details || "").includes("Diag:");
                                    return (
                                    <tr
                                      key={row.id}
                                      style={{
                                        borderBottom: "1px solid #f3f4f6",
                                        ...(nonlinear
                                          ? { backgroundColor: "#fef2f2" }
                                          : gapDiag
                                            ? { backgroundColor: "#fffbeb" }
                                            : {})
                                      }}
                                    >
                                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap", color: "#374151" }}>
                                        {formatActivityTime(row.createdAt)}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 6px",
                                          color: nonlinear || gapDiag ? "#b45309" : "#111827"
                                        }}
                                      >
                                        {formatActivityAction(row.action)}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 6px",
                                          color: nonlinear ? "#b91c1c" : gapDiag ? "#b45309" : "#111827",
                                          wordBreak: "break-word",
                                          maxWidth: 220,
                                          fontWeight:
                                            row.action === "played_audio" ||
                                            row.action === "audio_playback_outcome"
                                              ? 500
                                              : 400
                                        }}
                                      >
                                        {row.action === "played_audio" ||
                                        row.action === "audio_playback_outcome"
                                          ? playedAudioTitleForAdminCell(row.action, row.details) || "—"
                                          : row.action === "session_gap"
                                            ? "Gap / schedule"
                                            : "—"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 6px",
                                          color: nonlinear ? "#b91c1c" : gapDiag ? "#92400e" : "#4b5563",
                                          wordBreak: "break-word",
                                          maxWidth: 260
                                        }}
                                      >
                                        {formatActivityDetails(row.action, row.details)}
                                      </td>
                                    </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : rawActivity.length > 0 && filteredActivity.length === 0 ? (
                            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>
                              No entries match this filter. Try <strong>All activity</strong> or another filter.
                            </p>
                          ) : (
                            <p
                              style={{
                                color: memberActivityError[user.email] ? "#b91c1c" : "#94a3b8",
                                fontSize: 13,
                                marginBottom: 16
                              }}
                            >
                              {memberActivityLoading[user.email]
                                ? "Loading activity…"
                                : memberActivityError[user.email]
                                  ? memberActivityError[user.email]
                                  : "No activity logged yet for this member (they need to sign in after this feature ships)."}
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "membership"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "membership")}
                        onClick={() => toggleMemberSection(user.email, "membership")}
                      >
                        {memberSectionIsOpen(user.email, "membership") ? "▼" : "▶"} Membership Status
                      </button>
                      {memberSectionIsOpen(user.email, "membership") && (
                        <div className="card" style={{ marginTop: 8 }}>
                        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                          Current password cannot be shown (one-way hash). Enter a new password (6+ characters) and click
                          Save to reset member login—you can update password alone without changing tier or goals.
                        </p>
                        <p style={{ fontSize: 12, color: "#0f766e", marginBottom: 8 }}>
                          <strong>Existing Stripe members:</strong> paste Customer ID (<code>cus_…</code>) and Subscription ID (<code>sub_…</code>) from the Stripe Dashboard before they sign up or pay again. That links their current billing and prevents a second subscription.
                        </p>
                        {renderMemberPaymentLinkBlock(user)}
                        <input
                          style={inputStyle}
                          placeholder="Stripe Customer ID (cus_...) — from Stripe Dashboard"
                          value={
                            stripeEdits[user.email]?.stripeCustomerId ??
                            user.stripeCustomerId ??
                            ""
                          }
                          onChange={(event) =>
                            setStripeEdits({
                              ...stripeEdits,
                              [user.email]: {
                                ...stripeEdits[user.email],
                                stripeCustomerId: event.target.value
                              }
                            })
                          }
                        />
                        <input
                          style={inputStyle}
                          placeholder="Stripe Subscription ID (sub_...) — active subscription"
                          value={
                            stripeEdits[user.email]?.stripeSubscriptionId ??
                            user.stripeSubscriptionId ??
                            ""
                          }
                          onChange={(event) =>
                            setStripeEdits({
                              ...stripeEdits,
                              [user.email]: {
                                ...stripeEdits[user.email],
                                stripeSubscriptionId: event.target.value
                              }
                            })
                          }
                        />
                        <select
                          style={inputStyle}
                          value={
                            updates[user.email]?.subscriptionTier ||
                            user.subscriptionTier ||
                            "platinum"
                          }
                          onChange={(event) =>
                            setUpdates({
                              ...updates,
                              [user.email]: {
                                ...updates[user.email],
                                subscriptionTier: event.target
                                  .value as UserRow["subscriptionTier"]
                              }
                            })
                          }
                        >
                          <option value="platinum">Gold Member ($19.95/mo)</option>
                          <option value="platinum_managed">Platinum Managed Member ($39.95/mo)</option>
                        </select>
                        <select
                          style={inputStyle}
                          value={
                            updates[user.email]?.subscriptionStatus ||
                            user.subscriptionStatus ||
                            "inactive"
                          }
                          onChange={(event) =>
                            setUpdates({
                              ...updates,
                              [user.email]: {
                                ...updates[user.email],
                                subscriptionStatus: event.target
                                  .value as UserRow["subscriptionStatus"]
                              }
                            })
                          }
                        >
                          <option value="inactive">Inactive</option>
                          <option value="active">Active</option>
                          <option value="past_due">Past Due</option>
                          <option value="canceled">Canceled</option>
                        </select>
                        <select
                          style={inputStyle}
                          value={updates[user.email]?.playsPerNight || user.playsPerNight || 2}
                          onChange={(event) =>
                            setUpdates({
                              ...updates,
                              [user.email]: {
                                ...updates[user.email],
                                playsPerNight: Number(event.target.value) as 1 | 2
                              }
                            })
                          }
                        >
                          <option value={2}>2 audios per night</option>
                          <option value={1}>1 audio per step</option>
                        </select>
                        <label htmlFor={`member-pw-${user.email}`} className="sr-only">
                          New password for {user.email}
                        </label>
                        <input
                          id={`member-pw-${user.email}`}
                          style={inputStyle}
                          placeholder="New member password (optional, min 6 characters)"
                          type="password"
                          autoComplete="new-password"
                          value={resetPasswords[user.email] || ""}
                          onChange={(event) =>
                            setResetPasswords({
                              ...resetPasswords,
                              [user.email]: event.target.value
                            })
                          }
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                          <button className="button" onClick={() => updateUser(user.email)}>
                            Save
                          </button>
                          {user.subscriptionStatus === "active" ? (
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => setMemberStatus(user.email, "inactive")}
                            >
                              Make Inactive
                            </button>
                          ) : (
                            <button
                              className="button button-secondary"
                              type="button"
                              onClick={() => setMemberStatus(user.email, "active")}
                            >
                              Make Active
                            </button>
                          )}
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => deleteUser(user.email)}
                            style={{ color: "#b91c1c" }}
                          >
                            Delete Member
                          </button>
                        </div>
                          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                          <strong>Gold Member:</strong> $19.95/mo — Regular membership with goal-based scheduling.<br />
                          <strong>Platinum Managed Member:</strong> $39.95/mo — Managed membership with admin-assigned audios (no goals).
                        </p>
                        <p style={{ fontSize: 12, margin: 0 }}>
                          Current tier:{" "}
                          <strong>
                            {effectiveTier === "platinum_managed"
                              ? "Platinum Managed Member ($39.95/mo)"
                              : "Gold Member ($19.95/mo)"}
                          </strong>
                          {memberHasStripeOnFile(user)
                            ? " — Stripe billing is on file (see Membership Status)."
                            : " — no Stripe billing yet. Use Payment Link in Membership Status (or on the collapsed member row)."}
                        </p>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "addFile"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "addFile")}
                        onClick={() => toggleMemberSection(user.email, "addFile")}
                      >
                        {memberSectionIsOpen(user.email, "addFile") ? "▼" : "▶"} Add File
                      </button>
                      {memberSectionIsOpen(user.email, "addFile") && (
                        <div className="card" style={{ marginTop: 8 }}>
                        <label style={{ fontSize: 12 }}>Personalized audio (CGMR)</label>
                        {(() => {
                          const emailLower = user.email.toLowerCase();
                          const assigned = library.filter((item) =>
                            (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower)
                          );
                          const order = rotationOrder;
                          const isManagedSec4 = effectiveTier === "platinum_managed";
                          const byIdLookup = new Map(library.map((item) => [item.id, item]));
                          /** Managed rotation may repeat the same id; expand order into rows (matches schedule). */
                          const assignedOrdered =
                            isManagedSec4 && order.length > 0
                              ? order
                                  .map((id) => byIdLookup.get(id))
                                  .filter((item): item is LibraryItem => item != null)
                              : assigned.slice().sort((a, b) => {
                                  const indexA = order.indexOf(a.id);
                                  const indexB = order.indexOf(b.id);
                                  if (indexA === -1 && indexB === -1) return 0;
                                  if (indexA === -1) return 1;
                                  if (indexB === -1) return -1;
                                  return indexA - indexB;
                                });
                          const hasCat = (item: LibraryItem, cat: string) =>
                            (item.categories || []).some((c) => c.toLowerCase() === cat.toLowerCase());
                          /** Personalized CGMR only — matches member schedule API (not first assigned track). */
                          const cgmrTrack = assignedOrdered.find((item) => hasCat(item, "cgmr")) ?? null;
                          const pickByCode = (code: string) => {
                            const upper = code.trim().toUpperCase();
                            if (!upper) return null;
                            return (
                              library.find(
                                (item) =>
                                  (item.skuCode || "").toUpperCase().includes(upper) ||
                                  (item.title || "").toUpperCase().includes(upper)
                              ) ?? null
                            );
                          };
                          // Same default special track as buildSchedulePreview for platinum / platinum_managed
                          const tier = user.subscriptionTier || "platinum";
                          const cgmrGlobal = playbackSettings?.cgmrTrackId?.trim()
                            ? pickByCode(playbackSettings.cgmrTrackId)
                            : null;
                          const fallbackGlobal = playbackSettings?.fallbackTrackId?.trim()
                            ? pickByCode(playbackSettings.fallbackTrackId)
                            : null;
                          const defaultSpecialTrack =
                            tier === "platinum" || tier === "platinum_managed"
                              ? cgmrGlobal || fallbackGlobal
                              : fallbackGlobal || cgmrGlobal;
                          // For non-managed (Platinum) members, show default fallback (e.g. T-18) in the list so it's visible
                          const isNonManaged = effectiveTier !== "platinum_managed";
                          const fallbackCode = (playbackSettings?.fallbackTrackId || "T-18").trim().toUpperCase();
                          const fallbackItem = isNonManaged && fallbackCode
                            ? library.find(
                                (item) =>
                                  (item.skuCode || "").toUpperCase().includes(fallbackCode) ||
                                  (item.title || "").toUpperCase().includes(fallbackCode)
                              ) ?? null
                            : null;
                          const displayList =
                            fallbackItem && isNonManaged
                              ? [fallbackItem, ...assignedOrdered.filter((a) => a.id !== fallbackItem.id)]
                              : assignedOrdered;
                          return (
                            <div style={{ marginTop: 8, marginBottom: 8, padding: 10, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                              <strong style={{ fontSize: 12 }}>Assigned to this member (in selection order):</strong>{" "}
                              {displayList.length === 0 ? (
                                <span style={{ color: "#6b7280" }}>None. Their schedule will use T-18 for the CGMR slot.</span>
                              ) : (
                                <>
                                  <div style={{ marginTop: 6 }}>
                                    {displayList.map((item, index) => {
                                      const isDefault = isNonManaged && fallbackItem?.id === item.id;
                                      return (
                                        <div
                                          key={`assign-row-${user.email}-${index}-${item.id}`}
                                          style={{ marginBottom: 4, fontSize: 12 }}
                                        >
                                          <strong>{index + 1}.</strong> {item.skuCode || item.title || "No SKU/Title"}
                                          {isDefault && (
                                            <span style={{ color: "#047857", marginLeft: 6 }}>
                                              (default – used for CGMR slot)
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div style={{ marginTop: 6, fontSize: 12, color: "#047857" }}>
                                    <strong>Schedule uses as CGMR slot:</strong>{" "}
                                    {cgmrTrack
                                      ? `${cgmrTrack.skuCode ? cgmrTrack.skuCode + " – " : ""}${cgmrTrack.title}`
                                      : fallbackItem
                                        ? `${fallbackItem.skuCode || fallbackItem.title} (default)`
                                        : defaultSpecialTrack
                                          ? `${defaultSpecialTrack.skuCode ? defaultSpecialTrack.skuCode + " – " : ""}${defaultSpecialTrack.title} (global playback)`
                                          : `${playbackSettings?.fallbackTrackId || "T-18"} (global playback)`}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                          Assign custom audios for this member. Upload a file (or paste an Audio URL), then add title and description and click Add Personalized Audio. The schedule uses the CGMR track above; if none is assigned, T-18 is used.
                        </p>
                        <div className="grid" style={{ gap: 8, marginBottom: 12 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span style={{ fontSize: 12 }}>Upload file (optional, up to 100 MB)</span>
                              <input
                                type="file"
                                accept="audio/*"
                                id={`personalized-audio-file-${user.email}`}
                                style={inputStyle}
                                disabled={!!personalizedAudioUploading[user.email]}
                              />
                            </label>
                            <button
                              type="button"
                              className="button button-secondary"
                              disabled={!!personalizedAudioUploading[user.email]}
                              onClick={() => {
                                const el = document.getElementById(`personalized-audio-file-${user.email}`) as HTMLInputElement | null;
                                uploadPersonalizedAudioFile(user.email, el);
                              }}
                            >
                              {personalizedAudioUploading[user.email] ? "Uploading…" : "Upload file"}
                            </button>
                          </div>
                          <div
                            role="status"
                            aria-live="polite"
                            style={{
                              padding: 10,
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                              backgroundColor: personalizedAudioUploading[user.email]
                                ? "#fef3c7"
                                : uploadStatus[user.email]
                                  ? /failed|timed out|error|Choose a file/i.test(uploadStatus[user.email])
                                    ? "#fef2f2"
                                    : "#f0fdf4"
                                  : "#f9fafb",
                              color: uploadStatus[user.email] && /failed|timed out|error|Choose a file/i.test(uploadStatus[user.email])
                                ? "#b91c1c"
                                : "#111827",
                              fontSize: 13,
                              minHeight: 44
                            }}
                          >
                            {personalizedAudioUploading[user.email]
                              ? "Uploading… (large files supported; success or error will appear here)"
                              : uploadStatus[user.email] || "Upload result will appear here."}
                          </div>
                          <input
                            style={inputStyle}
                            placeholder="CGMR title"
                            value={getAudioDraft(user.email).title}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { title: event.target.value })
                            }
                          />
                          <input
                            style={inputStyle}
                            placeholder="CGMR description"
                            value={getAudioDraft(user.email).description}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { description: event.target.value })
                            }
                          />
                          <div>
                            <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                              Audio URL (required — filled automatically after upload)
                            </label>
                            <input
                              style={inputStyle}
                              placeholder="Upload a file above or paste URL"
                              value={getAudioDraft(user.email).audioUrl}
                              onChange={(event) =>
                                updateAudioDraft(user.email, { audioUrl: event.target.value })
                              }
                            />
                          </div>
                          <input
                            style={inputStyle}
                            placeholder="Cover URL (optional)"
                            value={getAudioDraft(user.email).coverUrl}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { coverUrl: event.target.value })
                            }
                          />
                          <input
                            style={inputStyle}
                            placeholder="SKU (optional)"
                            value={getAudioDraft(user.email).skuCode}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { skuCode: event.target.value })
                            }
                          />
                          <label style={{ fontSize: 12 }}>
                            Categories (comma-separated) — include <strong>CGMR</strong> so the schedule uses this as the member&apos;s CGMR slot
                          </label>
                          <input
                            style={inputStyle}
                            placeholder="e.g. CGMR"
                            value={getAudioDraft(user.email).categories}
                            onChange={(event) =>
                              updateAudioDraft(user.email, { categories: event.target.value })
                            }
                          />
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => addPersonalizedAudio(user.email)}
                          >
                            Add Personalized Audio
                          </button>
                        </div>
                        </div>
                      )}
                      {effectiveTier !== "platinum_managed" && (
                        <>
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "scheduledAudios"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "scheduledAudios")}
                        onClick={() => toggleMemberSection(user.email, "scheduledAudios")}
                      >
                        {memberSectionIsOpen(user.email, "scheduledAudios") ? "▼" : "▶"} Scheduled Audios
                      </button>
                      {memberSectionIsOpen(user.email, "scheduledAudios") && (
                        <div className="card" style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                            <strong>Gold:</strong> schedule audios come from assigned goals. Open
                            <strong> Goals</strong> below to choose what plays.
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "goals"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "goals")}
                        onClick={() => toggleMemberSection(user.email, "goals")}
                      >
                        {memberSectionIsOpen(user.email, "goals") ? "▼" : "▶"} Goals{user.goalIds?.length ? ` — ${user.goalIds.length} selected` : ""}
                      </button>
                      {memberSectionIsOpen(user.email, "goals") && (
                        <div className="card" style={{ marginTop: 8 }}>
                            {(() => {
                              const memberGoalIds = getMemberGoalIds(user.email, user.goalIds || []);
                              const orderedGoals = memberGoalIds.map((id) => ({
                                id,
                                name:
                                  interests.find((goal) => goal.id === id)?.name || "Unknown goal"
                              }));
                              const searchTerm = (memberGoalSearch[user.email] || "").trim().toLowerCase();
                              const filteredGoals = searchTerm
                                ? sortedInterests.filter((interest) =>
                                    interest.name.toLowerCase().includes(searchTerm)
                                  )
                                : sortedInterests;
                              return (
                                <>
                                  <div className="card" style={{ marginTop: 8 }}>
                                    <h5 style={{ marginTop: 0, marginBottom: 8 }}>
                                      Selected goals (saved order)
                                    </h5>
                                    {orderedGoals.length === 0 ? (
                                      <p style={{ color: "#6b7280", margin: 0, fontSize: 13 }}>
                                        No goals selected yet.
                                      </p>
                                    ) : (
                                      <div className="goal-stack">
                                        {orderedGoals.map((goal, index) => (
                                          <div
                                            key={goal.id}
                                            className="goal-item"
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 10
                                            }}
                                          >
                                            <strong style={{ minWidth: 24 }}>{index + 1}.</strong>
                                            <span style={{ flex: 1 }}>{goal.name}</span>
                                            <button
                                              className="button button-secondary"
                                              type="button"
                                              onClick={() =>
                                                moveMemberGoal(
                                                  user.email,
                                                  user.goalIds || [],
                                                  index,
                                                  index - 1
                                                )
                                              }
                                              disabled={index === 0}
                                              style={{ padding: "6px 10px", fontSize: 12 }}
                                            >
                                              Up
                                            </button>
                                            <button
                                              className="button button-secondary"
                                              type="button"
                                              onClick={() =>
                                                moveMemberGoal(
                                                  user.email,
                                                  user.goalIds || [],
                                                  index,
                                                  index + 1
                                                )
                                              }
                                              disabled={index === orderedGoals.length - 1}
                                              style={{ padding: "6px 10px", fontSize: 12 }}
                                            >
                                              Down
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="card" style={{ marginTop: 12 }}>
                                    <h5 style={{ marginTop: 0, marginBottom: 8 }}>Find goals</h5>
                                    <input
                                      style={inputStyle}
                                      placeholder="Search goals"
                                      value={memberGoalSearch[user.email] || ""}
                                      onChange={(event) =>
                                        setMemberGoalSearch((prev) => ({
                                          ...prev,
                                          [user.email]: event.target.value
                                        }))
                                      }
                                    />
                                    <div
                                      className="card goal-see-all-list"
                                      style={{ marginTop: 12 }}
                                    >
                                      <div className="goal-all-scroll">
                                        {filteredGoals.map((interest) => (
                                          <label key={interest.id} className="goal-all-row">
                                            <input
                                              type="checkbox"
                                              checked={memberGoalIds.includes(interest.id)}
                                              disabled={
                                                !memberGoalIds.includes(interest.id) &&
                                                memberGoalIds.length >= 10
                                              }
                                              onChange={() =>
                                                toggleMemberGoal(
                                                  user.email,
                                                  user.goalIds || [],
                                                  interest.id
                                                )
                                              }
                                            />
                                            <span className="goal-all-name">{interest.name}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                            <div style={{ marginTop: 12 }}>
                              <label style={{ fontSize: 12 }}>Current audios play list</label>
                              <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                                Up to 10 audios in this member&apos;s rotation from assigned goals.
                              </p>
                              <div className="goal-list">
                                {(() => {
                                  const goalAudios = getDerivedAudios(
                                    getMemberGoalIds(user.email, user.goalIds || [])
                                  ).slice(0, 10);
                                  return goalAudios.length === 0 ? (
                                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                                      No audios in play list yet.
                                    </span>
                                  ) : (
                                    goalAudios.map((item) => (
                                      <div
                                        key={item.id}
                                        className="goal-item"
                                        style={{ display: "flex", gap: 8, alignItems: "center" }}
                                      >
                                        <span style={{ flex: 1 }}>
                                          {item.skuCode ? `${item.skuCode} – ` : ""}
                                          {item.title}
                                        </span>
                                      </div>
                                    ))
                                  );
                                })()}
                              </div>
                            </div>
                        </div>
                      )}
                        </>
                      )}
                      {effectiveTier === "platinum_managed" && (
                        <>
                      <button
                        type="button"
                        className={adminSectionToggleClass(memberSectionIsOpen(user.email, "rotation"), true)}
                        aria-expanded={memberSectionIsOpen(user.email, "rotation")}
                        onClick={() => toggleMemberSection(user.email, "rotation")}
                      >
                        {memberSectionIsOpen(user.email, "rotation") ? "▼" : "▶"} Rotation Order{rotationOrder.length ? ` — ${rotationOrder.length} step${rotationOrder.length === 1 ? "" : "s"}` : ""}
                      </button>
                      {memberSectionIsOpen(user.email, "rotation") && (
                        <div className="card" style={{ marginTop: 8 }}>
                          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                            Build the night-by-night list below. Changes save automatically.
                          </p>
                        {effectiveTier === "platinum_managed" ? (
                          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                            Build the night-by-night list in <strong>Rotation order</strong> below — pick a recording and{" "}
                            <strong>Add at end</strong> (the dropdown resets each time; same recording can appear multiple
                            times). Use <strong>Up / Down</strong> to place each step. Up to {MANAGED_MAX_SLOTS_PER_AUDIO}×
                            per recording (no fixed cap on total steps). Changes save automatically.
                          </p>
                        ) : (
                          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                            <strong>Gold:</strong> schedule audios come from assigned goals in <strong>Goals</strong>.
                            Use the goals panel to choose what plays — no manual audio checklist is needed.
                          </p>
                        )}
                        {effectiveTier === "platinum_managed" && (
                          <div
                            className="card"
                            style={{
                              marginBottom: 12,
                              padding: 12,
                              background: "#fffbeb",
                              border: "1px solid #fcd34d"
                            }}
                          >
                            <strong style={{ fontSize: 13, color: "#78350f" }}>
                              Admin checklist — Platinum Managed rotation
                            </strong>
                            <ol
                              style={{
                                margin: "8px 0 0 0",
                                paddingLeft: 20,
                                fontSize: 12,
                                color: "#78350f",
                                lineHeight: 1.55
                              }}
                            >
                              <li>
                                After <strong>View / Edit member</strong>, wait until the blue status line under{" "}
                                <strong>Rotation order</strong> clears (saved order finished loading). Buttons stay disabled
                                until then so nothing overwrites your edits.
                              </li>
                              <li>
                                Set <strong>Platinum Managed Member</strong> under Membership Status when this member should use this
                                rotation; saves use that dropdown value even if you have not clicked <strong>Save</strong> on
                                the member row yet.
                              </li>
                              <li>
                                Add recordings using <strong>Add at end of rotation</strong> (dropdown + button). The dropdown
                                resets after each add — choose the recording again for another step (same title allowed, max{" "}
                                {MANAGED_MAX_SLOTS_PER_AUDIO}× per recording). Use <strong>Up / Down</strong> to place each step.
                              </li>
                              <li>
                                Reorder with <strong>Up / Down</strong> or remove a single step with <strong>Remove</strong>.
                                Each change saves to the server automatically.
                              </li>
                            </ol>
                          </div>
                        )}
                        {effectiveTier === "platinum_managed" && (
                          <div
                            className="card"
                            style={{
                              marginBottom: 16,
                              padding: 12,
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <strong style={{ fontSize: 14 }}>Rotation order (live schedule)</strong>
                            <p style={{ fontSize: 12, color: "#64748b", marginTop: 6, marginBottom: 8 }}>
                              This numbered list is the member&apos;s schedule (same recording may appear more than once).
                              Use <strong>Add at end of rotation</strong> to append a step, then <strong>Up / Down</strong> to
                              reorder. Each add, move, or remove saves automatically.
                            </p>
                            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 0, marginBottom: 8 }}>
                              {rotationOrder.length} step{rotationOrder.length === 1 ? "" : "s"} · each recording max{" "}
                              {MANAGED_MAX_SLOTS_PER_AUDIO}× in this rotation
                            </p>
                            {audioHydrating ? (
                              <p
                                role="status"
                                aria-label="Loading saved rotation from server"
                                style={{ fontSize: 12, color: "#2563eb", marginTop: 4, marginBottom: 10 }}
                              >
                                Loading saved rotation from server… Edit controls unlock in a moment.
                              </p>
                            ) : null}
                            {rotationOrder.length === 0 ? (
                              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4, marginBottom: 10 }}>
                                No steps yet — use <strong>Add at end of rotation</strong> below to choose a recording and
                                append it.
                              </p>
                            ) : (
                              <ol
                                ref={(el) => {
                                  managedRotationOlRefs.current[audioKey] = el;
                                }}
                                style={{
                                  marginTop: 4,
                                  marginLeft: 0,
                                  paddingLeft: 0,
                                  fontSize: 13,
                                  listStyleType: "none"
                                }}
                              >
                                {rotationOrder.map((slotId, idx) => {
                                  const libItem = library.find((x) => x.id === slotId);
                                  const label =
                                    [libItem?.skuCode, libItem?.title].filter(Boolean).join(" – ") || slotId;
                                  const list = rotationOrder;
                                  return (
                                    <li
                                      key={`managed-slot-${user.email}-${idx}-${slotId}`}
                                      style={{
                                        marginBottom: 8,
                                        display: "flex",
                                        flexWrap: "wrap",
                                        alignItems: "center",
                                        gap: 8
                                      }}
                                    >
                                      <span
                                        aria-label={`Step ${idx + 1}`}
                                        title={`Night ${idx + 1}`}
                                        style={{
                                          flex: "0 0 auto",
                                          minWidth: 44,
                                          fontWeight: 700,
                                          fontVariantNumeric: "tabular-nums",
                                          color: "#15803d",
                                          fontSize: 13,
                                          alignSelf: "center"
                                        }}
                                      >
                                        #{idx + 1}
                                      </span>
                                      <span style={{ flex: "1 1 140px", minWidth: 0 }}>{label}</span>
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          flexWrap: "wrap",
                                          gap: 6,
                                          alignItems: "center"
                                        }}
                                      >
                                        <button
                                          type="button"
                                          className="button button-secondary"
                                          style={{ padding: "2px 10px", fontSize: 12 }}
                                          disabled={audioHydrating || idx === 0}
                                          aria-label={`Move ${label} earlier in rotation`}
                                          onClick={() => moveManagedSlot(user.email, idx, "up")}
                                        >
                                          Up
                                        </button>
                                        <button
                                          type="button"
                                          className="button button-secondary"
                                          style={{ padding: "2px 10px", fontSize: 12 }}
                                          disabled={audioHydrating || idx >= list.length - 1}
                                          aria-label={`Move ${label} later in rotation`}
                                          onClick={() => moveManagedSlot(user.email, idx, "down")}
                                        >
                                          Down
                                        </button>
                                        <button
                                          type="button"
                                          className="button button-secondary"
                                          style={{ padding: "2px 10px", fontSize: 12 }}
                                          disabled={audioHydrating}
                                          onClick={() => removeManagedSlotAtIndex(user.email, idx)}
                                        >
                                          Remove
                                        </button>
                                      </span>
                                    </li>
                                  );
                                })}
                              </ol>
                            )}
                            <div
                              style={{
                                marginTop: 14,
                                paddingTop: 12,
                                borderTop: "1px solid #e2e8f0"
                              }}
                            >
                              <strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                                Add at end of rotation
                              </strong>
                              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px 0" }}>
                                After each add the dropdown goes back to <strong>Choose recording…</strong> so you can pick the
                                next step (including the same recording again). The page scrolls the new row into view when the
                                browser supports it — use <strong>Up / Down</strong> to move it if needed.
                              </p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                              <select
                                aria-label="Choose audio to add at end of rotation"
                                disabled={audioHydrating}
                                value={managedRotationPicker[audioKey] ?? managedRotationPicker[user.email] ?? ""}
                                onChange={(e) =>
                                  setManagedRotationPicker((p) => ({
                                    ...p,
                                    [audioKey]: e.target.value
                                  }))
                                }
                                style={{
                                  ...inputStyle,
                                  maxWidth: 360,
                                  width: "100%",
                                  flex: "1 1 240px",
                                  opacity: audioHydrating ? 0.6 : 1
                                }}
                              >
                                <option value="">Choose recording…</option>
                                {library
                                  .slice()
                                  .sort((a, b) => {
                                    const skuA = (a.skuCode || "").trim();
                                    const skuB = (b.skuCode || "").trim();
                                    const hasSkuA = !!skuA;
                                    const hasSkuB = !!skuB;
                                    if (hasSkuA && !hasSkuB) return -1;
                                    if (!hasSkuA && hasSkuB) return 1;
                                    if (hasSkuA && hasSkuB) {
                                      return skuA.localeCompare(skuB, undefined, {
                                        numeric: true,
                                        sensitivity: "base"
                                      });
                                    }
                                    return (a.title || "").localeCompare(b.title || "");
                                  })
                                  .map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.skuCode ? `${opt.skuCode} — ` : ""}
                                      {opt.title || opt.id}
                                    </option>
                                  ))}
                              </select>
                              <button
                                type="button"
                                className="button button-secondary"
                                disabled={
                                  audioHydrating ||
                                  !(managedRotationPicker[audioKey] ?? managedRotationPicker[user.email])?.trim()
                                }
                                onClick={() => {
                                  const email = user.email;
                                  const id = (
                                    managedRotationPicker[audioKey] ?? managedRotationPicker[user.email]
                                  )?.trim();
                                  if (!id) {
                                    setStatus("Choose a recording in the dropdown before Add at end.");
                                    return;
                                  }
                                  const added = incrementManagedAudioSlot(email, id);
                                  if (added) {
                                    setManagedRotationPicker((p) => ({
                                      ...p,
                                      [audioKey]: "",
                                      ...(audioKey !== user.email.trim() ? { [user.email]: "" } : {})
                                    }));
                                    setStatus(
                                      "Added to end of rotation. Use Up / Down on that row to move it if needed."
                                    );
                                    requestAnimationFrame(() => {
                                      const last =
                                        managedRotationOlRefs.current[audioKey]?.lastElementChild ?? null;
                                      last?.scrollIntoView?.({
                                        behavior: "smooth",
                                        block: "nearest",
                                        inline: "nearest"
                                      });
                                    });
                                  }
                                }}
                              >
                                Add at end
                              </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {audioSaveStatus[user.email] && (
                          <p
                            role="status"
                            style={{ fontSize: 12, color: "#047857", marginTop: effectiveTier === "platinum_managed" ? 8 : 0 }}
                          >
                            {audioSaveStatus[user.email]}
                          </p>
                        )}
                        </div>
                      )}
                        </>
                      )}
                      </div>
                    </>
                  )}
                  {!profileOpen[user.email] && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      <button className="button" onClick={() => updateUser(user.email)}>
                        Save
                      </button>
                      {user.subscriptionStatus === "active" ? (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => setMemberStatus(user.email, "inactive")}
                        >
                          Make Inactive
                        </button>
                      ) : (
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => setMemberStatus(user.email, "active")}
                        >
                          Make Active
                        </button>
                      )}
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => deleteUser(user.email)}
                        style={{ color: "#b91c1c" }}
                      >
                        Delete Member
                      </button>
                    </div>
                  )}
                </div>
                  );
                  })}
              </div>
            )}
            </>
          )}
        </div>
    </>
  );
}
