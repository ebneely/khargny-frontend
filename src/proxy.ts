import { NextResponse, type NextRequest } from "next/server";
import { bare, langOf, redirectFor } from "@5argny/core/rules/locale";
import { forwardBrowserApi } from "@/lib/server/api-forwarder";
import { SITE_URL } from "@/lib/config";
import { PLACE_REDIRECT_STATUS, placeSegments } from "@/lib/place-address";
import { resolvePlaceAddress } from "@/lib/server/place-redirect";

/**
 * The language comes from the URL only (owner 2026-11-14): a plain path is English, /ar/... is Arabic. No cookie,
 * Accept-Language or saved setting overrides it, so a crawler and a person see the same page at the same address.
 *
 * The language is carried by a real `[lang]` segment: the page reads it from `params`, never from the request, which is
 * what lets Home, Explore and the place pages be rendered once per language and kept (ISR, `src/app/api/revalidate`).
 *
 * Flow:
 *   /explorer/     -> rewrite to /en/explorer/  (the URL stays /explorer/: English is the plain address)
 *   /ar/explorer/  -> rewrite to /ar/explorer/  (the URL is unchanged; Arabic lives under /ar)
 *   /en/explorer/  -> 308 to /explorer/ (the retired English prefix), old addresses 308 to their new one in the same hop
 *   old place slug -> 301 to the current address, query string kept
 *   unknown place  -> rewrite to the site-styled 404 document with a real 404
 */

const LOCALE_HEADER = "x-khargny-locale";
const PATH_HEADER = "x-khargny-path";
const SEARCH_HEADER = "x-khargny-search";
const INTERNAL_REWRITE_HEADER = "x-khargny-internal-rewrite";

// A client must never be able to forge the headers the layouts trust. The marker carries a
// per-process secret, and every external request has all of them removed before the proxy
// reads anything else. (A rewrite's second pass carries the secret, so it keeps its headers.)
const INTERNAL_REWRITE_TOKEN = crypto.randomUUID();

function externalHeaders(req: NextRequest): Headers {
  const headers = new Headers(req.headers);
  for (const name of [...headers.keys()]) {
    if (name.startsWith('x-khargny-')) headers.delete(name);
  }
  return headers;
}

function isInternalRewrite(req: NextRequest): boolean {
  return req.headers.get(INTERNAL_REWRITE_HEADER) === INTERNAL_REWRITE_TOKEN;
}

/** A GET page whose query string is search/filter, not just campaign tracking. */
function hasSearchOrFilterQuery(search: string): boolean {
  for (const key of new URLSearchParams(search).keys()) {
    const lower = key.toLowerCase();
    if (lower.startsWith('utm_') || lower === 'fbclid' || lower === 'gclid') continue;
    return true;
  }
  return false;
}

function noindexForQuery(req: NextRequest, response: NextResponse): NextResponse {
  if (req.method === 'GET' && hasSearchOrFilterQuery(req.nextUrl.search)) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return response;
}

// Paths that never carry a language: API routes, Next internals, the SEO files, and anything that looks like a static
// asset (has a file extension).
const EXEMPT = /^\/(api|_next|monitoring|\.well-known)(\/|$)|^\/(robots\.txt|sitemap\.xml|favicon\.ico)$|\.[a-zA-Z0-9]+$/;

export async function proxy(req: NextRequest) {
  // A rewrite re-enters this function in Next 16. The secret marker keeps the headers decided
  // before the rewrite (and the language); every external request is stripped of them below.
  if (isInternalRewrite(req)) return NextResponse.next();

  const incoming = externalHeaders(req);
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

  // The router sees the path without /ar; "/ar" alone means the home page. Built before any
  // rewrite so the language (and the styled 404) survive the second pass.
  const headers = new Headers(incoming);
  headers.set(LOCALE_HEADER, locale);
  headers.set(PATH_HEADER, rest);
  headers.set(SEARCH_HEADER, search);

  // A place opened under an old slug answers 301 to its current address, keeping the query string
  // (a shared link's utm_* parameters). The page renders once per address and cannot read the
  // query, so the permanent 301 is decided here, before the page renders. A client-side navigation
  // (RSC / prefetch) without a query skips the lookup and keeps the page's own redirect.
  const place = placeSegments(rest);
  const documentRequest = (req.method === 'GET' || req.method === 'HEAD')
    && incoming.get('rsc') !== '1'
    && incoming.get('next-router-prefetch') !== '1'
    && incoming.get('sec-fetch-dest') !== 'empty';
  const carriesQuery = search.length > 1;
  if (place && (documentRequest || carriesQuery)) {
    const resolved = await resolvePlaceAddress({ ...place, locale, search, source: incoming });
    if (resolved.status === 'missing') {
      // Serve the site-styled 404 document, not a bare string, while keeping the real 404 and
      // noindex. The internal route is (site)/[lang]/not-found-place/view; never linked or sitemapped.
      headers.set(INTERNAL_REWRITE_HEADER, INTERNAL_REWRITE_TOKEN);
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/not-found-place/view/`;
      url.search = '';
      const missing = NextResponse.rewrite(url, { status: 404, request: { headers } });
      missing.headers.set('X-Robots-Tag', 'noindex, follow');
      return missing;
    }
    if (resolved.status === 'ok' && resolved.canonical) {
      // The standalone server's internal origin is localhost; the public redirect must use the
      // configured site origin, not the origin of the process serving the request.
      return NextResponse.redirect(new URL(resolved.canonical, SITE_URL), PLACE_REDIRECT_STATUS);
    }
  }

  // Both languages route through the `[lang]` segment, so the address in the bar never shows /en and Arabic keeps /ar.
  headers.set(INTERNAL_REWRITE_HEADER, INTERNAL_REWRITE_TOKEN);
  const url = req.nextUrl.clone();
  // A text search is rendered per request with its results in the HTML (/explorer/search), while /explorer/ itself
  // stays the cached page. The address the visitor sees and shares is still /explorer/?q=… in both languages.
  const searching = /^\/explorer\/?$/.test(rest) && Boolean(new URLSearchParams(search).get('q')?.trim());
  url.pathname = searching ? `/${locale}/explorer/search/` : `/${locale}${rest === '/' ? '' : rest}`;
  url.search = search;
  return noindexForQuery(req, NextResponse.rewrite(url, { request: { headers } }));
}

export const config = {
  // Let everything through the function and decide in code — the EXEMPT test above is the
  // single place that knows what is not a page, so the two can't drift apart.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
