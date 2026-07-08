export const SCREEN_WAKE_PREF_KEY = "rfts-screen-wake-enabled";

export function readScreenWakePreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SCREEN_WAKE_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeScreenWakePreference(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(SCREEN_WAKE_PREF_KEY, "1");
    } else {
      window.localStorage.removeItem(SCREEN_WAKE_PREF_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export async function fetchAccountScreenWakePreference(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/user/screen-wake", {
      credentials: "include",
      cache: "no-store"
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { screenWakeEnabled?: boolean };
    return !!data.screenWakeEnabled;
  } catch {
    return null;
  }
}

export async function saveAccountScreenWakePreference(enabled: boolean): Promise<void> {
  try {
    await fetch("/api/user/screen-wake", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
  } catch {
    // ignore network errors; localStorage still holds the choice
  }
}
