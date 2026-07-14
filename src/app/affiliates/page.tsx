import type { Metadata } from "next";
import { isAdminSession } from "@/lib/auth";
import AffiliateAdmin from "@/components/AffiliateAdmin";
import AffiliateForm from "@/components/AffiliateForm";
import SiteFooter from "@/components/SiteFooter";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";

export const metadata: Metadata = {
  title: "Affiliate Program | Reach For The Stars",
  description:
    "Share Reach For The Stars and earn 25% ongoing on every member who subscribes through your link. For therapists, coaches, and community partners."
};

export default async function AffiliatesPage() {
  const isAdmin = await isAdminSession();
  const signupHref = buildMarketingSignupHref();

  return (
    <main>
      <section className="hero section">
        <span className="pill">Partner program</span>
        <h1>Share Reach For The Stars. Earn as they grow.</h1>
        <p>
          Refer new members and earn <strong>25% ongoing</strong> from each subscriber for as long
          as they stay subscribed. Landing pages and referral links include your affiliate number —
          so sleep, stress, burnout, and goal pages all credit you.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <a className="button" href="#apply">
            Apply as a partner
          </a>
          <a className="button button-secondary" href="/member/login">
            Members: open My Profile
          </a>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 className="section-title">Simple, transparent rewards.</h2>
          <p className="section-subtitle">
            Invite people you believe will benefit — then they listen while they sleep.
          </p>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <h3>1. Get your link</h3>
            <p>
              Members find their affiliate number and copy-ready landing page links in{" "}
              <strong>My Profile → Share landing pages</strong>. Partners who apply below receive
              onboarding after approval.
            </p>
          </div>
          <div className="card">
            <h3>2. Share what fits</h3>
            <p>
              Send signup, sleep, stress, burnout recovery, or goal pages — each URL already
              includes your <code>ref</code> code.
            </p>
          </div>
          <div className="card">
            <h3>3. Earn 25% ongoing</h3>
            <p>
              You earn while they stay subscribed. Set payout preferences in My Profile (Stripe
              Connect or manual methods).
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Who this is for</span>
          <h2 className="section-title">Therapists, coaches, and community leaders.</h2>
          <p className="section-subtitle">
            Ideal partners already serve people dealing with stress, sleep, burnout, or personal
            growth — and want a product that does not add another daytime chore.
          </p>
        </div>
        <ul style={{ maxWidth: 640, lineHeight: 1.7, color: "#374151" }}>
          <li>Therapists, hypnotherapists, and wellness coaches</li>
          <li>First-responder and healthcare wellness programs</li>
          <li>Parent / caregiver community leaders</li>
          <li>Members who want to share Reach For The Stars with their network</li>
        </ul>
        <p style={{ marginTop: 16 }}>
          New to the platform?{" "}
          <a href={signupHref}>Start a member trial</a>, then share from My Profile — every member
          receives an affiliate number.
        </p>
      </section>

      <section id="apply" className="section">
        <div className="section-head">
          <span className="eyebrow">Get started</span>
          <h2 className="section-title">Apply or use your member link.</h2>
          <p className="section-subtitle">
            Already a member? You do not need this form — copy links from My Profile. Non-members
            who want partner payout setup can apply here.
          </p>
        </div>
        <div className={isAdmin ? "grid grid-2" : undefined} style={!isAdmin ? { maxWidth: 520 } : undefined}>
          <AffiliateForm />
          {isAdmin && <AffiliateAdmin />}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
