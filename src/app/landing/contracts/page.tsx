/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Your Contract With the Universe Is Fiction | Reach For The Stars",
  description:
    "Universe contracts and manifestation agreements sound powerful - and chances are they are fictional. Build real change with nightly goal-based sessions instead."
};

const SIGNUP_HREF = "/signup/step-1-subscription-selection";

export default function ContractsLandingPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">A direct challenge</span>
        <h1>If your “contract with the universe” were real, it would already be working.</h1>
        <p>
          Manifestation contracts, cosmic agreements, and signed wish lists feel
          meaningful - and chances are they are fictional. Paper does not bind
          reality. Practice does.
        </p>
        <div className="cta-row hero-cta" style={{ marginTop: 20 }}>
          <a className="button" href={SIGNUP_HREF}>
            Start a real nightly practice
          </a>
          <a className="button button-secondary" href="/how-it-works">
            See how it works
          </a>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">The hard question</span>
          <h2 className="section-title">What changed after you signed?</h2>
          <p className="section-subtitle">
            If nothing moved in your habits, sleep, focus, or follow-through, the
            document did not create a partnership with the cosmos. It created a story.
          </p>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <h3>Fictional contracts</h3>
            <ul className="list">
              <li>
                <span>•</span>
                <span>Sound legal, spiritual, or official - with no second party that can perform.</span>
              </li>
              <li>
                <span>•</span>
                <span>Promise delivery without a nightly process that reshapes attention.</span>
              </li>
              <li>
                <span>•</span>
                <span>Often leave you waiting for signs instead of building capacity.</span>
              </li>
            </ul>
          </div>
          <div className="card">
            <h3>What actually moves the needle</h3>
            <ul className="list">
              <li>
                <span>•</span>
                <span>Clear goals, ordered by priority - not vague cosmic clauses.</span>
              </li>
              <li>
                <span>•</span>
                <span>Repetition while falling asleep, when suggestion lands deepest.</span>
              </li>
              <li>
                <span>•</span>
                <span>A schedule that returns to those goals night after night.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Challenge accepted?</span>
          <h2 className="section-title">Trade the fiction for a 14-night test</h2>
          <p className="section-subtitle">
            Put the contract away. Name up to ten goals. Let Reach For The Stars
            rotate targeted meditations through your sleep progression. Then judge
            results the only way that matters: by what you feel and do.
          </p>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <h3>1. Name the goals</h3>
            <p>
              Health, wealth, relationships, memory, inspiration, spirituality,
              balance - prioritize what you actually want.
            </p>
          </div>
          <div className="card">
            <h3>2. Start your session</h3>
            <p>
              Press Start Session. Prep audio, then your first goal recording -
              built for the window as you drift off.
            </p>
          </div>
          <div className="card">
            <h3>3. Let nights compound</h3>
            <p>
              Optional second session later in the night reinforces the message
              while you rest. Consistency beats ceremony.
            </p>
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: 24, justifyContent: "center" }}>
          <a className="button" href={SIGNUP_HREF}>
            Start Your Journey - 14 Day Free Trial
          </a>
          <a className="button button-secondary" href="/science">
            Read the science
          </a>
        </div>
      </section>

      <section className="section">
        <div className="card glow" style={{ textAlign: "center", padding: 28 }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>
            The universe does not need your signature.
          </h2>
          <p className="section-subtitle" style={{ margin: "0 auto 20px", maxWidth: 560 }}>
            Your subconscious needs clear goals and repeated guidance. That is
            what Reach For The Stars is built to deliver - every night you listen.
          </p>
          <a className="button" href={SIGNUP_HREF}>
            Begin membership
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
