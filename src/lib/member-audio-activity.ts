/**
 * Client-only: POST member activity when audio actually starts playing.
 * Dedupes rapid repeat "playing" events for the same label (pause/resume).
 */
let lastPlayedLog: { key: string; at: number } | null = null;

export function logMemberPlayedAudio(details: string): void {
  if (typeof window === "undefined") return;
  const trimmed = details.trim().slice(0, 950);
  if (!trimmed) return;
  const now = Date.now();
  if (lastPlayedLog && lastPlayedLog.key === trimmed && now - lastPlayedLog.at < 5000) {
    return;
  }
  lastPlayedLog = { key: trimmed, at: now };
  fetch("/api/user/activity", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "played_audio", details: trimmed })
  }).catch(() => {});
}
