"use client";

import { useMemo, useState } from "react";
import {
  EXPO_PRACTICE_DEFAULTS,
  LONG_BEACH_EXPO_2026,
  type EventLeadFormTypeId
} from "@/lib/event-leads";

type Props = {
  formType: EventLeadFormTypeId;
  /** Pre-fill event for a specific expo QR. */
  defaultEventName?: string;
  defaultEventDates?: string;
  defaultEventKey?: string;
};

export default function EventLeadPublicForm({
  formType,
  defaultEventName,
  defaultEventDates,
  defaultEventKey
}: Props) {
  const defaults = useMemo(() => {
    if (formType === "practice_survey") {
      return {
        eventName: defaultEventName || EXPO_PRACTICE_DEFAULTS.eventName,
        eventDates: defaultEventDates || EXPO_PRACTICE_DEFAULTS.eventDates,
        eventKey: defaultEventKey || LONG_BEACH_EXPO_2026.eventKey
      };
    }
    return {
      eventName: defaultEventName || "Event lead",
      eventDates: defaultEventDates || "",
      eventKey: defaultEventKey || "consumer-lead"
    };
  }, [formType, defaultEventName, defaultEventDates, defaultEventKey]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [smsOk, setSmsOk] = useState(false);
  const [primaryOccupation, setPrimaryOccupation] = useState("");
  const [incomeGoalAmount, setIncomeGoalAmount] = useState("");
  const [incomeGoalYear, setIncomeGoalYear] = useState("");
  const [wantFullTime, setWantFullTime] = useState(false);
  const [wantPacket, setWantPacket] = useState(false);
  const [wantPresentation, setWantPresentation] = useState(false);
  const [notes, setNotes] = useState("");
  const [autoReply, setAutoReply] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    const body: Record<string, unknown> = {
      formType,
      eventName: defaults.eventName,
      eventDates: defaults.eventDates || null,
      eventKey: defaults.eventKey,
      fullName: fullName.trim() || null,
      email: email.trim() || null,
      phoneMobile: phoneMobile.trim() || null,
      smsOk,
      notes: notes.trim() || null,
      autoReply
    };
    if (formType === "practice_survey") {
      body.practice = {
        primaryOccupation: primaryOccupation.trim() || null,
        incomeGoalAmount: incomeGoalAmount.trim() || null,
        incomeGoalYear: incomeGoalYear.trim() || null,
        wantFullTime,
        wantPacket,
        wantPresentation,
        wantTxt: smsOk
      };
    } else {
      body.consumer = {
        offerCode: "abundance-magnet",
        incomeGoalAmount: incomeGoalAmount.trim() || null,
        incomeGoalYear: incomeGoalYear.trim() || null
      };
    }

    try {
      const res = await fetch("/api/lead/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Could not submit. Please try again.");
        return;
      }
      setStatus("done");
      setMessage(data.message || "Thank you!");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Thank you</h2>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <form className="card" style={{ maxWidth: 520, margin: "0 auto" }} onSubmit={onSubmit}>
      <h2 style={{ marginTop: 0 }}>
        {formType === "practice_survey" ? "Practice survey" : "Lead card"}
      </h2>
      <p style={{ color: "#4b5563", fontSize: 14 }}>
        {defaults.eventName}
        {defaults.eventDates ? ` · ${defaults.eventDates}` : ""}
      </p>

      <label>
        Name
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </label>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={formType === "consumer_lead"}
        />
      </label>
      <label>
        Cell phone
        <input value={phoneMobile} onChange={(e) => setPhoneMobile(e.target.value)} />
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={smsOk} onChange={(e) => setSmsOk(e.target.checked)} />
        Text OK
      </label>

      {formType === "practice_survey" && (
        <>
          <label>
            Primary occupation
            <input
              value={primaryOccupation}
              onChange={(e) => setPrimaryOccupation(e.target.value)}
            />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={wantFullTime}
              onChange={(e) => setWantFullTime(e.target.checked)}
            />
            I want to do it full time
          </label>
          <label>
            Income goal ($ / year)
            <input
              value={incomeGoalAmount}
              onChange={(e) => setIncomeGoalAmount(e.target.value)}
              placeholder="40000"
            />
          </label>
          <label>
            By year
            <input
              value={incomeGoalYear}
              onChange={(e) => setIncomeGoalYear(e.target.value)}
              placeholder="2027"
            />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={wantPacket}
              onChange={(e) => setWantPacket(e.target.checked)}
            />
            Packet
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={wantPresentation}
              onChange={(e) => setWantPresentation(e.target.checked)}
            />
            Presentation
          </label>
        </>
      )}

      {formType === "consumer_lead" && (
        <>
          <label>
            Income goal ($ / year)
            <input
              value={incomeGoalAmount}
              onChange={(e) => setIncomeGoalAmount(e.target.value)}
            />
          </label>
          <label>
            By year
            <input value={incomeGoalYear} onChange={(e) => setIncomeGoalYear(e.target.value)} />
          </label>
        </>
      )}

      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={autoReply}
          onChange={(e) => setAutoReply(e.target.checked)}
        />
        Email me next steps
      </label>

      {status === "error" && <p style={{ color: "#b91c1c" }}>{message}</p>}

      <button className="button" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
