export default function SiteFooter() {
  return (
    <footer className="section" style={{ marginTop: 40 }}>
      <div className="card">
        <div className="grid grid-2" style={{ gap: 16 }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Legal</h3>
            <div className="stack">
              <a href="https://www.reachforthestars.today/privacy-policy#">
                Privacy Policy
              </a>
              <a href="https://www.reachforthestars.today/terms-and-condition#">
                Terms and Conditions
              </a>
              <a href="https://www.acesuccess.com/" target="_blank" rel="noreferrer">
                Success Center
              </a>
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
