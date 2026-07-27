import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const supabaseHost = (() => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();

const packageVersion = (() => {
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "0.1.2";
  } catch {
    return "0.1.2";
  }
})();

/** Unique per deploy so existing browsers invalidate AreaIQ client caches. */
const appVersion =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  `${packageVersion}`;

const nextConfig: NextConfig = {
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  // Keep native/binary packages out of the Cloudflare Worker graph
  serverExternalPackages: ["sharp", "pg", "to-ico", "@opennextjs/cloudflare", "wrangler"],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  generateBuildId: async () => appVersion,
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https" as const,
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [
          {
            protocol: "https" as const,
            hostname: "hydrtiwdtptwoxoywavd.supabase.co",
            pathname: "/storage/v1/object/public/**",
          },
        ],
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "@supabase/supabase-js",
      "@supabase/ssr",
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
