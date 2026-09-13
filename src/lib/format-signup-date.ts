/** Calendar date for a member's `users.created_at` (signup). */
export function formatSignupDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const raw = String(iso).trim();
  if (!raw) return "";
  let date = new Date(raw);
  if (Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
    date = new Date(`${raw.replace(" ", "T")}Z`);
  }
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
