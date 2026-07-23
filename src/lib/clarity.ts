/** Microsoft Clarity project for RFTS Production. Override with NEXT_PUBLIC_CLARITY_PROJECT_ID. */
export const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() || "gqjkbi3vuk";

/** Set NEXT_PUBLIC_CLARITY_ENABLED=false to disable the tracking script (e.g. local). */
export function isClarityEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_CLARITY_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return Boolean(CLARITY_PROJECT_ID);
}

export function getClarityDashboardUrl(projectId = CLARITY_PROJECT_ID): string {
  return `https://clarity.microsoft.com/projects/view/${encodeURIComponent(projectId)}/dashboard`;
}
