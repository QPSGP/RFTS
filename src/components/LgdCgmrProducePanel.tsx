"use client";

import { useEffect, useState } from "react";
import { put } from "@vercel/blob/client";
import {
  LGD_FREQUENCY_BEDS,
  LGD_PROFESSIONAL_VOICES
} from "@/lib/lgd-intake";

type Props = {
  intakeId: string;
  memberEmail: string;
  voiceId: string | null;
  frequencyBedId: string | null;
  scriptText: string;
  libraryItemId?: string | null;
  producedAudioUrl?: string | null;
  /** Admin uses /api/admin/...; facilitator uses /api/moderator/... */
  apiBase: "/api/admin/lgd-intakes" | "/api/moderator/lgd-intakes";
  /** Admin upload token handler; facilitators use moderator handler. */
  uploadHandler: "/api/admin/upload-audio-handler" | "/api/moderator/upload-audio-handler";
  onProduced?: (result: {
    libraryItemId: string;
    audioUrl: string;
    regenerated: boolean;
  }) => void;
};

function voiceLabel(voiceId: string | null): string {
  if (voiceId === "member_own") return "Member’s own voice";
  return LGD_PROFESSIONAL_VOICES.find((v) => v.id === voiceId)?.label || voiceId || "—";
}

function bedLabel(bedId: string | null): string {
  return LGD_FREQUENCY_BEDS.find((b) => b.id === bedId)?.label || bedId || "—";
}

export default function LgdCgmrProducePanel({
  intakeId,
  memberEmail,
  voiceId,
  frequencyBedId,
  scriptText,
  libraryItemId,
  producedAudioUrl,
  apiBase,
  uploadHandler,
  onProduced
}: Props) {
  const [aiAvailable, setAiAvailable] = useState(false);
  const [audioUrl, setAudioUrl] = useState(producedAudioUrl || "");
  const [busy, setBusy] = useState<"generate" | "assign" | "upload" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setAudioUrl(producedAudioUrl || "");
  }, [producedAudioUrl, intakeId]);

  useEffect(() => {
    fetch(`${apiBase}/produce`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.aiGenerateAvailable === "boolean") {
          setAiAvailable(data.aiGenerateAvailable);
        }
      })
      .catch(() => {});
  }, [apiBase]);

  const produce = async (mode: "generate" | "assign") => {
    setBusy(mode);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/produce`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeId,
          mode,
          audioUrl: mode === "assign" ? audioUrl.trim() : undefined,
          scriptOverride: scriptText || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "Could not produce CGMR.");
        return;
      }
      setAudioUrl(data.audioUrl || audioUrl);
      setMessage(
        data.regenerated
          ? "CGMR audio updated and kept on the member’s playlist."
          : "CGMR produced and added to the member’s playlist (CGMR night slot)."
      );
      onProduced?.({
        libraryItemId: data.libraryItemId,
        audioUrl: data.audioUrl,
        regenerated: Boolean(data.regenerated)
      });
    } finally {
      setBusy(null);
    }
  };

  const uploadFile = async (file: File | null) => {
    if (!file) {
      setMessage("Choose an audio file first.");
      return;
    }
    setBusy("upload");
    setMessage(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-") || "cgmr.mp3";
    const pathname = `audios/lgd-cgmr/${intakeId}-${Date.now()}-${safeName}`;
    const useMultipart = file.size > 5 * 1024 * 1024;
    try {
      const tokenRes = await fetch(uploadHandler, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: { pathname, clientPayload: null, multipart: useMultipart }
        }),
        credentials: "include"
      });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) {
        setMessage(tokenData?.error || "Upload token failed. Check BLOB_READ_WRITE_TOKEN.");
        return;
      }
      const clientToken = tokenData?.clientToken;
      if (!clientToken) {
        setMessage("Upload failed: No token from server.");
        return;
      }
      const blob = await put(pathname, file, {
        access: "public",
        token: clientToken,
        multipart: useMultipart
      });
      setAudioUrl(blob.url);
      setMessage("File uploaded — click “Assign to playlist” to add it as their CGMR.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: "1px solid #e5e7eb",
        display: "grid",
        gap: 10
      }}
    >
      <h3 style={{ margin: 0, fontSize: 17 }}>Produce CGMR → member playlist</h3>
      <p style={{ margin: 0, fontSize: 14, color: "#4b5563" }}>
        Convert the script draft using the member’s voice and bed choices, then add the recording as
        their personalized CGMR (night schedule special slot).
      </p>
      <p style={{ margin: 0, fontSize: 14 }}>
        <strong>Member:</strong> {memberEmail}
        <br />
        <strong>Voice:</strong> {voiceLabel(voiceId)}
        <br />
        <strong>Bed:</strong> {bedLabel(frequencyBedId)}
        {libraryItemId ? (
          <>
            <br />
            <strong>Playlist:</strong> linked (library item {libraryItemId.slice(0, 8)}…)
          </>
        ) : null}
      </p>

      <div className="cta-row" style={{ flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          className="button"
          disabled={busy !== null || !scriptText.trim()}
          onClick={() => void produce("generate")}
          title={
            aiAvailable
              ? "Generate speech from the script with AI (OPENAI_API_KEY)"
              : "Requires OPENAI_API_KEY on the server, or use upload/assign"
          }
        >
          {busy === "generate" ? "Generating…" : "Generate with voice choice (AI)"}
        </button>
        {!aiAvailable && (
          <span style={{ fontSize: 13, color: "#92400e" }}>
            AI generate needs OPENAI_API_KEY on Vercel — or upload a studio file below.
          </span>
        )}
      </div>

      <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
        Studio / finished audio URL
        <input
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://…/cgmr.mp3"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            width: "100%"
          }}
        />
      </label>
      <div className="cta-row" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <label className="button button-secondary" style={{ cursor: "pointer" }}>
          {busy === "upload" ? "Uploading…" : "Upload audio file"}
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a"
            style={{ display: "none" }}
            disabled={busy !== null}
            onChange={(e) => void uploadFile(e.target.files?.[0] || null)}
          />
        </label>
        <button
          type="button"
          className="button"
          disabled={busy !== null || !audioUrl.trim()}
          onClick={() => void produce("assign")}
        >
          {busy === "assign" ? "Assigning…" : "Assign to playlist"}
        </button>
      </div>
      {message && (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: message.includes("Could not") || message.includes("failed") || message.includes("needs")
              ? "#b45309"
              : "#059669"
          }}
          role="status"
        >
          {message}
        </p>
      )}
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
        Bed mix under the voice is recorded on the library item; full automatic ducking of beds is a
        follow-up. Pre-mixed studio files can be assigned now.
      </p>
    </div>
  );
}
