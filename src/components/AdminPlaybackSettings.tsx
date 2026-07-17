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
        Playback builds a <strong>flat sequence</strong> of main plays (same order for 1 or 2 audios per night; only
        packing into nights changes). Intro relaxation music does not count. Each goal or assigned audio stays in
        rotation for its full rep list; CGMR or T-18 fills every <strong>4th sequence play</strong> without consuming a
        rotation step. Consecutive duplicate SKUs are skipped (the rep still counts as used).
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
            Repetitions of each track inside a rotation entry (managed: track×N; goal-based: A×N then B×N then C×N).
            When the entry&apos;s reps are exhausted it leaves the rotation. Specials (T-18 / CGMR) are not removed
            this way.
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
          Add new track every {settings.addNewTrackEveryNights} sequence plays (fixed)
          <input
            type="number"
            style={{ ...inputStyle, background: "#f1f5f9", color: "#475569" }}
            value={settings.addNewTrackEveryNights}
            readOnly
            aria-readonly="true"
            title="Product default; legacy databases update automatically on first read."
          />
          <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
            After this many plays in the generated sequence (including T-18/CGMR), the next goal or assigned audio is
            appended to the end of the rotation. With <strong>2</strong> per night,{" "}
            <strong>{settings.addNewTrackEveryNights}</strong> plays ≈{" "}
            <strong>{Math.round(settings.addNewTrackEveryNights / 2)}</strong> nights. Product default; existing
            installs update when settings load.
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
            Total width including the special slot: content slots = value − 1 when value ≥ 4. Standard is{" "}
            <strong>4</strong> (three content priorities start in rotation; T-18/CGMR every 4th sequence play).
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
