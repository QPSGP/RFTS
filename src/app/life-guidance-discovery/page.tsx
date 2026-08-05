import { redirect } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import { LandingTrialCtaButtons } from "@/components/LandingTrialCta";
import { getLgdPriceDisplay, getPublicLgdOfferEnabled } from "@/lib/lgd-access";

export const metadata = {
  title: "Life Guidance Discovery | Reach For The Stars",
  description:
    "Discover where you are, where you want to go, and how to get there - then receive a customized Goal Manifestation audio designed for you."
};

export default async function LifeGuidanceDiscoveryPage() {
  const enabled = await getPublicLgdOfferEnabled();
  if (!enabled) {
    redirect("/");
  }
  const price = getLgdPriceDisplay();

  return (
    <main>
      <section className="hero section">
        <span className="pill">Life Guidance Discovery</span>
        <h1>Life Guidance Discovery</h1>
        <p>
          A structured path to clarify where you are, where you want to go, and how you get there -
          so your facilitator can craft a customized Goal Manifestation recording in your words.
        </p>
        <div className="cta-row" style={{ marginTop: 16, flexWrap: "wrap", gap: 12 }}>
          <a className="button" href="/member/login?next=/member/lgd">
            Start electronic intake
          </a>
          <a className="button button-secondary" href="/signup/step-1-subscription-selection">
            Join Reach For The Stars
          </a>
        </div>
        {price.label ? (
          <p style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>
            Customized Goal Manifestation packaging from {price.label} (live session pricing may
            differ - see follow-up email or call 800-GOAL-NOW).
          </p>
        ) : null}
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">How it helps</span>
          <h2 className="section-title">Session brief + Goal Manifestation draft</h2>
          <p className="section-subtitle">
            Whether you meet live with a hypnotherapist or complete the electronic intake, your
            answers become the foundation for a personalized overnight audio.
          </p>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <h3>Where you are</h3>
            <p>
              Map life areas, occupying beliefs, gratitude, and the struggle that matters most this
              season - without losing your exact language.
            </p>
          </div>
          <div className="card">
            <h3>Where you want to go</h3>
            <p>
              Capture sensory outcomes, identity statements (“I am now…”), and prioritized goals
              that feed your nightly Reach For The Stars rotation.
            </p>
          </div>
          <div className="card">
            <h3>How you get there</h3>
            <p>
              Name blocks, strengths, learning will, voice preference, and supportive sound beds so
              production matches your style.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Two ways</span>
          <h2 className="section-title">Live session or electronic intake</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <h3>Live Life Guidance Discovery</h3>
            <p>
              Work directly with Terry Brussel-Rogers or an assigned facilitator. Ideal when you
              want a full consultation and collaborative script design.
            </p>
            <p style={{ marginBottom: 0 }}>
              Call <strong>800-GOAL-NOW (800-462-5669)</strong> or note interest when you sign up -
              we will follow up.
            </p>
          </div>
          <div className="card">
            <h3>Electronic intake (members)</h3>
            <p>
              Complete the structured intake in your member console. Save drafts anytime. When you
              submit, we generate a Goal Manifestation script draft for facilitator review before
              production.
            </p>
            <a className="button" href="/member/login?next=/member/lgd" style={{ marginTop: 12 }}>
              Open member intake
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card glow" style={{ textAlign: "center", padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>Ready for your customized audio?</h2>
          <p>
            Start with membership to unlock nightly sessions, then complete Life Guidance Discovery
            for your personal Goal Manifestation recording.
          </p>
          <LandingTrialCtaButtons />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
