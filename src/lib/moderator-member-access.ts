import { getSessionEmail, getSessionRole } from "@/lib/auth";
import { getModeratorByEmail } from "@/lib/db";
import type { ModeratorAccount } from "@/lib/types";

export type ModeratorMemberAccess = {
  moderator: ModeratorAccount;
  memberEmail: string;
};

export async function requireModeratorAssignedMember(
  targetEmail: string
): Promise<ModeratorMemberAccess | { error: string; status: number }> {
  if ((await getSessionRole()) !== "moderator") {
    return { error: "Unauthorized.", status: 401 };
  }
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return { error: "Unauthorized.", status: 401 };
  }
  const moderator = await getModeratorByEmail(sessionEmail);
  if (!moderator || moderator.status !== "active") {
    return { error: "Unauthorized.", status: 401 };
  }
  const normalized = targetEmail.trim().toLowerCase();
  const allowed = moderator.assignedUserEmails.map((e) => e.trim().toLowerCase());
  if (!allowed.includes(normalized)) {
    return { error: "This member is not assigned to you.", status: 403 };
  }
  return { moderator, memberEmail: normalized };
}

export async function requireActiveModerator():
  Promise<ModeratorAccount | { error: string; status: number }> {
  if ((await getSessionRole()) !== "moderator") {
    return { error: "Unauthorized.", status: 401 };
  }
  const sessionEmail = getSessionEmail();
  if (!sessionEmail) {
    return { error: "Unauthorized.", status: 401 };
  }
  const moderator = await getModeratorByEmail(sessionEmail);
  if (!moderator || moderator.status !== "active") {
    return { error: "Unauthorized.", status: 401 };
  }
  return moderator;
}
