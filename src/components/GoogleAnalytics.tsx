import Script from "next/script";
import { GA_MEASUREMENT_ID, isGoogleAnalyticsEnabled } from "@/lib/google-analytics";

/** Injects Google Analytics 4 (gtag.js). Async / afterInteractive - does not block rendering. */
export default function GoogleAnalytics() {
  if (!isGoogleAnalyticsEnabled()) return null;

  const id = JSON.stringify(GA_MEASUREMENT_ID);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${id});`}
      </Script>
    </>
  );
}
