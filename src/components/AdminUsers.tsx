"use client";

import { put } from "@vercel/blob/client";
import React, { useEffect, useMemo, useState } from "react";
import type { LibraryItem } from "@/lib/types";


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
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

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
      return "Updated session length (half/full)";
    case "played_audio":
      return "Played audio";
    case "admin_schedule_adjusted":
      return "Admin: schedule progress";
    default:
      return action.replace(/_/g, " ");
  }
}

/** Track / recording title for activity table (from `played_audio` details). */
function formatPlayedAudioTitle(action: string, details: string | null): string {
  if (action !== "played_audio" || !details) return "";
  const d = details.trim();
  const lib = /^Library — (.+)$/.exec(d);
  if (lib) return lib[1].trim();
  if (/^Play Options — Preparation audio$/i.test(d)) return "Preparation audio";
  const po = /^Play Options — (First|Second):\s*(.+)$/i.exec(d);
  if (po) return po[2].trim();
  return d;
}

/** Where they played (library vs Play Options, first/second/prep). */
function formatPlayedAudioContext(action: string, details: string | null): string {
  if (action !== "played_audio" || !details) return "";
  const d = details.trim();
  if (d.startsWith("Library —")) return "Audio library";
  if (/^Play Options — Preparation audio$/i.test(d)) return "Play Options · preparation";
  const po = /^Play Options — (First|Second):/i.exec(d);
  if (po) return `Play Options · ${po[1].toLowerCase()} recording`;
  if (d.startsWith("Play Options —")) return "Play Options";
  return "";
}

function formatActivityDetails(action: string, details: string | null): string {
  if (!details) return "—";
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
    return new Date(iso).toLocaleString(undefined, {
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

/** One “full session” = first + second main audio. Full-session mode: 1 schedule night = 1 full session. Half-session mode: 2 steps = 1 full session. */
function fullSessionsDecimal(completedScheduleSteps: number, playsPerNight: 1 | 2): number {
  if (playsPerNight === 2) {
    return completedScheduleSteps;
  }
  return completedScheduleSteps / 2;
}

function formatFullSessionsLabel(completedScheduleSteps: number, playsPerNight: 1 | 2): string {
  const v = fullSessionsDecimal(completedScheduleSteps, playsPerNight);
  if (playsPerNight === 2) {
    return String(completedScheduleSteps);
  }
  if (completedScheduleSteps === 0) return "0";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
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
  const [profileOpen, setProfileOpen] = useState<Record<string, boolean>>({});
  const [goalsSectionOpen, setGoalsSectionOpen] = useState<Record<string, boolean>>({});
  const [profileDrafts, setProfileDrafts] = useState<Record<string, ProfileDraft>>({});
  const [audioAssignments, setAudioAssignments] = useState<Record<string, Record<string, boolean>>>({});
  const [audioOrder, setAudioOrder] = useState<Record<string, string[]>>({});
  const [audioSaveStatus, setAudioSaveStatus] = useState<Record<string, string>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});
  const [personalizedAudioUploading, setPersonalizedAudioUploading] = useState<Record<string, boolean>>({});
  const [newAudioDrafts, setNewAudioDrafts] = useState<Record<string, NewAudioDraft>>({});
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberTierFilter, setMemberTierFilter] = useState<"all" | "platinum" | "platinum_managed">("all");
  const [memberActivity, setMemberActivity] = useState<Record<string, MemberActivityRow[]>>({});
  const [memberActivityLoading, setMemberActivityLoading] = useState<Record<string, boolean>>({});
  const [memberActivityError, setMemberActivityError] = useState<Record<string, string | null>>({});
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
  const [memberScheduleSaving, setMemberScheduleSaving] = useState<Record<string, boolean>>({});
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

  const updateUser = async (email: string) => {
    const user = users.find((u) => u.email === email);
    if (!user) {
      return;
    }
    const update = updates[email];
    const newPassword = (resetPasswords[email] || "").trim();
    const hasPasswordChange = newPassword.length >= 6;
    if (!update && !hasPasswordChange) {
      setStatus("Change tier/status or enter a new password (6+ characters), then Save.");
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
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      setStatus(hasPasswordChange ? "Password updated (and membership saved)." : "User updated.");
      setResetPasswords((prev) => ({ ...prev, [email]: "" }));
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

  const loadMemberActivity = async (email: string) => {
    setMemberActivityLoading((prev) => ({ ...prev, [email]: true }));
    setMemberActivityError((prev) => ({ ...prev, [email]: null }));
    try {
      const res = await fetch(
        `/api/admin/member-activity?email=${encodeURIComponent(email)}`,
        { credentials: "include" }
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
        const ppn = users.find((u) => u.email === email);
        const plays = memberPlaysPerNight(ppn ?? { playsPerNight: 2 });
        const sessionsLabel = formatFullSessionsLabel(clamped, plays);
        const nextStep = Math.min(366, Math.max(1, clamped + 1));
        setStatus(
          plays === 1
            ? `Schedule updated for ${email}: ${clamped} schedule step(s) → ${sessionsLabel} full session(s) complete (next step #${nextStep}).`
            : `Schedule updated for ${email}: ${clamped} schedule night(s) → ${sessionsLabel} full session(s) complete (next night #${nextStep}).`
        );
      }
      await loadMemberActivity(email);
    } finally {
      setMemberScheduleSaving((prev) => ({ ...prev, [email]: false }));
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

  const toggleAudioAssignment = (email: string, itemId: string) => {
    const current = audioAssignments[email]?.[itemId] ?? false;
    const newValue = !current;
    
    setAudioAssignments((prev) => ({
      ...prev,
      [email]: {
        ...(prev[email] || {}),
        [itemId]: newValue
      }
    }));

    // Update order: if checking, add to end; if unchecking, remove
    setAudioOrder((prev) => {
      const currentOrder = prev[email] || [];
      if (newValue) {
        // Add to end if not already present
        if (!currentOrder.includes(itemId)) {
          return {
            ...prev,
            [email]: [...currentOrder, itemId]
          };
        }
      } else {
        // Remove from order
        return {
          ...prev,
          [email]: currentOrder.filter((id) => id !== itemId)
        };
      }
      return prev;
    });
  };

  const updateAudioOrder = (email: string, itemId: string, orderValue: string) => {
    const parsed = Number(orderValue);
    if (!orderValue || Number.isNaN(parsed) || parsed <= 0) {
      // Remove from order but keep assignment
      setAudioOrder((prev) => {
        const currentOrder = prev[email] || [];
        return {
          ...prev,
          [email]: currentOrder.filter((id) => id !== itemId)
        };
      });
      return;
    }
    setAudioOrder((prev) => {
      const currentOrder = prev[email] || [];
      const without = currentOrder.filter((id) => id !== itemId);
      const next = [...without];
      next.splice(Math.min(parsed - 1, next.length), 0, itemId);
      return {
        ...prev,
        [email]: next
      };
    });
  };

  const getAudioOrder = (email: string, itemId: string, fallback: string[]) => {
    const list = audioOrder[email] || fallback;
    const index = list.indexOf(itemId);
    return index === -1 ? "" : String(index + 1);
  };

  const saveAudioAssignments = async (email: string) => {
    const current = audioAssignments[email] || buildAudioAssignment(email);
    const emailLower = email.toLowerCase();
    const updates = library.filter((item) => {
      const shouldHave = !!current[item.id];
      const hasEmail =
        item.allowedUserEmails?.some((allowed) => allowed.toLowerCase() === emailLower) ||
        false;
      return shouldHave !== hasEmail;
    });
    if (updates.length === 0 && !audioOrder[email]) {
      setAudioSaveStatus((prev) => ({ ...prev, [email]: "No changes to save." }));
      return;
    }
    
    // Save assignments
    await Promise.all(
      updates.map((item) => {
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

    // Save order
    const order = audioOrder[email] || [];
    if (order.length > 0) {
      const orderResponse = await fetch("/api/admin/member-audio-order", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          order
        })
      });
      if (!orderResponse.ok) {
        setAudioSaveStatus((prev) => ({
          ...prev,
          [email]: `Saved ${updates.length} assignment(s), but order save failed.`
        }));
        await load();
        return;
      }
    }

    setAudioSaveStatus((prev) => ({
      ...prev,
      [email]: `Saved ${updates.length} personalized audio update(s)${order.length > 0 ? ` and order` : ""}.`
    }));
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

  const getDerivedAudios = (goalIds: string[]) => {
    if (!goalIds || goalIds.length === 0) {
      return [];
    }
    return library.filter((item) => item.interestIds?.some((id) => goalIds.includes(id)));
  };

  const updateOrderedGoals = (email: string, goalId: string, orderValue: string) => {
    const parsed = Number(orderValue);
    if (!orderValue || Number.isNaN(parsed) || parsed <= 0) {
      setUpdates((prev) => {
        const current = prev[email]?.goalIds || [];
        return {
          ...prev,
          [email]: {
            ...prev[email],
            goalIds: current.filter((id) => id !== goalId)
          }
        };
      });
      return;
    }
    setUpdates((prev) => {
      const current = prev[email]?.goalIds || [];
      const without = current.filter((id) => id !== goalId);
      const next = [...without];
      next.splice(Math.min(parsed - 1, next.length), 0, goalId);
      return {
        ...prev,
        [email]: {
          ...prev[email],
          goalIds: next
        }
      };
    });
  };

  const getGoalOrder = (email: string, goalId: string, fallback: string[]) => {
    const list = updates[email]?.goalIds || fallback;
    const index = list.indexOf(goalId);
    return index === -1 ? "" : String(index + 1);
  };
  return React.createElement(
    "div",
    { className: "card" },
    <>
      <h2>Member Accounts</h2>
      <p style={{ color: "#4b5563" }}>
        Create member accounts, assign tiers, and activate subscriptions.
      </p>
      {dataLoadNotice && (
        <p style={{ color: "#b45309", marginTop: 8, marginBottom: 0 }} role="status">
          {dataLoadNotice}
        </p>
      )}
      {status && <p>{status}</p>}
      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Create Member</h3>
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
              <option value={2}>Full session — 2 main audios per schedule night (default)</option>
              <option value={1}>Half session — 1 main audio per step (2 steps = 1 full session)</option>
            </select>
            <button className="button" onClick={createUser}>
              Create Member
            </button>
          </div>
        </div>

        <div className="card">
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
                  {filteredUsers.map((user) => (
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
                      Goals: {user.goalIds?.length || 0} · {user.subscriptionTier === "platinum_managed" ? "Platinum Managed Member" : "Gold Member"} · {user.subscriptionStatus ?? "inactive"} ·{" "}
                      {memberPlaysPerNight(user) === 2 ? "Full session (2 audios/night)" : "Half session (1 audio/step)"}
                    </p>
                  )}
                  {!profileOpen[user.email] && (
                    <>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={async () => {
                          setProfileOpen({ ...profileOpen, [user.email]: true });
                          if (!profileDrafts[user.email]) {
                            await loadProfile(user.email);
                          }
                          void loadMemberActivity(user.email);
                          // Load audio assignments and order
                          const assignments = buildAudioAssignment(user.email);
                          setAudioAssignments((prev) => ({
                            ...prev,
                            [user.email]: assignments
                          }));
                          const order = await buildAudioOrder(user.email);
                          setAudioOrder((prev) => ({
                            ...prev,
                            [user.email]: order
                          }));
                        }}
                      >
                        View / Edit member
                      </button>
                    </>
                  )}
                  {profileOpen[user.email] && (
                    <>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={async () => {
                          const next = !profileOpen[user.email];
                          setProfileOpen({ ...profileOpen, [user.email]: next });
                          if (next && !profileDrafts[user.email]) {
                            await loadProfile(user.email);
                          }
                          if (next) {
                            void loadMemberActivity(user.email);
                            // Load audio assignments and order
                            const assignments = buildAudioAssignment(user.email);
                            setAudioAssignments((prev) => ({
                              ...prev,
                              [user.email]: assignments
                            }));
                            const order = await buildAudioOrder(user.email);
                            setAudioOrder((prev) => ({
                              ...prev,
                              [user.email]: order
                            }));
                          }
                        }}
                      >
                        {profileOpen[user.email] ? "Hide Member Profile" : "View Member Profile"}
                      </button>
                      <div className="card" style={{ marginTop: 12 }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              marginBottom: 8
                            }}
                          >
                            <h4 style={{ margin: 0 }}>Member activity</h4>
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
                          <p style={{ color: "#64748b", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
                            Sign-ins (with first page they head to), sign-outs, page views, played audio (library
                            and Play Options — each row lists the recording name), goal and console updates, and
                            admin schedule changes.
                          </p>
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
                              <p style={{ margin: "0 0 8px", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                                {memberPlaysPerNight(user) === 2 ? (
                                  <>
                                    <strong>Full session</strong> for this member: <strong>two</strong> main
                                    audios in one schedule night (first, then second after the gap). One completed
                                    night here = <strong>1</strong> full session. Preparation audio is extra.
                                  </>
                                ) : (
                                  <>
                                    <strong>Half session</strong> for this member: <strong>one</strong> main audio
                                    per schedule <strong>step</strong> in the rotation. Two completed steps ={" "}
                                    <strong>one</strong> full session (first main + second main). So progress often
                                    reads as <strong>0.5, 1, 1.5…</strong> full sessions. Preparation audio is extra.
                                  </>
                                )}
                              </p>
                              <p
                                style={{
                                  margin: "0 0 10px",
                                  fontSize: 15,
                                  color: "#0f172a",
                                  fontWeight: 600
                                }}
                              >
                                Full sessions complete:{" "}
                                {formatFullSessionsLabel(
                                  memberScheduleProgress[user.email]!.completedScheduleNights,
                                  memberPlaysPerNight(user)
                                )}
                                {memberPlaysPerNight(user) === 1 ? (
                                  <span style={{ fontSize: 13, fontWeight: 400, color: "#64748b" }}>
                                    {" "}
                                    (two steps = 1 session; each step ={" "}
                                    <span style={{ fontFamily: "ui-monospace, monospace" }}>½</span> session)
                                  </span>
                                ) : null}
                              </p>
                              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569" }}>
                                {memberPlaysPerNight(user) === 1 ? (
                                  <>
                                    <strong>Schedule steps completed:</strong>{" "}
                                    {memberScheduleProgress[user.email]!.completedScheduleNights}
                                    {" · "}
                                  </>
                                ) : (
                                  <>
                                    <strong>Schedule nights completed:</strong>{" "}
                                    {memberScheduleProgress[user.email]!.completedScheduleNights}
                                    {" · "}
                                  </>
                                )}
                                <strong>Main rotation audios completed (approx.):</strong>{" "}
                                {memberScheduleProgress[user.email]!.completedScheduleNights *
                                  memberPlaysPerNight(user)}
                                {" · "}
                                <strong>
                                  {memberPlaysPerNight(user) === 1 ? "Next schedule step:" : "Next schedule night:"}
                                </strong>{" "}
                                #{memberScheduleProgress[user.email]!.currentNight}
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
                                  title={
                                    memberPlaysPerNight(user) === 1
                                      ? "Subtract one schedule step (½ full session in half-session mode)"
                                      : "Subtract one completed schedule night"
                                  }
                                  disabled={!!memberScheduleSaving[user.email]}
                                  onClick={() =>
                                    void saveMemberScheduleProgress(
                                      user.email,
                                      memberScheduleProgress[user.email]!.completedScheduleNights - 1
                                    )
                                  }
                                >
                                  {memberPlaysPerNight(user) === 1 ? "−1 step" : "−1 night"}
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  style={{ fontSize: 13, padding: "6px 12px" }}
                                  title={
                                    memberPlaysPerNight(user) === 1
                                      ? "Add one schedule step (½ full session in half-session mode)"
                                      : "Add one completed schedule night"
                                  }
                                  disabled={!!memberScheduleSaving[user.email]}
                                  onClick={() =>
                                    void saveMemberScheduleProgress(
                                      user.email,
                                      memberScheduleProgress[user.email]!.completedScheduleNights + 1
                                    )
                                  }
                                >
                                  {memberPlaysPerNight(user) === 1 ? "+1 step" : "+1 night"}
                                </button>
                                <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                                  {memberPlaysPerNight(user) === 1
                                    ? "Set completed steps (0–366)"
                                    : "Set completed nights (0–366)"}
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
                                      setStatus(
                                        memberPlaysPerNight(user) === 1
                                          ? "Enter a number between 0 and 366 for completed schedule steps."
                                          : "Enter a number between 0 and 366 for completed schedule nights."
                                      );
                                      return;
                                    }
                                    void saveMemberScheduleProgress(user.email, n);
                                  }}
                                >
                                  {memberScheduleSaving[user.email] ? "Saving…" : "Apply"}
                                </button>
                              </div>
                              <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
                                This updates stored progress in the app (steps in half-session mode, nights in
                                full-session mode). It does not change goals, session length setting, or rotation
                                start date.
                              </p>
                            </div>
                          )}
                          {(memberActivity[user.email] || []).length > 0 ? (
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
                                  {(memberActivity[user.email] || []).map((row: MemberActivityRow) => (
                                    <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap", color: "#374151" }}>
                                        {formatActivityTime(row.createdAt)}
                                      </td>
                                      <td style={{ padding: "8px 6px", color: "#111827" }}>
                                        {formatActivityAction(row.action)}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 6px",
                                          color: "#111827",
                                          wordBreak: "break-word",
                                          maxWidth: 220,
                                          fontWeight: row.action === "played_audio" ? 500 : 400
                                        }}
                                      >
                                        {row.action === "played_audio"
                                          ? formatPlayedAudioTitle(row.action, row.details) || "—"
                                          : "—"}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 6px",
                                          color: "#4b5563",
                                          wordBreak: "break-word",
                                          maxWidth: 260
                                        }}
                                      >
                                        {formatActivityDetails(row.action, row.details)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
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
                      {profileDrafts[user.email] ? (
                        <div className="card" style={{ marginTop: 12 }}>
                          <h4>1. Member Profile</h4>
                          <p style={{ color: "#4b5563", marginTop: 4 }}>
                            Same fields and order as new member signup (Personal Details step).
                          </p>
                          <label style={{ fontSize: 12, display: "block", marginBottom: 4, marginTop: 12 }}>
                            Admin notes (internal only)
                          </label>
                          <textarea
                            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                            placeholder="Internal notes about this member (admin only)"
                            value={profileDrafts[user.email].notes}
                            onChange={(event) =>
                              setProfileDrafts({
                                ...profileDrafts,
                                [user.email]: { ...profileDrafts[user.email], notes: event.target.value }
                              })
                            }
                          />
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
                              <span>I am interested in a Life Guidance Discovery Session.</span>
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
                              <span>I am or would like to be a therapist, healer, or coach.</span>
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
                        </div>
                      ) : (
                        <p style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>
                          Loading member profile…
                        </p>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <h4 style={{ marginBottom: 8 }}>2. Goals</h4>
                        <button
                          type="button"
                          onClick={() =>
                            setGoalsSectionOpen((prev) => ({
                              ...prev,
                              [user.email]: !prev[user.email]
                            }))
                          }
                          style={{
                            background: "none",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: 12,
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                          }}
                        >
                          {goalsSectionOpen[user.email] ? "▼" : "▶"}
                          Assigned goals (up to 10)
                          {user.goalIds?.length ? ` — ${user.goalIds.length} selected` : ""}
                        </button>
                        {goalsSectionOpen[user.email] && (
                          <>
                            <div className="goal-list" style={{ marginTop: 8 }}>
                              {sortedInterests.map((interest) => {
                                const orderValue = getGoalOrder(
                                  user.email,
                                  interest.id,
                                  user.goalIds || []
                                );
                                return (
                                  <label
                                    key={interest.id}
                                    className="goal-item"
                                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={orderValue !== ""}
                                      onChange={(event) =>
                                        updateOrderedGoals(
                                          user.email,
                                          interest.id,
                                          event.target.checked ? "1" : ""
                                        )
                                      }
                                    />
                                    <span style={{ flex: 1 }}>{interest.name}</span>
                                    <input
                                      value={orderValue}
                                      onChange={(event) =>
                                        updateOrderedGoals(
                                          user.email,
                                          interest.id,
                                          event.target.value
                                        )
                                      }
                                      placeholder="#"
                                      style={{
                                        width: 44,
                                        textAlign: "center",
                                        borderRadius: 6,
                                        border: "1px solid #d1d5db",
                                        padding: "4px 6px",
                                        background: orderValue ? "#16a34a" : "#ffffff",
                                        color: orderValue ? "#ffffff" : "#111827",
                                        fontWeight: 600
                                      }}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <label style={{ fontSize: 12 }}>Current audios play list</label>
                              <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                                Up to 10 audios in this member&apos;s rotation (from goals or assigned).
                              </p>
                              <div className="goal-list">
                                {(() => {
                                  const isManaged = user.subscriptionTier === "platinum_managed";
                                  const assignedForPlaylist = isManaged
                                    ? library.filter((item) =>
                                        (item.allowedUserEmails || []).some((e) => e.toLowerCase() === user.email.toLowerCase())
                                      ).slice(0, 10)
                                    : [];
                                  const goalAudios = getDerivedAudios(user.goalIds || []).slice(0, 10);
                                  const list = isManaged ? assignedForPlaylist : goalAudios;
                                  return list.length === 0 ? (
                                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                                      No audios in play list yet.
                                    </span>
                                  ) : (
                                    list.map((item) => (
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
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <h4 style={{ marginBottom: 8 }}>
                          3. Membership, active status, session length (half/full), password
                        </h4>
                        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                          Passwords are stored securely and cannot be viewed. Enter a new password (6+ characters)
                          and click Save to set it for this member—you can change password only without changing tier.
                        </p>
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
                          <option value={2}>Full session — 2 main audios per schedule night</option>
                          <option value={1}>Half session — 1 main audio per step (2 steps = 1 full session)</option>
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
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <h4 style={{ marginBottom: 8 }}>4. Add file</h4>
                        <label style={{ fontSize: 12 }}>Personalized audio (CGMR)</label>
                        {(() => {
                          const emailLower = user.email.toLowerCase();
                          const assigned = library.filter((item) =>
                            (item.allowedUserEmails || []).some((e) => e.toLowerCase() === emailLower)
                          );
                          // Sort by the order they were selected (from audioOrder state)
                          const order = audioOrder[user.email] || [];
                          const assignedOrdered = assigned.slice().sort((a, b) => {
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
                          const isNonManaged = user.subscriptionTier !== "platinum_managed";
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
                                        <div key={item.id} style={{ marginBottom: 4, fontSize: 12 }}>
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
                      <div style={{ marginTop: 12 }}>
                        <h4 style={{ marginBottom: 8 }}>5. Check audios designed for them</h4>
                        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                          Check which audios this member can access. Managed members are entered only by a facilitator or admin; you choose their recordings and order. The order you check them (shown as numbers) is used by the algorithm.
                        </p>
                        <div className="goal-list">
                          {library
                            .slice()
                            .sort((a, b) => {
                              // Sort by SKU: items with SKU first, then by SKU value, then by title
                              const skuA = (a.skuCode || "").trim();
                              const skuB = (b.skuCode || "").trim();
                              const hasSkuA = !!skuA;
                              const hasSkuB = !!skuB;
                              
                              // Items with SKU come before items without SKU
                              if (hasSkuA && !hasSkuB) return -1;
                              if (!hasSkuA && hasSkuB) return 1;
                              
                              // Both have SKU or both don't have SKU
                              if (hasSkuA && hasSkuB) {
                                return skuA.localeCompare(skuB, undefined, { numeric: true, sensitivity: 'base' });
                              }
                              
                              // Neither has SKU, sort by title
                              return (a.title || "").localeCompare(b.title || "");
                            })
                            .map((item) => {
                            const emailLower = user.email.toLowerCase();
                            const isAssigned =
                              audioAssignments[user.email]?.[item.id] ??
                              item.allowedUserEmails?.some(
                                (allowed) => allowed.toLowerCase() === emailLower
                              ) ??
                              false;
                            const currentOrder = audioOrder[user.email] || [];
                            const fallbackOrder = library
                              .filter((i) =>
                                i.allowedUserEmails?.some((e) => e.toLowerCase() === emailLower)
                              )
                              .map((i) => i.id);
                            const orderValue = getAudioOrder(user.email, item.id, fallbackOrder);
                            return (
                              <label
                                key={item.id}
                                className="goal-item"
                                style={{ display: "flex", gap: 8, alignItems: "center" }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAssigned}
                                  onChange={() => toggleAudioAssignment(user.email, item.id)}
                                />
                                <span style={{ flex: 1 }}>
                                  {item.skuCode || item.title || "No SKU/Title"}
                                </span>
                                <input
                                  value={orderValue}
                                  onChange={(event) =>
                                    updateAudioOrder(
                                      user.email,
                                      item.id,
                                      event.target.value
                                    )
                                  }
                                  placeholder="#"
                                  style={{
                                    width: 44,
                                    textAlign: "center",
                                    borderRadius: 6,
                                    border: "1px solid #d1d5db",
                                    padding: "4px 6px",
                                    background: orderValue ? "#16a34a" : "#ffffff",
                                    color: orderValue ? "#ffffff" : "#111827",
                                    fontWeight: 600
                                  }}
                                />
                              </label>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                          To remove a track from this member: uncheck it above and click Save Personalized Audios.
                        </p>
                        <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => saveAudioAssignments(user.email)}
                          >
                            Save Personalized Audios
                          </button>
                          {audioSaveStatus[user.email] && (
                            <span style={{ alignSelf: "center" }}>
                              {audioSaveStatus[user.email]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="card" style={{ marginTop: 12, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <h4 style={{ marginBottom: 6 }}>6. Billing &amp; rate</h4>
                        <p style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                          <strong>Gold Member:</strong> $19.95/mo — Regular membership with goal-based scheduling.<br />
                          <strong>Platinum Managed Member:</strong> $39.95/mo — Managed membership with admin-assigned audios (no goals).
                        </p>
                        <p style={{ fontSize: 12, margin: 0 }}>
                          Current tier: <strong>{user.subscriptionTier === "platinum_managed" ? "Platinum Managed Member ($39.95/mo)" : "Gold Member ($19.95/mo)"}</strong> — use subscription controls above to activate and charge.
                        </p>
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
                ))}
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
