"use client";

import { put } from "@vercel/blob/client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Interest } from "@/lib/types";
import { filterLibraryBySearch } from "@/lib/library-search";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";
import AdminAudioPreview from "@/components/AdminAudioPreview";

function sanitizePathSegment(name: string): string {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || "audio";
}

type LibraryItem = {
  id: string;
  title: string;
  description: string;
  skuCode?: string;
  fileName?: string;
  categories?: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  order: number;
  isAdult?: boolean;
  allowedUserEmails?: string[];
  moderatorId?: string | null;
  inGeneralCatalog?: boolean;
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

function getFileNameFromAudioUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  try {
    const withoutQuery = url.split("?")[0];
    const segment = withoutQuery.split("/").filter(Boolean).pop();
    return segment || "";
  } catch {
    return "";
  }
}

type LibraryCategoryFilter =
  | "all"
  | "General"
  | "Special"
  | "CGMR"
  | "facilitator_private"
  | "facilitator_all";

const isFacilitatorPrivate = (item: LibraryItem) =>
  Boolean(item.moderatorId) && !item.inGeneralCatalog;
const isFacilitatorTrack = (item: LibraryItem) => Boolean(item.moderatorId);

type AdminContentProps = {
  openGoals: boolean;
  openLibrary: boolean;
  isFirstAdmin?: boolean | null;
};

export default function AdminContent({ openGoals, openLibrary, isFirstAdmin }: AdminContentProps) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [populateFilenamesStatus, setPopulateFilenamesStatus] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState<Interest | null>(null);
  const [librarySort, setLibrarySort] = useState<"title" | "sku">("title");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<LibraryCategoryFilter>("General");
  const [bulkCatalogStatus, setBulkCatalogStatus] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<LibraryItem | null>(null);
  const [editInterestIds, setEditInterestIds] = useState<string[]>([]);
  const [goalSearch, setGoalSearch] = useState("");
  const [goalAudioA, setGoalAudioA] = useState<string>("");
  const [goalAudioB, setGoalAudioB] = useState<string>("");
  const [goalAudioC, setGoalAudioC] = useState<string>("");
  const [uploadAudioStatus, setUploadAudioStatus] = useState<string | null>(null);
  const [uploadAudioLoading, setUploadAudioLoading] = useState(false);
  const [uploadCoverStatus, setUploadCoverStatus] = useState<string | null>(null);
  const [uploadCoverLoading, setUploadCoverLoading] = useState(false);
  const [editCoverStatus, setEditCoverStatus] = useState<string | null>(null);
  const [editCoverLoading, setEditCoverLoading] = useState(false);
  const [editAudioStatus, setEditAudioStatus] = useState<string | null>(null);
  const [editAudioLoading, setEditAudioLoading] = useState(false);
  const [libraryAddStatus, setLibraryAddStatus] = useState<string | null>(null);
  const [libraryAddSuccess, setLibraryAddSuccess] = useState<string | null>(null);
  const [addFormPreviewUrl, setAddFormPreviewUrl] = useState<string | null>(null);
  const [addNewAudioOpen, setAddNewAudioOpen] = useState(false);
  const addLibraryFormRef = useRef<HTMLFormElement>(null);
  const editCoverInputRef = useRef<HTMLInputElement | null>(null);
  const editAudioInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    const [interestRes, libraryRes] = await Promise.all([
      fetch("/api/interests", { cache: "no-store", credentials: "include" }),
      fetch("/api/library", { cache: "no-store", credentials: "include" })
    ]);
    if (!interestRes.ok || !libraryRes.ok) {
      setStatus("Admin session required.");
      return;
    }
    const interestData = await interestRes.json();
    const libraryData = await libraryRes.json();
    setInterests(interestData.interests || []);
    setLibrary(
      (libraryData.library || []).sort(
        (a: LibraryItem, b: LibraryItem) => a.order - b.order
      )
    );
  };

  useEffect(() => {
    load();
  }, []);

  const interestOptions = useMemo(() => {
    return interests
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((interest) => ({
        value: interest.id,
        label: interest.name
      }));
  }, [interests]);

  const interestNameById = useMemo(() => {
    const map = new Map<string, string>();
    interests.forEach((i) => map.set(i.id, i.name));
    return map;
  }, [interests]);

  const formatGoalIdsForAdmin = (ids: string[]) => {
    if (!ids.length) return null;
    return ids.map((id) => interestNameById.get(id) || id).join("; ");
  };

  const filteredGoals = useMemo(() => {
    const term = goalSearch.trim().toLowerCase();
    const sorted = interests.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter((g) => g.name.toLowerCase().includes(term));
  }, [interests, goalSearch]);

  const sortedLibrary = useMemo(() => {
    const copy = [...library];
    if (librarySort === "sku") {
      return copy.sort((a, b) => {
        const skuA = (a.skuCode || "").trim();
        const skuB = (b.skuCode || "").trim();
        if (skuA && !skuB) return -1;
        if (!skuA && skuB) return 1;
        if (skuA && skuB) {
          return skuA.localeCompare(skuB, undefined, { numeric: true, sensitivity: "base" });
        }
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      });
    }
    return copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }, [library, librarySort]);

  const hasCategory = (item: LibraryItem, cat: string) =>
    (item.categories || []).some((c) => c.toLowerCase() === cat.toLowerCase());
  const filteredLibrary = useMemo(() => {
    if (libraryCategoryFilter === "all") return sortedLibrary;
    if (libraryCategoryFilter === "CGMR") return sortedLibrary.filter((item) => hasCategory(item, "cgmr"));
    if (libraryCategoryFilter === "Special") return sortedLibrary.filter((item) => hasCategory(item, "special"));
    if (libraryCategoryFilter === "General")
      return sortedLibrary.filter((item) => !hasCategory(item, "cgmr") && !hasCategory(item, "special"));
    if (libraryCategoryFilter === "facilitator_private")
      return sortedLibrary.filter(isFacilitatorPrivate);
    if (libraryCategoryFilter === "facilitator_all") return sortedLibrary.filter(isFacilitatorTrack);
    return sortedLibrary;
  }, [sortedLibrary, libraryCategoryFilter]);

  const searchFilteredLibrary = useMemo(() => {
    return filterLibraryBySearch(filteredLibrary, librarySearch, interests);
  }, [filteredLibrary, librarySearch, interests]);

  const facilitatorLibraryCounts = useMemo(() => {
    const facilitatorAll = library.filter(isFacilitatorTrack).length;
    const facilitatorPrivate = library.filter(isFacilitatorPrivate).length;
    return { facilitatorAll, facilitatorPrivate };
  }, [library]);

  const addInterest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const buildPractice = formData.get("buildPractice") === "on";
    const payload = {
      name: formData.get("name"),
      description: formData.get("description"),
      isAdult: formData.get("adultContent") === "on",
      categories: buildPractice ? ["special"] : []
    };
    const response = await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });
    if (response.ok) {
      form.reset();
      setStatus(null);
      await load();
    } else {
      setStatus("Failed to add goal. Try again.");
    }
  };

  const deleteInterest = async (id: string) => {
    await fetch("/api/interests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    await load();
  };

  const startGoalEdit = (interest: Interest) => {
    setEditingGoalId(interest.id);
    setGoalDraft({ ...interest });
    setGoalAudioA(interest.audioIdA || "");
    setGoalAudioB(interest.audioIdB || "");
    setGoalAudioC(interest.audioIdC || "");
  };

  const cancelGoalEdit = () => {
    setEditingGoalId(null);
    setGoalDraft(null);
    setGoalAudioA("");
    setGoalAudioB("");
    setGoalAudioC("");
  };

  const saveGoalEditWithAudio = async () => {
    if (!goalDraft) return;
    const response = await fetch("/api/interests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: goalDraft.id,
        name: goalDraft.name,
        description: goalDraft.description || "",
        audioIdA: goalAudioA || null,
        audioIdB: goalAudioB || null,
        audioIdC: goalAudioC || null,
        isAdult: goalDraft.isAdult ?? false,
        categories: goalDraft.categories ?? []
      })
    });
    if (response.ok) {
      cancelGoalEdit();
      await load();
    }
  };

  const fillAddFormFromUpload = async (fileName: string, audioUrl: string) => {
    setAddNewAudioOpen(true);
    const addForm = addLibraryFormRef.current;
    if (!addForm || !audioUrl) return;
    (addForm.elements.namedItem("audioUrl") as HTMLInputElement).value = audioUrl;
    (addForm.elements.namedItem("fileName") as HTMLInputElement).value = fileName || "";
    setAddFormPreviewUrl(audioUrl);
    setLibraryAddSuccess(null);
    setLibraryAddStatus(null);
    try {
      const res = await fetch(
        `/api/admin/recording-metadata?fileName=${encodeURIComponent(fileName)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          title?: string;
          description?: string;
          skuCode?: string | null;
          coverUrl?: string;
        };
        const titleEl = addForm.elements.namedItem("title") as HTMLInputElement;
        const descEl = addForm.elements.namedItem("description") as HTMLTextAreaElement;
        const skuEl = addForm.elements.namedItem("skuCode") as HTMLInputElement;
        const coverEl = addForm.elements.namedItem("coverUrl") as HTMLInputElement;
        if (data.title && !titleEl.value.trim()) titleEl.value = data.title;
        if (data.description && !descEl.value.trim()) descEl.value = data.description;
        if (data.skuCode && !skuEl.value.trim()) skuEl.value = data.skuCode;
        if (data.coverUrl && !coverEl.value.trim()) coverEl.value = data.coverUrl;
      }
    } catch {
      // Metadata lookup is optional; upload still succeeded.
    }
    addForm.scrollIntoView({ behavior: "smooth", block: "start" });
    (addForm.elements.namedItem("title") as HTMLInputElement)?.focus();
  };

  const addLibraryItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const interestIds = formData.getAll("interestIds") as string[];
    const allowedUsersRaw = String(formData.get("allowedUserEmails") || "").trim();
    const allowedUserEmails = allowedUsersRaw
      ? allowedUsersRaw.split(",").map((email) => email.trim()).filter(Boolean)
      : [];
    const categoriesRaw = String(formData.get("categories") || "").trim();
    let categories = categoriesRaw
      ? categoriesRaw.split(",").map((category) => category.trim()).filter(Boolean)
      : [];
    if (formData.get("categoryGeneral") === "on") {
      if (!categories.some((c) => c.toLowerCase() === "general")) categories.push("General");
    }
    if (formData.get("categorySpecial") === "on") {
      if (!categories.some((c) => c.toLowerCase() === "special")) categories.push("Special");
    }
    if (formData.get("categoryCgmr") === "on") {
      if (!categories.some((c) => c.toLowerCase() === "cgmr")) categories.push("CGMR");
    }
    if (categories.length === 0) categories = ["General"];
    if (formData.get("buildPractice") === "on") {
      if (!categories.some((c) => c.toLowerCase() === "special")) categories = [...categories, "special"];
    }
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      skuCode: formData.get("skuCode") || "",
      fileName: formData.get("fileName") || "",
      categories,
      coverUrl: formData.get("coverUrl") || "",
      audioUrl: formData.get("audioUrl") || "",
      interestIds,
      allowedUserEmails,
      isAdult: formData.get("adultContent") === "on"
    };
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setStatus(null);
      setLibraryAddStatus(null);
      setLibraryAddSuccess("Audio added to the library. Assign it to goals below if needed.");
      setAddFormPreviewUrl(null);
      event.currentTarget.reset();
      await load();
    } else {
      const data = await response.json().catch(() => ({}));
      const err = data?.error || "Failed to add item.";
      setLibraryAddSuccess(null);
      setLibraryAddStatus(err);
      setStatus(err);
    }
  };

  const uploadAudioFileToBlob = async (file: File): Promise<string> => {
    const pathname = `audios/${sanitizePathSegment(file.name.replace(/\.[^.]+$/, "") || "audio")}${file.name.match(/\.[^.]+$/)?.[0] || ".mp3"}`;
    const useMultipart = file.size > 5 * 1024 * 1024;
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
      throw new Error(
        tokenRes.status === 401
          ? "Log in as admin and try again."
          : tokenData?.error || tokenRes.statusText || String(tokenRes.status)
      );
    }
    const clientToken = tokenData?.clientToken;
    if (!clientToken) {
      throw new Error("No token from server.");
    }
    const blob = await put(pathname, file, {
      access: "public",
      token: clientToken,
      multipart: useMultipart
    });
    const url = blob?.url || "";
    if (!url) {
      throw new Error("Upload completed but no URL returned.");
    }
    return url;
  };

  const uploadAudio = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("uploadAudioFile") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setUploadAudioStatus("Choose an audio file first.");
      return;
    }
    setUploadAudioStatus(null);
    setUploadAudioLoading(true);
    try {
      const url = await uploadAudioFileToBlob(file);
      setUploadAudioStatus(
        `Uploaded: ${file.name}. Title, SKU, and description were filled in Step 2 when available — review and click Add Audio.`
      );
      await fillAddFormFromUpload(file.name, url);
      if (fileInput) fileInput.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadAudioStatus(`Upload failed: ${msg}. Ensure you're logged in as admin and BLOB_READ_WRITE_TOKEN is set.`);
    } finally {
      setUploadAudioLoading(false);
    }
  };

  const uploadCoverFromFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/upload-cover", {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.url) {
      throw new Error(data?.error || `Upload failed (${response.status}).`);
    }
    return String(data.url);
  };

  const uploadCoverForAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("uploadCoverFile") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      setUploadCoverStatus("Choose a cover image first.");
      return;
    }
    setUploadCoverStatus(null);
    setUploadCoverLoading(true);
    try {
      const url = await uploadCoverFromFile(file);
      setUploadCoverStatus(`Uploaded: ${file.name}. Cover URL was filled in Step 2.`);
      const addForm = addLibraryFormRef.current;
      if (addForm && url) {
        setAddNewAudioOpen(true);
        (addForm.elements.namedItem("coverUrl") as HTMLInputElement).value = url;
        addForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (fileInput) fileInput.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUploadCoverStatus(`Upload failed: ${msg}`);
    } finally {
      setUploadCoverLoading(false);
    }
  };

  const uploadAudioForEdit = async () => {
    if (!editDraft) {
      setEditAudioStatus("Open an audio in Edit mode first.");
      return;
    }
    const fileInput = editAudioInputRef.current;
    const file = fileInput?.files?.[0];
    if (!file) {
      setEditAudioStatus("Choose an audio file first.");
      return;
    }
    setEditAudioStatus(null);
    setEditAudioLoading(true);
    try {
      const url = await uploadAudioFileToBlob(file);
      setEditDraft({
        ...editDraft,
        audioUrl: url,
        fileName: file.name
      });
      setEditAudioStatus(
        `Uploaded: ${file.name}. Audio URL and file name were updated — click Save to keep changes.`
      );
      if (fileInput) fileInput.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setEditAudioStatus(`Upload failed: ${msg}. Ensure you're logged in as admin and BLOB_READ_WRITE_TOKEN is set.`);
    } finally {
      setEditAudioLoading(false);
    }
  };

  const uploadCoverForEdit = async () => {
    if (!editDraft) {
      setEditCoverStatus("Open an audio in Edit mode first.");
      return;
    }
    const fileInput = editCoverInputRef.current;
    const file = fileInput?.files?.[0];
    if (!file) {
      setEditCoverStatus("Choose a cover image first.");
      return;
    }
    setEditCoverStatus(null);
    setEditCoverLoading(true);
    try {
      const url = await uploadCoverFromFile(file);
      setEditDraft({ ...editDraft, coverUrl: url });
      setEditCoverStatus(`Uploaded: ${file.name}. Click Save to keep this cover.`);
      if (fileInput) fileInput.value = "";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setEditCoverStatus(`Upload failed: ${msg}`);
    } finally {
      setEditCoverLoading(false);
    }
  };

  const populateFilenamesFromUrls = async () => {
    setPopulateFilenamesStatus(null);
    try {
      const response = await fetch("/api/admin/library-populate-filenames", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPopulateFilenamesStatus(data.error || "Failed");
        return;
      }
      setPopulateFilenamesStatus(`Updated ${data.updated ?? 0} of ${data.total ?? 0} file name(s).`);
      const libraryRes = await fetch("/api/library");
      const libraryData = await libraryRes.json();
      setLibrary(
        (libraryData.library || []).sort(
          (a: LibraryItem, b: LibraryItem) => a.order - b.order
        )
      );
    } catch (e) {
      setPopulateFilenamesStatus("Error: " + String(e));
    }
  };

  const syncLibraryMetadata = async () => {
    setSyncStatus(null);
    const response = await fetch("/api/admin/library-sync", { method: "POST" });
    if (!response.ok) {
      setSyncStatus("Sync failed. Admin session required.");
      return;
    }
    const data = await response.json();
    setSyncStatus(
      `Sync complete. Updated ${data.updated ?? 0} items. Skipped ${data.skipped ?? 0}.`
    );
    await load();
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const index = library.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= library.length) {
      return;
    }
    const reordered = [...library];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setLibrary(reordered);
    await fetch("/api/library", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((item) => item.id) })
    });
    await load();
  };

  const startEdit = (item: LibraryItem) => {
    setEditingId(item.id);
    setEditDraft({ ...item });
    setEditInterestIds(item.interestIds);
    setEditCoverStatus(null);
    setEditAudioStatus(null);
    if (editCoverInputRef.current) editCoverInputRef.current.value = "";
    if (editAudioInputRef.current) editAudioInputRef.current.value = "";
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditInterestIds([]);
    setEditCoverStatus(null);
    setEditCoverLoading(false);
    setEditAudioStatus(null);
    setEditAudioLoading(false);
    if (editCoverInputRef.current) editCoverInputRef.current.value = "";
    if (editAudioInputRef.current) editAudioInputRef.current.value = "";
  };

  const promoteFacilitatorPrivateToCatalog = async () => {
    const items = searchFilteredLibrary.filter(isFacilitatorPrivate);
    if (items.length === 0) {
      setBulkCatalogStatus("No facilitator-private tracks in this view.");
      return;
    }
    setBulkCatalogStatus("Promoting tracks to general catalog…");
    let promoted = 0;
    for (const item of items) {
      const response = await fetch("/api/library", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          description: item.description,
          skuCode: item.skuCode || "",
          fileName: item.fileName || "",
          categories: item.categories || [],
          coverUrl: item.coverUrl || "",
          audioUrl: item.audioUrl || "",
          interestIds: item.interestIds || [],
          allowedUserEmails: item.allowedUserEmails || [],
          isAdult: item.isAdult || false,
          inGeneralCatalog: true
        })
      });
      if (response.ok) promoted += 1;
    }
    await load();
    setBulkCatalogStatus(`Promoted ${promoted} of ${items.length} track(s) to general catalog.`);
  };

  const saveEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editDraft) {
      return;
    }
    const payload = {
      id: editDraft.id,
      title: editDraft.title,
      description: editDraft.description,
      skuCode: editDraft.skuCode || "",
      fileName: editDraft.fileName || "",
      categories: editDraft.categories || [],
      coverUrl: editDraft.coverUrl || "",
      audioUrl: editDraft.audioUrl || "",
      interestIds: editInterestIds,
      allowedUserEmails: editDraft.allowedUserEmails || [],
      isAdult: editDraft.isAdult || false,
      inGeneralCatalog: editDraft.inGeneralCatalog ?? true
    };
    const response = await fetch("/api/library", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setStatus(null);
      cancelEdit();
      await load();
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus(data?.error || "Failed to save.");
    }
  };

  return (
    <div className="grid" style={{ gap: 24 }}>
      {status && <p>{status}</p>}
      {openGoals && (
        <section id="admin-goals" className="card">
          <h3 style={{ marginTop: 0 }}>Goals</h3>
          <input
            placeholder="Search goals..."
            value={goalSearch}
            onChange={(e) => setGoalSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 320, marginBottom: 16 }}
          />
          <div className="admin-goals-list">
            {filteredGoals.map((interest) => (
              <div key={interest.id} className="admin-goal-row">
                {editingGoalId === interest.id && goalDraft ? (
                  <div className="admin-goal-edit">
                    <input
                      style={inputStyle}
                      value={goalDraft.name}
                      onChange={(e) =>
                        setGoalDraft({ ...goalDraft, name: e.target.value })
                      }
                      placeholder="Goal name"
                    />
                    <input
                      style={inputStyle}
                      value={goalDraft.description || ""}
                      onChange={(e) =>
                        setGoalDraft({ ...goalDraft, description: e.target.value })
                      }
                      placeholder="Description"
                    />
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!goalDraft.isAdult}
                          onChange={(e) =>
                            setGoalDraft({ ...goalDraft, isAdult: e.target.checked })
                          }
                        />
                        Adult content (18+)
                      </label>
                      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={(goalDraft.categories || []).some((c) => c.toLowerCase() === "special")}
                          onChange={(e) => {
                            const cats = goalDraft.categories || [];
                            const hasSpecial = cats.some((c) => c.toLowerCase() === "special");
                            const next = e.target.checked
                              ? hasSpecial ? cats : [...cats, "special"]
                              : cats.filter((c) => c.toLowerCase() !== "special");
                            setGoalDraft({ ...goalDraft, categories: next });
                          }}
                        />
                        Build Practice
                      </label>
                    </div>
                    <div className="admin-goal-audio-slots">
                      <label>Audio files — play order follows A → B → C in the nightly cycle</label>
                      <div className="grid grid-3" style={{ gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>A (1st in play cycle)</label>
                          <select
                            value={goalAudioA}
                            onChange={(e) => setGoalAudioA(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="">— None —</option>
                            {sortedLibrary.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.skuCode || "—"} {item.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>B (2nd in play cycle)</label>
                          <select
                            value={goalAudioB}
                            onChange={(e) => setGoalAudioB(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="">— None —</option>
                            {sortedLibrary.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.skuCode || "—"} {item.title}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>C (3rd in play cycle)</label>
                          <select
                            value={goalAudioC}
                            onChange={(e) => setGoalAudioC(e.target.value)}
                            style={inputStyle}
                          >
                            <option value="">— None —</option>
                            {sortedLibrary.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.skuCode || "—"} {item.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="button" onClick={saveGoalEditWithAudio} type="button">
                        Save
                      </button>
                      <button
                        className="button button-secondary"
                        onClick={cancelGoalEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="admin-goal-name">{interest.name}</span>
                    <div className="admin-goal-meta" title="Play order: A → B → C">
                      {[interest.audioIdA, interest.audioIdB, interest.audioIdC]
                        .filter(Boolean)
                        .map((id, i) => (
                          <span key={id} className="admin-goal-slot-badge" title={`${["1st", "2nd", "3rd"][i]} in play cycle`}>
                            {["A", "B", "C"][i]}
                          </span>
                        ))}
                      {(interest.isAdult || (interest.categories || []).some((c) => c.toLowerCase() === "special")) && (
                        <span style={{ marginLeft: 8 }}>
                          {interest.isAdult && <span style={{ fontSize: 11, background: "#fef3c7", padding: "2px 6px", borderRadius: 4 }}>Adult</span>}
                          {(interest.categories || []).some((c) => c.toLowerCase() === "special") && (
                            <span style={{ fontSize: 11, background: "#dbeafe", padding: "2px 6px", borderRadius: 4, marginLeft: interest.isAdult ? 4 : 0 }}>Build Practice</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="button button-secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => startGoalEdit(interest)}
                      >
                        Edit
                      </button>
                      <button
                        className="button button-secondary"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => deleteInterest(interest.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={addInterest} className="grid" style={{ marginTop: 16, maxWidth: 400 }}>
            <input name="name" placeholder="New goal name" required style={inputStyle} />
            <input name="description" placeholder="Description" style={inputStyle} />
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" name="adultContent" />
                Adult content (18+)
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" name="buildPractice" />
                Build Practice
              </label>
            </div>
            <button className="button" type="submit">
              Add Goal
            </button>
          </form>
        </section>
      )}

      {openLibrary && (
        <section id="admin-audio-library" className="card">
        <div style={{ marginBottom: addNewAudioOpen ? 16 : 0 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
              marginBottom: 8
            }}
          >
            <h2 style={{ margin: 0 }}>Audio library</h2>
            <button
              type="button"
              className={adminSectionToggleClass(addNewAudioOpen)}
              onClick={() => setAddNewAudioOpen((open) => !open)}
              aria-expanded={addNewAudioOpen}
              aria-controls="admin-add-new-audio-panel"
            >
              {addNewAudioOpen ? "Hide add new audio" : "Add new audio"}
            </button>
          </div>
          {!addNewAudioOpen && (
            <p style={{ color: "#4b5563", margin: 0, fontSize: 14 }}>
              Search and edit tracks below, or use <strong>Add new audio</strong> to upload a
              recording.
            </p>
          )}
        </div>
        <div
          id="admin-facilitator-library-filters"
          className="card"
          style={{
            marginBottom: 16,
            padding: 14,
            background: "#f8fafc",
            border: "1px solid #e2e8f0"
          }}
        >
          <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>
            Facilitator library filters
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
            Use <strong>Facilitator (private)</strong> for member-only uploads, or{" "}
            <strong>Facilitator (all)</strong> for every facilitator track. Promote private tracks
            to include them in the general member library.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              className={adminSectionToggleClass(libraryCategoryFilter === "facilitator_private", true)}
              onClick={() => setLibraryCategoryFilter("facilitator_private")}
            >
              Private ({facilitatorLibraryCounts.facilitatorPrivate})
            </button>
            <button
              type="button"
              className={adminSectionToggleClass(libraryCategoryFilter === "facilitator_all", true)}
              onClick={() => setLibraryCategoryFilter("facilitator_all")}
            >
              Facilitator all ({facilitatorLibraryCounts.facilitatorAll})
            </button>
            <button
              type="button"
              className={adminSectionToggleClass(libraryCategoryFilter === "General", true)}
              onClick={() => setLibraryCategoryFilter("General")}
            >
              General catalog
            </button>
            <button
              type="button"
              className={adminSectionToggleClass(libraryCategoryFilter === "all", true)}
              onClick={() => setLibraryCategoryFilter("all")}
            >
              Show all tracks
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center"
            }}
          >
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Search
              <input
                type="search"
                placeholder="Keywords, title, SKU, goal..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  minWidth: 160
                }}
              />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Library view
              <select
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                value={libraryCategoryFilter}
                onChange={(event) =>
                  setLibraryCategoryFilter(event.target.value as LibraryCategoryFilter)
                }
              >
                <option value="all">All</option>
                <option value="General">General</option>
                <option value="Special">Special</option>
                <option value="CGMR">CGMR</option>
                <option value="facilitator_private">
                  Facilitator (private) ({facilitatorLibraryCounts.facilitatorPrivate})
                </option>
                <option value="facilitator_all">
                  Facilitator (all) ({facilitatorLibraryCounts.facilitatorAll})
                </option>
              </select>
            </label>
            {(libraryCategoryFilter === "facilitator_private" ||
              libraryCategoryFilter === "facilitator_all") && (
              <button
                type="button"
                className="button button-secondary"
                disabled={libraryCategoryFilter !== "facilitator_private"}
                onClick={() => void promoteFacilitatorPrivateToCatalog()}
              >
                Promote visible private tracks to library
              </button>
            )}
            {bulkCatalogStatus && (
              <span style={{ fontSize: 13, color: "#64748b" }}>{bulkCatalogStatus}</span>
            )}
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              Sort by
              <select
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
                value={librarySort}
                onChange={(event) => setLibrarySort(event.target.value as "title" | "sku")}
              >
                <option value="title">Title (default)</option>
                <option value="sku">SKU</option>
              </select>
            </label>
          </div>
          {libraryCategoryFilter === "facilitator_private" &&
            facilitatorLibraryCounts.facilitatorPrivate === 0 && (
              <p style={{ margin: "12px 0 0", fontSize: 13, color: "#6b7280" }}>
                No facilitator-private tracks yet. Facilitators upload these from their console under{" "}
                <strong>Member audios</strong>.
              </p>
            )}
        </div>
        {addNewAudioOpen && (
        <div id="admin-add-new-audio-panel">
        <p style={{ color: "#4b5563", marginBottom: 16 }}>
          Upload → review auto-filled details → Add Audio → assign to goals (A/B/C) or members.
        </p>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Step 1: Upload an audio file (optional)</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            Upload an MP3, M4A, WAV, or OGG (up to 100 MB). The file is stored in the cloud (Vercel Blob). On success, the <strong>Audio URL</strong> and <strong>File name</strong> are filled in Step 2 below.
          </p>
          <p style={{ fontSize: 13, color: "#059669", marginBottom: 12, fontWeight: 500 }}>
            Next: Complete Step 2 (title, description, Add Audio) to add it to the library. Then you can assign it to goals and/or members.
          </p>
          <form onSubmit={uploadAudio} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13 }}>File</span>
              <input
                name="uploadAudioFile"
                type="file"
                accept="audio/*"
                style={{ ...inputStyle, maxWidth: 320 }}
                disabled={uploadAudioLoading}
              />
            </label>
            <button className="button" type="submit" disabled={uploadAudioLoading}>
              {uploadAudioLoading ? "Uploading…" : "Upload"}
            </button>
          </form>
          {uploadAudioStatus && <p style={{ marginTop: 12, marginBottom: 0 }}>{uploadAudioStatus}</p>}
        </div>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Step 1B: Upload a cover image (optional)</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>
            Choose a PNG, JPG, WEBP, GIF, or SVG from your computer (up to 10 MB). On success, the
            <strong> Cover URL</strong> field in Step 2 is filled automatically.
          </p>
          <form onSubmit={uploadCoverForAdd} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 13 }}>Cover file</span>
              <input
                name="uploadCoverFile"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                style={{ ...inputStyle, maxWidth: 320 }}
                disabled={uploadCoverLoading}
              />
            </label>
            <button className="button" type="submit" disabled={uploadCoverLoading}>
              {uploadCoverLoading ? "Uploading…" : "Upload cover"}
            </button>
          </form>
          {uploadCoverStatus && <p style={{ marginTop: 12, marginBottom: 0 }}>{uploadCoverStatus}</p>}
        </div>
        <form
          ref={addLibraryFormRef}
          id="step-2-add-audio"
          onSubmit={addLibraryItem}
          className="card grid"
          style={{ marginBottom: 16 }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 4 }}>Step 2: Add audio to the library</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            After Step 1, title, SKU, and description are filled when we recognize the file (e.g.{" "}
            <code>T18</code>). Review, attach goals if needed, then click <strong>Add Audio</strong>.
          </p>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Title</label>
          <input name="title" placeholder="Title" required style={inputStyle} />
          <label style={{ fontSize: 13, fontWeight: 600 }}>Description</label>
          <textarea
            name="description"
            placeholder="Description"
            required
            rows={4}
            style={{ ...inputStyle, resize: "vertical", minHeight: 88 }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>SKU</label>
              <input name="skuCode" placeholder="e.g. T01" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>File name</label>
              <input name="fileName" placeholder="Filled by upload" style={inputStyle} />
            </div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Categories</span>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="categoryGeneral" defaultChecked />
              General
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="categorySpecial" />
              Special
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="categoryCgmr" />
              CGMR (personalized)
            </label>
          </div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Cover URL (optional)</label>
          <input name="coverUrl" placeholder="Filled by Step 1B or catalog sync" style={inputStyle} />
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Audio URL{" "}
            <span style={{ color: "#6b7280", fontWeight: 400 }}>(required; filled by Step 1)</span>
          </label>
          <input
            name="audioUrl"
            placeholder="Paste URL or upload in Step 1"
            style={inputStyle}
            onChange={(event) => {
              const url = event.target.value.trim();
              setAddFormPreviewUrl(url || null);
            }}
          />
          {addFormPreviewUrl && (
            <div className="card" style={{ padding: 12, background: "#f8fafc" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600 }}>Preview</p>
              <AdminAudioPreview src={addFormPreviewUrl} style={{ width: "100%" }} />
            </div>
          )}
          <label style={{ fontSize: 13, fontWeight: 600 }}>Allowed member emails (optional)</label>
          <input
            name="allowedUserEmails"
            placeholder="email@example.com, other@example.com — limits who can hear this track"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="adultContent" />
              Adult content (18+)
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="buildPractice" />
              Build Practice (adds Special category)
            </label>
          </div>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Attach goals (optional — Ctrl/Cmd+click for several)</label>
          <select name="interestIds" multiple style={{ ...inputStyle, minHeight: 120 }}>
            {interestOptions.map((interest) => (
              <option key={interest.value} value={interest.value}>
                {interest.label}
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            Add Audio
          </button>
          {libraryAddSuccess && (
            <p style={{ marginTop: 8, color: "#059669", fontWeight: 500 }}>{libraryAddSuccess}</p>
          )}
          {libraryAddStatus && (
            <p style={{ marginTop: 8, color: "#b91c1c", fontWeight: 500 }}>{libraryAddStatus}</p>
          )}
        </form>
        </div>
        )}
        {isFirstAdmin && (
          <>
            <p style={{ color: "#4b5563" }}>
              Use sync to pull descriptions and covers from the assets list.
            </p>
            <button className="button button-secondary" onClick={syncLibraryMetadata}>
              Sync Descriptions & Covers
            </button>
            <button className="button button-secondary" type="button" onClick={populateFilenamesFromUrls}>
              Populate file names from URLs (one-time)
            </button>
            {syncStatus && <p style={{ marginTop: 8 }}>{syncStatus}</p>}
            {populateFilenamesStatus && <p style={{ marginTop: 8 }}>{populateFilenamesStatus}</p>}
          </>
        )}
        {library.length > 0 ? (
          <>
            <div className="card" style={{ marginTop: 0 }}>
            <h3>Audio Title List. Click a title for complete details and preview playback.</h3>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
              }}
            >
              {searchFilteredLibrary.map((item) => (
                <div key={item.id} style={{ minWidth: 0 }}>
                  <a href={`#audio-${item.id}`} style={{ fontWeight: 600 }}>
                    {(item.skuCode || "SKU?") + " - " + item.title}
                  </a>
                  {item.moderatorId && !item.inGeneralCatalog ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "2px 6px",
                        borderRadius: 4
                      }}
                    >
                      Facilitator (private)
                    </span>
                  ) : item.moderatorId ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        background: "#ecfdf5",
                        color: "#047857",
                        padding: "2px 6px",
                        borderRadius: 4
                      }}
                    >
                      Facilitator (in library)
                    </span>
                  ) : null}
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 13,
                      color: "#4b5563",
                      lineHeight: 1.45
                    }}
                  >
                    {item.description?.trim() || "Description pending."}
                  </p>
                  {!item.audioUrl?.trim() && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>No audio URL</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          </>
        ) : (
          <p style={{ marginTop: 16, fontSize: 13, color: "#6b7280" }}>
            No tracks in the library yet. Use <strong>Add new audio</strong> above, or wait for
            facilitator uploads.
          </p>
        )}
        {searchFilteredLibrary.length > 0 && (
        <div className="grid" style={{ marginTop: 16 }}>
          {searchFilteredLibrary.map((item) => (
            <div key={item.id} id={`audio-${item.id}`} className="card">
              {editingId === item.id && editDraft ? (
                <form onSubmit={saveEdit} className="grid">
                  <div className="card" style={{ marginBottom: 8 }}>
                    <h4 style={{ marginTop: 0, marginBottom: 8 }}>Replace audio file</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 13 }}>Audio file</span>
                        <input
                          ref={editAudioInputRef}
                          name="editAudioFile"
                          type="file"
                          accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg"
                          style={{ ...inputStyle, maxWidth: 340 }}
                          disabled={editAudioLoading}
                        />
                      </label>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void uploadAudioForEdit()}
                        disabled={editAudioLoading}
                      >
                        {editAudioLoading ? "Uploading…" : "Upload audio"}
                      </button>
                    </div>
                    {editAudioStatus && <p style={{ marginTop: 10, marginBottom: 0 }}>{editAudioStatus}</p>}
                    {editDraft.audioUrl ? (
                      <>
                        <p style={{ marginTop: 8, marginBottom: 8, fontSize: 12, color: "#6b7280" }}>
                          Current audio URL is set below. Click <strong>Save</strong> to keep uploaded changes.
                        </p>
                        <AdminAudioPreview src={editDraft.audioUrl} style={{ width: "100%" }} />
                      </>
                    ) : (
                      <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#6b7280" }}>
                        No audio URL yet — upload a file or paste a URL below, then click <strong>Save</strong>.
                      </p>
                    )}
                  </div>
                  <div className="card" style={{ marginBottom: 8 }}>
                    <h4 style={{ marginTop: 0, marginBottom: 8 }}>Upload cover from computer</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 13 }}>Cover image</span>
                        <input
                          ref={editCoverInputRef}
                          name="editCoverFile"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                          style={{ ...inputStyle, maxWidth: 340 }}
                          disabled={editCoverLoading}
                        />
                      </label>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => void uploadCoverForEdit()}
                        disabled={editCoverLoading}
                      >
                        {editCoverLoading ? "Uploading…" : "Upload cover"}
                      </button>
                    </div>
                    {editCoverStatus && <p style={{ marginTop: 10, marginBottom: 0 }}>{editCoverStatus}</p>}
                    {editDraft.coverUrl ? (
                      <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#6b7280" }}>
                        Current cover URL is set below. Click <strong>Save</strong> to keep uploaded changes.
                      </p>
                    ) : null}
                  </div>
                  <input
                    name="title"
                    value={editDraft.title}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, title: event.target.value })
                    }
                    required
                    style={inputStyle}
                  />
                  <input
                    name="description"
                    value={editDraft.description}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, description: event.target.value })
                    }
                    required
                    style={inputStyle}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <input
                      name="skuCode"
                      value={editDraft.skuCode || ""}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, skuCode: event.target.value })
                      }
                      placeholder="SKU (e.g., T01)"
                      style={inputStyle}
                    />
                    <input
                      name="fileName"
                      value={editDraft.fileName || ""}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, fileName: event.target.value })
                      }
                      placeholder="File name"
                      style={inputStyle}
                    />
                  </div>
                  <input
                    name="categories"
                    value={(editDraft.categories || []).join(", ")}
                    onChange={(event) =>
                      setEditDraft({
                        ...editDraft,
                        categories: event.target.value
                          .split(",")
                          .map((category) => category.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="Categories (comma-separated)"
                    style={inputStyle}
                  />
                  <input
                    name="coverUrl"
                    value={editDraft.coverUrl}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, coverUrl: event.target.value })
                    }
                    placeholder="Cover URL (optional)"
                    style={inputStyle}
                  />
                  <input
                    name="audioUrl"
                    value={editDraft.audioUrl}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, audioUrl: event.target.value })
                    }
                    placeholder="Audio URL (optional)"
                    style={inputStyle}
                  />
                  <input
                    name="allowedUserEmails"
                    value={(editDraft.allowedUserEmails || []).join(", ")}
                    onChange={(event) =>
                      setEditDraft({
                        ...editDraft,
                        allowedUserEmails: event.target.value
                          .split(",")
                          .map((email) => email.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="Allowed user emails (comma-separated, optional)"
                    style={inputStyle}
                  />
                  {editDraft.moderatorId ? (
                    <p style={{ fontSize: 12, color: "#78350f", margin: "0 0 8px" }}>
                      Facilitator-uploaded track — private to allowed members until included in the general library.
                    </p>
                  ) : null}
                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <input
                      type="checkbox"
                      checked={editDraft.inGeneralCatalog ?? true}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, inGeneralCatalog: event.target.checked })
                      }
                    />
                    Include in general library (all members can browse)
                  </label>
                  <label style={{ fontSize: 13 }}>Attach goals</label>
                  <select
                    name="interestIds"
                    multiple
                    value={editInterestIds}
                    onChange={(event) =>
                      setEditInterestIds(
                        Array.from(event.target.selectedOptions, (option) => option.value)
                      )
                    }
                    style={inputStyle}
                  >
                    {interestOptions.map((interest) => (
                      <option key={interest.value} value={interest.value}>
                        {interest.label}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={!!editDraft.isAdult}
                        onChange={(event) =>
                          setEditDraft({ ...editDraft, isAdult: event.target.checked })
                        }
                      />
                      Adult content (18+)
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={(editDraft.categories || []).some(
                          (c) => c.toLowerCase() === "special"
                        )}
                        onChange={(event) => {
                          const cats = editDraft.categories || [];
                          const hasSpecial = cats.some((c) => c.toLowerCase() === "special");
                          const next = event.target.checked
                            ? hasSpecial
                              ? cats
                              : [...cats, "special"]
                            : cats.filter((c) => c.toLowerCase() !== "special");
                          setEditDraft({ ...editDraft, categories: next });
                        }}
                      />
                      Build Practice
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="button" type="submit">
                      Save
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        cancelEdit();
                        document.getElementById("admin-audio-library")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Back to list
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={`${item.title} cover`}
                      style={{
                        width: "100%",
                        maxWidth: 220,
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        marginBottom: 8
                      }}
                    />
                  ) : (
                    <div
                      className="card"
                      style={{
                        width: "100%",
                        maxWidth: 220,
                        marginBottom: 8,
                        textAlign: "center"
                      }}
                    >
                      Cover pending
                    </div>
                  )}
                  <strong>{item.skuCode || "SKU?"} - {item.title}</strong>
                  {item.audioUrl ? (
                    <div style={{ marginTop: 12, marginBottom: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                        Play preview (admin — same stream as members)
                      </p>
                      <AdminAudioPreview
                        src={`/api/stream/audio?id=${encodeURIComponent(item.id)}`}
                        controlsList="nodownload"
                        style={{ width: "100%", maxWidth: 520, display: "block" }}
                      />
                    </div>
                  ) : (
                    <p style={{ marginTop: 10, marginBottom: 0, fontSize: 14, color: "#6b7280" }}>
                      No audio URL yet — complete Step 1 or edit this item to add audio, then preview here.
                    </p>
                  )}
                  <p>{item.description || "Description pending."}</p>
                  <p>SKU: {item.skuCode || "Pending"} {item.fileName ? `· File name: ${item.fileName}` : ""}</p>
                  <p>
                    Categories:{" "}
                    {item.categories && item.categories.length > 0
                      ? item.categories.join(", ")
                      : "None"}
                  </p>
                  <p>Cover: {item.coverUrl || "Pending"}</p>
                  <p>Audio: {item.audioUrl ? getFileNameFromAudioUrl(item.audioUrl) || "Pending" : "Pending"}</p>
                  <p>
                    <strong>Goals (library grouping / scheduling):</strong>{" "}
                    {formatGoalIdsForAdmin(item.interestIds) || "None"}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: -6 }}>
                    Edit this audio and use &quot;Attach goals&quot; to fix mistaken links. Goal play-order slots (A→B→C)
                    are edited under Goals → Edit on each goal.
                  </p>
                  <p>
                    Allowed Users:{" "}
                    {item.allowedUserEmails && item.allowedUserEmails.length > 0
                      ? item.allowedUserEmails.join(", ")
                      : "All users"}
                  </p>
                  {(item.isAdult || (item.categories || []).some((c) => c.toLowerCase() === "special")) && (
                    <p>
                      {item.isAdult && "Adult content (18+)"}
                      {(item.isAdult && (item.categories || []).some((c) => c.toLowerCase() === "special")) && " · "}
                      {(item.categories || []).some((c) => c.toLowerCase() === "special") && "Build Practice"}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="button button-secondary"
                      onClick={() =>
                        document.getElementById("admin-audio-library")?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Back to list
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => moveItem(item.id, "up")}
                    >
                      Move Up
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={() => moveItem(item.id, "down")}
                    >
                      Move Down
                    </button>
                    <button className="button" onClick={() => startEdit(item)}>
                      Edit
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={async () => {
                        await fetch("/api/library", {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: item.id })
                        });
                        await load();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        )}
      </section>
      )}
    </div>
  );
}
