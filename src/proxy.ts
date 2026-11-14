import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/dictionaries";
import { forwardBrowserApi } from "@/lib/server/api-forwarder";

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
const PATH_HEADER = "x-khargny-path";

// Paths that must never be locale-prefixed: API routes, Next internals, the SEO files, and
// anything that looks like a static asset (has a file extension).
const EXEMPT = /^\/(api|_next|monitoring)(\/|$)|^\/(robots\.txt|sitemap\.xml|favicon\.ico)$|\.[a-zA-Z0-9]+$/;

function localeFromPath(pathname: string): Locale | null {
  const seg = pathname.split("/")[1];
  return (LOCALES as string[]).includes(seg) ? (seg as Locale) : null;
}


/**
 * Old (pre-redesign) addresses that still exist in search results, bookmarks, shares and the app: each lands on its
 * redesign equivalent with one 308. Returns the new locale-less path + query, or null when the path is current.
 *  /explorer/<city>/  -> /explorer/?city=<city> (area, q and category kept as the new Explore reads them)
 *  /plan/             -> /saved/
 *  /trips/listers/<id>/ -> /host/<id>/ (the host profile); the rest of /trips stays: bookings need sign-in (spec 003)
 */
export function redesignRoute(path: string, search: string): string | null {
  const q = new URLSearchParams(search);
  const city = /^\/explorer\/([^/]+)\/?$/.exec(path);
  if (city) {
    const next = new URLSearchParams({ city: decodeURIComponent(city[1]) });
    for (const [from, to] of [['area', 'area'], ['q', 'q'], ['category', 'cat'], ['time', 'time']] as const) { const v = q.get(from); if (v) next.set(to, v); }
    return `/explorer/?${next}`;
  }
  if (/^\/plan\/?$/.test(path)) return `/saved/${search}`;
  const lister = /^\/trips\/listers\/([^/]+)\/?$/.exec(path);
  if (lister) return `/host/${lister[1]}/${search}`;
  return null;
}

export function proxy(req: NextRequest) {
  const forwarded = forwardBrowserApi(req);
  if (forwarded) return forwarded;
  const { pathname, search } = req.nextUrl;
  if (EXEMPT.test(pathname)) return NextResponse.next();

  const urlLocale = localeFromPath(pathname);

  if (urlLocale) {
    // Strip the prefix for the router; "/en" alone means the home page.
    const rest = pathname.slice(urlLocale.length + 1) || "/";
    const moved = redesignRoute(rest, search);
    if (moved) {
      const to = req.nextUrl.clone(); const [p, qs = ''] = moved.split('?');
      to.pathname = `/${urlLocale}${p}`; to.search = qs ? `?${qs}` : '';
      const out = NextResponse.redirect(to, 308);
      out.cookies.set(COOKIE, urlLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
      return out;
    }
    const url = req.nextUrl.clone();
    url.pathname = rest;

    const headers = new Headers(req.headers);
    headers.set(LOCALE_HEADER, urlLocale);
    // The locale segment is stripped before routing, so a layout can no longer tell which
    // depth it is rendering at. A city layout that emits breadcrumbs needs to know whether
    // it is the city page or a place page nested inside it — otherwise both emit one and a
    // place page ships two competing BreadcrumbLists.
    headers.set(PATH_HEADER, rest);
    headers.set('x-khargny-search', search);
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
  const moved = redesignRoute(pathname, search);
  const [movedPath, movedQs = ''] = moved ? moved.split('?') : [pathname, search.replace(/^\?/, '')];
  url.pathname = `/${locale}${movedPath === "/" ? "" : movedPath}`;
  url.search = movedQs ? `?${movedQs}` : '';
  return NextResponse.redirect(url, moved ? 308 : undefined);
}

export const config = {
  // Let everything through the function and decide in code — the EXEMPT test above is the
  // single place that knows what is not a page, so the two can't drift apart.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
