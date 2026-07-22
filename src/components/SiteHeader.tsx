import { headers } from "next/headers";
import { getSessionConsoleType } from "@/lib/auth";
import HeaderStartJourneyLink from "@/components/HeaderStartJourneyLink";
import WhyItWorksVideoButton from "@/components/WhyItWorksVideoButton";
import { isMemberLoggedIn } from "@/lib/member-session";

export const dynamic = "force-dynamic";

export default async function SiteHeader() {
  const pathname = (await headers()).get("x-rfts-pathname") ?? "";
  const onMemberLoginPage = pathname === "/member/login";

  const [consoleType, memberLoggedIn] = await Promise.all([
    getSessionConsoleType(),
    isMemberLoggedIn()
  ]);
  const consoleLink =
    consoleType === "admin"
      ? { label: "Admin Console", href: "/admin/content" }
      : consoleType === "moderator"
        ? { label: "Facilitators Console", href: "/moderator/console" }
        : null;
  const memberConsoleLink =
    consoleType === "member" && !onMemberLoginPage
      ? { label: "Members Console", href: "/play-options" }
      : null;
  const showMemberReportIssue = consoleType === "member";
  const showAdminReportIssue = consoleType === "admin";
  const showGuestSignupActions = !memberLoggedIn;
  return (
    <header id="page-top" className="site-header">
      <div className="site-header-inner">
        <div className="site-header-row">
          <div className="header-left">
            <details className="menu-toggle mobile-only">
              <summary className="button button-secondary header-cta">Menu</summary>
              <div className="menu-panel">
                <a href="/">Home</a>
                <WhyItWorksVideoButton variant="menu" />
                <a href="/science">Science</a>
                <a href="/faqs">FAQs</a>
                <a href="/blog">Blog</a>
                <a href="/affiliates">Affiliates</a>
                {consoleType === "admin" && <a href="/facilitator">Facilitators</a>}
                {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
                {memberConsoleLink && <a href={memberConsoleLink.href}>{memberConsoleLink.label}</a>}
                {showMemberReportIssue && <a href="/member/report-issue">Report an issue</a>}
                {showAdminReportIssue && <a href="/admin/member-issues#file-issue">Report an issue</a>}
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
            <WhyItWorksVideoButton variant="nav" />
            <a href="/science">Science</a>
            <a href="/faqs">FAQs</a>
            <a href="/blog">Blog</a>
            <a href="/affiliates">Affiliates</a>
            {consoleType === "admin" && <a href="/facilitator">Facilitators</a>}
            {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
            {memberConsoleLink && <a href={memberConsoleLink.href}>{memberConsoleLink.label}</a>}
            {showMemberReportIssue && <a href="/member/report-issue">Report an issue</a>}
            {showAdminReportIssue && <a href="/admin/member-issues#file-issue">Report an issue</a>}
          </nav>
          <div className="header-actions">
            {showGuestSignupActions && <HeaderStartJourneyLink />}
            {showGuestSignupActions && (
              <details className="login-toggle">
                <summary className="button header-cta">Login</summary>
                <div className="menu-panel">
                  <a href="/member/login">Members</a>
                  <a href="/login">Facilitators</a>
                  <a href="/login">Administrator</a>
                  {consoleLink && <a href={consoleLink.href}>{consoleLink.label}</a>}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
