/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true
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
