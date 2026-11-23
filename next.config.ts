// next.config.ts
// OPDATERET (/auktion og /grejauktion sender videre til /auktioner). Admin-siden får X-Robots-Tag: noindex.
// Next.js-konfiguration. Tillader billeder fra Supabase Storage og Google-avatarer.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/auktion", destination: "/auktioner", permanent: true },
      { source: "/auktion/:path*", destination: "/auktioner/:path*", permanent: true },
      { source: "/grejauktion", destination: "/auktioner", permanent: true },
      { source: "/grejauktionen", destination: "/auktioner", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        source: "/admin",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
