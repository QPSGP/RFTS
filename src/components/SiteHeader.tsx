import { getSessionConsoleType } from "@/lib/auth";

export default async function SiteHeader() {
  const consoleType = await getSessionConsoleType();
  const consoleLink =
    consoleType === "admin"
      ? { label: "Admin Console", href: "/admin/content" }
      : consoleType === "moderator"
        ? { label: "Facilitators Console", href: "/moderator/console" }
        : null;
  const memberConsoleLink = consoleType === "member" ? { label: "Members Console", href: "/play-options" } : null;
  return (
    <header id="page-top" className="site-header">
      <div className="site-header-inner">
        <div className="site-header-row">
          <div className="header-left">
            <details className="menu-toggle mobile-only">
              <summary className="button button-secondary header-cta">Menu</summary>
              <div className="menu-panel">
                <a href="/">Home</a>
                <a href="/how-it-works">How It Works</a>
                <a href="/science">Science</a>
                <a href="/faqs">FAQs</a>
                {consoleType === "admin" && <a href="/facilitator">Facilitators</a>}
                {consoleType === "admin" && <a href="/affiliates">Affiliates</a>}
                {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
                {memberConsoleLink && <a href="/member/report-issue">Report an issue</a>}
              </div>
            </details>
            <a href="/" className="brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/Images/RFTSLogo.png"
                alt=""
                className="brand-logo"
                aria-hidden="true"
              />
              <span className="brand-text">Reach For The Stars</span>
            </a>
          </div>
          <nav className="nav site-nav desktop-only">
            <a href="/">Home</a>
            <a href="/how-it-works">How It Works</a>
            <a href="/science">Science</a>
            <a href="/faqs">FAQs</a>
            {consoleType === "admin" && <a href="/facilitator">Facilitators</a>}
            {consoleType === "admin" && <a href="/affiliates">Affiliates</a>}
            {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
            {memberConsoleLink && <a href="/member/report-issue">Report an issue</a>}
          </nav>
          <div className="header-actions">
            {consoleType !== "member" && (
              <a className="button header-cta header-start-btn" href="/signup/step-1-subscription-selection">
                <span className="header-btn-long">Start Your Journey</span>
                <span className="header-btn-short">Start</span>
              </a>
            )}
            <details className="login-toggle">
              <summary className="button header-cta">Login</summary>
              <div className="menu-panel">
                <a href="/member/login">Members</a>
                <a href="/moderator/console">Facilitators</a>
                <a href="/login">Administrator</a>
                {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
                {memberConsoleLink && (
                  <a href={memberConsoleLink.href} data-rfts="member-console">
                    {memberConsoleLink.label}
                  </a>
                )}
                {memberConsoleLink && <a href="/member/report-issue">Report an issue</a>}
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
