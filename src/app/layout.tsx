import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { LanguageToggle } from "@/components/ds/LanguageToggle";

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
  title: "Khargny",
  description: "Find your next outing in Egypt — curated places, not bookings.",
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
