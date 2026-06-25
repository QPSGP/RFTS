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
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);

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
    setStatusType(response.ok ? "success" : "error");
  };

  if (!settings) {
    return null;
  }

  return (
    <div className="card">
      <h2>Playback Schedule Settings</h2>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 12, lineHeight: 1.5 }}>
        All fields use the same rule: a <strong>main play</strong> is one scheduled listening slot (first or second
        recording on a schedule night when the member uses 2 per night, or the single recording when they use 1 per
        night). Preparation audio does not count. A <strong>listening session</strong> is one full schedule night
        (1 or 2 main plays, depending on their setting). CGMR or the default code fills every{" "}
        <strong>4th main play</strong> in order; other numbers below count <strong>main plays</strong> only.
      </p>
      <div className="grid">
        <label>
          Max main plays per recording
          <input
            type="number"
            min={1}
            max={365}
            style={inputStyle}
            value={settings.playsPerRecording}
            onChange={(event) => update("playsPerRecording", Number(event.target.value))}
          />
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            After a library item has been heard this many times as a <strong>main play</strong>, it leaves the active
            rotation (CGMR / default code is not removed this way).
          </span>
        </label>
        <label>
          Hours between main plays (same night)
          <input
            type="number"
            min={0}
            max={12}
            step="0.5"
            style={inputStyle}
            value={settings.nightlyGapHours}
            onChange={(event) => update("nightlyGapHours", Number(event.target.value))}
          />
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Wait time between the first and second <strong>main play</strong> when the member uses 2 per night. Ignored
            when they use 1 per night.
          </span>
        </label>
        <label>
          Add new track every {settings.addNewTrackEveryNights} main plays (fixed)
          <input
            type="number"
            style={{ ...inputStyle, background: "#f1f5f9", color: "#475569" }}
            value={settings.addNewTrackEveryNights}
            readOnly
            aria-readonly="true"
            title="Product default; legacy databases update automatically on first read."
          />
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Completed <strong>main plays</strong> before the next goal or assigned audio joins the bottom of the
            rotation. With <strong>2</strong> main plays per night, <strong>{settings.addNewTrackEveryNights}</strong>{" "}
            plays ≈ <strong>{Math.round(settings.addNewTrackEveryNights / 2)}</strong> full nights; with{" "}
            <strong>1</strong> per night, it equals nights. This value is always stored as the product default; existing
            installs are updated when settings load.
          </span>
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
            Total width of the rotation including the CGMR / default slot: content slots = value − 1{" "}
            <strong>main plays</strong> before the repeating special. Standard is <strong>4</strong> (three content
            priorities + one special every 4th <strong>main play</strong>). If this is 3 you only get two content slots
            plus T-18.
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
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Library code for the member&apos;s custom CGMR when assigned; otherwise the default code below is used as
            the every-4th-<strong>main play</strong> special.
          </span>
        </label>
        <label>
          Default code (fallback special)
          <input
            style={inputStyle}
            value={settings.fallbackTrackId}
            onChange={(event) => update("fallbackTrackId", event.target.value)}
            placeholder="T18"
          />
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Used when no CGMR is assigned (all members). Plays as the special on every 4th <strong>main play</strong> in
            order.
          </span>
        </label>
      </div>
      <button className="button" style={{ marginTop: 12 }} onClick={save}>
        Save Playback Settings
      </button>
      {status && (
        <p className={`status-message status-message--${statusType ?? "error"}`} style={{ marginTop: 12 }} role="status" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
