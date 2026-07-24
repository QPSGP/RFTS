"use client";

import { LANDING_TRIAL_CTA_LABEL, LANDING_TRIAL_SIGNUP_HREF } from "@/components/LandingTrialCta";
import { GOAL_LANDING_PAGES } from "@/lib/goal-landing-pages";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";
import { useMemberLoggedIn } from "@/hooks/useMemberLoggedIn";

type SiteFooterProps = {
  showCta?: boolean;
  showStartJourney?: boolean;
};

function scrollToPageTop() {
  const scrollingEl = document.scrollingElement || document.documentElement;
  scrollingEl.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

export default function SiteFooter({ showCta = true, showStartJourney = true }: SiteFooterProps) {
  const isMember = useMemberLoggedIn();
  const hideGuestSignup = isMember === true;
  const showFooterStart = showCta && showStartJourney && !hideGuestSignup;

  return (
    <footer className="section" style={{ marginTop: 40 }}>
      <div className="card glow" style={{ marginBottom: 24, textAlign: "center", padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {showFooterStart && (
            <a className="button" href={LANDING_TRIAL_SIGNUP_HREF}>
              {LANDING_TRIAL_CTA_LABEL}
            </a>
          )}
          <button type="button" className="button button-secondary" onClick={scrollToPageTop}>
            Go To Top
          </button>
        </div>
      </div>
      <div className="card">
        <div className="grid grid-3" style={{ gap: 16 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Goals</h3>
            <div className="stack">
              <a href="/blog">Blog &amp; articles</a>
              {GOAL_LANDING_PAGES.map((page) => (
                <a key={page.slug} href={page.path}>{page.label}</a>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Other wellness focus areas</h3>
            <div className="stack">
              {WELLNESS_BENEFIT_LINKS.map((benefit) => (
                <a key={benefit.label} href={benefit.path}>{benefit.label}</a>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Legal</h3>
            <div className="stack">
              <a href="/life-guidance-discovery">Life Guidance Discovery</a>
              <a href="https://www.reachforthestars.today/privacy-policy#">
                Privacy Policy
              </a>
              <a href="/terms-and-conditions">
                Terms and Conditions
              </a>
              <a href="/creator-content-license">
                Creator Content License
              </a>
              <a href="/affiliates">Partner / affiliate program</a>
              <a href="https://www.acesuccess.com/" target="_blank" rel="noreferrer">
                Success Center
              </a>
            </div>
            <h3 style={{ marginTop: 16 }}>Contact Us</h3>
            <div className="stack">
              <a href="mailto:customerservice@reachforthestars.today">
                customerservice@reachforthestars.today
              </a>
              <a href="tel:+18004625669">800-GOAL-NOW (462-5669)</a>
            </div>
          </div>
        </div>
        <p style={{ marginTop: 16, textAlign: "center", fontWeight: 700 }}>
          Copyright © 2026. All rights reserved. Success Center, Inc.
        </p>
      </div>
    </footer>
  );
}
