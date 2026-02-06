import { getSessionConsoleType } from "@/lib/auth";

export default async function SiteHeader() {
  const consoleType = await getSessionConsoleType();
  const consoleLink =
    consoleType === "admin"
      ? { label: "Admin Console", href: "/admin/content" }
      : consoleType === "moderator"
        ? { label: "Co-Creators Console", href: "/moderator/console" }
        : consoleType === "member"
          ? { label: "Members Console", href: "/play-options" }
          : null;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-row">
          <div className="header-left">
            <details className="menu-toggle mobile-only">
              <summary className="button button-secondary">Menu</summary>
              <div className="menu-panel">
                <a href="/">Home</a>
                <a href="/how-it-works">How It Works</a>
                <a href="/science">Science</a>
                <a href="/faqs">FAQs</a>
                <a href="/co-creator">Co-Creators</a>
                <a href="/affiliates">Affiliates</a>
                {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
              </div>
            </details>
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <strong>Reach For The Stars</strong>
            </div>
          </div>
          <div className="header-actions">
            <a className="button" href="/signup/step-1-subscription-selection">
              Start Your Journey
            </a>
            <details className="login-toggle">
              <summary className="button">Login</summary>
              <div className="menu-panel">
                <a href="/member/login">Members</a>
                <a href="/moderator/console">Co-Creators</a>
                <a href="/affiliates">Affiliates</a>
                <a href="/login">Administrator</a>
                {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
              </div>
            </details>
          </div>
        </div>
        <nav className="nav site-nav desktop-only">
          <a href="/">Home</a>
          <a href="/how-it-works">How It Works</a>
          <a href="/science">Science</a>
          <a href="/faqs">FAQs</a>
          <a href="/co-creator">Co-Creators</a>
          <a href="/affiliates">Affiliates</a>
          {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
        </nav>
      </div>
    </header>
  );
}
