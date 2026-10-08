import { withSentryConfig } from "@sentry/nextjs";
// Force reload
import type { NextConfig } from "next";
import { IMAGE_HOSTS, LEGACY_IMAGE_HOST_PATTERNS } from "./src/lib/image-hosts";
import { getApiBaseUrl } from "./src/lib/config";

const isProd = process.env.NODE_ENV === "production";

// Security headers, same baseline as MiniRue's storefront (security level Medium).
// frame-ancestors/object-src/base-uri/form-action are strict: they do not affect rendering.
// script-src still allows 'unsafe-inline' because the App Router injects inline hydration
// scripts (JSON-LD blocks are data, not script, and are unaffected); a nonce-based
// script-src is the High-level follow-up. Dev adds 'unsafe-eval' + ws/http for HMR.
export function buildContentSecurityPolicy({
  mode = process.env.NEXT_PUBLIC_API_MODE,
  production = isProd,
}: { mode?: string; production?: boolean } = {}): string {
  const sentryOrigins = new Set([
    'https://*.ingest.sentry.io', 'https://*.ingest.us.sentry.io', 'https://*.ingest.de.sentry.io',
  ]);
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      const dsn = new URL(process.env.NEXT_PUBLIC_SENTRY_DSN);
      if (dsn.protocol === 'https:' || dsn.protocol === 'http:') sentryOrigins.add(dsn.origin);
    } catch {}
  }
  const connections = mode === 'same-origin'
    ? `${new URL(getApiBaseUrl({ browser: false })).origin} ${[...sentryOrigins].join(' ')}`
    : `https:${production ? '' : ' ws: wss: http:'}`;
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    `connect-src 'self' ${connections}`,
    "frame-src 'none'",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
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

// Anything that is not a person's browser. Deliberately broad: an unknown fetcher that names
// itself with any of these words is treated as a crawler. Ordinary and in-app browsers (Chrome,
// Safari, Firefox, Samsung, Instagram, Facebook's FBAN/FBAV) match none of them.
const CRAWLERS =
  /bot|crawl|spider|slurp|preview|fetch|scrap|facebookexternalhit|facebookcatalog|meta-external|whatsapp|telegram|discord|slack|skype|linkedin|pinterest|vkshare|embed|validator|lighthouse|pagespeed|headless|monitor|uptime|curl|wget|python|java|go-http|okhttp|axios|node|ruby|perl|php|libwww|httpclient|postman|insomnia|seo|check|google|bing|yandex|baidu|duckduck|applebot|ia_archiver/i;

const nextConfig: NextConfig = {
  env: { SEO_BUILD_DATE: new Date().toISOString() },
  outputFileTracingIncludes: {
    '/og/default.png': ['./public/images/5argny-mark-96.png', './public/images/khargny-ar-wordmark.svg'],
  },
  // SSR mode enabled (no static export)
  trailingSlash: true,
  // Crawlers and link-preview fetchers get every meta tag in <head> before any content
  // (they do not run scripts, and many read only the head). People's browsers do not: for
  // them metadata streams, so a tap shows the loading placeholder at once instead of waiting
  // for the place to be fetched for its title. This was /.*/, which made every visitor wait.
  htmlLimitedBots: CRAWLERS,
  poweredByHeader: false,
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [{ source: '/:keyFile([A-Za-z0-9-]{8,128}\\.txt)', destination: '/api/indexnow/:keyFile' }],
      fallback: [],
    };
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...(process.env.NEXT_PUBLIC_API_MODE === 'same-origin' ? [{
        source: '/api/v1/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
          { key: 'x-vercel-enable-rewrite-caching', value: '0' },
        ],
      }] : []),
    ];
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
