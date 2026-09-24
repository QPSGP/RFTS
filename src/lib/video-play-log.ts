import { logMemberPlayedVideo } from "@/lib/member-audio-activity";
import { trackGaEvent } from "@/lib/google-analytics";

export const WHY_IT_WORKS_VIDEO_TITLE = "Why it works - Terry RFTS short";
export const WHY_IT_WORKS_VIDEO_SRC = "/Images/Terry-RFTS-short-for-web-T3.mp4";
/** Longer Terry film opened from Learn more while the short video is playing. */
export const TERRY_LONG_VIDEO_TITLE = "Learn more - Terry sizzle reel";
export const TERRY_LONG_VIDEO_SRC = "/Images/Terry-Sizzle-Reel-Website.mp4";
/** @deprecated Prefer WHY_IT_WORKS_VIDEO_SRC */
export const TERRY_WHY_IT_WORKS_VIDEO_SRC = WHY_IT_WORKS_VIDEO_SRC;

export function whyItWorksVideoLogDetails(pagePath: string): string {
  const path = pagePath.trim() || "/";
  return `${WHY_IT_WORKS_VIDEO_TITLE} | ${path}`;
}

/** Member activity + GA / Vercel / Clarity when the Why it works video starts. */
export function logWhyItWorksVideoStarted(pagePath?: string): void {
  if (typeof window === "undefined") return;
  const path = (pagePath || window.location.pathname || "/").slice(0, 200);
  logMemberPlayedVideo(whyItWorksVideoLogDetails(path));
  trackGaEvent("video_start", {
    video_title: WHY_IT_WORKS_VIDEO_TITLE,
    video_url: WHY_IT_WORKS_VIDEO_SRC,
    page_path: path
  });
  void import("@vercel/analytics")
    .then((mod) => {
      mod.track("why_it_works_video_started", { path });
    })
    .catch(() => {});
  try {
    const clarity = (window as Window & { clarity?: (cmd: string, name: string) => void }).clarity;
    clarity?.("event", "why_it_works_video_started");
  } catch {
    /* Clarity is optional */
  }
}

/** Member activity + analytics when Learn more starts the longer Terry video. */
export function logTerryLongVideoStarted(pagePath?: string): void {
  if (typeof window === "undefined") return;
  const path = (pagePath || window.location.pathname || "/").slice(0, 200);
  logMemberPlayedVideo(`${TERRY_LONG_VIDEO_TITLE} | ${path}`);
  trackGaEvent("video_start", {
    video_title: TERRY_LONG_VIDEO_TITLE,
    video_url: TERRY_LONG_VIDEO_SRC,
    page_path: path
  });
  void import("@vercel/analytics")
    .then((mod) => {
      mod.track("terry_long_video_started", { path });
    })
    .catch(() => {});
}
