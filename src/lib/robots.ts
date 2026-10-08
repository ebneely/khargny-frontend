import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { isPreviewDeployment } from '@/lib/seo-environment';

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The plan is guest-personal, not indexable content. Every real URL carries a locale
      // segment, so "/plan" alone matched nothing that exists — the rule read as intent
      // while /ar/plan and /en/plan stayed fully crawlable.
      disallow: ["/plan", "/ar/plan", "/en/plan", "/*/plan"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
