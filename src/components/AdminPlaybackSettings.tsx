"use client";

import { useEffect, useState } from "react";
import type { PlaybackSettings } from "@/lib/types";

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function AdminPlaybackSettings() {
  const [settings, setSettings] = useState<PlaybackSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/playback-settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings));
  }, []);

  const update = (field: keyof PlaybackSettings, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const save = async () => {
    if (!settings) return;
    setStatus(null);
    const response = await fetch("/api/playback-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });
    setStatus(response.ok ? "Playback settings saved." : "Save failed.");
  };

  if (!settings) {
    return null;
  }

  return (
    <div className="card">
      <h2>Playback Schedule Settings</h2>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12 }}>
        Schedule is built by <strong>sessions</strong> (not nights). Rotation adds a new goal track every N sessions.
      </p>
      <div className="grid">
        <label>
          Plays per recording
          <input
            type="number"
            min={1}
            max={365}
            style={inputStyle}
            value={settings.playsPerRecording}
            onChange={(event) => update("playsPerRecording", Number(event.target.value))}
          />
        </label>
        <label>
          Hours between sessions
          <input
            type="number"
            min={0}
            max={12}
            step="0.5"
            style={inputStyle}
            value={settings.nightlyGapHours}
            onChange={(event) => update("nightlyGapHours", Number(event.target.value))}
          />
        </label>
        <label>
          Add new track every N sessions
          <input
            type="number"
            min={1}
            max={60}
            style={inputStyle}
            value={settings.addNewTrackEveryNights}
            onChange={(event) =>
              update("addNewTrackEveryNights", Number(event.target.value))
            }
          />
        </label>
        <label>
          Initial tracks in rotation (total)
          <input
            type="number"
            min={1}
            max={10}
            style={inputStyle}
            value={settings.initialTracks}
            onChange={(event) => update("initialTracks", Number(event.target.value))}
          />
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            4 = 3 from goals + 1 CGMR (or T-18 if no CGMR). Editable.
          </span>
        </label>
        <label>
          CGMR track code
          <input
            style={inputStyle}
            value={settings.cgmrTrackId}
            onChange={(event) => update("cgmrTrackId", event.target.value)}
            placeholder="CGMR code (optional)"
          />
        </label>
        <label>
          Default code
          <input
            style={inputStyle}
            value={settings.fallbackTrackId}
            onChange={(event) => update("fallbackTrackId", event.target.value)}
            placeholder="T-18"
          />
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Used when no CGMR is assigned (for all members, including membership).
          </span>
        </label>
      </div>
      <button className="button" style={{ marginTop: 12 }} onClick={save}>
        Save Playback Settings
      </button>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
