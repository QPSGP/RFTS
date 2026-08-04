/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Imagine the Best You | Reach For The Stars",
  description:
    "Personalized sleep sessions that reinforce your goals while you fall asleep. Start a 14-day free trial with Reach For The Stars."
};

const SIGNUP_HREF = "/signup/step-1-subscription-selection";

const GOALS = [
  { label: "Health", src: "/Images/Health.jpg" },
  { label: "Wealth", src: "/Images/Wealth.jpeg" },
  { label: "Relationship", src: "/Images/Relationship.jpeg" },
  { label: "Memory", src: "/Images/Memory.jpg" },
  { label: "Inspiration", src: "/Images/Inspiration.jpg" },
  { label: "Spirituality", src: "/Images/Spirtuality.jpg" },
  { label: "Balanced Life", src: "/Images/BalancedLife.jpg" }
] as const;

export default function BestYouLandingPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Conscious Growth Engine</span>
        <h1>Imagine the best you — then train for it while you sleep.</h1>
        <p>
          Reach For The Stars turns your prioritized goals into nightly guided
          meditations, so your subconscious gets the right messages at the right
          time.
        </p>
        <div className="cta-row hero-cta" style={{ marginTop: 20 }}>
          <a className="button" href={SIGNUP_HREF}>
            Start Your Journey
          </a>
          <strong>14 Day Free Trial</strong>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Your goals, nightly</span>
          <h2 className="section-title">Choose what matters. We rotate the rest.</h2>
          <p className="section-subtitle">
            Select up to ten priorities. Your schedule reinforces top goals more
            often — without you building a playlist every evening.
          </p>
        </div>
        <div className="grid grid-3">
          {GOALS.map((goal) => (
            <a
              key={goal.label}
              href={SIGNUP_HREF}
              className="card"
              aria-label={`${goal.label}: begin membership`}
              style={{ padding: 0, overflow: "hidden", display: "block" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={goal.src}
                alt=""
                style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", display: "block" }}
              />
              <div style={{ padding: "14px 16px" }}>
                <h3 style={{ margin: 0 }}>{goal.label}</h3>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">How nights work</span>
          <h2 className="section-title">Simple to start. Structured to stick.</h2>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <h3>Fall-asleep window</h3>
            <p>
              Sessions begin with preparation, then your first goal recording —
              timed for high receptivity as you drift off.
            </p>
          </div>
          <div className="card">
            <h3>Optional second session</h3>
            <p>
              Choose one or two audios per night. A later recording reinforces
              goals during restorative sleep.
            </p>
          </div>
          <div className="card">
            <h3>Built to compound</h3>
            <p>
              Consistent rotation beats one-off inspiration. Show up nightly;
              let the schedule do the sequencing.
            </p>
          </div>
        </div>
        <div className="cta-row" style={{ marginTop: 24, justifyContent: "center" }}>
          <a className="button" href={SIGNUP_HREF}>
            Start Your Journey — 14 Day Free Trial
          </a>
          <a className="button button-secondary" href="/landing/contracts">
            Tired of fictional contracts?
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
