"use client";

import { put } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";
import { MANAGED_MAX_SLOTS_PER_AUDIO } from "@/lib/managed-rotation-limits";

function sanitizePathSegment(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || "audio";
}

type FacilitatorAudioRow = {
  id: string;
  title: string;
  description: string;
  skuCode: string;
  allowedUserEmails: string[];
  inGeneralCatalog: boolean;
  createdAt: string;
};

type MemberRow = {
  email: string;
  registered: boolean;
  firstName: string | null;
  lastName: string | null;
  subscriptionTier: "platinum" | "platinum_managed" | null;
  subscriptionStatus: string | null;
  goalIds: string[];
  playsPerNight: number;
};

type MemberProfileDetail = {
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  yearBorn?: number | null;
  contactNumber?: string | null;
  timeZone?: string | null;
  occupation?: string | null;
  notes?: string | null;
};

type ActivityRow = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
};

type LibraryItem = {
  id: string;
  title: string;
  skuCode: string;
  interestIds?: string[];
};

type GoalOption = {
  id: string;
  name: string;
  description?: string;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

function memberLabel(member: MemberRow): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return name || member.email;
}

function tierLabel(tier: MemberRow["subscriptionTier"]): string {
  if (tier === "platinum_managed") return "Platinum Managed";
  if (tier === "platinum") return "Gold Member";
  return "Unknown tier";
}

/** Sort key: last name, first name, then email. */
function memberSortKey(member: MemberRow): string {
  const last = (member.lastName ?? "").trim().toLowerCase();
  const first = (member.firstName ?? "").trim().toLowerCase();
  return `${last}\t${first}\t${member.email.toLowerCase()}`;
}

/** Display for search results: Last, First (falls back to email). */
function memberSortDisplayName(member: MemberRow): string {
  const last = (member.lastName ?? "").trim();
  const first = (member.firstName ?? "").trim();
  if (last && first) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return member.email;
}

function memberMatchesSearch(member: MemberRow, term: string): boolean {
  if (!term) return true;
  const haystack = [
    member.email,
    member.firstName ?? "",
    member.lastName ?? "",
    memberSortDisplayName(member),
    memberLabel(member)
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

function countInOrder(order: string[], itemId: string): number {
  return order.filter((id) => id === itemId).length;
}

type SchedulePreviewNight = {
  night: number;
  scheduleNight?: number;
  tracks: Array<{ id?: string; title: string; skuCode?: string }>;
  note?: string;
  rotationAdded?: string[];
  rotationSessionDrop?: string[];
  rotationRemovedAfterPlays?: string[];
};

type SchedulePreviewMeta = {
  tier: MemberRow["subscriptionTier"] | "platinum" | "platinum_managed";
  playsPerNight: number;
  completedScheduleNights: number;
  currentNight: number;
  startScheduleNight?: number;
  goalCount: number;
  rotationStepCount: number;
};

function trackLabel(track: { skuCode?: string; title: string }): string {
  return track.skuCode ? `${track.skuCode} – ${track.title}` : track.title;
}

function lineupAlgorithmNote(
  night: SchedulePreviewNight,
  idLabels: Map<string, string>
): string {
  const parts: string[] = [];
  if (night.note) parts.push(night.note);
  if (night.rotationAdded?.length) {
    parts.push(
      `Added to rotation: ${night.rotationAdded.map((id) => idLabels.get(id) || id).join(", ")}`
    );
  }
  if (night.rotationSessionDrop?.length) {
    parts.push(
      `Goals leave rotation: ${night.rotationSessionDrop.map((id) => idLabels.get(id) || id).join(", ")}`
    );
  }
  if (night.rotationRemovedAfterPlays?.length) {
    parts.push(
      `Removed after plays: ${night.rotationRemovedAfterPlays.map((id) => idLabels.get(id) || id).join(", ")}`
    );
  }
  return parts.join(" · ") || "—";
}

type ConsolePanel = "client" | "add-member" | "member-audios" | "lineup";

export default function FacilitatorMembers() {
  const [facilitatorName, setFacilitatorName] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [goalsCatalog, setGoalsCatalog] = useState<GoalOption[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [profileDetail, setProfileDetail] = useState<{
    subscriptionTier: MemberRow["subscriptionTier"];
    subscriptionStatus: string | null;
    goalIds: string[];
    playsPerNight: number;
    profile: MemberProfileDetail | null;
    registered: boolean;
  } | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [scheduleProgress, setScheduleProgress] = useState<{
    completedScheduleNights: number;
    currentNight: number;
    scheduleStartedAt: string | null;
  } | null>(null);
  const [rotationOrder, setRotationOrder] = useState<string[]>([]);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [rotationSaveStatus, setRotationSaveStatus] = useState<string | null>(null);
  const [pickerId, setPickerId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [consolePanel, setConsolePanel] = useState<ConsolePanel>("client");
  const [clientSearch, setClientSearch] = useState("");
  type AudioListFilter = "all" | "private" | "in_library";
  const [audioListFilter, setAudioListFilter] = useState<AudioListFilter>("all");
  const [facilitatorAudios, setFacilitatorAudios] = useState<FacilitatorAudioRow[]>([]);
  const [audioDraft, setAudioDraft] = useState({
    title: "",
    description: "",
    audioUrl: "",
    coverUrl: "",
    skuCode: ""
  });
  const [audioMemberPick, setAudioMemberPick] = useState<Record<string, boolean>>({});
  const [audioUploadStatus, setAudioUploadStatus] = useState<string | null>(null);
  const [audioSaveStatus, setAudioSaveStatus] = useState<string | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");
  const [newMemberTier, setNewMemberTier] = useState<"platinum" | "platinum_managed">("platinum");
  const [newMemberStatus, setNewMemberStatus] = useState<"inactive" | "active">("inactive");
  const [newMemberSaveStatus, setNewMemberSaveStatus] = useState<string | null>(null);
  const [goalDraftIds, setGoalDraftIds] = useState<Record<string, string[]>>({});
  const [goalSearch, setGoalSearch] = useState("");
  const [goalsSaveStatus, setGoalsSaveStatus] = useState<string | null>(null);
  const [goalsSaving, setGoalsSaving] = useState(false);
  type ClientSection = "summary" | "notes" | "goals" | "schedule" | "rotation" | "issues" | "activity";
  const [openClientSection, setOpenClientSection] = useState<ClientSection | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [notesSaveStatus, setNotesSaveStatus] = useState<string | null>(null);
  const [notesSaving, setNotesSaving] = useState(false);
  const [activitySummary, setActivitySummary] = useState<
    Record<
      string,
      {
        goalCount: number;
        lastLoginAt: string | null;
        lastPlayAt: string | null;
        lastPlayDetails: string | null;
        activityRowCount: number;
      }
    >
  >({});
  const [schedulePreview, setSchedulePreview] = useState<Record<string, SchedulePreviewNight[]>>({});
  const [schedulePreviewMeta, setSchedulePreviewMeta] = useState<Record<string, SchedulePreviewMeta>>(
    {}
  );
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [lineupMemberEmail, setLineupMemberEmail] = useState("");
  const [lineupNights, setLineupNights] = useState(14);
  const [lineupMessage, setLineupMessage] = useState<string | null>(null);
  const [openIssues, setOpenIssues] = useState<
    Array<{
      id: string;
      memberEmail: string;
      subject: string;
      category: string;
      status: string;
      createdAt: string;
    }>
  >([]);

  const selectedMember = useMemo(
    () => members.find((m) => m.email === selectedEmail) ?? null,
    [members, selectedEmail]
  );

  const isManaged =
    profileDetail?.subscriptionTier === "platinum_managed" ||
    selectedMember?.subscriptionTier === "platinum_managed";

  const isGold =
    !isManaged &&
    (profileDetail?.subscriptionTier === "platinum" ||
      selectedMember?.subscriptionTier === "platinum" ||
      profileDetail?.subscriptionTier == null);

  const sortedGoals = useMemo(
    () => goalsCatalog.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [goalsCatalog]
  );

  const memberGoalIds = selectedEmail
    ? goalDraftIds[selectedEmail] ?? profileDetail?.goalIds ?? selectedMember?.goalIds ?? []
    : [];

  const filteredGoals = useMemo(() => {
    const term = goalSearch.trim().toLowerCase();
    if (!term) return sortedGoals;
    return sortedGoals.filter((goal) => goal.name.toLowerCase().includes(term));
  }, [goalSearch, sortedGoals]);

  const goalDerivedAudios = useMemo(() => {
    if (memberGoalIds.length === 0) return [];
    return library
      .filter((item) => item.interestIds?.some((id) => memberGoalIds.includes(id)))
      .slice(0, 10);
  }, [library, memberGoalIds]);

  const facilitatorAudioCounts = useMemo(() => {
    const privateCount = facilitatorAudios.filter((row) => !row.inGeneralCatalog).length;
    const inLibraryCount = facilitatorAudios.filter((row) => row.inGeneralCatalog).length;
    return { privateCount, inLibraryCount, all: facilitatorAudios.length };
  }, [facilitatorAudios]);

  const filteredFacilitatorAudios = useMemo(() => {
    if (audioListFilter === "private") {
      return facilitatorAudios.filter((row) => !row.inGeneralCatalog);
    }
    if (audioListFilter === "in_library") {
      return facilitatorAudios.filter((row) => row.inGeneralCatalog);
    }
    return facilitatorAudios;
  }, [facilitatorAudios, audioListFilter]);

  const loadMembers = useCallback(async () => {
    const meRes = await fetch("/api/moderator/me");
    if (!meRes.ok) throw new Error("Unauthorized");
    const meData = await meRes.json();
    setFacilitatorName(meData.moderator?.name ?? "");

    const membersRes = await fetch("/api/moderator/members");
    if (!membersRes.ok) throw new Error("Could not load members");
    const membersData = await membersRes.json();
    const memberList = membersData.members ?? [];
    setMembers(memberList);
    if (memberList.length === 0) {
      setConsolePanel("add-member");
    }

    const issuesRes = await fetch("/api/moderator/member-issues");
    if (issuesRes.ok) {
      const issuesData = await issuesRes.json();
      setOpenIssues(issuesData.reports ?? []);
    }

    const libRes = await fetch("/api/moderator/library");
    if (libRes.ok) {
      const libData = await libRes.json();
      setLibrary(libData.library ?? []);
    }

    const goalsRes = await fetch("/api/moderator/goals");
    if (goalsRes.ok) {
      const goalsData = await goalsRes.json();
      setGoalsCatalog(goalsData.interests ?? []);
    }
  }, []);

  const loadFacilitatorAudios = useCallback(async () => {
    const res = await fetch("/api/moderator/facilitator-audios");
    if (!res.ok) return;
    const data = await res.json();
    setFacilitatorAudios(data.audios ?? []);
  }, []);

  useEffect(() => {
    if (consolePanel === "member-audios") void loadFacilitatorAudios();
  }, [consolePanel, loadFacilitatorAudios]);

  useEffect(() => {
    if (members.length === 0) return;
    setAudioMemberPick((prev) => {
      const next = { ...prev };
      for (const m of members) {
        if (next[m.email] === undefined) next[m.email] = true;
      }
      return next;
    });
  }, [members]);

  const loadMemberDetail = useCallback(async (email: string, memberTier: MemberRow["subscriptionTier"]) => {
    setDetailLoading(true);
    setProfileDetail(null);
    setActivity([]);
    setScheduleProgress(null);
    setRotationOrder([]);
    setRotationSaveStatus(null);
    setGoalSearch("");
    setGoalsSaveStatus(null);
    setNotesSaveStatus(null);
    setOpenClientSection(null);
    try {
      let tier = memberTier;
      const profileRes = await fetch(
        `/api/moderator/members/profile?email=${encodeURIComponent(email)}`
      );
      if (profileRes.ok) {
        const data = await profileRes.json();
        tier = data.member?.subscriptionTier ?? tier;
        setProfileDetail({
          subscriptionTier: data.member?.subscriptionTier ?? null,
          subscriptionStatus: data.member?.subscriptionStatus ?? null,
          goalIds: data.member?.goalIds ?? [],
          playsPerNight: data.member?.playsPerNight ?? 2,
          profile: data.member?.profile ?? null,
          registered: data.member?.registered ?? true
        });
        setGoalDraftIds((prev) => ({
          ...prev,
          [email]: data.member?.goalIds ?? []
        }));
        setNotesDraft((prev) => ({
          ...prev,
          [email]: data.member?.profile?.notes ?? ""
        }));
      }

      const activityRes = await fetch(
        `/api/moderator/members/activity?email=${encodeURIComponent(email)}&limit=80`
      );
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activityLog ?? []);
        setScheduleProgress(data.scheduleProgress ?? null);
        if (data.summary) {
          setActivitySummary((prev) => ({ ...prev, [email]: data.summary }));
        }
      }

      if (tier === "platinum_managed") {
        setRotationLoading(true);
        const orderRes = await fetch(
          `/api/moderator/members/audio-order?email=${encodeURIComponent(email)}`
        );
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setRotationOrder(orderData.order ?? []);
        }
        setRotationLoading(false);
      }
    } catch {
      setStatus("Could not load member details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadMembers();
      } catch {
        setStatus("Facilitator access required.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMembers]);

  useEffect(() => {
    if (!selectedEmail) return;
    const member = members.find((m) => m.email === selectedEmail);
    void loadMemberDetail(selectedEmail, member?.subscriptionTier ?? null);
    setLineupMemberEmail(selectedEmail);
  }, [selectedEmail, members, loadMemberDetail]);

  useEffect(() => {
    if (lineupMemberEmail) return;
    const firstRegistered = members.find((member) => member.registered);
    if (firstRegistered) setLineupMemberEmail(firstRegistered.email);
  }, [members, lineupMemberEmail]);

  useEffect(() => {
    if (consolePanel !== "lineup" || !lineupMemberEmail) return;
    void loadSchedulePreview(lineupMemberEmail, lineupNights);
  }, [consolePanel, lineupMemberEmail, lineupNights]);

  const toggleClientSection = (section: ClientSection) => {
    const opening = openClientSection !== section;
    setOpenClientSection(opening ? section : null);
    if (opening && section === "schedule" && selectedEmail) {
      void loadSchedulePreview(selectedEmail, lineupNights);
    }
  };

  const loadSchedulePreview = async (email: string, nights = lineupNights) => {
    setScheduleLoading(true);
    setLineupMessage(null);
    try {
      const res = await fetch(
        `/api/moderator/members/schedule-preview?email=${encodeURIComponent(email)}&nights=${nights}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLineupMessage(typeof data?.error === "string" ? data.error : "Could not load lineup.");
        return;
      }
      if (typeof data.message === "string" && data.message) {
        setLineupMessage(data.message);
      }
      setSchedulePreview((prev) => ({
        ...prev,
        [email]: (data.schedule ?? []).map((night: SchedulePreviewNight) => ({
          night: night.night,
          scheduleNight: night.scheduleNight,
          note: night.note,
          rotationAdded: night.rotationAdded,
          rotationSessionDrop: night.rotationSessionDrop,
          rotationRemovedAfterPlays: night.rotationRemovedAfterPlays,
          tracks: (night.tracks ?? []).map((t) => ({
            id: t.id,
            title: t.title ?? "Audio",
            skuCode: t.skuCode
          }))
        }))
      }));
      setSchedulePreviewMeta((prev) => ({
        ...prev,
        [email]: {
          tier: data.tier ?? "platinum",
          playsPerNight: data.playsPerNight ?? 2,
          completedScheduleNights: data.completedScheduleNights ?? 0,
          currentNight: data.startScheduleNight ?? data.currentNight ?? 1,
          startScheduleNight: data.startScheduleNight ?? data.currentNight ?? 1,
          goalCount: data.goalCount ?? 0,
          rotationStepCount: data.rotationStepCount ?? 0
        }
      }));
    } finally {
      setScheduleLoading(false);
    }
  };

  const saveMemberNotes = async (email: string) => {
    setNotesSaving(true);
    setNotesSaveStatus(null);
    try {
      const response = await fetch("/api/moderator/members/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          notes: notesDraft[email] ?? ""
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNotesSaveStatus(data?.error || "Could not save notes.");
        return;
      }
      setNotesSaveStatus("Notes saved.");
      setProfileDetail((prev) =>
        prev
          ? {
              ...prev,
              profile: {
                ...(prev.profile ?? {}),
                notes: notesDraft[email] ?? ""
              }
            }
          : prev
      );
    } finally {
      setNotesSaving(false);
    }
  };

  const persistRotation = async (email: string, order: string[]) => {
    setRotationSaveStatus("Saving rotation…");
    const response = await fetch("/api/moderator/members/audio-order", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, order })
    });
    if (response.ok) {
      setRotationSaveStatus(
        order.length === 0
          ? "Rotation cleared on server."
          : `Saved ${order.length} rotation step${order.length === 1 ? "" : "s"}.`
      );
      return true;
    }
    const data = await response.json().catch(() => ({}));
    setRotationSaveStatus(data?.error || "Rotation save failed.");
    setStatus(data?.error || "Rotation save failed.");
    return false;
  };

  const addRotationSlot = () => {
    if (!selectedEmail || !pickerId.trim()) return;
    const id = pickerId.trim();
    if (countInOrder(rotationOrder, id) >= MANAGED_MAX_SLOTS_PER_AUDIO) {
      setStatus(
        `This recording is already in the rotation ${MANAGED_MAX_SLOTS_PER_AUDIO} times (maximum).`
      );
      return;
    }
    const next = [...rotationOrder, id];
    setRotationOrder(next);
    setPickerId("");
    void persistRotation(selectedEmail, next);
  };

  const removeRotationSlot = (index: number) => {
    if (!selectedEmail) return;
    const next = rotationOrder.filter((_, i) => i !== index);
    setRotationOrder(next);
    void persistRotation(selectedEmail, next);
  };

  const moveRotationSlot = (index: number, direction: "up" | "down") => {
    if (!selectedEmail) return;
    const j = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || index >= rotationOrder.length || j < 0 || j >= rotationOrder.length) return;
    const next = [...rotationOrder];
    const t = next[index];
    next[index] = next[j];
    next[j] = t;
    setRotationOrder(next);
    void persistRotation(selectedEmail, next);
  };

  const uploadFacilitatorAudioFile = async (fileInput: HTMLInputElement | null) => {
    const file = fileInput?.files?.[0];
    if (!file) {
      setAudioUploadStatus("Choose a file first.");
      return;
    }
    setAudioUploading(true);
    setAudioUploadStatus(null);
    const pathname = `audios/${sanitizePathSegment(file.name.replace(/\.[^.]+$/, "") || "audio")}${file.name.match(/\.[^.]+$/)?.[0] || ".mp3"}`;
    const useMultipart = file.size > 5 * 1024 * 1024;
    try {
      const tokenRes = await fetch("/api/moderator/upload-audio-handler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: { pathname, clientPayload: null, multipart: useMultipart }
        })
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        setAudioUploadStatus(tokenData?.error || "Upload failed.");
        return;
      }
      const clientToken = tokenData?.clientToken;
      if (!clientToken) {
        setAudioUploadStatus("Upload failed: no token from server.");
        return;
      }
      const blob = await put(pathname, file, {
        access: "public",
        token: clientToken,
        multipart: useMultipart
      });
      const url = blob?.url || "";
      setAudioDraft((d) => ({ ...d, audioUrl: url }));
      setAudioUploadStatus(
        url ? "Upload complete — add title and description, then save." : "Upload finished but no URL returned."
      );
      if (fileInput) fileInput.value = "";
    } catch (e) {
      setAudioUploadStatus(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setAudioUploading(false);
    }
  };

  const saveFacilitatorAudio = async () => {
    const memberEmails = members.filter((m) => audioMemberPick[m.email]).map((m) => m.email);
    if (!audioDraft.title.trim() || !audioDraft.description.trim() || !audioDraft.audioUrl.trim()) {
      setAudioSaveStatus("Title, description, and audio URL are required.");
      return;
    }
    if (memberEmails.length === 0) {
      setAudioSaveStatus("Select at least one assigned member.");
      return;
    }
    setAudioSaveStatus(null);
    const res = await fetch("/api/moderator/facilitator-audios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: audioDraft.title.trim(),
        description: audioDraft.description.trim(),
        audioUrl: audioDraft.audioUrl.trim(),
        coverUrl: audioDraft.coverUrl.trim(),
        skuCode: audioDraft.skuCode.trim(),
        memberEmails
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setAudioSaveStatus(data?.error || "Could not save audio.");
      return;
    }
    setAudioSaveStatus("Audio saved for your selected members.");
    setAudioDraft({ title: "", description: "", audioUrl: "", coverUrl: "", skuCode: "" });
    await loadFacilitatorAudios();
    const libRes = await fetch("/api/moderator/library");
    if (libRes.ok) {
      const libData = await libRes.json();
      setLibrary(libData.library ?? []);
    }
  };

  const createAssignedMember = async () => {
    const email = newMemberEmail.trim();
    if (!email || newMemberPassword.length < 6) {
      setNewMemberSaveStatus("Email and password (6+ characters) are required.");
      return;
    }
    setNewMemberSaveStatus(null);
    setStatus(null);
    const res = await fetch("/api/moderator/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: newMemberPassword,
        firstName: newMemberFirstName.trim() || undefined,
        lastName: newMemberLastName.trim() || undefined,
        tier: newMemberTier,
        status: newMemberStatus,
        playsPerNight: 2
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNewMemberSaveStatus(data?.error || "Could not create member.");
      return;
    }
    setNewMemberSaveStatus(data?.message || "Member saved.");
    setNewMemberEmail("");
    setNewMemberPassword("");
    setNewMemberFirstName("");
    setNewMemberLastName("");
    await loadMembers();
  };

  const toggleMemberGoal = (email: string, goalId: string) => {
    setGoalDraftIds((prev) => {
      const current = prev[email] ?? [];
      if (current.includes(goalId)) {
        return { ...prev, [email]: current.filter((id) => id !== goalId) };
      }
      if (current.length >= 10) return prev;
      return { ...prev, [email]: [...current, goalId] };
    });
    setGoalsSaveStatus(null);
  };

  const moveMemberGoal = (email: string, fromIndex: number, toIndex: number) => {
    setGoalDraftIds((prev) => {
      const current = [...(prev[email] ?? [])];
      if (toIndex < 0 || toIndex >= current.length) return prev;
      const [item] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, item);
      return { ...prev, [email]: current };
    });
    setGoalsSaveStatus(null);
  };

  const saveMemberGoals = async (email: string) => {
    const goalIds = goalDraftIds[email] ?? [];
    setGoalsSaving(true);
    setGoalsSaveStatus(null);
    try {
      const res = await fetch("/api/moderator/members/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, goalIds })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGoalsSaveStatus(data?.error || "Could not save goals.");
        return;
      }
      setGoalsSaveStatus(`Saved ${goalIds.length} goal${goalIds.length === 1 ? "" : "s"}.`);
      setProfileDetail((prev) => (prev ? { ...prev, goalIds } : prev));
      await loadMembers();
    } finally {
      setGoalsSaving(false);
    }
  };

  const sortedLibrary = useMemo(
    () =>
      library.slice().sort((a, b) => {
        const skuA = (a.skuCode || "").trim();
        const skuB = (b.skuCode || "").trim();
        if (skuA && !skuB) return -1;
        if (!skuA && skuB) return 1;
        if (skuA && skuB) {
          return skuA.localeCompare(skuB, undefined, { numeric: true, sensitivity: "base" });
        }
        return (a.title || "").localeCompare(b.title || "");
      }),
    [library]
  );

  const registeredMembers = useMemo(() => members.filter((member) => member.registered), [members]);

  const sortedMembers = useMemo(
    () => members.slice().sort((a, b) => memberSortKey(a).localeCompare(memberSortKey(b))),
    [members]
  );

  const filteredMembers = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    return sortedMembers.filter((member) => memberMatchesSearch(member, term));
  }, [clientSearch, sortedMembers]);

  const selectClient = (email: string) => {
    setStatus(null);
    setSelectedEmail(email);
    setConsolePanel("client");
  };

  const openConsolePanel = (panel: ConsolePanel) => {
    setStatus(null);
    setConsolePanel(panel);
    if (panel === "member-audios") void loadFacilitatorAudios();
  };

  const buildLineupIdLabels = (email: string) => {
    const idLabels = new Map<string, string>();
    library.forEach((item) => idLabels.set(item.id, trackLabel(item)));
    (schedulePreview[email] ?? []).forEach((night) => {
      night.tracks.forEach((track) => {
        if (track.id) idLabels.set(track.id, trackLabel(track));
      });
    });
    return idLabels;
  };

  const renderLineupPreview = (email: string, showLoading = false) => {
    const nights = schedulePreview[email] ?? [];
    const meta = schedulePreviewMeta[email];
    const idLabels = buildLineupIdLabels(email);
    const isLoading = showLoading && scheduleLoading && lineupMemberEmail === email;

    if (isLoading) {
      return <p style={{ fontSize: 13, color: "#64748b" }}>Loading nightly lineup…</p>;
    }

    if (nights.length === 0) {
      return (
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          {lineupMemberEmail === email && lineupMessage
            ? lineupMessage
            : "Assign goals (Gold) or rotation steps (Managed), then refresh the preview."}
        </p>
      );
    }

    return (
      <>
        {meta && (
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px", lineHeight: 1.5 }}>
            <strong>{tierLabel(meta.tier)}</strong> · {meta.playsPerNight} audio
            {meta.playsPerNight === 1 ? "" : "s"} per night · schedule night{" "}
            <strong>{meta.startScheduleNight ?? meta.currentNight}</strong> is tonight (
            {meta.completedScheduleNights} main plays completed)
            {meta.tier === "platinum_managed"
              ? ` · ${meta.rotationStepCount} rotation step${meta.rotationStepCount === 1 ? "" : "s"}`
              : ` · ${meta.goalCount} goal${meta.goalCount === 1 ? "" : "s"}`}
            . Preview starts at tonight (night 1 below).
          </p>
        )}
        <div style={{ maxHeight: 420, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>Upcoming</th>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>Audio lineup</th>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>Algorithm notes</th>
              </tr>
            </thead>
            <tbody>
              {nights.map((night) => (
                <tr key={night.night} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 10px", verticalAlign: "top", fontWeight: 600 }}>
                    {night.night}
                    {night.night === 1 ? (
                      <span style={{ color: "#047857", fontWeight: 500 }}> · tonight</span>
                    ) : null}
                    {night.scheduleNight && night.scheduleNight !== night.night ? (
                      <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 11 }}>
                        <br />
                        (schedule #{night.scheduleNight})
                      </span>
                    ) : null}
                  </td>
                  <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                    {night.tracks.length === 0
                      ? "—"
                      : night.tracks.map((track, index) => (
                          <div key={`${night.night}-${index}`}>{trackLabel(track)}</div>
                        ))}
                  </td>
                  <td style={{ padding: "8px 10px", verticalAlign: "top", color: "#64748b" }}>
                    {lineupAlgorithmNote(night, idLabels)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <section className="card">
        <p>Loading your clients…</p>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ marginBottom: 24 }}>
        <span className="pill">Facilitator Console</span>
        <h1>Welcome, {facilitatorName || "Facilitator"}</h1>
        <p>
          Manage members assigned to you — add clients, upload member audios, set Gold member goals,
          preview nightly lineups, and edit Platinum Managed rotations.
        </p>
      </section>

      {status && (
        <p className="card" style={{ marginBottom: 16, color: "#b91c1c" }} role="status">
          {status}
        </p>
      )}

      <div className="facilitator-console-layout">
        <section className="card facilitator-console-nav">
          <h2 style={{ marginTop: 0 }}>Clients</h2>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Client search</span>
            <input
              style={inputStyle}
              type="search"
              placeholder="Last name, first name, or email…"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              aria-label="Client search"
            />
          </label>
          <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0" }}>
            Sorted by last name, first name. Click a client to view details on the right.
          </p>
          {members.length === 0 ? (
            <p style={{ color: "#64748b", lineHeight: 1.6, marginTop: 12 }}>
              No clients yet. Use <strong>Add new member</strong> below, or ask admin to assign members.
            </p>
          ) : filteredMembers.length === 0 ? (
            <p style={{ color: "#64748b", marginTop: 12 }}>No matching clients.</p>
          ) : (
            <div className="stack" style={{ marginTop: 8, maxHeight: 320, overflowY: "auto" }}>
              {filteredMembers.map((member) => (
                <button
                  key={member.email}
                  type="button"
                  className="button button-secondary"
                  aria-pressed={selectedEmail === member.email && consolePanel === "client"}
                  style={{
                    textAlign: "left",
                    display: "block",
                    width: "100%",
                    background:
                      selectedEmail === member.email && consolePanel === "client"
                        ? "#ecfdf5"
                        : undefined,
                    borderColor:
                      selectedEmail === member.email && consolePanel === "client"
                        ? "#10b981"
                        : undefined
                  }}
                  onClick={() => selectClient(member.email)}
                >
                  <strong style={{ display: "block" }}>{memberSortDisplayName(member)}</strong>
                  <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {member.email}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {member.registered
                      ? tierLabel(member.subscriptionTier) + " · " + (member.subscriptionStatus ?? "inactive")
                      : "Not registered yet"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}
          >
            <button
              type="button"
              className={adminSectionToggleClass(consolePanel === "add-member", true)}
              onClick={() => openConsolePanel("add-member")}
            >
              Add new member
            </button>
            <button
              type="button"
              className={adminSectionToggleClass(consolePanel === "member-audios", true)}
              onClick={() => openConsolePanel("member-audios")}
            >
              Member audios{facilitatorAudios.length ? " (" + facilitatorAudios.length + ")" : ""}
            </button>
            <button
              type="button"
              className={adminSectionToggleClass(consolePanel === "lineup", true)}
              onClick={() => openConsolePanel("lineup")}
            >
              Audio lineup
            </button>
          </div>
        </section>

        <section className="card facilitator-console-main">
          {consolePanel === "add-member" && (
            <>
              <h2 style={{ marginTop: 0 }}>Add new member</h2>
              <div className="card" style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>
                  Creates a member account and assigns them to you automatically. They can sign in at{" "}
                  <strong>/member/login</strong> with the password you set. Use <strong>Inactive</strong> until
                  billing is set up, or <strong>Active</strong> for testing.
                </p>
                <div className="stack" style={{ gap: 8 }}>
                  <input
                    style={inputStyle}
                    placeholder="Email *"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="Temporary password (min 6 characters) *"
                    type="password"
                    autoComplete="new-password"
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="First name (optional)"
                    value={newMemberFirstName}
                    onChange={(e) => setNewMemberFirstName(e.target.value)}
                  />
                  <input
                    style={inputStyle}
                    placeholder="Last name (optional)"
                    value={newMemberLastName}
                    onChange={(e) => setNewMemberLastName(e.target.value)}
                  />
                  <select
                    style={inputStyle}
                    value={newMemberTier}
                    onChange={(e) =>
                      setNewMemberTier(e.target.value as "platinum" | "platinum_managed")
                    }
                  >
                    <option value="platinum">Gold Member</option>
                    <option value="platinum_managed">Platinum Managed Member</option>
                  </select>
                  <select
                    style={inputStyle}
                    value={newMemberStatus}
                    onChange={(e) =>
                      setNewMemberStatus(e.target.value as "inactive" | "active")
                    }
                  >
                    <option value="inactive">Inactive (until billing)</option>
                    <option value="active">Active</option>
                  </select>
                  <button type="button" className="button" onClick={() => void createAssignedMember()}>
                    Create member
                  </button>
                  {newMemberSaveStatus && (
                    <p
                      style={{
                        fontSize: 12,
                        margin: 0,
                        color: newMemberSaveStatus.includes("Could not") ? "#b91c1c" : "#047857"
                      }}
                    >
                      {newMemberSaveStatus}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          {consolePanel === "member-audios" && (
            <>
              <h2 style={{ marginTop: 0 }}>Member audios</h2>
              <div className="card" style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>
                  Upload recordings for your assigned members only. They appear in rotation pickers
                  and in the library for those members. Admin can later include a track in the
                  general library for everyone.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <button
                    type="button"
                    className={adminSectionToggleClass(audioListFilter === "all", true)}
                    onClick={() => setAudioListFilter("all")}
                  >
                    All ({facilitatorAudioCounts.all})
                  </button>
                  <button
                    type="button"
                    className={adminSectionToggleClass(audioListFilter === "private", true)}
                    onClick={() => setAudioListFilter("private")}
                  >
                    Private ({facilitatorAudioCounts.privateCount})
                  </button>
                  <button
                    type="button"
                    className={adminSectionToggleClass(audioListFilter === "in_library", true)}
                    onClick={() => setAudioListFilter("in_library")}
                  >
                    In library ({facilitatorAudioCounts.inLibraryCount})
                  </button>
                </div>
                {filteredFacilitatorAudios.length > 0 ? (
                  <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 13 }}>
                    {filteredFacilitatorAudios.map((row) => (
                      <li key={row.id} style={{ marginBottom: 6 }}>
                        <strong>{row.title}</strong>
                        {row.inGeneralCatalog ? (
                          <span style={{ color: "#047857", fontSize: 12 }}> · in general library</span>
                        ) : (
                          <span style={{ color: "#92400e", fontSize: 12 }}> · members only</span>
                        )}
                        <br />
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          {row.allowedUserEmails.length} member
                          {row.allowedUserEmails.length === 1 ? "" : "s"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>
                    No audios in this view.
                  </p>
                )}
                {members.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#92400e" }}>
                    Assign members before uploading audio.
                  </p>
                ) : (
                  <div className="stack" style={{ gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Members who can access this audio</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {members.map((m) => (
                        <label
                          key={m.email}
                          style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
                        >
                          <input
                            type="checkbox"
                            checked={audioMemberPick[m.email] ?? true}
                            onChange={(e) =>
                              setAudioMemberPick((p) => ({ ...p, [m.email]: e.target.checked }))
                            }
                          />
                          {memberLabel(m)}
                        </label>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        <span style={{ fontSize: 12 }}>Audio file (up to 100 MB)</span>
                        <input type="file" accept="audio/*" id="facilitator-audio-file" style={inputStyle} />
                      </label>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={audioUploading}
                        onClick={() => {
                          const el = document.getElementById(
                            "facilitator-audio-file"
                          ) as HTMLInputElement | null;
                          uploadFacilitatorAudioFile(el);
                        }}
                      >
                        {audioUploading ? "Uploading…" : "Upload file"}
                      </button>
                    </div>
                    {audioUploadStatus && (
                      <p style={{ fontSize: 12, margin: 0, color: "#475569" }}>{audioUploadStatus}</p>
                    )}
                    <input
                      style={inputStyle}
                      placeholder="Title *"
                      value={audioDraft.title}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Description *"
                      value={audioDraft.description}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, description: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Audio URL * (filled after upload)"
                      value={audioDraft.audioUrl}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, audioUrl: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="Cover URL (optional)"
                      value={audioDraft.coverUrl}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, coverUrl: e.target.value }))}
                    />
                    <input
                      style={inputStyle}
                      placeholder="SKU (optional)"
                      value={audioDraft.skuCode}
                      onChange={(e) => setAudioDraft((d) => ({ ...d, skuCode: e.target.value }))}
                    />
                    <button type="button" className="button" onClick={() => void saveFacilitatorAudio()}>
                      Save audio for selected members
                    </button>
                    {audioSaveStatus && (
                      <p style={{ fontSize: 12, color: "#047857", margin: 0 }}>{audioSaveStatus}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          {consolePanel === "lineup" && (
            <>
              <h2 style={{ marginTop: 0 }}>Audio lineup</h2>
              <div className="card" style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>
                  Upcoming audio lineup from tonight — same algorithm as the member app. Night 1 is
                  always tonight; higher numbers are upcoming nights.
                </p>
                {registeredMembers.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#92400e" }}>
                    No registered clients yet. Members must complete signup before a lineup can be
                    previewed.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "flex-end",
                        marginBottom: 12
                      }}
                    >
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Client</span>
                        <select
                          style={inputStyle}
                          value={lineupMemberEmail}
                          onChange={(e) => setLineupMemberEmail(e.target.value)}
                        >
                          {registeredMembers.map((member) => (
                            <option key={member.email} value={member.email}>
                              {memberLabel(member)} — {tierLabel(member.subscriptionTier)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Nights</span>
                        <select
                          style={{ ...inputStyle, width: 120 }}
                          value={lineupNights}
                          onChange={(e) => setLineupNights(Number(e.target.value))}
                        >
                          <option value={7}>7 nights</option>
                          <option value={14}>14 nights</option>
                          <option value={21}>21 nights</option>
                          <option value={30}>30 nights</option>
                          <option value={42}>42 nights</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className="button button-secondary"
                        disabled={!lineupMemberEmail || scheduleLoading}
                        onClick={() =>
                          lineupMemberEmail && void loadSchedulePreview(lineupMemberEmail, lineupNights)
                        }
                      >
                        {scheduleLoading ? "Loading…" : "Refresh lineup"}
                      </button>
                    </div>
                    {lineupMemberEmail ? renderLineupPreview(lineupMemberEmail, true) : null}
                  </>
                )}
              </div>
            </>
          )}
          {consolePanel === "client" && !selectedEmail ? (
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              Search for a client on the left and click their name to view profile, goals,
              rotation, and activity. Or use <strong>Add new member</strong>,{" "}
              <strong>Member audios</strong>, or <strong>Audio lineup</strong> in the sidebar.
            </p>
          ) : consolePanel === "client" && detailLoading ? (
            <p>Loading member details…</p>
          ) : consolePanel === "client" && selectedEmail ? (
            <>
              <h2 style={{ marginTop: 0 }}>{memberLabel(selectedMember!)}</h2>
              <p style={{ color: "#64748b", marginBottom: 16 }}>{selectedEmail}</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                <button
                  type="button"
                  className={adminSectionToggleClass(openClientSection === "summary", true)}
                  onClick={() => toggleClientSection("summary")}
                >
                  Client summary
                </button>
                {openClientSection === "summary" && (
                  <div className="card" style={{ marginTop: 4 }}>
                    <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
                      <div className="card" style={{ background: "#f8fafc" }}>
                        <strong>Goals</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 22 }}>
                          {activitySummary[selectedEmail]?.goalCount ?? memberGoalIds.length}
                        </p>
                      </div>
                      <div className="card" style={{ background: "#f8fafc" }}>
                        <strong>Schedule nights</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 22 }}>
                          {scheduleProgress?.completedScheduleNights ?? 0}
                        </p>
                      </div>
                      <div className="card" style={{ background: "#f8fafc" }}>
                        <strong>Last login</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                          {activitySummary[selectedEmail]?.lastLoginAt
                            ? new Date(activitySummary[selectedEmail].lastLoginAt!).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                      <div className="card" style={{ background: "#f8fafc" }}>
                        <strong>Last play</strong>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                          {activitySummary[selectedEmail]?.lastPlayAt
                            ? new Date(activitySummary[selectedEmail].lastPlayAt!).toLocaleString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="card" style={{ background: "#f8fafc" }}>
                      <h3 style={{ marginTop: 0 }}>Profile</h3>
                {!profileDetail?.registered ? (
                  <p style={{ color: "#92400e" }}>
                    This person has not completed signup yet. They will appear here once they
                    register.
                  </p>
                ) : (
                  <div className="stack" style={{ fontSize: 14 }}>
                    <p>
                      <strong>Tier:</strong> {tierLabel(profileDetail.subscriptionTier)} ·{" "}
                      {profileDetail.subscriptionStatus ?? "inactive"}
                    </p>
                    <p>
                      <strong>Session length:</strong>{" "}
                      {profileDetail.playsPerNight === 1
                        ? "Half session (1 audio/night)"
                        : "Full session (2 audios/night)"}
                    </p>
                    {profileDetail.profile?.contactNumber && (
                      <p><strong>Phone:</strong> {profileDetail.profile.contactNumber}</p>
                    )}
                    {profileDetail.profile?.timeZone && (
                      <p><strong>Time zone:</strong> {profileDetail.profile.timeZone}</p>
                    )}
                    {profileDetail.profile?.occupation && (
                      <p><strong>Occupation:</strong> {profileDetail.profile.occupation}</p>
                    )}
                  </div>
                )}
                    </div>
                  </div>
                )}

              {profileDetail?.registered && selectedEmail && (
                <>
                  <button
                    type="button"
                    className={adminSectionToggleClass(openClientSection === "notes", true)}
                    onClick={() => toggleClientSection("notes")}
                  >
                    Client notes
                  </button>
                  {openClientSection === "notes" && (
                    <div className="card" style={{ marginTop: 4, marginBottom: 8 }}>
                      <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, lineHeight: 1.5 }}>
                        Shared internal notes — admins and facilitators can see and edit these.
                        Not visible to the member.
                      </p>
                      <textarea
                        style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                        placeholder="Coaching notes, follow-ups, context for the team…"
                        value={notesDraft[selectedEmail] ?? ""}
                        onChange={(e) =>
                          setNotesDraft((prev) => ({
                            ...prev,
                            [selectedEmail]: e.target.value
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="button"
                        style={{ marginTop: 12 }}
                        disabled={notesSaving}
                        onClick={() => void saveMemberNotes(selectedEmail)}
                      >
                        {notesSaving ? "Saving notes…" : "Save client notes"}
                      </button>
                      {notesSaveStatus && (
                        <p
                          style={{
                            fontSize: 12,
                            marginTop: 8,
                            marginBottom: 0,
                            color: notesSaveStatus.includes("Could not") ? "#b91c1c" : "#047857"
                          }}
                        >
                          {notesSaveStatus}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {openIssues.filter((r) => r.memberEmail.toLowerCase() === selectedEmail.toLowerCase()).length >
                0 && (
                <>
                  <button
                    type="button"
                    className={adminSectionToggleClass(openClientSection === "issues", true)}
                    onClick={() => toggleClientSection("issues")}
                  >
                    Open issue reports (
                    {
                      openIssues.filter(
                        (r) => r.memberEmail.toLowerCase() === selectedEmail.toLowerCase()
                      ).length
                    }
                    )
                  </button>
                  {openClientSection === "issues" && (
                    <div className="card" style={{ marginTop: 4, marginBottom: 8 }}>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                        {openIssues
                          .filter((r) => r.memberEmail.toLowerCase() === selectedEmail.toLowerCase())
                          .map((issue) => (
                            <li key={issue.id} style={{ marginBottom: 8 }}>
                              <strong>{issue.subject}</strong> ({issue.status}) —{" "}
                              {new Date(issue.createdAt).toLocaleString()}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {profileDetail?.registered && selectedEmail && (
                <>
                  <button
                    type="button"
                    className={adminSectionToggleClass(openClientSection === "schedule", true)}
                    onClick={() => toggleClientSection("schedule")}
                  >
                    Audio lineup
                  </button>
                  {openClientSection === "schedule" && (
                    <div className="card" style={{ marginTop: 4, marginBottom: 8 }}>
                      {renderLineupPreview(selectedEmail, true)}
                    </div>
                  )}
                </>
              )}

              {isGold && profileDetail?.registered && selectedEmail && (
                <>
                  <button
                    type="button"
                    className={adminSectionToggleClass(openClientSection === "goals", true)}
                    onClick={() => toggleClientSection("goals")}
                  >
                    Goals (Gold){memberGoalIds.length ? ` — ${memberGoalIds.length}` : ""}
                  </button>
                  {openClientSection === "goals" && (
                <div className="card" style={{ marginTop: 4, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
                    Choose up to 10 goals in order. Nightly schedule audios come from these goals.
                  </p>
                  <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                    <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14 }}>
                      Selected goals (saved order)
                    </h4>
                    {memberGoalIds.length === 0 ? (
                      <p style={{ color: "#6b7280", margin: 0, fontSize: 13 }}>
                        No goals selected yet.
                      </p>
                    ) : (
                      <div className="goal-stack">
                        {memberGoalIds.map((goalId, index) => {
                          const goalName =
                            sortedGoals.find((g) => g.id === goalId)?.name || "Unknown goal";
                          return (
                            <div
                              key={goalId}
                              className="goal-item"
                              style={{ display: "flex", alignItems: "center", gap: 10 }}
                            >
                              <strong style={{ minWidth: 24 }}>{index + 1}.</strong>
                              <span style={{ flex: 1 }}>{goalName}</span>
                              <button
                                type="button"
                                className="button button-secondary"
                                style={{ padding: "6px 10px", fontSize: 12 }}
                                disabled={index === 0}
                                onClick={() => moveMemberGoal(selectedEmail, index, index - 1)}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                style={{ padding: "6px 10px", fontSize: 12 }}
                                disabled={index === memberGoalIds.length - 1}
                                onClick={() => moveMemberGoal(selectedEmail, index, index + 1)}
                              >
                                Down
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="card" style={{ marginTop: 12 }}>
                    <h4 style={{ marginTop: 0, marginBottom: 8, fontSize: 14 }}>Find goals</h4>
                    <input
                      style={inputStyle}
                      placeholder="Search goals"
                      value={goalSearch}
                      onChange={(e) => setGoalSearch(e.target.value)}
                    />
                    <div className="card goal-see-all-list" style={{ marginTop: 12 }}>
                      <div className="goal-all-scroll">
                        {filteredGoals.length === 0 ? (
                          <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
                            No goals match your search.
                          </p>
                        ) : (
                          filteredGoals.map((goal) => (
                            <label key={goal.id} className="goal-all-row">
                              <input
                                type="checkbox"
                                checked={memberGoalIds.includes(goal.id)}
                                disabled={
                                  !memberGoalIds.includes(goal.id) && memberGoalIds.length >= 10
                                }
                                onChange={() => toggleMemberGoal(selectedEmail, goal.id)}
                              />
                              <span className="goal-all-name">{goal.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600 }}>Current audios play list</label>
                    <p style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                      Up to 10 audios in this member&apos;s rotation from assigned goals.
                    </p>
                    <div className="goal-list">
                      {goalDerivedAudios.length === 0 ? (
                        <span style={{ color: "#6b7280", fontSize: 12 }}>
                          No audios in play list yet.
                        </span>
                      ) : (
                        goalDerivedAudios.map((item) => (
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
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="button"
                    style={{ marginTop: 12 }}
                    disabled={goalsSaving}
                    onClick={() => void saveMemberGoals(selectedEmail)}
                  >
                    {goalsSaving ? "Saving goals…" : "Save goals"}
                  </button>
                  {goalsSaveStatus && (
                    <p
                      style={{
                        fontSize: 12,
                        marginTop: 8,
                        marginBottom: 0,
                        color: goalsSaveStatus.includes("Could not") ? "#b91c1c" : "#047857"
                      }}
                    >
                      {goalsSaveStatus}
                    </p>
                  )}
                </div>
                  )}
                </>
              )}

              {scheduleProgress && openClientSection === "summary" && (
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                  Schedule progress: <strong>{scheduleProgress.completedScheduleNights}</strong> nights
                  complete · current night <strong>{scheduleProgress.currentNight}</strong>
                </p>
              )}

              {isManaged && (
                <>
                  <button
                    type="button"
                    className={adminSectionToggleClass(openClientSection === "rotation", true)}
                    onClick={() => toggleClientSection("rotation")}
                  >
                    Rotation order (Managed)
                  </button>
                  {openClientSection === "rotation" && (
                <div className="card" style={{ marginTop: 4, marginBottom: 8 }}>
                  <h3 style={{ marginTop: 0 }}>Rotation order (Platinum Managed)</h3>
                  <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
                    This is the member&apos;s live schedule. Each add, move, or remove saves
                    automatically. Same recording may appear up to {MANAGED_MAX_SLOTS_PER_AUDIO}{" "}
                    times.
                  </p>
                  {rotationLoading ? (
                    <p style={{ fontSize: 13, color: "#2563eb" }}>Loading rotation…</p>
                  ) : rotationOrder.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#6b7280" }}>
                      No steps yet — add a recording below.
                    </p>
                  ) : (
                    <ol style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                      {rotationOrder.map((slotId, idx) => {
                        const libItem = library.find((x) => x.id === slotId);
                        const label =
                          [libItem?.skuCode, libItem?.title].filter(Boolean).join(" – ") || slotId;
                        return (
                          <li
                            key={`slot-${idx}-${slotId}`}
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8
                            }}
                          >
                            <span style={{ fontWeight: 700, color: "#15803d", minWidth: 36 }}>
                              #{idx + 1}
                            </span>
                            <span style={{ flex: "1 1 140px" }}>{label}</span>
                            <button
                              type="button"
                              className="button button-secondary"
                              style={{ padding: "2px 10px", fontSize: 12 }}
                              disabled={idx === 0}
                              onClick={() => moveRotationSlot(idx, "up")}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              className="button button-secondary"
                              style={{ padding: "2px 10px", fontSize: 12 }}
                              disabled={idx >= rotationOrder.length - 1}
                              onClick={() => moveRotationSlot(idx, "down")}
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              className="button button-secondary"
                              style={{ padding: "2px 10px", fontSize: 12 }}
                              onClick={() => removeRotationSlot(idx)}
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <select
                      aria-label="Choose recording to add"
                      value={pickerId}
                      disabled={rotationLoading}
                      onChange={(e) => setPickerId(e.target.value)}
                      style={{ ...inputStyle, maxWidth: 360, flex: "1 1 240px" }}
                    >
                      <option value="">Choose recording…</option>
                      {sortedLibrary.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.skuCode ? `${item.skuCode} — ` : ""}
                          {item.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="button button-secondary"
                      disabled={rotationLoading || !pickerId}
                      onClick={addRotationSlot}
                    >
                      Add at end
                    </button>
                  </div>
                  {rotationSaveStatus && (
                    <p style={{ fontSize: 12, color: "#047857", marginTop: 8 }}>{rotationSaveStatus}</p>
                  )}
                </div>
                  )}
                </>
              )}

              <button
                type="button"
                className={adminSectionToggleClass(openClientSection === "activity", true)}
                onClick={() => toggleClientSection("activity")}
              >
                Recent activity
              </button>
              {openClientSection === "activity" && (
              <div className="card" style={{ marginTop: 4 }}>
                <h3 style={{ marginTop: 0 }}>Recent activity</h3>
                {activity.length === 0 ? (
                  <p style={{ color: "#6b7280" }}>No activity recorded yet.</p>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: "auto" }}>
                    <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "6px 8px" }}>When</th>
                          <th style={{ padding: "6px 8px" }}>Action</th>
                          <th style={{ padding: "6px 8px" }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.map((row) => (
                          <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 8px", verticalAlign: "top" }}>
                              {new Date(row.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: "6px 8px", verticalAlign: "top" }}>{row.action}</td>
                            <td style={{ padding: "6px 8px", verticalAlign: "top", color: "#64748b" }}>
                              {row.details || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}
              </div>
            </>

          ) : null}
        </section>
      </div>
    </>
  );
}
