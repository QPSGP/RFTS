"use client";

import {
  MEMBER_PROFILE_TIME_ZONES,
  memberDraftShowsAdultContentOptions,
  type MemberProfileDraft
} from "@/lib/member-profile-form";

const defaultInputStyle = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  width: "100%"
} as const;

type MemberProfileEditorProps = {
  draft: MemberProfileDraft;
  onChange: (draft: MemberProfileDraft) => void;
  inputStyle?: React.CSSProperties;
  showIncomeFields?: boolean;
};

export default function MemberProfileEditor({
  draft,
  onChange,
  inputStyle = defaultInputStyle,
  showIncomeFields = true
}: MemberProfileEditorProps) {
  const setField = <K extends keyof MemberProfileDraft>(key: K, value: MemberProfileDraft[K]) => {
    onChange({ ...draft, [key]: value });
  };

  const showAdult = memberDraftShowsAdultContentOptions(draft);

  return (
    <>
      <div className="section-heading" style={{ marginTop: 8, marginBottom: 8 }}>
        Personal details
      </div>
      <div className="grid grid-2">
        <input
          style={inputStyle}
          placeholder="First name"
          value={draft.firstName}
          onChange={(event) => setField("firstName", event.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Last name"
          value={draft.lastName}
          onChange={(event) => setField("lastName", event.target.value)}
        />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 4 }}>
            Birthdate (optional). Required for mature content access 18+.
          </p>
          <input
            type="date"
            style={inputStyle}
            value={draft.birthDate}
            onChange={(event) => {
              const value = event.target.value;
              onChange({
                ...draft,
                birthDate: value,
                yearBorn: value ? value.slice(0, 4) : ""
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
            value={draft.gender}
            onChange={(event) => setField("gender", event.target.value)}
          />
        </div>
        <input
          style={inputStyle}
          placeholder="Occupation (optional)"
          value={draft.occupation}
          onChange={(event) => setField("occupation", event.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Best contact number (optional)"
          value={draft.contactNumber}
          onChange={(event) => setField("contactNumber", event.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Best time(s) to reach (optional)"
          value={draft.bestContactTimes}
          onChange={(event) => setField("bestContactTimes", event.target.value)}
        />
        <select
          style={inputStyle}
          value={draft.timeZone}
          onChange={(event) => setField("timeZone", event.target.value)}
        >
          {MEMBER_PROFILE_TIME_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <label className="card" style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <input
            type="checkbox"
            checked={draft.hadLgdSession}
            onChange={(event) => setField("hadLgdSession", event.target.checked)}
            style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
          />
          <span>
            Interested in a Life Guidance Discovery Session for a customized Goal Manifestation
            audio
          </span>
        </label>

        {showAdult ? (
          <div className="card">
            <p style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>Adult content</p>
            <label style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={draft.adultConsent}
                onChange={(event) => setField("adultConsent", event.target.checked)}
                style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
              />
              <span>Consent to hear audios with mature content</span>
            </label>
            <div style={{ marginLeft: 28, paddingLeft: 12, borderLeft: "2px solid #e5e7eb" }}>
              <label style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={draft.wantsPolyamory}
                  onChange={(event) => setField("wantsPolyamory", event.target.checked)}
                  style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
                />
                <span>Would like audios related to polyamory</span>
              </label>
            </div>
          </div>
        ) : null}

        <label className="card" style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <input
            type="checkbox"
            checked={draft.wantsPracticeGrowth}
            onChange={(event) => setField("wantsPracticeGrowth", event.target.checked)}
            style={{ marginTop: 3, flex: "0 0 auto", width: 18, minWidth: 18, height: 18 }}
          />
          <span>
            Interested in building a practice as a hypnotherapist, healer, or life/business coach
          </span>
        </label>

        <label className="card" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={draft.isFirstResponder}
            onChange={(event) => setField("isFirstResponder", event.target.checked)}
          />
          First responder / healthcare
        </label>

        <input
          style={inputStyle}
          placeholder="How did they find us? (optional)"
          value={draft.referralSource}
          onChange={(event) => setField("referralSource", event.target.value)}
        />
      </div>

      {showIncomeFields ? (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>Goals & income (optional)</p>
          <div className="grid grid-2" style={{ gap: 8 }}>
            <input
              style={inputStyle}
              placeholder="Annual income goal"
              value={draft.incomeGoal}
              onChange={(event) => setField("incomeGoal", event.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="Goal year"
              value={draft.incomeGoalYear}
              onChange={(event) => setField("incomeGoalYear", event.target.value)}
            />
            <input
              style={inputStyle}
              placeholder="Goal vs current income"
              value={draft.incomeGoalRelation}
              onChange={(event) => setField("incomeGoalRelation", event.target.value)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
