import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { SITE_URL } from "@/lib/config";
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
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Khargny — Find your next outing in Egypt",
    template: "%s · Khargny",
  },
  description:
    "Curated places worth the trip across Egypt — beaches, ruins, oases and tables. Discover where to go next.",
  applicationName: "Khargny",
  icons: { icon: "/images/logo-en.png" },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Khargny",
    title: "Khargny — Find your next outing in Egypt",
    description:
      "Curated places worth the trip across Egypt — beaches, ruins, oases and tables.",
    url: SITE_URL,
    images: [{ url: "/images/logo-en.png", width: 1200, height: 630, alt: "Khargny" }],
    locale: "ar_EG",
  },
  twitter: {
    card: "summary_large_image",
    title: "Khargny — Find your next outing in Egypt",
    description: "Curated places worth the trip across Egypt.",
    images: ["/images/logo-en.png"],
  },
  robots: { index: true, follow: true },
};

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
