import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { isPreviewDeployment } from '@/lib/seo-environment';

export default function robots(): MetadataRoute.Robots {
  if (isPreviewDeployment()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The plan is guest-personal, not indexable content. English is the plain URL and Arabic is under /ar, so each
      // private path is listed both ways ("/*/x" does not match "/x").
      disallow: ["/plan", "/*/plan", "/trips/me", "/*/trips/me", "/trips/cash", "/*/trips/cash", "/trips/qr", "/*/trips/qr", "/trips/sign-in", "/*/trips/sign-in"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
