import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import MemberRouteActivityLogger from "@/components/MemberRouteActivityLogger";
import AffiliateRefSync from "@/components/AffiliateRefSync";
import SiteHeader from "@/components/SiteHeader";
import { getPublicSiteUrl } from "@/lib/site-url";
import "./globals.css";

/** Fresh cookie reads for SiteHeader on every request (avoids stale “Members Console” vs /api/user/me mismatch). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reach For The Stars",
  description: "Guided audio for calm, sleep, and recovery.",
  metadataBase: new URL(getPublicSiteUrl())
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
        <AffiliateRefSync />
        <SiteHeader />
        {stripeMode === "demo" && (
          <div
            style={{
              background: "#fef3c7",
              color: "#92400e",
              padding: "10px 16px",
              textAlign: "center",
              borderBottom: "1px solid #fde68a",
              fontSize: 14
            }}
          >
            <strong>Stripe demo mode.</strong> Test card: <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4 }}>4242 4242 4242 4242</code> — any future expiry, any 3-digit CVC.
          </div>
        )}
        <MemberRouteActivityLogger />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
