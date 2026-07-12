import { getSessionConsoleType } from "@/lib/auth";

/** True when the current request has a signed-in member session (not admin/facilitator). */
export async function isMemberLoggedIn(): Promise<boolean> {
  return (await getSessionConsoleType()) === "member";
}
