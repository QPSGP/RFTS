"use client";

import { useState } from "react";
import type { Interest } from "@/lib/types";
import LgdIntakeForm from "@/components/LgdIntakeForm";

type Props = {
  interests: Interest[];
};

/** Lets super-admin open the full A–F intake for a member while LGD_ADMIN_ONLY is on. */
export default function AdminLgdIntakeRunner({ interests }: Props) {
  const [emailInput, setEmailInput] = useState("");
  const [activeEmail, setActiveEmail] = useState<string | null>(null);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 style={{ marginTop: 0 }}>Run / preview intake (A–F)</h2>
      <p style={{ color: "#64748b" }}>
        Enter a member login email, then open the electronic Life Guidance Discovery form for that
        account. After submit, it appears in the review queue below.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          type="email"
          placeholder="member@example.com"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            minWidth: 280,
            flex: "1 1 240px"
          }}
        />
        <button
          type="button"
          className="button"
          onClick={() => {
            const e = emailInput.trim().toLowerCase();
            if (e.includes("@")) setActiveEmail(e);
          }}
        >
          Open intake form
        </button>
        {activeEmail ? (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setActiveEmail(null)}
          >
            Close form
          </button>
        ) : null}
      </div>
      {activeEmail ? (
        <div style={{ marginTop: 20 }}>
          <LgdIntakeForm interests={interests} adminMemberEmail={activeEmail} />
        </div>
      ) : null}
    </div>
  );
}
