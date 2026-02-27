import { redirect } from "next/navigation";
import { getMemberProfileForSession } from "@/lib/user-auth";
import PlayOptionsClient from "./PlayOptionsClient";

export const dynamic = "force-dynamic";

export default async function PlayOptionsPage() {
  let profile: Awaited<ReturnType<typeof getMemberProfileForSession>> = null;
  try {
    profile = await getMemberProfileForSession();
  } catch (_e) {
    redirect("/member/login");
  }
  if (!profile) {
    redirect("/member/login");
  }
  return (
    <PlayOptionsClient
      initialProfile={{
        email: String(profile.email),
        goalIds: Array.isArray(profile.goalIds) ? profile.goalIds : [],
        subscriptionStatus: profile.subscriptionStatus ?? null,
        subscriptionTier: profile.subscriptionTier ?? null,
        playsPerNight: Number(profile.playsPerNight) || 2
      }}
    />
  );
}
