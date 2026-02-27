import { redirect } from "next/navigation";
import { getMemberProfileForSession } from "@/lib/user-auth";
import PlayOptionsClient from "./PlayOptionsClient";

export const dynamic = "force-dynamic";

export default async function PlayOptionsPage() {
  const profile = await getMemberProfileForSession();
  if (!profile) {
    redirect("/member/login");
  }
  return (
    <PlayOptionsClient
      initialProfile={{
        email: profile.email,
        goalIds: profile.goalIds,
        subscriptionStatus: profile.subscriptionStatus,
        subscriptionTier: profile.subscriptionTier,
        playsPerNight: profile.playsPerNight
      }}
    />
  );
}
