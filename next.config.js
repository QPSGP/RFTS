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
      }
    ];
  }
};

module.exports = nextConfig;
