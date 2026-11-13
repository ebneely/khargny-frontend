import type { Metadata } from "next";
import { SITE_URL } from "@/lib/config";
import { currentLocale, homeTitle, pageMetadata } from "@/lib/seo";

// The root metadata, shared by both root layouts: (site) for the pages not yet rebuilt and (k) for the 5argny redesign.
const TITLE_AR = "خرجني — اكتشف أحلى أماكن تخرج فيها في مصر";
const TITLE_EN = "Khargny — Find your next outing in Egypt";
const DESC_AR =
  "خرجني (5argny) دليلك لأحلى الأماكن في مصر: مطاعم وكافيهات وشواطئ وفنادق ومعالم في القاهرة والإسكندرية والأقصر وأسوان.";
const DESC_EN =
  "5argny (Khargny) is a curated guide to Egypt's best places: restaurants, cafes, beaches, hotels and landmarks in Cairo, Alexandria, Luxor and Aswan.";

/**
 * Root metadata is per-request because the canonical depends on the locale segment the
 * middleware matched. As a static object it hardcoded `canonical: "/"`, and since Next
 * inherits metadata wholesale into any route that exports none, EVERY page without its own
 * metadata — the home page, /explorer, every city page, /plan, /contact, /privacy — told
 * search engines its canonical was the site root. That is an instruction to drop them.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  const isAr = locale === "ar";
  const title = isAr ? TITLE_AR : TITLE_EN;
  const description = isAr ? DESC_AR : DESC_EN;

  const base = pageMetadata({ path: '/', locale, title, description });
  // The home page's own title states the name as people type it; every other page keeps the
  // short suffix from the template.
  const home = homeTitle(locale);

  return {
    metadataBase: new URL(SITE_URL),
    ...base,
    title: { default: home, template: isAr ? '%s · خرجني' : '%s · Khargny' },
    openGraph: { ...base.openGraph, title: home },
    twitter: { ...base.twitter, title: home },
    applicationName: "Khargny",
    icons: { icon: "/images/logo-en.png" },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
    },
  };
}

