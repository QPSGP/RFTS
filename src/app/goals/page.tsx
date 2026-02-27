import { redirect } from "next/navigation";
import { getMemberProfileByUserId, getUserProfile, listInterests } from "@/lib/db";
import { getUserSessionEmail } from "@/lib/user-auth";
import GoalsSelector from "@/components/GoalsSelector";

export default async function GoalsPage() {
  const email = await getUserSessionEmail();
  if (!email) {
    redirect("/member/login");
  }
  const profile = await getUserProfile(email);
  if (!profile) {
    redirect("/member/login");
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
    const hasBuildPractice = (interest.categories || []).some((c) => c.toLowerCase() === "special");
    if (hasBuildPractice && !wantsPracticeGrowth) return false;
    return true;
  });

  return (
    <main>
      <section className="hero section">
        <span className="pill">Goal Setting</span>
        <h1>Set your priorities</h1>
        <p>Select the focus areas you want your sessions to reinforce.</p>
        <a className="button button-secondary" href="/play-options" style={{ marginTop: 12 }}>
          ← Back to Console
        </a>
      </section>
      <GoalsSelector interests={interests} />
      <section className="section" style={{ textAlign: "center", paddingTop: 24 }}>
        <a className="button button-secondary" href="/play-options">
          ← Back to Console
        </a>
      </section>
    </main>
  );
}
