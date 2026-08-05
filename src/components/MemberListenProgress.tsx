"use client";

import { useCallback, useEffect, useState } from "react";
import type { ListenProgressReport } from "@/lib/member-listen-progress";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

function sourceLabel(source: "library" | "session" | "both"): string {
  if (source === "library") return "Library";
  if (source === "session") return "Play Options";
  return "Play Options & Library";
}

export default function MemberListenProgress() {
  const [report, setReport] = useState<ListenProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/user/listen-progress", {
        credentials: "include",
        cache: "no-store"
      });
      if (!res.ok) {
        setError("Could not load your listen progress.");
        setReport(null);
        return;
      }
      const data = (await res.json()) as ListenProgressReport;
      setReport(data);
    } catch {
      setError("Could not load your listen progress.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onCompleted = () => {
      void load();
    };
    window.addEventListener("rfts-audio-completed", onCompleted);
    return () => window.removeEventListener("rfts-audio-completed", onCompleted);
  }, [load]);

  return (
    <div className="card" id="listen-progress">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap"
        }}
      >
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 6 }}>Your listening progress</h3>
          <p style={{ margin: 0, color: "#4b5563", fontSize: 14 }}>
            Audios you&apos;ve started and finished - including how many full listens each has.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          style={{ fontSize: 13, padding: "8px 12px" }}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide report" : "Show report"}
        </button>
      </div>

      {loading ? <p style={{ marginTop: 12, color: "#64748b" }}>Loading progress…</p> : null}
      {error ? (
        <p className="status-message status-message--error" style={{ marginTop: 12 }}>
          {error}
        </p>
      ) : null}

      {!loading && report ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10
            }}
          >
            <div className="callout-accent" style={{ margin: 0 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Full listens</p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#0f766e" }}>
                {report.totalCompletions}
              </p>
            </div>
            <div className="callout-accent" style={{ margin: 0 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Times started</p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#0f766e" }}>
                {report.totalStarts}
              </p>
            </div>
            <div className="callout-accent" style={{ margin: 0 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Schedule steps done</p>
              <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#0f766e" }}>
                {report.scheduleStepsCompleted}
              </p>
            </div>
          </div>

          {open ? (
            <>
              <p style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
                Full list of each audio below - counts update when an audio finishes playing.
              </p>
              {report.tracks.length === 0 ? (
                <p style={{ marginTop: 14, color: "#64748b" }}>
                  No listens recorded yet. Start a session or play from the library - when an audio
                  finishes, it will show here as completed.
                </p>
              ) : (
                <div className="table-scroll" style={{ marginTop: 14 }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                      minWidth: 420
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                        <th style={{ padding: "8px 6px" }}>Audio</th>
                        <th style={{ padding: "8px 6px" }}>Where</th>
                        <th style={{ padding: "8px 6px" }}>Completed</th>
                        <th style={{ padding: "8px 6px" }}>Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.tracks.map((track) => (
                        <tr key={track.title} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "8px 6px" }}>
                            <strong>{track.title}</strong>
                            {track.timesCompleted > 0 ? (
                              <div style={{ fontSize: 12, color: "#15803d", marginTop: 2 }}>
                                Completed
                                {track.lastCompletedAt
                                  ? ` · last ${formatWhen(track.lastCompletedAt)}`
                                  : ""}
                              </div>
                            ) : (
                              <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
                                Started, not yet finished
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 6px", color: "#4b5563" }}>
                            {sourceLabel(track.source)}
                          </td>
                          <td style={{ padding: "8px 6px", fontWeight: 600 }}>{track.timesCompleted}</td>
                          <td style={{ padding: "8px 6px" }}>{track.timesStarted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.recentCompletions.length > 0 ? (
                <div style={{ marginTop: 16 }}>
                  <strong style={{ fontSize: 14 }}>Recently completed</strong>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#374151", fontSize: 14 }}>
                    {report.recentCompletions.map((item, idx) => (
                      <li key={`${item.title}-${item.at}-${idx}`} style={{ marginBottom: 4 }}>
                        {item.title}
                        <span style={{ color: "#64748b" }}>
                          {" "}
                          · {item.source === "library" ? "Library" : "Play Options"} ·{" "}
                          {formatWhen(item.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
              Open the report for a full list of each audio and completion counts.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Notify listen progress UI that an audio finished. */
export function notifyMemberAudioCompleted(title?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("rfts-audio-completed", { detail: { title: title ?? null } })
  );
}
