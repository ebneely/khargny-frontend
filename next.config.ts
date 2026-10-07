import { withSentryConfig } from "@sentry/nextjs";
// Force reload
import type { NextConfig } from "next";
import { IMAGE_HOSTS, LEGACY_IMAGE_HOST_PATTERNS } from "./src/lib/image-hosts";

const isProd = process.env.NODE_ENV === "production";

// Security headers, same baseline as MiniRue's storefront (security level Medium).
// frame-ancestors/object-src/base-uri/form-action are strict: they do not affect rendering.
// script-src still allows 'unsafe-inline' because the App Router injects inline hydration
// scripts (JSON-LD blocks are data, not script, and are unaffected); a nonce-based
// script-src is the High-level follow-up. Dev adds 'unsafe-eval' + ws/http for HMR.
// connect-src https: covers the API origin (NEXT_PUBLIC_API_URL) and Sentry ingestion.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // Place/city photos: storage.5argny.com, img.5argny.com (imgproxy), Google place photos.
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  `connect-src 'self' https:${isProd ? "" : " ws: wss: http:"}`,
  "frame-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // The directions button may ask for the visitor's position on this site only.
    value: "camera=(), microphone=(), geolocation=(self), browsing-topics=()",
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // SSR mode enabled (no static export)
  trailingSlash: true,
  htmlLimitedBots: /.*/,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [...IMAGE_HOSTS, ...LEGACY_IMAGE_HOST_PATTERNS].map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "khargny-wk",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
