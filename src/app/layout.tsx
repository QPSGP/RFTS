import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reach For The Stars",
  description: "Guided audio for calm, sleep, and recovery.",
  metadataBase: new URL("https://www.reachforthestars.today")
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const stripeMode = process.env.NEXT_PUBLIC_STRIPE_MODE;
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <strong>Reach For The Stars</strong>
            </div>
            <nav className="nav site-nav">
              <a href="/">Home</a>
              <a href="/how-it-works">How It Works</a>
              <a href="/science">Science</a>
              <a href="/faqs">FAQs</a>
              <a href="/play-options#meditation-library">Play Options</a>
              <a href="/library">Library</a>
              <a href="/member/login">Member Login</a>
              <a href="/signup/step-1-subscription-selection">Sign Up</a>
              <a href="/affiliates">Affiliates</a>
              <a href="/moderation">Moderation</a>
              <a href="/moderator/console">Moderator Console</a>
              <a href="/admin/content">Admin</a>
              <a href="/login" className="button button-secondary">
                Admin Login
              </a>
            </nav>
          </div>
        </header>
        {stripeMode === "demo" && (
          <div
            style={{
              background: "#fef3c7",
              color: "#92400e",
              padding: "10px 16px",
              textAlign: "center",
              borderBottom: "1px solid #fde68a"
            }}
          >
            Stripe is in demo mode. Use test cards only.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
