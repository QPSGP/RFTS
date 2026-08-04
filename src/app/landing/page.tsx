import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Landing Pages | Reach For The Stars",
  description: "Campaign landing pages for Reach For The Stars."
};

export default function LandingHubPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Campaign pages</span>
        <h1>Landing pages</h1>
        <p>
          Share these URLs in ads, email, or social. Each page sends visitors to
          membership signup when they are ready.
        </p>
      </section>

      <section className="section">
        <div className="grid grid-2">
          <a href="/landing/contracts" className="card" style={{ display: "block" }}>
            <span className="badge">Challenge</span>
            <h3 style={{ marginTop: 12 }}>Fictional contracts</h3>
            <p>
              Challenges “contracts with the universe” and other manifestation
              agreements as fiction — then offers a 14-night practice test.
            </p>
            <p style={{ marginBottom: 0, color: "#0f766e", fontWeight: 600 }}>
              /landing/contracts →
            </p>
          </a>
          <a href="/landing/best-you" className="card" style={{ display: "block" }}>
            <span className="badge">Conversion</span>
            <h3 style={{ marginTop: 12 }}>Imagine the best you</h3>
            <p>
              Goal-forward sleep sessions: pick priorities, start nightly
              meditations, 14-day free trial.
            </p>
            <p style={{ marginBottom: 0, color: "#0f766e", fontWeight: 600 }}>
              /landing/best-you →
            </p>
          </a>
        </div>
      </section>

      <SiteFooter showCta={false} />
    </main>
  );
}
