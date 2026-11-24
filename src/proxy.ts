import { NextResponse, type NextRequest } from "next/server";
import { bare, langOf, redirectFor } from "@5argny/core/rules/locale";
import { forwardBrowserApi } from "@/lib/server/api-forwarder";
import { SITE_URL } from "@/lib/config";
import { PLACE_REDIRECT_STATUS, placeSegments } from "@/lib/place-address";
import { resolvePlaceAddress } from "@/lib/server/place-redirect";

const NOT_FOUND_HTML = (arabic: boolean) => `<!doctype html>
<html lang="${arabic ? 'ar' : 'en'}" dir="${arabic ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>${arabic ? 'المكان ده مش موجود' : 'This place is not here'}</title></head>
<body style="font:16px system-ui;padding:40px;max-width:40rem;margin:auto"><h1 style="font-size:1.25rem">${arabic ? 'المكان ده مش موجود' : 'This place is not here'}</h1><p><a href="${arabic ? '/ar' : ''}/explorer/">${arabic ? 'ارجع للأماكن' : 'Back to places'}</a></p></body></html>`;

/**
 * The language comes from the URL only (owner 2026-11-14): a plain path is English, /ar/... is Arabic. No cookie,
 * Accept-Language or saved setting overrides it, so a crawler and a person see the same page at the same address.
 *
 * Why a middleware rewrite rather than an app/[locale] segment: the routes keep their file paths, while the language is
 * known to the SERVER before the first byte. The layouts read it off the header set here, so <html lang/dir> and every
 * string are right on first paint.
 *
 * Flow:
 *   /ar/explorer/  -> rewrite to /explorer/, header x-khargny-locale: ar   (URL stays /ar/explorer/)
 *   /explorer/     -> served as is, header x-khargny-locale: en
 *   /en/explorer/  -> 308 to /explorer/ (the retired English prefix), old addresses 308 to their new one in the same hop
 */

const LOCALE_HEADER = "x-khargny-locale";
const PATH_HEADER = "x-khargny-path";

// Paths that never carry a language: API routes, Next internals, the SEO files, and anything that looks like a static
// asset (has a file extension).
const EXEMPT = /^\/(api|_next|monitoring|\.well-known)(\/|$)|^\/(robots\.txt|sitemap\.xml|favicon\.ico)$|\.[a-zA-Z0-9]+$/;

export async function proxy(req: NextRequest) {
  const forwarded = forwardBrowserApi(req);
  if (forwarded) return forwarded;
  const { pathname, search } = req.nextUrl;
  if (EXEMPT.test(pathname)) return NextResponse.next();

  const target = redirectFor(pathname, search);
  if (target) {
    const to = req.nextUrl.clone(); const [p, qs = ''] = target.split('?');
    to.pathname = p; to.search = qs ? `?${qs}` : '';
    return NextResponse.redirect(to, 308);
  }

  const locale = langOf(pathname);
  const rest = bare(pathname);

  // A place opened under an old slug answers 301 to its current address. The page can only
  // emit Next's 308, so the permanent 301 is decided here, before the page renders. Client-side
  // navigations (RSC / prefetch) skip the lookup and keep the page's own redirect.
  const place = placeSegments(rest);
  const documentRequest = (req.method === 'GET' || req.method === 'HEAD')
    && req.headers.get('rsc') !== '1'
    && req.headers.get('next-router-prefetch') !== '1'
    && req.headers.get('sec-fetch-dest') !== 'empty';
  if (place && documentRequest) {
    const resolved = await resolvePlaceAddress({ ...place, locale, search });
    if (resolved.status === 'missing') {
      return new Response(NOT_FOUND_HTML(locale === 'ar'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, s-maxage=60' },
      });
    }
    if (resolved.status === 'ok' && resolved.canonical) {
      // The standalone server's internal origin is localhost; the public redirect must use the
      // configured site origin, not the origin of the process serving the request.
      return NextResponse.redirect(new URL(resolved.canonical, SITE_URL), PLACE_REDIRECT_STATUS);
    }
  }

  // The router sees the path without /ar; "/ar" alone means the home page.
  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  // The /ar segment is stripped before routing, so a layout can no longer tell which depth it is rendering at. A city
  // layout that emits breadcrumbs needs to know whether it is the city page or a place page nested inside it.
  headers.set(PATH_HEADER, rest);
  headers.set('x-khargny-search', search);
  if (locale === 'en') return NextResponse.next({ request: { headers } });
  const url = req.nextUrl.clone();
  url.pathname = rest;
  return NextResponse.rewrite(url, { request: { headers } });
}

export const config = {
  // Let everything through the function and decide in code — the EXEMPT test above is the
  // single place that knows what is not a page, so the two can't drift apart.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
