"use client";

import { useEffect, useState } from "react";
import type { Interest } from "@/lib/types";

type GoalsSelectorProps = {
  interests: Interest[];
};

export default function GoalsSelector({ interests }: GoalsSelectorProps) {
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "loggedOut" | "ready">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [canEdit, setCanEdit] = useState(true);
  const [nextAllowedAt, setNextAllowedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/goals")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setGoalIds(data.goalIds || []);
        setLimit(data.limit || 10);
        setCanEdit(data.canEdit ?? true);
        setNextAllowedAt(data.nextAllowedAt || null);
        setStatus("ready");
      })
      .catch(() => setStatus("loggedOut"));
  }, []);

  const toggleGoal = (id: string) => {
    setGoalIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((goal) => goal !== id);
      }
      if (prev.length >= limit) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const save = async () => {
    setMessage(null);
    const response = await fetch("/api/user/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalIds })
    });
    if (response.ok) {
      setMessage("Goals saved.");
      return;
    }
    const data = await response.json().catch(() => ({}));
    setMessage(data?.error || "Save failed.");
  };

  if (status === "loading") {
    return null;
  }

  if (status === "loggedOut") {
    return (
      <div className="card">
        <h2>Member Login Required</h2>
        <p>Log in to set your goals and personalize your sessions.</p>
        <a className="button" href="/member/login">
          Member Login
        </a>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Select Your Goals</h2>
      <p style={{ color: "#4b5563" }}>
        Choose up to {limit} priorities you want your sessions to focus on.
      </p>
      {!canEdit && nextAllowedAt && (
        <p style={{ color: "#b91c1c" }}>
          Goal changes are locked until {new Date(nextAllowedAt).toLocaleDateString()}.
        </p>
      )}
      <div className="grid grid-2" style={{ marginTop: 16 }}>
        {interests.map((interest) => (
          <label key={interest.id} className="card" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={goalIds.includes(interest.id)}
              disabled={
                !canEdit ||
                (!goalIds.includes(interest.id) && goalIds.length >= limit)
              }
              onChange={() => toggleGoal(interest.id)}
              style={{ marginRight: 8 }}
            />
            <strong>{interest.name}</strong>
            {interest.description && <p>{interest.description}</p>}
          </label>
        ))}
      </div>
      <button
        className="button"
        style={{ marginTop: 16 }}
        onClick={save}
        disabled={!canEdit}
      >
        Save Goals
      </button>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
