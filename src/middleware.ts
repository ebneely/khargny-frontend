import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/dictionaries";

/**
 * Locale in the URL: every visitor page lives under /ar/... or /en/....
 *
 * Why a middleware rewrite rather than an app/[locale] segment: the routes keep their
 * current file paths (no mass file move, no broken relative imports), while the language
 * becomes part of the URL — shareable, indexable, and, most importantly, known to the
 * SERVER before the first byte. The layout reads the locale off the header set here, so
 * <html lang/dir> and every string are already correct on first paint. The cookie remains
 * only as the memory of the last choice, used to pick a prefix for a bare URL.
 *
 * Flow:
 *   /en/explorer  -> rewrite to /explorer, header x-khargny-locale: en   (URL stays /en/explorer)
 *   /explorer     -> redirect to /<remembered or default>/explorer
 */

const COOKIE = "khargny.locale";
const LOCALE_HEADER = "x-khargny-locale";

// Paths that must never be locale-prefixed: API routes, Next internals, the SEO files, and
// anything that looks like a static asset (has a file extension).
const EXEMPT = /^\/(api|_next|monitoring)(\/|$)|^\/(robots\.txt|sitemap\.xml|favicon\.ico)$|\.[a-zA-Z0-9]+$/;

function localeFromPath(pathname: string): Locale | null {
  const seg = pathname.split("/")[1];
  return (LOCALES as string[]).includes(seg) ? (seg as Locale) : null;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (EXEMPT.test(pathname)) return NextResponse.next();

  const urlLocale = localeFromPath(pathname);

  if (urlLocale) {
    // Strip the prefix for the router; "/en" alone means the home page.
    const rest = pathname.slice(urlLocale.length + 1) || "/";
    const url = req.nextUrl.clone();
    url.pathname = rest;

    const headers = new Headers(req.headers);
    headers.set(LOCALE_HEADER, urlLocale);
    const res = NextResponse.rewrite(url, { request: { headers } });
    // Keep the cookie in step so a later bare URL redirects to the language they are reading.
    if (req.cookies.get(COOKIE)?.value !== urlLocale) {
      res.cookies.set(COOKIE, urlLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    }
    return res;
  }

  // No locale in the URL — send them to the one they last chose, else the default.
  const cookie = req.cookies.get(COOKIE)?.value;
  const locale: Locale = (LOCALES as string[]).includes(cookie ?? "") ? (cookie as Locale) : DEFAULT_LOCALE;
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.redirect(url);
}

export const config = {
  // Let everything through the function and decide in code — the EXEMPT test above is the
  // single place that knows what is not a page, so the two can't drift apart.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
