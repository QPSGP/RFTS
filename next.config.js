/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()"
      },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: https:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms https://challenges.cloudflare.com",
          "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://challenges.cloudflare.com",
          "connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://*.blob.vercel-storage.com https://www.google-analytics.com https://region1.google-analytics.com https://www.clarity.ms https://*.clarity.ms https://challenges.cloudflare.com"
        ].join("; ")
      }
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains"
      });
    }
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: "/blog/stress-relief-meditation-before-bed",
        destination: "/blog/stress-relief-meditation-during-sleep",
        permanent: true
      },
      {
        source: "/sign-up",
        destination: "/signup/step-1-subscription-selection",
        permanent: true
      },
      {
        source: "/signup",
        destination: "/signup/step-1-subscription-selection",
        permanent: true
      }
    ];
  }
};

module.exports = nextConfig;
