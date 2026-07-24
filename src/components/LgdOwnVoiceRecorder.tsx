"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  enabled: boolean;
  onUploaded?: (url: string) => void;
};

/** Device mic recorder for “My own voice” phrases (member browser). */
export default function LgdOwnVoiceRecorder({ enabled, onUploaded }: Props) {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  if (!enabled) return null;

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone permission is required to record on this device.");
    }
  };

  const stopAndUpload = async () => {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecording(false);
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    if (!blob.size) {
      setError("No audio captured. Try again.");
      return;
    }
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", blob, `own-voice-${Date.now()}.webm`);
    const res = await fetch("/api/member/lgd-own-voice", {
      method: "POST",
      credentials: "include",
      body: form
    });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data?.error || "Upload failed.");
      return;
    }
    setUrl(data.url);
    onUploaded?.(data.url);
  };

  return (
    <div
      className="card"
      style={{ marginTop: 12, background: "#f8fafc", borderColor: "#e2e8f0" }}
    >
      <h4 style={{ marginTop: 0 }}>Record on this device</h4>
      <p style={{ fontSize: 14, color: "#475569" }}>
        After accepting the{" "}
        <a href="/voice-recording-agreement" target="_blank" rel="noreferrer">
          Voice Recording Agreement
        </a>
        , record short identity phrases here. We store the file for production (AI/internal mix
        preferred; studio fallback if needed).
      </p>
      {!supported ? (
        <p style={{ color: "#b91c1c" }}>This browser cannot record audio. Try Chrome or Safari.</p>
      ) : (
        <div className="cta-row" style={{ gap: 8, flexWrap: "wrap" }}>
          {!recording ? (
            <button type="button" className="button" onClick={() => void start()}>
              Start recording
            </button>
          ) : (
            <button type="button" className="button" onClick={() => void stopAndUpload()}>
              Stop &amp; upload
            </button>
          )}
        </div>
      )}
      {uploading ? <p>Uploading…</p> : null}
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {url ? (
        <p style={{ fontSize: 14 }}>
          Uploaded.{" "}
          <a href={url} target="_blank" rel="noreferrer">
            Preview
          </a>
        </p>
      ) : null}
    </div>
  );
}
