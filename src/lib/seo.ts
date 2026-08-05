/**
 * Canonical URLs, hreflang, and JSON-LD helpers.
 *
 * Two things about this site make hand-written metadata get it wrong every time:
 *
 * 1. Every real URL carries a locale segment. Middleware rewrites `/en/explorer/cairo` to
 *    `/explorer/cairo` internally, so route code never sees the segment — but the crawlable
 *    address always has it. A canonical built from the route path alone points at a URL that
 *    only exists as a redirect.
 * 2. `trailingSlash: true` in next.config means `/en/explorer/cairo` 308s to
 *    `/en/explorer/cairo/`. A canonical or sitemap entry without the slash costs a redirect
 *    hop on every crawl.
 *
 * Everything here produces the address the visitor's browser actually ends on.
 */
import { headers, cookies } from 'next/headers';
import type { Metadata } from 'next';
import { SITE_URL } from './config';
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/i18n/dictionaries';

/** The locale this request is being served in. Mirrors what the root layout decides. */
export async function currentLocale(): Promise<Locale> {
  const fromUrl = (await headers()).get('x-khargny-locale');
  const fromCookie = (await cookies()).get('khargny.locale')?.value;
  const chosen = fromUrl ?? fromCookie;
  return chosen === 'en' ? 'en' : DEFAULT_LOCALE;
}

/**
 * The route path being rendered, without the locale segment. Middleware sets it, because
 * the rewrite hides the real depth from every layout.
 */
export async function currentPath(): Promise<string> {
  return (await headers()).get('x-khargny-path') ?? '';
}

/** `/explorer/cairo` -> `https://www.5argny.com/en/explorer/cairo/` */
export function urlFor(path: string, locale: Locale): string {
  const clean = path === '/' ? '' : `/${path.replace(/^\/+|\/+$/g, '')}`;
  return `${SITE_URL}/${locale}${clean}/`;
}

/**
 * canonical + hreflang for a route path (without the locale segment).
 *
 * x-default points at Arabic: it is the default the middleware sends an unprefixed request
 * to, so it is the honest answer to "which one for an unmatched language".
 */
export function alternatesFor(path: string, locale: Locale): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l === 'ar' ? 'ar-EG' : 'en'] = urlFor(path, l);
  languages['x-default'] = urlFor(path, DEFAULT_LOCALE);

  return { canonical: urlFor(path, locale), languages };
}

/** Open Graph wants a POSIX locale, not our two-letter code. */
export const ogLocale = (locale: Locale) => (locale === 'ar' ? 'ar_EG' : 'en_US');
export const ogAlternateLocale = (locale: Locale) => (locale === 'ar' ? ['en_US'] : ['ar_EG']);

/** Trim to a length search engines actually display, without cutting mid-word. */
export function clampDescription(text: string, max = 160): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

/**
 * Serialise JSON-LD for a <script> tag. `<` is escaped because a description containing
 * "</script>" would otherwise end the tag early and break the page.
 */
export const jsonLdScript = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');

/** The publisher, referenced by the other schemas rather than repeated in each. */
export function organizationSchema(locale: Locale) {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Khargny',
    alternateName: 'خرجني',
    url: urlFor('/', locale),
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logo-en.png` },
  };
}

/** Site-level schema with the search action, so Google can offer a sitelinks search box. */
export function webSiteSchema(locale: Locale) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: urlFor('/', locale),
    name: 'Khargny',
    inLanguage: locale === 'ar' ? 'ar-EG' : 'en',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${urlFor('/explorer', locale)}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** A trail of the pages above this one, so results show a path instead of a bare URL. */
export function breadcrumbSchema(
  crumbs: { name: string; path: string }[],
  locale: Locale,
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: urlFor(c.path, locale),
    })),
  };
}

/** Wrap one or more schema objects in the @graph envelope they should share. */
export const graph = (...nodes: unknown[]) => ({
  '@context': 'https://schema.org',
  '@graph': nodes.filter(Boolean),
});
