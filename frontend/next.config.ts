import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Schlankes Docker-Image: nur .next/standalone + server.js statt voller node_modules.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Same-Origin-Proxy (Muster B): Der Browser ruft /api/... same-origin auf; dieser
  // Rewrite läuft SERVERSEITIG in Next.js und leitet an das Backend weiter. Der Hostname
  // 'backend:8000' ist der interne Compose-Netz-Name — das Backend hört intern auf 8000
  // (das 8001:8000-Mapping ist nur das Host-Port-Mapping, für den internen Proxy irrelevant).
  async rewrites() {
    return [
      {
        // Block external access to maintenance endpoints
        source: '/api/v1/maintenance/:path*',
        destination: '/404',
      },
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
