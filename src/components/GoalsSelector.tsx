"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [playsPerNight, setPlaysPerNight] = useState<1 | 2>(2);
  const [searchTerm, setSearchTerm] = useState("");
  const goalNameById = useMemo(() => {
    const map = new Map<string, Interest>();
    interests.forEach((interest) => {
      map.set(interest.id, interest);
    });
    return map;
  }, [interests]);
  const sortedInterests = useMemo(
    () => interests.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [interests]
  );
  const filteredGoals = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedInterests;
    return sortedInterests.filter((interest) => interest.name.toLowerCase().includes(term));
  }, [searchTerm, sortedInterests]);
  const orderedGoals = useMemo(
    () =>
      goalIds.map((id) => ({
        id,
        name: goalNameById.get(id)?.name || "Unknown goal"
      })),
    [goalIds, goalNameById]
  );

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
        setPlaysPerNight(data.playsPerNight === 1 ? 1 : 2);
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

  const moveGoal = (fromIndex: number, toIndex: number) => {
    setGoalIds((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const save = async () => {
    setMessage(null);
    const response = await fetch("/api/user/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalIds, playsPerNight })
    });
    if (response.ok) {
      setMessage("Goals saved.");
      window.location.href = "/play-options?autoplay=1";
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
      <p style={{ color: "#4b5563" }}>
        You can change your goals at any time. For best results, stick with your goals
        until you complete the full 21-times cycle when possible.
      </p>
      <p style={{ color: "#4b5563" }}>
        Changes save when you click &quot;Save Goals&quot;.
      </p>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Your selected goals (saved order)</h3>
        {orderedGoals.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No goals selected yet.</p>
        ) : (
          <div className="goal-stack">
            {orderedGoals.map((goal, index) => (
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
                  disabled={!canEdit || index === 0}
                  style={{ padding: "6px 10px", fontSize: 12 }}
                >
                  Up
                </button>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => moveGoal(index, index + 1)}
                  disabled={!canEdit || index === orderedGoals.length - 1}
                  style={{ padding: "6px 10px", fontSize: 12 }}
                >
                  Down
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Find your goals</h3>
        <input
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            width: "100%",
            marginTop: 8
          }}
          placeholder="Search goals"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <div className="card goal-see-all-list" style={{ marginTop: 12 }}>
          <div className="goal-all-scroll">
            {filteredGoals.map((interest) => (
              <label key={interest.id} className="goal-all-row">
                <input
                  type="checkbox"
                  checked={goalIds.includes(interest.id)}
                  disabled={
                    !canEdit ||
                    (!goalIds.includes(interest.id) && goalIds.length >= limit)
                  }
                  onChange={() => toggleGoal(interest.id)}
                />
                <span className="goal-all-name">{interest.name}</span>
              </label>
            ))}
          </div>
        </div>
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
