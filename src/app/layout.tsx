import type { Metadata } from "next";
import MemberRouteActivityLogger from "@/components/MemberRouteActivityLogger";
import SiteHeader from "@/components/SiteHeader";
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
      </body>
    </html>
  );
}
