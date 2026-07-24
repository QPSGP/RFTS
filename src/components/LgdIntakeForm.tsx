"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Interest } from "@/lib/types";
import {
  LGD_FREQUENCY_BEDS,
  LGD_INTAKE_SECTIONS,
  LGD_LIFE_AREAS,
  LGD_PROFESSIONAL_VOICES,
  defaultLgdFacilitatorFeatureFlags,
  emptyLgdIntakeAnswers,
  type LgdFacilitatorFeatureFlags,
  type LgdIntakeAnswers,
  type LgdLifeAreaId
} from "@/lib/lgd-intake";
import LgdOwnVoiceRecorder from "@/components/LgdOwnVoiceRecorder";

type Props = {
  interests: Interest[];
  /**
   * When set (admin preview), load/save via /api/admin/lgd-intake for this member
   * instead of the logged-in member session API.
   */
  adminMemberEmail?: string;
};

const inputStyle: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%",
  boxSizing: "border-box"
};

function linesToList(text: string, max: number): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function listToLines(list: string[]): string {
  return list.join("\n");
}

export default function LgdIntakeForm({ interests, adminMemberEmail }: Props) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<LgdIntakeAnswers>(emptyLgdIntakeAnswers());
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "disabled">("loading");
  const [editable, setEditable] = useState(true);
  const [intakeStatus, setIntakeStatus] = useState("draft");
  const [scriptDraftText, setScriptDraftText] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [goalSearch, setGoalSearch] = useState("");
  const [flags, setFlags] = useState<LgdFacilitatorFeatureFlags>(
    defaultLgdFacilitatorFeatureFlags()
  );
  const [priceLabel, setPriceLabel] = useState<string | null>(null);

  const section = LGD_INTAKE_SECTIONS[sectionIndex];
  const adminEmail = adminMemberEmail?.trim().toLowerCase() || "";
  const isAdminMode = !!adminEmail;

  const sortedInterests = useMemo(
    () => interests.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [interests]
  );
  const filteredGoals = useMemo(() => {
    const term = goalSearch.trim().toLowerCase();
    if (!term) return sortedInterests;
    return sortedInterests.filter((g) => g.name.toLowerCase().includes(term));
  }, [goalSearch, sortedInterests]);

  useEffect(() => {
    setStatus("loading");
    const url = isAdminMode
      ? `/api/admin/lgd-intake?memberEmail=${encodeURIComponent(adminEmail)}`
      : "/api/member/lgd-intake";
    fetch(url, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setStatus("disabled");
          setMessage(data?.error || "Electronic LGD is not currently offered.");
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Unauthorized");
        if (data.intake?.answers) setAnswers(data.intake.answers);
        if (data.flags) setFlags(data.flags);
        if (data.priceLabel) setPriceLabel(data.priceLabel);
        setEditable(data.intake?.editable !== false);
        setIntakeStatus(data.intake?.status || "draft");
        setScriptDraftText(data.intake?.scriptDraftText || null);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not load intake.");
      });
  }, [adminEmail, isAdminMode]);

  const patchAnswers = (partial: Partial<LgdIntakeAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...partial }));
  };

  const setLifeScore = (id: LgdLifeAreaId, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      lifeAreaScores: { ...prev.lifeAreaScores, [id]: value }
    }));
  };

  const toggleGoal = (id: string) => {
    setAnswers((prev) => {
      if (prev.goalIds.includes(id)) {
        return { ...prev, goalIds: prev.goalIds.filter((g) => g !== id) };
      }
      if (prev.goalIds.length >= 10) return prev;
      return { ...prev, goalIds: [...prev.goalIds, id] };
    });
  };

  const moveGoal = (fromIndex: number, toIndex: number) => {
    setAnswers((prev) => {
      if (toIndex < 0 || toIndex >= prev.goalIds.length) return prev;
      const next = [...prev.goalIds];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return { ...prev, goalIds: next };
    });
  };

  const orderedSelectedGoals = useMemo(
    () =>
      answers.goalIds
        .map((id) => interests.find((g) => g.id === id))
        .filter((g): g is Interest => !!g),
    [answers.goalIds, interests]
  );

  const showMessage = (text: string, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const submitBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!answers.consentStored) {
      blockers.push("Section A: check consent to store answers.");
    }
    if (answers.crisisFlag) {
      blockers.push("Section A: crisis flag is checked — clear it or handle with a human facilitator.");
    }
    if (!answers.identityStatements.length && !answers.topOutcomes.length) {
      blockers.push(
        "Section C: add at least one top outcome or identity statement (one per line)."
      );
    }
    if (answers.voiceId === "member_own" && !answers.ownVoiceConsent) {
      blockers.push("Section E: confirm Voice Recording Agreement for own voice.");
    }
    return blockers;
  }, [answers]);

  const saveDraft = async (quiet = false) => {
    setSaving(true);
    if (!quiet) setMessage(null);
    const res = await fetch(isAdminMode ? "/api/admin/lgd-intake" : "/api/member/lgd-intake", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isAdminMode ? { memberEmail: adminEmail, answers } : { answers }
      )
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showMessage(data?.error || "Could not save draft.", true);
      return false;
    }
    if (!quiet) showMessage("Draft saved.");
    return true;
  };

  const goNext = async () => {
    if (!editable) {
      setSectionIndex((i) => Math.min(LGD_INTAKE_SECTIONS.length - 1, i + 1));
      return;
    }
    const ok = await saveDraft(true);
    if (!ok) return;
    setSectionIndex((i) => Math.min(LGD_INTAKE_SECTIONS.length - 1, i + 1));
  };

  const submit = async () => {
    if (submitBlockers.length) {
      showMessage(`Cannot submit yet:\n• ${submitBlockers.join("\n• ")}`, true);
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const res = await fetch(isAdminMode ? "/api/admin/lgd-intake" : "/api/member/lgd-intake", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isAdminMode ? { memberEmail: adminEmail, answers } : { answers }
      )
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      showMessage(data?.error || "Could not submit.", true);
      return;
    }
    setEditable(false);
    setIntakeStatus(data.intake?.status || "submitted");
    setScriptDraftText(data.scriptDraftText || data.intake?.scriptDraftText || null);
    showMessage(
      isAdminMode
        ? "Submitted. Refresh the review queue below to see the brief and script."
        : "Submitted. Your facilitator can review the brief and Goal Manifestation draft."
    );
  };

  if (status === "loading") {
    return <p>Loading your Life Guidance Discovery intake…</p>;
  }
  if (status === "disabled") {
    return (
      <div className="card">
        <p style={{ marginTop: 0 }}>{message || "Electronic Life Guidance Discovery is not available right now."}</p>
        <p style={{ color: "#64748b" }}>
          Call <strong>800-GOAL-NOW (800-462-5669)</strong> for a live session, or return to your{" "}
          <a href="/play-options">member console</a>.
        </p>
      </div>
    );
  }
  if (status === "error") {
    return (
      <p>
        {message || (
          <>
            Please <a href="/member/login?next=/member/lgd">log in</a> to continue.
          </>
        )}
      </p>
    );
  }

  return (
    <div>
      {isAdminMode ? (
        <p
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#ecfeff",
            border: "1px solid #a5f3fc",
            color: "#155e75"
          }}
        >
          Admin intake for <strong>{adminEmail}</strong> (sections A–F). Members do not see this
          while LGD is admin-only.
        </p>
      ) : null}
      <div className="stepper" style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        {LGD_INTAKE_SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={i === sectionIndex ? "button" : "button button-secondary"}
            style={{ padding: "8px 12px", fontSize: 13 }}
            onClick={() => setSectionIndex(i)}
          >
            {s.id}. {s.title}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "#64748b", marginTop: 0 }}>
        Status: <strong>{intakeStatus}</strong>
        {!editable ? " · Submitted (read-only)" : null}
      </p>

      {message && (
        <p
          style={{
            padding: 12,
            borderRadius: 8,
            background: messageIsError ? "#fef2f2" : "#ecfdf5",
            border: messageIsError ? "1px solid #fecaca" : "1px solid #a7f3d0",
            color: messageIsError ? "#991b1b" : "#065f46",
            whiteSpace: "pre-wrap"
          }}
        >
          {message}
        </p>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>
          Section {section.id} — {section.title}
        </h2>

        {section.id === "A" && (
          <div className="grid" style={{ gap: 12 }}>
            <p style={{ marginTop: 0 }}>
              This electronic Life Guidance Discovery gathers where you are, where you want to go,
              and how you get there so your facilitator can prepare — and so we can draft a
              customized Goal Manifestation script in your words.
            </p>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                disabled={!editable}
                checked={answers.consentStored}
                onChange={(e) => patchAnswers({ consentStored: e.target.checked })}
                style={{ marginTop: 3 }}
              />
              <span>
                I consent to store these answers and use them to prepare my session brief and a
                Goal Manifestation script draft.
              </span>
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                disabled={!editable}
                checked={!!answers.crisisFlag}
                onChange={(e) => patchAnswers({ crisisFlag: e.target.checked })}
                style={{ marginTop: 3 }}
              />
              <span>
                I am in crisis or need urgent safety support (do not auto-generate a script — please
                contact a person / emergency services).
              </span>
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                disabled={!editable}
                checked={!!answers.alreadyHadLiveLgd}
                onChange={(e) => patchAnswers({ alreadyHadLiveLgd: e.target.checked })}
                style={{ marginTop: 3 }}
              />
              <span>I have already completed a live Life Guidance Discovery Session.</span>
            </label>
            {priceLabel ? (
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 0 }}>
                Goal Manifestation packaging reference: {priceLabel} (your facilitator confirms final
                pricing).
              </p>
            ) : null}
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 0 }}>
              This is educational wellness support, not medical or psychiatric care.
            </p>
          </div>
        )}

        {section.id === "B" && (
          <div className="grid" style={{ gap: 16 }}>
            <p style={{ marginTop: 0 }}>Rate each life area from 1 (low) to 10 (thriving).</p>
            {LGD_LIFE_AREAS.map((area) => (
              <label key={area.id} style={{ display: "grid", gap: 6 }}>
                <span>
                  {area.label}: <strong>{answers.lifeAreaScores[area.id] ?? "—"}</strong>
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  disabled={!editable}
                  value={answers.lifeAreaScores[area.id] ?? 5}
                  onChange={(e) => setLifeScore(area.id, Number(e.target.value))}
                />
              </label>
            ))}
            <label style={{ display: "grid", gap: 6 }}>
              Occupying beliefs (one per line, up to 5) — e.g. “I always…”, “I can’t…”
              <textarea
                disabled={!editable}
                rows={4}
                style={inputStyle}
                value={listToLines(answers.occupyingBeliefs)}
                onChange={(e) =>
                  patchAnswers({ occupyingBeliefs: linesToList(e.target.value, 5) })
                }
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              What is working / gratitude (one per line, up to 3)
              <textarea
                disabled={!editable}
                rows={3}
                style={inputStyle}
                value={listToLines(answers.gratitude)}
                onChange={(e) => patchAnswers({ gratitude: linesToList(e.target.value, 3) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Primary struggle this season
              <textarea
                disabled={!editable}
                rows={4}
                style={inputStyle}
                value={answers.primaryStruggle}
                onChange={(e) => patchAnswers({ primaryStruggle: e.target.value })}
              />
            </label>
          </div>
        )}

        {section.id === "C" && (
          <div className="grid" style={{ gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Top 3 outcomes in your words (one per line) — sensory and specific
              <textarea
                disabled={!editable}
                rows={4}
                style={inputStyle}
                value={listToLines(answers.topOutcomes)}
                onChange={(e) => patchAnswers({ topOutcomes: linesToList(e.target.value, 3) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Identity statements (one per line, up to 7) — “I am becoming…” / “I am now…”
              <textarea
                disabled={!editable}
                rows={5}
                style={inputStyle}
                value={listToLines(answers.identityStatements)}
                onChange={(e) =>
                  patchAnswers({ identityStatements: linesToList(e.target.value, 7) })
                }
              />
            </label>
            <div>
              <p style={{ marginBottom: 8 }}>
                Align with RFTS goals (up to 10). Order matters — #1 is highest priority.
              </p>
              {orderedSelectedGoals.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
                    Selected goals ({orderedSelectedGoals.length}) — priority order
                  </p>
                  <div className="goal-stack" style={{ display: "grid", gap: 8 }}>
                    {orderedSelectedGoals.map((goal, index) => (
                      <div
                        key={goal.id}
                        className="goal-item"
                        style={{ display: "flex", alignItems: "center", gap: 10 }}
                      >
                        <strong style={{ minWidth: 24 }}>{index + 1}.</strong>
                        <span style={{ flex: 1 }}>{goal.name}</span>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => moveGoal(index, index - 1)}
                          disabled={!editable || index === 0}
                          style={{ padding: "6px 10px", fontSize: 12 }}
                        >
                          Up
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => moveGoal(index, index + 1)}
                          disabled={!editable || index === orderedSelectedGoals.length - 1}
                          style={{ padding: "6px 10px", fontSize: 12 }}
                        >
                          Down
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ color: "#6b7280", marginBottom: 12 }}>No goals selected yet.</p>
              )}
              <input
                placeholder="Search goals…"
                style={{ ...inputStyle, marginBottom: 8 }}
                value={goalSearch}
                onChange={(e) => setGoalSearch(e.target.value)}
                disabled={!editable}
              />
              <div className="goal-list" style={{ maxHeight: 220, overflow: "auto" }}>
                {filteredGoals.map((goal) => {
                  const selected = answers.goalIds.includes(goal.id);
                  const rank = selected ? answers.goalIds.indexOf(goal.id) + 1 : null;
                  return (
                    <label
                      key={goal.id}
                      className="goal-item"
                      style={{
                        display: "flex",
                        gap: 8,
                        cursor: editable ? "pointer" : "default",
                        opacity: !editable && !selected ? 0.5 : 1
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={!editable || (!selected && answers.goalIds.length >= 10)}
                        checked={selected}
                        onChange={() => toggleGoal(goal.id)}
                      />
                      <span>
                        {rank ? `${rank}. ` : ""}
                        {goal.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <label style={{ display: "grid", gap: 6 }}>
              Timeline
              <select
                disabled={!editable}
                style={inputStyle}
                value={answers.timeline}
                onChange={(e) =>
                  patchAnswers({
                    timeline: e.target.value as LgdIntakeAnswers["timeline"]
                  })
                }
              >
                <option value="">Select…</option>
                <option value="90_days">90 days</option>
                <option value="12_months">12 months</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Current income band (optional)
              <input
                disabled={!editable}
                style={inputStyle}
                value={answers.incomeCurrentBand || ""}
                onChange={(e) => patchAnswers({ incomeCurrentBand: e.target.value })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Desired income / investment framing (optional)
              <input
                disabled={!editable}
                style={inputStyle}
                value={answers.incomeDesiredBand || ""}
                onChange={(e) => patchAnswers({ incomeDesiredBand: e.target.value })}
              />
            </label>
          </div>
        )}

        {section.id === "D" && (
          <div className="grid" style={{ gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Known blocks (one per line)
              <textarea
                disabled={!editable}
                rows={4}
                style={inputStyle}
                value={listToLines(answers.blocks)}
                onChange={(e) => patchAnswers({ blocks: linesToList(e.target.value, 10) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Past attempts and what failed
              <textarea
                disabled={!editable}
                rows={4}
                style={inputStyle}
                value={answers.pastAttempts}
                onChange={(e) => patchAnswers({ pastAttempts: e.target.value })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Strengths / resources (one per line)
              <textarea
                disabled={!editable}
                rows={3}
                style={inputStyle}
                value={listToLines(answers.strengths)}
                onChange={(e) => patchAnswers({ strengths: linesToList(e.target.value, 10) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Will to learn (1–5): <strong>{answers.willToLearn ?? "—"}</strong>
              <input
                type="range"
                min={1}
                max={5}
                disabled={!editable}
                value={answers.willToLearn ?? 3}
                onChange={(e) => patchAnswers({ willToLearn: Number(e.target.value) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Belief I can learn (1–5): <strong>{answers.beliefCanLearn ?? "—"}</strong>
              <input
                type="range"
                min={1}
                max={5}
                disabled={!editable}
                value={answers.beliefCanLearn ?? 3}
                onChange={(e) => patchAnswers({ beliefCanLearn: Number(e.target.value) })}
              />
            </label>
          </div>
        )}

        {section.id === "E" && (
          <div className="grid" style={{ gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Preferred metaphors (one per line) — ocean, mountain, light, business, faith…
              <textarea
                disabled={!editable}
                rows={3}
                style={inputStyle}
                value={listToLines(answers.metaphors)}
                onChange={(e) => patchAnswers({ metaphors: linesToList(e.target.value, 10) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Words you love (one per line)
              <textarea
                disabled={!editable}
                rows={2}
                style={inputStyle}
                value={listToLines(answers.wordsLove)}
                onChange={(e) => patchAnswers({ wordsLove: linesToList(e.target.value, 20) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Words to avoid (one per line)
              <textarea
                disabled={!editable}
                rows={2}
                style={inputStyle}
                value={listToLines(answers.wordsAvoid)}
                onChange={(e) => patchAnswers({ wordsAvoid: linesToList(e.target.value, 20) })}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Faith / spiritual language
              <select
                disabled={!editable}
                style={inputStyle}
                value={answers.spiritualLanguage}
                onChange={(e) =>
                  patchAnswers({
                    spiritualLanguage: e.target.value as LgdIntakeAnswers["spiritualLanguage"]
                  })
                }
              >
                <option value="">Select…</option>
                <option value="yes">Yes — welcome</option>
                <option value="minimal">Minimal</option>
                <option value="none">None</option>
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              Listening context
              <select
                disabled={!editable}
                style={inputStyle}
                value={answers.listenContext}
                onChange={(e) =>
                  patchAnswers({
                    listenContext: e.target.value as LgdIntakeAnswers["listenContext"]
                  })
                }
              >
                <option value="">Select…</option>
                <option value="sleep">Primarily sleep / overnight</option>
                <option value="sleep_and_day">Sleep and daytime</option>
              </select>
            </label>
            {flags.lgdProfessionalVoices || flags.lgdMemberOwnVoice ? (
              <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <legend>Voice preference</legend>
                {flags.lgdProfessionalVoices
                  ? LGD_PROFESSIONAL_VOICES.map((voice) => (
                      <label
                        key={voice.id}
                        style={{ display: "flex", gap: 8, marginBottom: 8, cursor: "pointer" }}
                      >
                        <input
                          type="radio"
                          name="voice"
                          disabled={!editable}
                          checked={answers.voiceId === voice.id}
                          onChange={() => patchAnswers({ voiceId: voice.id, ownVoiceConsent: false })}
                        />
                        <span>
                          <strong>{voice.label}</strong> — {voice.description}
                        </span>
                      </label>
                    ))
                  : null}
                {flags.lgdMemberOwnVoice ? (
                  <>
                    <label
                      style={{ display: "flex", gap: 8, marginBottom: 8, cursor: "pointer" }}
                    >
                      <input
                        type="radio"
                        name="voice"
                        disabled={!editable}
                        checked={answers.voiceId === "member_own"}
                        onChange={() => patchAnswers({ voiceId: "member_own" })}
                      />
                      <span>
                        <strong>My own voice</strong> — affirmations in your voice (recording /
                        clone process with your facilitator)
                      </span>
                    </label>
                    {answers.voiceId === "member_own" ? (
                      <>
                        <label
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                            cursor: "pointer",
                            marginLeft: 8
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!editable}
                            checked={!!answers.ownVoiceConsent}
                            onChange={(e) => patchAnswers({ ownVoiceConsent: e.target.checked })}
                            style={{ marginTop: 3 }}
                          />
                          <span style={{ fontSize: 14 }}>
                            I agree to the{" "}
                            <a href="/voice-recording-agreement" target="_blank" rel="noreferrer">
                              Voice Recording Agreement
                            </a>{" "}
                            (record, store, and export for my Goal Manifestation audio).
                          </span>
                        </label>
                        <LgdOwnVoiceRecorder
                          enabled={!!answers.ownVoiceConsent}
                        />
                      </>
                    ) : null}
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#64748b", marginBottom: 0 }}>
                    “My own voice” is not enabled for your facilitator yet.
                  </p>
                )}
              </fieldset>
            ) : (
              <p style={{ fontSize: 14, color: "#64748b" }}>
                Voice selection is managed by your facilitator for this practice.
              </p>
            )}
            {flags.lgdFrequencyBeds ? (
              <label style={{ display: "grid", gap: 6 }}>
                Frequency / sound bed
                <select
                  disabled={!editable}
                  style={inputStyle}
                  value={answers.frequencyBedId}
                  onChange={(e) =>
                    patchAnswers({
                      frequencyBedId: e.target.value as LgdIntakeAnswers["frequencyBedId"]
                    })
                  }
                >
                  {LGD_FREQUENCY_BEDS.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.label} — {bed.intent}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        )}

        {section.id === "F" && (
          <div className="grid" style={{ gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Questions for your facilitator / scheduling notes
              <textarea
                disabled={!editable}
                rows={5}
                style={inputStyle}
                value={answers.questionsForFacilitator}
                onChange={(e) => patchAnswers({ questionsForFacilitator: e.target.value })}
              />
            </label>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                disabled={!editable}
                checked={answers.permissionToEditDraft !== false}
                onChange={(e) => patchAnswers({ permissionToEditDraft: e.target.checked })}
                style={{ marginTop: 3 }}
              />
              <span>
                I allow my facilitator to edit the Goal Manifestation script draft before
                production.
              </span>
            </label>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 0 }}>
              When you submit
              {flags.lgdScriptDraft
                ? ", we generate a Goal Manifestation script draft for facilitator review"
                : ", your facilitator will write the script from this brief"}{" "}
              before production. Progress auto-saves when you click Next; you must click{" "}
              <strong>Submit intake</strong> on this last section for it to appear in review.
            </p>
            {editable && submitBlockers.length > 0 ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  color: "#92400e"
                }}
              >
                <strong>Still needed before submit:</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {submitBlockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            ) : editable ? (
              <p style={{ color: "#065f46", marginBottom: 0 }}>
                Ready to submit — click <strong>Submit intake</strong> below.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="cta-row" style={{ flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          className="button button-secondary"
          disabled={sectionIndex === 0}
          onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
        >
          Previous
        </button>
        {sectionIndex < LGD_INTAKE_SECTIONS.length - 1 ? (
          <button
            type="button"
            className="button"
            disabled={saving}
            onClick={() => void goNext()}
          >
            {saving ? "Saving…" : "Next"}
          </button>
        ) : null}
        {editable ? (
          <>
            <button
              type="button"
              className="button button-secondary"
              disabled={saving}
              onClick={() => void saveDraft()}
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            {sectionIndex === LGD_INTAKE_SECTIONS.length - 1 ? (
              <button
                type="button"
                className="button"
                disabled={submitting || submitBlockers.length > 0}
                onClick={() => void submit()}
                title={
                  submitBlockers.length
                    ? submitBlockers.join(" ")
                    : "Submit for facilitator / admin review"
                }
              >
                {submitting ? "Submitting…" : "Submit intake"}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {scriptDraftText ? (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Goal Manifestation script draft</h3>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.5,
              margin: 0
            }}
          >
            {scriptDraftText}
          </pre>
          {priceLabel && intakeStatus !== "draft" && !isAdminMode ? (
            <button
              type="button"
              className="button"
              style={{ marginTop: 16 }}
              onClick={() => {
                void fetch("/api/member/lgd-checkout", {
                  method: "POST",
                  credentials: "include"
                })
                  .then(async (res) => {
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setMessage(data?.error || "Checkout unavailable.");
                      return;
                    }
                    if (data.url) window.location.href = data.url;
                  })
                  .catch(() => setMessage("Checkout failed."));
              }}
            >
              Pay {priceLabel} for Goal Manifestation packaging
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
