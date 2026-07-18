import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LanguageToggle } from "@/components/ds/LanguageToggle";
import { SITE_URL } from "@/lib/config";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="scrollbar-hide" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <QueryProvider>
            {children}
            <LanguageToggle />
            <Toaster />
          </QueryProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
