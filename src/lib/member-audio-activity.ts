/**
 * Appended to `audio_playback_outcome` details when the member seeks or fast-forwards
 * (non-linear). Admin member activity highlights rows containing this marker.
 */
export const MEMBER_AUDIO_NONLINEAR_OUTCOME_MARKER = "skipped ahead (non-linear playback)";

/**
 * Client-only: POST member activity when audio or video actually starts playing.
 * Dedupes rapid repeat "playing" events for the same label (pause/resume).
 */
let lastPlayedLog: { key: string; at: number } | null = null;

const ACTIVITY_MAX = 1000;

function okResponseStub(): Response {
  return { ok: true, status: 200, text: async () => "" } as unknown as Response;
}

function postActivity(
  action: string,
  details: string,
  useKeepalive: boolean
): ReturnType<typeof fetch> {
  if (typeof fetch !== "function") {
    // Jest (no fetch) and similar: avoid `new Response` (not always in jsdom).
    return Promise.resolve(okResponseStub());
  }
  return fetch("/api/user/activity", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, details }),
    keepalive: useKeepalive
  });
}

/**
 * General member activity POST (e.g. playback completed / stopped). No dedupe - each outcome is a row.
 */
export function logMemberActivity(action: string, details: string): void {
  if (typeof window === "undefined") return;
  const trimmed = details.trim().slice(0, ACTIVITY_MAX);
  if (!trimmed) return;
  void postActivity(action, trimmed, true)
    .then(async (res) => {
      if (res?.ok) return;
      if (!res) return;
      const errText = await res.text().catch(() => "");
      console.warn("[logMemberActivity] POST /api/user/activity failed:", res.status, errText);
    })
    .catch((err) => {
      console.warn("[logMemberActivity] network error:", err);
    });
}

/** `details` use format: `Play Options - First: T-12 – Title | completed full listen` (prefix matches played_audio, then ` | ` + outcome). */
export function logMemberAudioOutcome(details: string): void {
  logMemberActivity("audio_playback_outcome", details);
}

export function logMemberPlayedAudio(details: string): void {
  logPlayedMedia("played_audio", details);
}

/** Client-only: POST when a marketing / explainer video actually starts playing. */
export function logMemberPlayedVideo(details: string): void {
  logPlayedMedia("played_video", details);
}

function logPlayedMedia(action: "played_audio" | "played_video", details: string): void {
  if (typeof window === "undefined") return;
  const trimmed = details.trim().slice(0, 950);
  if (!trimmed) return;
  const now = Date.now();
  const key = `${action}:${trimmed}`;
  if (lastPlayedLog && lastPlayedLog.key === key && now - lastPlayedLog.at < 5000) {
    return;
  }
  lastPlayedLog = { key, at: now };
  void postActivity(action, trimmed, true)
    .then(async (res) => {
      if (res?.ok) return;
      if (!res) return;
      const errText = await res.text().catch(() => "");
      console.warn(
        `[${action === "played_video" ? "logMemberPlayedVideo" : "logMemberPlayedAudio"}] POST /api/user/activity failed:`,
        res.status,
        errText || res.statusText
      );
    })
    .catch((err) => {
      console.warn(
        `[${action === "played_video" ? "logMemberPlayedVideo" : "logMemberPlayedAudio"}] network error:`,
        err
      );
    });
}
