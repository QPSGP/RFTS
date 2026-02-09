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
        <div className="signup-title">Sign Up for Your Account</div>
        <div className="signup-subtitle">
          Begin reaching your highest potential, all while you sleep.
        </div>
        <MemberOnboarding plans={plans} goals={goals} />
      </div>
      <SiteFooter showStartJourney={false} />
    </div>
  );
}
