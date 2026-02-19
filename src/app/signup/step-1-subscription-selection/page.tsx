import MemberOnboarding from "@/components/MemberOnboarding";
import { listInterests, listSubscriptionPlans } from "@/lib/db";
import SiteFooter from "@/components/SiteFooter";

export default async function SubscriptionSelectionPage() {
  const [plans, goals] = await Promise.all([
    listSubscriptionPlans(),
    listInterests()
  ]);
  return (
    <div className="signup-shell">
      <div className="signup-card">
        <div className="signup-title">Begin reaching your highest potential, all while you sleep.</div>
        <div className="signup-subtitle" style={{ fontWeight: 700 }}>
          By signing up for your 14 day free trial membership!
        </div>
        <MemberOnboarding plans={plans} goals={goals} />
      </div>
      <SiteFooter showStartJourney={false} />
    </div>
  );
}
