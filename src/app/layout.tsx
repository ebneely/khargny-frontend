import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { NavProgress } from "@/components/NavProgress";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { SITE_URL } from "@/lib/config";
import { currentLocale, homeTitle, pageMetadata, graph, jsonLdScript, organizationSchema, webSiteSchema } from "@/lib/seo";
import { cookies, headers } from "next/headers";
import type { Locale } from "@/i18n/dictionaries";
import { getSiteSettings } from '@/lib/api/site-settings';
import { SiteSettingsProvider } from '@/lib/api/hooks/use-site-settings';
import { primePublicRoute, markPublicError } from '@/lib/server/public-data';

/**
 * Root layout — single light theme (no `next-themes` / dark mode).
 * The Khargny Design System is light-only (TASK-0007 sweep removed
 * `theme-provider.tsx` and `ui/Darkmode.tsx`).
 *
 * The design system requires `suppressHydrationWarning` because the global
 * `:root` token block in `globals.css` is large and Next.js can flag the body
 * style on hydration. Keeping the attribute so the streaming render doesn't
 * throw a hydration mismatch.
 */
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The language is decided SERVER-SIDE so the very first paint — <html lang/dir> and every
  // string — is already correct. Without this the server rendered the default (ar) and the
  // client flipped on mount: the ar→en→ar flash on refresh.
  //
  // The URL is the source of truth (/en/... or /ar/...); middleware puts the segment it
  // matched on this header. The cookie is only the fallback for a request that somehow
  // reached the layout unprefixed.
  const urlLocale = (await headers()).get("x-khargny-locale");
  const cookieLocale = (await cookies()).get("khargny.locale")?.value;
  const chosen = urlLocale ?? cookieLocale;
  const locale: Locale = chosen === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";
  const requestHeaders = await headers();
  const [settings] = await Promise.all([
    getSiteSettings(),
    primePublicRoute(requestHeaders.get('x-khargny-path') ?? '', requestHeaders.get('x-khargny-search') ?? '').catch((error: unknown) => { throw markPublicError(error, locale); }),
  ]);

  return (
    // Scrollbars are hidden globally in globals.css. The `scrollbar-hide` class that used to
    // sit on <html> was never defined by any stylesheet or plugin, so it did nothing.
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        {/* Publisher and site identity, declared once. Every other page's schema refers to
            these by @id rather than repeating them. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(graph(organizationSchema(locale, settings), webSiteSchema(locale))),
          }}
        />
        <LocaleProvider initialLocale={locale}>
          <QueryProvider>
            <SiteSettingsProvider settings={settings}>
              {children}
            {/* The floating LanguageToggle was removed: SiteHeader already carries a language
                control, so on mobile the language switch rendered TWICE (once in the nav, once
                floating at the bottom). The header is now the single place to switch. */}
              <NavProgress />
              <Toaster />
              <PageViewTracker />
            </SiteSettingsProvider>
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
