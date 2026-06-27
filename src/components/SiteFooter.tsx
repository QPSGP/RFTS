import { TOPIC_LANDING_PAGES } from "@/lib/topic-landing-pages";

type SiteFooterProps = {
  showCta?: boolean;
  showStartJourney?: boolean;
};

export default function SiteFooter({ showCta = true, showStartJourney = true }: SiteFooterProps) {
  return (
    <footer className="section" style={{ marginTop: 40 }}>
      {showCta && (
        <div className="card glow" style={{ marginBottom: 24, textAlign: "center", padding: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {showStartJourney && (
              <a className="button" href="/signup/step-1-subscription-selection">
                Start Your Journey
              </a>
            )}
            <a className="button button-secondary" href="#page-top">
              Go To Top
            </a>
          </div>
        </div>
      )}
      <div className="card">
        <div className="grid grid-3" style={{ gap: 16 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Legal</h3>
            <div className="stack">
              <a href="https://www.reachforthestars.today/privacy-policy#">
                Privacy Policy
              </a>
              <a href="/terms-and-conditions">
                Terms and Conditions
              </a>
              <a href="https://www.acesuccess.com/" target="_blank" rel="noreferrer">
                Success Center
              </a>
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Wellness topics</h3>
            <div className="stack">
              {TOPIC_LANDING_PAGES.map((page) => (
                <a key={page.slug} href={page.path}>{page.pill}</a>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Contact Us</h3>
            <div className="stack">
              <a href="mailto:customerservice@reachforthestars.today">
                customerservice@reachforthestars.today
              </a>
              <a href="tel:+18004625669">800-GOAL-NOW (462-5669)</a>
            </div>
          </div>
        </div>
        <p style={{ marginTop: 16 }}>
          Copyright © 2026. All rights reserved. Success Center, Inc.
        </p>
      </div>
    </footer>
  );
}
