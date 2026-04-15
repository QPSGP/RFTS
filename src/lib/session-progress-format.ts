/** 1 = half session (one main audio per schedule step; two steps = one full session). 2 = full session per schedule night. */
export type PlaysPerNightSetting = 1 | 2;

/**
 * How many full sessions (first + second main audio) are complete, as a friendly string.
 * Half-session mode uses Unicode fractions: ½, 1, 1½, 2, 2½, …
 */
export function formatFullSessionsFraction(
  completedScheduleSteps: number,
  playsPerNight: PlaysPerNightSetting
): string {
  const n = Math.max(0, Math.floor(completedScheduleSteps));
  if (playsPerNight === 2) {
    return String(n);
  }
  const whole = Math.floor(n / 2);
  const half = n % 2 === 1;
  if (n === 0) return "0";
  if (half && whole === 0) return "½";
  if (half) return `${whole}½`;
  return String(whole);
}
