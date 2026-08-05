import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { SITE_URL } from "@/lib/config";
import { alternatesFor, currentLocale, urlFor, ogLocale, ogAlternateLocale, graph, jsonLdScript, organizationSchema, webSiteSchema } from "@/lib/seo";
import { cookies, headers } from "next/headers";
import type { Locale } from "@/i18n/dictionaries";

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
const TITLE_AR = "خرجني — اكتشف أماكن تستحق الزيارة في مصر";
const TITLE_EN = "Khargny — Find your next outing in Egypt";
const DESC_AR =
  "دليل مختار لأفضل الأماكن في مصر: مطاعم، مقاهي، شواطئ، فنادق ومعالم تاريخية في القاهرة والإسكندرية والأقصر وأسوان والغردقة والإسماعيلية.";
const DESC_EN =
  "A curated guide to Egypt's best places — restaurants, cafes, beaches, hotels and historic landmarks across Cairo, Alexandria, Luxor, Aswan, Hurghada and Ismailia.";

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

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: isAr ? "%s · خرجني" : "%s · Khargny" },
    description,
    applicationName: "Khargny",
    icons: { icon: "/images/logo-en.png" },
    alternates: alternatesFor("/", locale),
    openGraph: {
      type: "website",
      siteName: "Khargny",
      title,
      description,
      url: urlFor("/", locale),
      images: [{ url: "/images/logo-en.png", width: 1200, height: 630, alt: "Khargny" }],
      locale: ogLocale(locale),
      alternateLocale: ogAlternateLocale(locale),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/logo-en.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
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
            __html: jsonLdScript(graph(organizationSchema(locale), webSiteSchema(locale))),
          }}
        />
        <LocaleProvider initialLocale={locale}>
          <QueryProvider>
            {children}
            {/* The floating LanguageToggle was removed: SiteHeader already carries a language
                control, so on mobile the language switch rendered TWICE (once in the nav, once
                floating at the bottom). The header is now the single place to switch. */}
            <Toaster />
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
