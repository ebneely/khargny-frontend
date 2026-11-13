import "../globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { NavProgress } from "@/components/NavProgress";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { graph, jsonLdScript, organizationSchema, webSiteSchema } from "@/lib/seo";
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
export { generateMetadata } from '@/lib/root-metadata';

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
