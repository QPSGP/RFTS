"use client";

import { useEffect, useMemo, useState } from "react";
import type { Interest } from "@/lib/types";

type LibraryItem = {
  id: string;
  title: string;
  description: string;
  skuCode?: string;
  categories?: string[];
  coverUrl: string;
  audioUrl: string;
  interestIds: string[];
  order: number;
  isAdult?: boolean;
  allowedUserEmails?: string[];
};

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

type AdminContentProps = {
  openGoals: boolean;
  openLibrary: boolean;
};

export default function AdminContent({ openGoals, openLibrary }: AdminContentProps) {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [goalAssignments, setGoalAssignments] = useState<Record<string, boolean>>({});
  const [goalSaveStatus, setGoalSaveStatus] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState<Interest | null>(null);
  const [librarySort, setLibrarySort] = useState<"title" | "sku">("title");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<LibraryItem | null>(null);
  const [editInterestIds, setEditInterestIds] = useState<string[]>([]);
  const [goalSearch, setGoalSearch] = useState("");
  const [goalAudioA, setGoalAudioA] = useState<string>("");
  const [goalAudioB, setGoalAudioB] = useState<string>("");
  const [goalAudioC, setGoalAudioC] = useState<string>("");

  const load = async () => {
    const [interestRes, libraryRes] = await Promise.all([
      fetch("/api/interests"),
      fetch("/api/library")
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

  const goalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    library.forEach((item) => {
      item.interestIds.forEach((goalId) => {
        counts.set(goalId, (counts.get(goalId) || 0) + 1);
      });
    });
    return counts;
  }, [library]);

  const filteredGoals = useMemo(() => {
    const term = goalSearch.trim().toLowerCase();
    const sorted = interests.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!term) return sorted;
    return sorted.filter((g) => g.name.toLowerCase().includes(term));
  }, [interests, goalSearch]);

  const sortedLibrary = useMemo(() => {
    const copy = [...library];
    if (librarySort === "sku") {
      return copy.sort((a, b) => (a.skuCode || "").localeCompare(b.skuCode || ""));
    }
    return copy.sort((a, b) => a.title.localeCompare(b.title));
  }, [library, librarySort]);

  const addInterest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      description: formData.get("description")
    };
    const response = await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      event.currentTarget.reset();
      await load();
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
        audioIdC: goalAudioC || null
      })
    });
    if (response.ok) {
      cancelGoalEdit();
      await load();
    }
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
    const categories = categoriesRaw
      ? categoriesRaw.split(",").map((category) => category.trim()).filter(Boolean)
      : [];
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      skuCode: formData.get("skuCode") || "",
      categories,
      coverUrl: formData.get("coverUrl") || "",
      audioUrl: formData.get("audioUrl") || "",
      interestIds,
      allowedUserEmails
    };
    const response = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      event.currentTarget.reset();
      await load();
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditInterestIds([]);
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
      categories: editDraft.categories || [],
      coverUrl: editDraft.coverUrl || "",
      audioUrl: editDraft.audioUrl || "",
      interestIds: editInterestIds,
      allowedUserEmails: editDraft.allowedUserEmails || [],
      isAdult: editDraft.isAdult || false
    };
    const response = await fetch("/api/library", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      cancelEdit();
      await load();
    }
  };

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoalId(goalId);
    if (!goalId) {
      setGoalAssignments({});
      return;
    }
    const nextAssignments: Record<string, boolean> = {};
    library.forEach((item) => {
      nextAssignments[item.id] = item.interestIds.includes(goalId);
    });
    setGoalAssignments(nextAssignments);
  };

  const toggleGoalAssignment = (itemId: string) => {
    setGoalAssignments((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const saveGoalAssignments = async () => {
    if (!selectedGoalId) {
      setGoalSaveStatus("Select a goal to edit.");
      return;
    }
    setGoalSaveStatus(null);
    const updates = library.filter((item) => {
      const shouldHave = !!goalAssignments[item.id];
      const hasGoal = item.interestIds.includes(selectedGoalId);
      return shouldHave !== hasGoal;
    });
    if (updates.length === 0) {
      setGoalSaveStatus("No changes to save.");
      return;
    }
    await Promise.all(
      updates.map((item) => {
        const shouldHave = !!goalAssignments[item.id];
        const interestIds = shouldHave
          ? Array.from(new Set([...item.interestIds, selectedGoalId]))
          : item.interestIds.filter((id) => id !== selectedGoalId);
        return fetch("/api/library", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            title: item.title,
            description: item.description,
            skuCode: item.skuCode || "",
            categories: item.categories || [],
            coverUrl: item.coverUrl || "",
            audioUrl: item.audioUrl || "",
            interestIds,
            allowedUserEmails: item.allowedUserEmails || [],
            isAdult: item.isAdult || false
          })
        });
      })
    );
    setGoalSaveStatus(`Saved ${updates.length} updates.`);
    setSelectedGoalId("");
    setGoalAssignments({});
    await load();
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
                    <div className="admin-goal-audio-slots">
                      <label>Audio files (order A → B → C is used for playback)</label>
                      <div className="grid grid-3" style={{ gap: 12 }}>
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 600 }}>A</label>
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
                          <label style={{ fontSize: 12, fontWeight: 600 }}>B</label>
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
                          <label style={{ fontSize: 12, fontWeight: 600 }}>C</label>
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
                    <div className="admin-goal-meta">
                      {[interest.audioIdA, interest.audioIdB, interest.audioIdC]
                        .filter(Boolean)
                        .map((id, i) => {
                          const item = library.find((l) => l.id === id);
                          return (
                            <span key={id} className="admin-goal-slot-badge">
                              {["A", "B", "C"][i]}
                            </span>
                          );
                        })}
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
            <button className="button" type="submit">
              Add Goal
            </button>
          </form>
        </section>
      )}

      {openLibrary && (
        <section id="admin-audio-library" className="card">
        <p style={{ color: "#4b5563" }}>
          Use sync to pull descriptions and covers from the assets list.
        </p>
        <button className="button button-secondary" onClick={syncLibraryMetadata}>
          Sync Descriptions & Covers
        </button>
        {syncStatus && <p style={{ marginTop: 8 }}>{syncStatus}</p>}
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Assign Audios by Goal</h3>
          <p style={{ color: "#4b5563" }}>
            Pick a goal and attach the audios that belong to it.
          </p>
          <select
            style={inputStyle}
            value={selectedGoalId}
            onChange={(event) => handleGoalSelect(event.target.value)}
          >
            <option value="">Select a goal</option>
            {interestOptions.map((interest) => (
              <option key={interest.value} value={interest.value}>
                {interest.label} ({goalCounts.get(interest.value) || 0})
              </option>
            ))}
          </select>
          {selectedGoalId && (
            <div className="grid" style={{ marginTop: 12 }}>
              {library.map((item) => (
                <label key={item.id} className="card" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!goalAssignments[item.id]}
                    onChange={() => toggleGoalAssignment(item.id)}
                    style={{ marginRight: 8 }}
                  />
                  {item.title}
                </label>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <button className="button button-secondary" onClick={saveGoalAssignments}>
              Save Goal Assignments
            </button>
            {goalSaveStatus && <span style={{ alignSelf: "center" }}>{goalSaveStatus}</span>}
          </div>
        </div>
        {library.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Audio Title List (Jump Links)</h3>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
              }}
            >
              {sortedLibrary.map((item) => (
                <a key={item.id} href={`#audio-${item.id}`}>
                  {(item.skuCode || "SKU?") + " - " + item.title}
                </a>
              ))}
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Sort by
            <select
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              value={librarySort}
              onChange={(event) =>
                setLibrarySort(event.target.value as "title" | "sku")
              }
            >
              <option value="title">Title (default)</option>
              <option value="sku">SKU</option>
            </select>
          </label>
        </div>
        <form onSubmit={addLibraryItem} className="grid">
          <input name="title" placeholder="Title" required style={inputStyle} />
          <input
            name="description"
            placeholder="Description"
            required
            style={inputStyle}
          />
          <input name="skuCode" placeholder="SKU (e.g., T-01)" style={inputStyle} />
          <input
            name="categories"
            placeholder="Categories (comma-separated)"
            style={inputStyle}
          />
          <input name="coverUrl" placeholder="Cover URL (optional)" style={inputStyle} />
          <input name="audioUrl" placeholder="Audio URL (optional)" style={inputStyle} />
          <input
            name="allowedUserEmails"
            placeholder="Allowed user emails (comma-separated, optional)"
            style={inputStyle}
          />
          <label style={{ fontSize: 13 }}>Attach goals</label>
          <select name="interestIds" multiple style={inputStyle}>
            {interestOptions.map((interest) => (
              <option key={interest.value} value={interest.value}>
                {interest.label}
              </option>
            ))}
          </select>
          <button className="button" type="submit">
            Add Audio
          </button>
        </form>
        <div className="grid" style={{ marginTop: 16 }}>
          {sortedLibrary.map((item) => (
            <div key={item.id} id={`audio-${item.id}`} className="card">
              {editingId === item.id && editDraft ? (
                <form onSubmit={saveEdit} className="grid">
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
                  <input
                    name="skuCode"
                    value={editDraft.skuCode || ""}
                    onChange={(event) =>
                      setEditDraft({ ...editDraft, skuCode: event.target.value })
                    }
                    placeholder="SKU (e.g., T-01)"
                    style={inputStyle}
                  />
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
                  <div style={{ display: "flex", gap: 8 }}>
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
                  <p>{item.description || "Description pending."}</p>
                  <p>SKU: {item.skuCode || "Pending"}</p>
                  <p>
                    Categories:{" "}
                    {item.categories && item.categories.length > 0
                      ? item.categories.join(", ")
                      : "None"}
                  </p>
                  <p>Cover: {item.coverUrl || "Pending"}</p>
                  <p>Audio: {item.audioUrl || "Pending"}</p>
                  <p>Interests: {item.interestIds.join(", ") || "None"}</p>
                  <p>
                    Allowed Users:{" "}
                    {item.allowedUserEmails && item.allowedUserEmails.length > 0
                      ? item.allowedUserEmails.join(", ")
                      : "All users"}
                  </p>
                  {item.isAdult && <p>Adult content</p>}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
      </section>
      )}
    </div>
  );
}
