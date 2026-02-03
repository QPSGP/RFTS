import type { Metadata } from "next";
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
