import AffiliateAdmin from "@/components/AffiliateAdmin";
import AffiliateForm from "@/components/AffiliateForm";

export default function AffiliatesPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Affiliate Growth Network</span>
        <h1>Share the work. Earn as they grow.</h1>
        <p>
          Refer new members and earn X from each subscriber as long as they stay
          subscribed.
        </p>
      </section>
      <section className="section">
        <div className="section-head">
          <span className="eyebrow">How It Works</span>
          <h2 className="section-title">Simple, transparent rewards.</h2>
          <p className="section-subtitle">
            Invite people you believe will benefit and build recurring impact.
          </p>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <h3>Share</h3>
            <p>Send your referral link to your audience or community.</p>
          </div>
          <div className="card">
            <h3>Subscribe</h3>
            <p>They join and start their guided meditation journey.</p>
          </div>
          <div className="card">
            <h3>Earn</h3>
            <p>You earn X for every active subscriber you bring in.</p>
          </div>
        </div>
      </section>
      <section className="grid grid-2 section">
        <AffiliateForm />
        <AffiliateAdmin />
      </section>
    </main>
  );
}
