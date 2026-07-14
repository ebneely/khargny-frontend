import type { Metadata } from "next";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "5ragny",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scrollbar-hide" suppressHydrationWarning>
      <body>
        <QueryProvider>
          <NextThemesProvider attribute="class" defaultTheme="dark">
            {children}
            <Toaster />
          </NextThemesProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
