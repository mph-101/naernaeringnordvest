import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    tsconfigPath: "./tsconfig.next.json",
    ignoreBuildErrors: true,
  },
  distDir: ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/article/:id",
        destination: "/sak/:id",
        permanent: true,
      },
      // Bridge redirects from legacy slugs the running app still emits at
      // runtime (Supabase password-reset email links and Stripe return URLs)
      // to the new canonical Norwegian routes. Kept as non-permanent so the
      // mapping can change while both the Vite and Next apps coexist.
      // The recovery token lives in the URL hash and the Stripe session_id in
      // the query string — both survive an HTTP redirect.
      {
        source: "/reset-password",
        destination: "/nullstill-passord",
        permanent: false,
      },
      {
        source: "/abonnement/takk",
        destination: "/abonnement/retur",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
