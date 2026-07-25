"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LGD_FACILITATOR_FEATURE_FLAGS,
  LGD_LIFE_AREAS,
  buildLgdProductionPacket,
  prioritizedLgdChallenges,
  type LgdFacilitatorFeatureFlags,
  type LgdIntakeAnswers,
  type LgdIntakeEditEvent,
  defaultLgdFacilitatorFeatureFlags
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

export default function FacilitatorLgdPanel() {
  const [flags, setFlags] = useState<LgdFacilitatorFeatureFlags>(
    defaultLgdFacilitatorFeatureFlags()
  );
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [statusValue, setStatusValue] = useState<string>("submitted");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingFlags, setSavingFlags] = useState(false);
  const [savingIntake, setSavingIntake] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const selected = intakes.find((i) => i.id === selectedId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [settingsRes, intakesRes] = await Promise.all([
        fetch("/api/moderator/lgd-settings", { credentials: "include" }),
        fetch("/api/moderator/lgd-intakes", { credentials: "include" })
      ]);
      if (!settingsRes.ok || !intakesRes.ok) {
        setMessage("Unable to load Life Guidance Discovery tools.");
        return;
      }
      const settingsData = await settingsRes.json();
      const intakesData = await intakesRes.json();
      if (settingsData.flags) setFlags(settingsData.flags);
      const list: IntakeRow[] = intakesData.intakes || [];
      setIntakes(list);
      if (selectedId && !list.some((i) => i.id === selectedId)) {
        setSelectedId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) {
      setScriptText("");
      return;
    }
    setScriptText(selected.scriptDraftText || "");
    setStatusValue(selected.status);
  }, [selected]);

  const saveFlags = async () => {
    setSavingFlags(true);
    setMessage(null);
    const res = await fetch("/api/moderator/lgd-settings", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flags })
    });
    setSavingFlags(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Could not save feature settings.");
      return;
    }
    const data = await res.json();
    if (data.flags) setFlags(data.flags);
    setMessage("LGD feature settings saved.");
  };

  const saveIntake = async () => {
    if (!selectedId) return;
    setSavingIntake(true);
    setMessage(null);
    const res = await fetch("/api/moderator/lgd-intakes", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedId,
        status: statusValue,
        scriptDraftText: scriptText
      })
    });
    setSavingIntake(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data?.error || "Could not update intake.");
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
    setMessage("Intake updated.");
  };

  const setMemberFormEdit = async (authorize: boolean) => {
    if (!selectedId) return;
    setAuthBusy(true);
    setMessage(null);
    const res = await fetch("/api/moderator/lgd-intakes", {
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

  if (loading) {
    return <p>Loading Life Guidance Discovery tools…</p>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Life Guidance Discovery</h2>
      <p style={{ color: "#64748b" }}>
        Turn features on or off for your practice, then review submitted electronic intakes and
        Goal Manifestation script drafts for your assigned members.
      </p>

      {message && (
        <p
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46"
          }}
        >
          {message}
        </p>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Feature toggles</h3>
        <div className="grid" style={{ gap: 10 }}>
          {LGD_FACILITATOR_FEATURE_FLAGS.map((flag) => (
            <label
              key={flag.key}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={!!flags[flag.key]}
                onChange={(e) => setFlags((prev) => ({ ...prev, [flag.key]: e.target.checked }))}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong>{flag.label}</strong>
                {flag.defaultOn ? "" : " (off by default)"}
              </span>
            </label>
          ))}
        </div>
        <button
          type="button"
          className="button"
          style={{ marginTop: 12 }}
          disabled={savingFlags}
          onClick={() => void saveFlags()}
        >
          {savingFlags ? "Saving…" : "Save feature settings"}
        </button>
      </div>

      <div className="grid" style={{ gap: 16, gridTemplateColumns: "minmax(220px, 280px) 1fr" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Review queue {intakes.length ? `(${intakes.length})` : ""}
          </h3>
          {intakes.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 14 }}>No submitted intakes yet.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {intakes.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="button button-secondary"
                  style={{
                    textAlign: "left",
                    borderColor: selectedId === row.id ? "#0f766e" : undefined
                  }}
                  onClick={() => setSelectedId(row.id)}
                >
                  <strong style={{ display: "block" }}>{memberLabel(row)}</strong>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {row.status}
                    {row.submittedAt
                      ? ` · ${new Date(row.submittedAt).toLocaleDateString()}`
                      : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="button button-secondary"
            style={{ marginTop: 12 }}
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>

        <div className="card">
          {!selected ? (
            <p style={{ color: "#64748b" }}>Select an intake to review the brief and script.</p>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>{memberLabel(selected)}</h3>
              <p style={{ fontSize: 14, color: "#64748b" }}>{selected.memberEmail}</p>

              <div style={{ marginBottom: 16 }}>
                {selected.status !== "cancelled" ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    style={{ marginBottom: 12 }}
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
                {flags.lgdRequireFacilitatorApproval ? (
                  <p style={{ fontSize: 13, color: "#92400e", margin: "0 0 8px" }}>
                    Approval required before in_production or complete.
                  </p>
                ) : null}
                <p style={{ fontSize: 13, margin: "0 0 8px" }}>
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
                      · Member edit authorized
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
                {(selected.reviewFlags || []).length > 0 ? (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: 10,
                      borderRadius: 8,
                      background: "#fffbeb",
                      border: "1px solid #fcd34d",
                      fontSize: 13
                    }}
                  >
                    <strong>Review flags</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {selected.reviewFlags!.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <details open style={{ marginBottom: 16 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>Session brief</summary>
                <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.5 }}>
                  <p>
                    <strong>Primary struggle:</strong>{" "}
                    {selected.answers.primaryStruggle || "—"}
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
                  <p>
                    <strong>Top outcomes:</strong>{" "}
                    {selected.answers.topOutcomes.join("; ") || "—"}
                  </p>
                  <p>
                    <strong>Identity statements:</strong>{" "}
                    {selected.answers.identityStatements.join("; ") || "—"}
                  </p>
                  <p>
                    <strong>Blocks:</strong> {selected.answers.blocks.join("; ") || "—"}
                  </p>
                  <p>
                    <strong>Strengths:</strong> {selected.answers.strengths.join("; ") || "—"}
                  </p>
                  <p>
                    <strong>Questions for facilitator:</strong>{" "}
                    {selected.answers.questionsForFacilitator || "—"}
                  </p>
                  <p>
                    <strong>Life area scores:</strong>
                  </p>
                  <ul style={{ marginTop: 4 }}>
                    {LGD_LIFE_AREAS.map((area) => (
                      <li key={area.id}>
                        {area.label}: {selected.answers.lifeAreaScores[area.id] ?? "—"}
                      </li>
                    ))}
                  </ul>
                </div>
              </details>

              <label style={{ display: "grid", gap: 6 }}>
                Goal Manifestation script draft (editable)
                <textarea
                  rows={18}
                  style={{ ...inputStyle, fontFamily: "inherit", lineHeight: 1.45 }}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                />
              </label>

              <div className="cta-row" style={{ marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className="button"
                  disabled={savingIntake}
                  onClick={() => void saveIntake()}
                >
                  {savingIntake ? "Saving…" : "Save review"}
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
                      scriptDraftText: scriptText || selected.scriptDraftText || "",
                      status: statusValue,
                      resolvedBedId: selected.frequencyBedId || undefined
                    });
                    void navigator.clipboard.writeText(packet).then(
                      () => setMessage("Production packet copied to clipboard."),
                      () => setMessage("Could not copy packet — select script text manually.")
                    );
                  }}
                >
                  Copy production packet
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
