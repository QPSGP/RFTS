import { redirect } from "next/navigation";
import { getMemberProfileByUserId, getUserProfile, listInterests } from "@/lib/db";
import { getUserSessionEmail } from "@/lib/user-auth";
import LgdIntakeForm from "@/components/LgdIntakeForm";

export default async function MemberLgdPage() {
  const email = await getUserSessionEmail();
  if (!email) {
    redirect("/member/login?next=/member/lgd");
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    redirect("/member/login?next=/member/lgd");
  }
  const memberProfile = await getMemberProfileByUserId(profile.id);
  const yearBorn = memberProfile?.yearBorn ?? null;
  const currentYear = new Date().getFullYear();
  const hasVerifiedAge = yearBorn != null && currentYear - yearBorn >= 18;
  const adultConsent = !!(memberProfile?.adultConsent && hasVerifiedAge);
  const wantsPracticeGrowth = !!memberProfile?.wantsPracticeGrowth;

  const allInterests = await listInterests();
  const interests = allInterests.filter((interest) => {
    if (interest.isAdult && !adultConsent) return false;
    const hasBuildPractice = (interest.categories || []).some(
      (c) => c.toLowerCase() === "special"
    );
    if (hasBuildPractice && !wantsPracticeGrowth) return false;
    return true;
  });

  return (
    <main>
      <section className="hero section">
        <span className="pill">Life Guidance Discovery</span>
        <h1>Electronic Life Guidance Discovery</h1>
        <p>
          Share where you are, where you want to go, and how you get there. Your answers prepare
          your facilitator and help draft a customized Goal Manifestation script in your words.
        </p>
        <a className="button button-secondary" href="/play-options" style={{ marginTop: 12 }}>
          ← Back to Console
        </a>
      </section>
      <LgdIntakeForm interests={interests} />
      <section className="section" style={{ textAlign: "center", paddingTop: 24 }}>
        <a className="button button-secondary" href="/play-options">
          ← Back to Console
        </a>
      </section>
    </main>
  );
}
