import SubscriptionSelection from "@/components/SubscriptionSelection";
import { listSubscriptionPlans } from "@/lib/db";

export default async function SubscriptionSelectionPage() {
  const plans = await listSubscriptionPlans();
  return (
    <div className="signup-shell">
      <div className="signup-card">
        <div className="signup-title">Sign Up for Your Account</div>
        <div className="signup-subtitle">
          Begin reaching your highest potential, all while you sleep.
        </div>
        <SubscriptionSelection plans={plans} />
      </div>
    </div>
  );
}
