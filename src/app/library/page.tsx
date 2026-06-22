import { getMemberProfileByUserId, getUserProfile, listInterests, listLibrary } from "@/lib/db";
import { memberCanBrowseLibraryItem } from "@/lib/library-access";
import { getUserSessionEmail } from "@/lib/user-auth";
import LibraryBrowser from "@/components/LibraryBrowser";
import PlaySecondRecordingCta from "@/components/PlaySecondRecordingCta";

function filterInterestsByMemberAccess(
  interests: Awaited<ReturnType<typeof listInterests>>,
  adultConsent: boolean,
  wantsPracticeGrowth: boolean
) {
  return interests.filter((interest) => {
    if (interest.isAdult && !adultConsent) return false;
    const hasBuildPractice = (interest.categories || []).some((c) => c.toLowerCase() === "special");
    if (hasBuildPractice && !wantsPracticeGrowth) return false;
    return true;
  });
}

export default async function LibraryPage() {
  const email = await getUserSessionEmail();
  const [library, allInterests] = await Promise.all([
    listLibrary(),
    listInterests()
  ]);
  let interests = allInterests;
  if (email) {
    const profile = await getUserProfile(email);
    const memberProfile = profile ? await getMemberProfileByUserId(profile.id) : null;
    const yearBorn = memberProfile?.yearBorn ?? null;
    const currentYear = new Date().getFullYear();
    const hasVerifiedAge = yearBorn != null && currentYear - yearBorn >= 18;
    const adultConsent = !!(memberProfile?.adultConsent && hasVerifiedAge);
    const wantsPracticeGrowth = !!memberProfile?.wantsPracticeGrowth;
    interests = filterInterestsByMemberAccess(allInterests, adultConsent, wantsPracticeGrowth);
  } else {
    interests = filterInterestsByMemberAccess(allInterests, false, false);
  }
  const libraryForMember = library.filter(
    (item) =>
      !(item.skuCode || "").toUpperCase().startsWith("MU") &&
      memberCanBrowseLibraryItem(item, email)
  );
  return (
    <main>
      <section id="library-top" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Audio Library</h1>
          <p>Browse and stream the latest guided audio sessions.</p>
        </div>
        <a className="button button-secondary" href="/play-options">
          ← Back to Console
        </a>
      </section>
      <LibraryBrowser interests={interests} library={libraryForMember} />
      <PlaySecondRecordingCta />
      <section style={{ textAlign: "center", paddingTop: 24, marginTop: 24, borderTop: "1px solid #e5e7eb" }}>
        <a className="button button-secondary" href="/play-options">
          ← Back to Console
        </a>
      </section>
    </main>
  );
}
