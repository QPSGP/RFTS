"use client";

import { useEffect, useState } from "react";

type ModerationItem = {
  id: string;
  title: string;
  creator: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
};

export default function ModerationQueue() {
  const [queue, setQueue] = useState<ModerationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await fetch("/api/moderators");
    if (!response.ok) {
      setError("Admin session required.");
      return;
    }
    const data = await response.json();
    setQueue(data.queue || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: ModerationItem["status"]) => {
    const response = await fetch("/api/moderators", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status })
    });
    if (response.ok) {
      await load();
    }
  };

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="card">
      <h3>Moderation Queue</h3>
      {queue.length === 0 ? (
        <p>No submissions waiting.</p>
      ) : (
        <div className="grid">
          {queue.map((item) => (
            <div key={item.id} className="card">
              <strong>{item.title}</strong>
              <p>Creator: {item.creator}</p>
              <p>Submitted: {new Date(item.submittedAt).toLocaleString()}</p>
              <p>Status: {item.status}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="button"
                  onClick={() => updateStatus(item.id, "approved")}
                >
                  Approve
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => updateStatus(item.id, "rejected")}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
