"use client";

import type { CSSProperties } from "react";
import {
  LGD_HOW_HEARD_OPTIONS,
  type LgdChildInfo,
  type LgdHowHeardId,
  type LgdIntakeClientInfo
} from "@/lib/lgd-intake";

type Props = {
  info: LgdIntakeClientInfo;
  editable: boolean;
  inputStyle: CSSProperties;
  onChange: (patch: Partial<LgdIntakeClientInfo>) => void;
};

export default function LgdIntakeClientInfoFields({
  info,
  editable,
  inputStyle,
  onChange
}: Props) {
  const setChild = (index: number, patch: Partial<LgdChildInfo>) => {
    const children = info.children.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange({ children });
  };

  const addChild = () => {
    if (info.children.length >= 8) return;
    onChange({ children: [...info.children, { name: "", age: "", sex: "" }] });
  };

  const removeChild = (index: number) => {
    onChange({ children: info.children.filter((_, i) => i !== index) });
  };

  const toggleHowHeard = (id: LgdHowHeardId) => {
    const has = info.howHeard.includes(id);
    const howHeard = has ? info.howHeard.filter((h) => h !== id) : [...info.howHeard, id];
    const howHeardSpecify = { ...info.howHeardSpecify };
    if (has) delete howHeardSpecify[id];
    onChange({ howHeard, howHeardSpecify });
  };

  return (
    <div className="grid" style={{ gap: 16 }}>
      <p style={{ marginTop: 0, color: "#475569" }}>
        From the Success Center Client Information Intake Form (pages 2–4). This information is never
        sold or shared — it is only for developing your Success Plan and session brief. Clinical
        fields help your facilitator work safely alongside any care you already receive.
      </p>

      <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Contact &amp; identity</p>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
        }}
      >
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Name*
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.legalName}
            onChange={(e) => onChange({ legalName: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Sex
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.sex}
            onChange={(e) => onChange({ sex: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Age
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.age}
            onChange={(e) => onChange({ age: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Birth date
          <input
            disabled={!editable}
            style={inputStyle}
            placeholder="MM/DD/YYYY"
            value={info.birthDate}
            onChange={(e) => onChange({ birthDate: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Address
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.address}
            onChange={(e) => onChange({ address: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          City
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          State
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.state}
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Zip
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.zip}
            onChange={(e) => onChange({ zip: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Home phone
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.homePhone}
            onChange={(e) => onChange({ homePhone: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Home hours
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.homePhoneHours}
            onChange={(e) => onChange({ homePhoneHours: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Work phone
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.workPhone}
            onChange={(e) => onChange({ workPhone: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Work hours
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.workPhoneHours}
            onChange={(e) => onChange({ workPhoneHours: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Cell phone
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.cellPhone}
            onChange={(e) => onChange({ cellPhone: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Email*
          <input
            disabled={!editable}
            style={inputStyle}
            type="email"
            value={info.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </label>
      </div>

      <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Employment &amp; family</p>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          Employed by
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.employedBy}
            onChange={(e) => onChange({ employedBy: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Employer phone
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.employerPhone}
            onChange={(e) => onChange({ employerPhone: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Employer address
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.employerAddress}
            onChange={(e) => onChange({ employerAddress: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Employer city
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.employerCity}
            onChange={(e) => onChange({ employerCity: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Employer state
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.employerState}
            onChange={(e) => onChange({ employerState: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Employer zip
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.employerZip}
            onChange={(e) => onChange({ employerZip: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Marital status
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.maritalStatus}
            onChange={(e) => onChange({ maritalStatus: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Spouse&apos;s name
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.spouseName}
            onChange={(e) => onChange({ spouseName: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Anniversary date
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.anniversaryDate}
            onChange={(e) => onChange({ anniversaryDate: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Spouse employed by
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.spouseEmployedBy}
            onChange={(e) => onChange({ spouseEmployedBy: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Occupation
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.occupation}
            onChange={(e) => onChange({ occupation: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Amount of your education &amp; degrees held
          <textarea
            disabled={!editable}
            rows={2}
            style={inputStyle}
            value={info.educationDegrees}
            onChange={(e) => onChange({ educationDegrees: e.target.value })}
          />
        </label>
      </div>

      <div>
        <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Children (name / age / sex)</p>
        {info.children.map((child, index) => (
          <div
            key={`child-${index}`}
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "2fr 1fr 1fr auto",
              marginBottom: 8,
              alignItems: "end"
            }}
          >
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              Name
              <input
                disabled={!editable}
                style={inputStyle}
                value={child.name}
                onChange={(e) => setChild(index, { name: e.target.value })}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              Age
              <input
                disabled={!editable}
                style={inputStyle}
                value={child.age}
                onChange={(e) => setChild(index, { age: e.target.value })}
              />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
              Sex
              <input
                disabled={!editable}
                style={inputStyle}
                value={child.sex}
                onChange={(e) => setChild(index, { sex: e.target.value })}
              />
            </label>
            {editable ? (
              <button
                type="button"
                className="button button-secondary"
                style={{ padding: "8px 10px", fontSize: 12 }}
                onClick={() => removeChild(index)}
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        {editable && info.children.length < 8 ? (
          <button
            type="button"
            className="button button-secondary"
            style={{ padding: "6px 12px", fontSize: 13 }}
            onClick={addChild}
          >
            + Add child
          </button>
        ) : null}
      </div>

      <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>Clinical &amp; emergency</p>
      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
        Hypnosis and guided meditation support wellness and habit change. They are not a substitute
        for medical or psychiatric care. Share what your facilitator should know.
      </p>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))"
        }}
      >
        <label style={{ display: "grid", gap: 6 }}>
          Doctor&apos;s name
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.doctorName}
            onChange={(e) => onChange({ doctorName: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Doctor&apos;s phone
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.doctorPhone}
            onChange={(e) => onChange({ doctorPhone: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          In emergency please notify
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.emergencyContactName}
            onChange={(e) => onChange({ emergencyContactName: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Relationship
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.emergencyContactRelationship}
            onChange={(e) => onChange({ emergencyContactRelationship: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Emergency phone
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.emergencyContactPhone}
            onChange={(e) => onChange({ emergencyContactPhone: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Emergency address
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.emergencyContactAddress}
            onChange={(e) => onChange({ emergencyContactAddress: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Current health issues
          <textarea
            disabled={!editable}
            rows={3}
            style={inputStyle}
            value={info.currentHealthIssues}
            onChange={(e) => onChange({ currentHealthIssues: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Current medications
          <textarea
            disabled={!editable}
            rows={3}
            style={inputStyle}
            value={info.currentMedications}
            onChange={(e) => onChange({ currentMedications: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
          Please describe any prior hypnosis experiences
          <textarea
            disabled={!editable}
            rows={3}
            style={inputStyle}
            value={info.priorHypnosisExperiences}
            onChange={(e) => onChange({ priorHypnosisExperiences: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Religion raised
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.religionRaised}
            onChange={(e) => onChange({ religionRaised: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Religion now
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.religionNow}
            onChange={(e) => onChange({ religionNow: e.target.value })}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          Attend services
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.religionAttendServices}
            onChange={(e) => onChange({ religionAttendServices: e.target.value })}
          />
        </label>
      </div>

      <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>How did you hear about us?</p>
      <div style={{ display: "grid", gap: 8 }}>
        {LGD_HOW_HEARD_OPTIONS.map((opt) => {
          const selected = info.howHeard.includes(opt.id);
          return (
            <div key={opt.id}>
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: editable ? "pointer" : "default"
                }}
              >
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={selected}
                  onChange={() => toggleHowHeard(opt.id)}
                  style={{ marginTop: 3 }}
                />
                <span>{opt.label}</span>
              </label>
              {selected && "specifyLabel" in opt && opt.specifyLabel ? (
                <input
                  disabled={!editable}
                  style={{ ...inputStyle, marginTop: 6, marginLeft: 28 }}
                  placeholder={opt.specifyLabel}
                  value={info.howHeardSpecify[opt.id] || ""}
                  onChange={(e) =>
                    onChange({
                      howHeardSpecify: { ...info.howHeardSpecify, [opt.id]: e.target.value }
                    })
                  }
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        Special interests / hobbies
        <textarea
          disabled={!editable}
          rows={2}
          style={inputStyle}
          value={info.specialInterestsHobbies}
          onChange={(e) => onChange({ specialInterestsHobbies: e.target.value })}
        />
      </label>

      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          cursor: editable ? "pointer" : "default"
        }}
      >
        <input
          type="checkbox"
          disabled={!editable}
          checked={info.associatedWithSpeakerOrg}
          onChange={(e) => onChange({ associatedWithSpeakerOrg: e.target.checked })}
          style={{ marginTop: 3 }}
        />
        <span>
          I am associated with a business / organization which may need a speaker or seminar leader
        </span>
      </label>
      {info.associatedWithSpeakerOrg ? (
        <label style={{ display: "grid", gap: 6 }}>
          Please specify
          <input
            disabled={!editable}
            style={inputStyle}
            value={info.associatedWithSpeakerOrgSpecify}
            onChange={(e) => onChange({ associatedWithSpeakerOrgSpecify: e.target.value })}
          />
        </label>
      ) : null}

      <div
        style={{
          padding: 12,
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "#f8fafc",
          display: "grid",
          gap: 10
        }}
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
          I AM APPLYING FOR A HYPNOSIS SESSION. I UNDERSTAND THAT MISSED APPOINTMENTS WILL BE FULLY
          CHARGEABLE TO ME AT REGULAR RATES. IF A 24-HOUR NOTICE IS GIVEN TO CHANGE APPOINTMENT,
          THERE WILL BE NO CHARGE.
        </p>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
          <input
            type="checkbox"
            disabled={!editable}
            checked={info.hypnosisAgreementAccepted}
            onChange={(e) => onChange({ hypnosisAgreementAccepted: e.target.checked })}
            style={{ marginTop: 3 }}
          />
          <span>
            <strong>Agreement*</strong> — I accept the missed-appointment policy above
          </span>
        </label>
        <label style={{ display: "grid", gap: 6, maxWidth: 220 }}>
          Date*
          <input
            disabled={!editable}
            style={inputStyle}
            type="date"
            value={info.hypnosisAgreementDate}
            onChange={(e) => onChange({ hypnosisAgreementDate: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
