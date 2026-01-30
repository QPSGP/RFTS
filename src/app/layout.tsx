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
  return (
    <html lang="en">
      <body>
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "#ffffff"
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <strong>Reach For The Stars</strong>
            <nav className="nav">
              <a href="/">Home</a>
              <a href="/how-it-works">How It Works</a>
              <a href="/science">Science</a>
              <a href="/faqs">FAQs</a>
              <a href="/play-options#meditation-library">Play Options</a>
              <a href="/goals">Goals</a>
              <a href="/library">Library</a>
              <a href="/signup/step-1-subscription-selection">Sign Up</a>
              <a href="/affiliates">Affiliates</a>
              <a href="/moderation">Moderation</a>
              <a href="/admin/content">Admin</a>
              <a href="/login" className="button button-secondary">
                Admin Login
              </a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
