// Which language a URL is in, and where an old URL lands. Owner rule (2026-11-14): the language comes from the URL only.
// A plain path is English, a path under /ar is Arabic; no cookie, Accept-Language or saved setting overrides it.
import type { Lang } from '../copy/index.ts';

export const langOf = (path: string): Lang => (/^\/ar(\/|$)/.test(path) ? 'ar' : 'en');

/** The path without its language segment (/ar, or the retired /en); '/' for the home page. */
export const bare = (path: string) => path.replace(/^\/(ar|en)(?=\/|$)/, '') || '/';

/** What a path in this language starts with: '/ar' for Arabic, nothing for English. */
export const langPrefix = (lang: Lang) => (lang === 'ar' ? '/ar' : '');

/** The page's path in a language, with the trailing slash the site serves (trailingSlash: true). */
export function pathIn(path: string, lang: Lang): string {
  const p = bare(path.split(/[?#]/, 1)[0]).replace(/^\/+|\/+$/g, '');
  return `${langPrefix(lang)}/${p ? `${p}/` : ''}`;
}

/**
 * Old (pre-redesign) addresses that still exist in search results, bookmarks, shares and the app: each lands on its
 * redesign equivalent. Takes and returns a path without a language segment, query included; null when it is current.
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

/**
 * Where a request must go instead, in one 308, or null to serve it. /en/... loses its segment (English is the plain
 * URL), and an old address lands on its new one in the same hop, in the language the URL asked for.
 */
export function redirectFor(pathname: string, search: string): string | null {
  const retiredEn = /^\/en(\/|$)/.test(pathname);
  const lang = langOf(pathname);
  const rest = bare(pathname);
  const moved = redesignRoute(rest, search);
  if (moved) return `${langPrefix(lang)}${moved}`;
  return retiredEn ? `${pathIn(rest, 'en')}${search}` : null;
}

/** Where the language switch goes: the same page under the other language's URL. */
export const switchTo = (path: string, search = '') => `${langPrefix(langOf(path) === 'ar' ? 'en' : 'ar')}${bare(path)}${search}`;

/** hreflang paths for a page: en is the plain URL, ar is under /ar, and x-default is the plain English URL. */
export const hreflangFor = (path: string) => ({ en: pathIn(path, 'en'), ar: pathIn(path, 'ar'), 'x-default': pathIn(path, 'en') });
