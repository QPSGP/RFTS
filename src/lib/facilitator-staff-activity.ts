import { getSessionEmail } from "@/lib/auth";
import { getModeratorByEmail, recordStaffActivity } from "@/lib/db";

/** Log facilitator console actions to staff_activity_log for admin dashboards. */
export async function recordModeratorStaffActivity(action: string): Promise<void> {
  const email = getSessionEmail();
  if (!email) return;
  const moderator = await getModeratorByEmail(email);
  if (!moderator) return;
  try {
    await recordStaffActivity("moderator", email, action, moderator.name);
  } catch {
    // Table may not exist on older DBs
  }
}
