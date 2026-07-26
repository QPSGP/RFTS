"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LgdCgmrProducePanel from "@/components/LgdCgmrProducePanel";
import {
  LGD_LIFE_AREAS,
  buildLgdProductionPacket,
  formatLgdHorizonGoals,
  orderedLgdSevenKeys,
  prioritizedLgdChallenges,
  type LgdIntakeAnswers,
  type LgdIntakeEditEvent
} from "@/lib/lgd-intake";

type IntakeRow = {
  id: string;
  memberEmail: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  answers: LgdIntakeAnswers;
  scriptDraftText: string | null;
  voiceId: string | null;
  frequencyBedId: string | null;
  reviewFlags?: string[];
  paidAt?: string | null;
  ownVoiceAudioUrl?: string | null;
  libraryItemId?: string | null;
  producedAudioUrl?: string | null;
  memberEditAuthorizedAt?: string | null;
  memberEditAuthorizedBy?: string | null;
  editHistory?: LgdIntakeEditEvent[];
  submittedAt: string | null;
  updatedAt: string;
  approvedAt: string | null;
};

const STATUS_OPTIONS = [
  "submitted",
  "in_review",
  "script_ready",
  "approved",
  "in_production",
  "complete",
  "cancelled"
] as const;

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%" as const
};

function memberLabel(row: IntakeRow): string {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  return name || row.memberEmail;
}

type SortMode = "newest" | "name";

type Props = {
  onEditForm?: (memberEmail: string) => void;
  onCloseForm?: () => void;
  registerRefresh?: (fn: () => void) => void;
};

/** Super-admin LGD review (all members) while LGD_ADMIN_ONLY is on. */
export default function AdminLgdPanel({ onEditForm, onCloseForm, registerRefresh }: Props) {
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [statusValue, setStatusValue] = useState("submitted");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const selected = intakes.find((i) => i.id === selectedId) || null;

  const visibleIntakes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? intakes.filter((row) => {
          const label = memberLabel(row).toLowerCase();
          const email = row.memberEmail.toLowerCase();
          return label.includes(term) || email.includes(term);
        })
      : intakes.slice();
    filtered.sort((a, b) => {
      if (sortMode === "name") {
        return memberLabel(a).localeCompare(memberLabel(b), undefined, { sensitivity: "base" });
      }
      const aTime = Date.parse(a.updatedAt || a.submittedAt || "") || 0;
      const bTime = Date.parse(b.updatedAt || b.submittedAt || "") || 0;
      return bTime - aTime;
    });
    return filtered;
  }, [intakes, search, sortMode]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/lgd-intakes", { credentials: "include" });
      if (!res.ok) {
        setMessage("Unable to load LGD intakes (admin session required).");
        return;
      }
      const data = await res.json();
      setIntakes(data.intakes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    registerRefresh?.(() => {
      void load();
    });
  }, [load, registerRefresh]);

  useEffect(() => {
    if (!selected) {
      setScriptText("");
      return;
    }
    setScriptText(selected.scriptDraftText || "");
    setStatusValue(selected.status);
  }, [selected]);

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/lgd-intakes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedId,
        status: statusValue,
        scriptDraftText: scriptText
      })
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Save failed.");
      return;
    }
    const data = await res.json();
    setIntakes((prev) =>
      prev.map((row) =>
        row.id === selectedId
          ? {
              ...row,
              status: data.intake.status,
              scriptDraftText: data.intake.scriptDraftText,
              approvedAt: data.intake.approvedAt,
              updatedAt: data.intake.updatedAt,
              reviewFlags: data.intake.reviewFlags ?? row.reviewFlags
            }
          : row
      )
    );
    setSelectedId(null);
    onCloseForm?.();
    setMessage("Saved. Intake closed.");
  };

  const setMemberFormEdit = async (authorize: boolean) => {
    if (!selectedId) return;
    setAuthBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/lgd-intakes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, authorizeMemberEdit: authorize })
    });
    setAuthBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Could not update member edit access.");
      return;
    }
    const data = await res.json();
    setIntakes((prev) =>
      prev.map((row) =>
        row.id === selectedId
          ? {
              ...row,
              memberEditAuthorizedAt: data.intake.memberEditAuthorizedAt ?? null,
              memberEditAuthorizedBy: data.intake.memberEditAuthorizedBy ?? null,
              editHistory: data.intake.editHistory ?? row.editHistory,
              updatedAt: data.intake.updatedAt
            }
          : row
      )
    );
    setMessage(
      authorize
        ? "Member can now edit the submitted form."
        : "Member form edit access revoked."
    );
  };

  if (loading) return <p>Loading LGD intakes…</p>;

  return (
    <div>
      <p style={{ color: "#92400e", background: "#fffbeb", padding: 12, borderRadius: 8 }}>
        LGD is in <strong>admin-only</strong> preview (<code>LGD_ADMIN_ONLY</code>). Members,
        facilitators, and the public site do not see this process until you set{" "}
        <code>LGD_ADMIN_ONLY=false</code>.
      </p>
      {message ? <p style={{ color: "#065f46" }}>{message}</p> : null}

      <div className="grid" style={{ gap: 16, gridTemplateColumns: "minmax(220px, 300px) 1fr" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            All intakes (
            {search.trim()
              ? `${visibleIntakes.length} of ${intakes.length}`
              : intakes.length}
            )
          </h3>
          <p style={{ fontSize: 13, color: "#64748b" }}>
            Drafts are incomplete until <strong>Submit intake</strong> on section F. Only submitted
            rows are ready for script review. Saving review closes the open form.
          </p>
          <label style={{ display: "grid", gap: 6, marginBottom: 8, fontSize: 13 }}>
            Search by name or email
            <input
              type="search"
              placeholder="e.g. Jane or member@…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className={sortMode === "newest" ? "button" : "button button-secondary"}
              onClick={() => setSortMode("newest")}
            >
              Newest
            </button>
            <button
              type="button"
              className={sortMode === "name" ? "button" : "button button-secondary"}
              onClick={() => setSortMode("name")}
            >
              By name
            </button>
          </div>
          {intakes.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>No intakes yet.</p>
          ) : visibleIntakes.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>No intakes match your search.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {visibleIntakes.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="button button-secondary"
                  style={{
                    textAlign: "left",
                    borderColor: selectedId === row.id ? "#0f766e" : undefined,
                    opacity: row.status === "draft" ? 0.85 : 1
                  }}
                  onClick={() => setSelectedId(row.id)}
                >
                  <strong style={{ display: "block" }}>{memberLabel(row)}</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {row.status === "draft" ? "draft (not submitted)" : row.status}
                    {row.paidAt ? " · paid" : ""}
                    {row.submittedAt
                      ? ` · ${new Date(row.submittedAt).toLocaleDateString()}`
                      : row.status === "draft"
                        ? " · open form above to finish"
                        : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="button button-secondary" style={{ marginTop: 12 }} onClick={() => void load()}>
            Refresh
          </button>
        </div>

        <div className="card">
          {!selected ? (
            <p style={{ color: "#64748b" }}>Select an intake to review.</p>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>{memberLabel(selected)}</h3>
              <p style={{ fontSize: 14, color: "#64748b" }}>{selected.memberEmail}</p>
              <div className="cta-row" style={{ marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                {onEditForm ? (
                  <button
                    type="button"
                    className="button"
                    onClick={() => onEditForm(selected.memberEmail)}
                  >
                    Edit form answers
                  </button>
                ) : null}
                {selected.status !== "draft" && selected.status !== "cancelled" ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={authBusy}
                    onClick={() => void setMemberFormEdit(!selected.memberEditAuthorizedAt)}
                  >
                    {authBusy
                      ? "Updating…"
                      : selected.memberEditAuthorizedAt
                        ? "Revoke member form edit"
                        : "Authorize member form edit"}
                  </button>
                ) : null}
              </div>
              <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                Status
                <select
                  style={inputStyle}
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <p style={{ fontSize: 13 }}>
                Voice: <strong>{selected.voiceId || "unset"}</strong> · Bed:{" "}
                <strong>{selected.frequencyBedId || "unset"}</strong>
                {selected.paidAt ? (
                  <>
                    {" "}
                    · Paid: <strong>{new Date(selected.paidAt).toLocaleDateString()}</strong>
                  </>
                ) : null}
                {selected.memberEditAuthorizedAt ? (
                  <>
                    {" "}
                    · Member edit:{" "}
                    <strong>
                      authorized {new Date(selected.memberEditAuthorizedAt).toLocaleDateString()}
                    </strong>
                    {selected.memberEditAuthorizedBy
                      ? ` by ${selected.memberEditAuthorizedBy}`
                      : ""}
                  </>
                ) : null}
              </p>
              {(selected.editHistory || []).length > 0 ? (
                <details style={{ marginBottom: 12, fontSize: 13 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                    Edit history ({selected.editHistory!.length})
                  </summary>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#475569" }}>
                    {[...selected.editHistory!].reverse().slice(0, 20).map((ev, i) => (
                      <li key={`${ev.at}-${i}`}>
                        {new Date(ev.at).toLocaleString()} — <strong>{ev.byRole}</strong>{" "}
                        {ev.byName || ev.byEmail}: {ev.action.replace(/_/g, " ")}
                        {ev.note ? ` (${ev.note})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              {selected.ownVoiceAudioUrl ? (
                <p style={{ fontSize: 13 }}>
                  Own-voice file:{" "}
                  <a href={selected.ownVoiceAudioUrl} target="_blank" rel="noreferrer">
                    open recording
                  </a>
                </p>
              ) : null}
              {(selected.reviewFlags || []).length > 0 ? (
                <ul style={{ fontSize: 13, color: "#92400e" }}>
                  {selected.reviewFlags!.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              ) : null}
              <details open style={{ marginBottom: 12 }}>
                <summary style={{ fontWeight: 600, cursor: "pointer" }}>Brief</summary>
                <div style={{ fontSize: 14, marginTop: 8 }}>
                  <p>
                    <strong>Live sessions interest:</strong>{" "}
                    {selected.answers.wantsLiveLgdSessions ? (
                      <span style={{ color: "#0f766e", fontWeight: 600 }}>Yes — follow up</span>
                    ) : (
                      "Not requested"
                    )}
                  </p>
                  <p>
                    <strong>Struggle:</strong> {selected.answers.primaryStruggle || "—"}
                  </p>
                  {prioritizedLgdChallenges(selected.answers).length > 0 ? (
                    <>
                      <p style={{ marginBottom: 4 }}>
                        <strong>Priority challenges:</strong>
                      </p>
                      <ol style={{ marginTop: 0 }}>
                        {prioritizedLgdChallenges(selected.answers).map((c) => (
                          <li key={c.id}>{c.label}</li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                  <p style={{ marginBottom: 4 }}>
                    <strong>Seven Keys order:</strong>
                  </p>
                  <ol style={{ marginTop: 0 }}>
                    {orderedLgdSevenKeys(selected.answers).map((k) => (
                      <li key={k.id}>
                        {k.metal} — {k.label}
                      </li>
                    ))}
                  </ol>
                  {formatLgdHorizonGoals(selected.answers).length > 0 ? (
                    <>
                      <p style={{ marginBottom: 4 }}>
                        <strong>Goal horizons:</strong>
                      </p>
                      <ul style={{ marginTop: 0 }}>
                        {formatLgdHorizonGoals(selected.answers).map((h) => (
                          <li key={h.label}>
                            <strong>{h.label}:</strong> {h.value}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <p>
                    <strong>Outcomes:</strong> {selected.answers.topOutcomes.join("; ") || "—"}
                  </p>
                  <p>
                    <strong>Identity:</strong>{" "}
                    {selected.answers.identityStatements.join("; ") || "—"}
                  </p>
                  <ul>
                    {LGD_LIFE_AREAS.map((a) => (
                      <li key={a.id}>
                        {a.label}: {selected.answers.lifeAreaScores[a.id] ?? "—"}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
              <label style={{ display: "grid", gap: 6 }}>
                Script draft
                <textarea
                  rows={16}
                  style={{ ...inputStyle, fontFamily: "inherit" }}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                />
              </label>
              <div className="cta-row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="button" disabled={saving} onClick={() => void save()}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    const packet = buildLgdProductionPacket({
                      memberEmail: selected.memberEmail,
                      firstName: selected.firstName,
                      lastName: selected.lastName,
                      answers: selected.answers,
                      scriptDraftText: scriptText || "",
                      status: statusValue,
                      resolvedBedId: selected.frequencyBedId || undefined
                    });
                    void navigator.clipboard.writeText(packet).then(
                      () => setMessage("Production packet copied."),
                      () => setMessage("Copy failed.")
                    );
                  }}
                >
                  Copy production packet
                </button>
              </div>
              {selected.status !== "draft" && selected.status !== "cancelled" && (
                <LgdCgmrProducePanel
                  intakeId={selected.id}
                  memberEmail={selected.memberEmail}
                  voiceId={selected.voiceId}
                  frequencyBedId={selected.frequencyBedId}
                  scriptText={scriptText}
                  libraryItemId={selected.libraryItemId}
                  producedAudioUrl={selected.producedAudioUrl}
                  apiBase="/api/admin/lgd-intakes"
                  uploadHandler="/api/admin/upload-audio-handler"
                  onProduced={(result) => {
                    setIntakes((prev) =>
                      prev.map((row) =>
                        row.id === selected.id
                          ? {
                              ...row,
                              status: "complete",
                              libraryItemId: result.libraryItemId,
                              producedAudioUrl: result.audioUrl
                            }
                          : row
                      )
                    );
                    setStatusValue("complete");
                    setMessage(
                      result.regenerated
                        ? "CGMR updated on member playlist."
                        : "CGMR added to member playlist."
                    );
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
