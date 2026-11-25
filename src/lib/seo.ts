/**
 * Canonical URLs, hreflang, and JSON-LD helpers.
 *
 * Two things about this site make hand-written metadata get it wrong every time:
 *
 * 1. An Arabic URL carries an /ar segment. Middleware rewrites `/ar/explorer/cairo` to
 *    `/explorer/cairo` internally, so route code never sees the segment — but the crawlable
 *    address has it. English is the plain URL (the old /en/... only redirects).
 * 2. `trailingSlash: true` in next.config means `/explorer/cairo` 308s to
 *    `/explorer/cairo/`. A canonical or sitemap entry without the slash costs a redirect
 *    hop on every crawl.
 *
 * Everything here produces the address the visitor's browser actually ends on.
 */
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { SITE_URL } from './config';
import { urlFor } from './site-url';
import { normalizeSiteSettings, siteSocialUrls } from '@/lib/site-socials';
import type { Locale } from '@/i18n/dictionaries';
import { hreflangFor } from '@5argny/core/rules/locale';
import { normalizePhoto, type Photo } from '@/lib/place-photo';
import { isPreviewDeployment } from '@/lib/seo-environment';

export { isPreviewDeployment } from '@/lib/seo-environment';
export { urlFor } from './site-url';

/** The locale a URL segment names: `ar` is Arabic, anything else (plain, `en`) English. */
export function localeOf(lang: string | string[] | undefined): Locale {
  return (Array.isArray(lang) ? lang[0] : lang) === 'ar' ? 'ar' : 'en';
}

/** The locale this request is being served in: the URL's, as the middleware read it (the URL only, owner 2026-11-14). */
export async function currentLocale(): Promise<Locale> {
  return (await headers()).get('x-khargny-locale') === 'ar' ? 'ar' : 'en';
}

/**
 * The route path being rendered, without the locale segment. Middleware sets it, because
 * the rewrite hides the real depth from every layout.
 */
export async function currentPath(): Promise<string> {
  return (await headers()).get('x-khargny-path') ?? '';
}

/**
 * canonical + hreflang for a route path (without the locale segment).
 *
 * x-default points at the plain English URL: it is what an unprefixed address serves.
 */
export function alternatesFor(path: string, locale: Locale): Metadata['alternates'] {
  const languages = Object.fromEntries(Object.entries(hreflangFor(path)).map(([language, p]) => [language, `${SITE_URL}${p}`]));
  return { canonical: urlFor(path, locale), languages };
}

/** Open Graph wants a POSIX locale, not our two-letter code. */
export const ogLocale = (locale: Locale) => (locale === 'ar' ? 'ar_EG' : 'en_US');
export const ogAlternateLocale = (locale: Locale) => (locale === 'ar' ? ['en_US'] : ['ar_EG']);

/** Trim to a length search engines actually display, without cutting mid-word. */
export function fitText(text: string, max: number): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const words: string[] = [];
  for (const word of clean.split(' ')) {
    if ([...words, word].join(' ').length > max - 1) break;
    words.push(word);
  }
  return `${words.join(' ')}…`;
}

export function clampDescription(text: string, max = 155): string {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return trimDanglingText(clean);
  const sentences = [...clean.matchAll(/[.!?؟](?=\s|$)/g)]
    .map((match) => match.index + 1).filter((end) => end <= max);
  if (sentences.length) return clean.slice(0, sentences[sentences.length - 1]);
  const clauses = [...clean.matchAll(/[,،;؛:](?=\s)|\s[—–-](?=\s)/g)]
    .filter((match) => !/&(?:#\d+|#x[\da-f]+|[a-z][\da-z]*);$/i.test(clean.slice(0, match.index + 1)))
    .map((match) => match.index).filter((end) => end <= max - 1);
  const fitted = clauses.length
    ? clean.slice(0, clauses[clauses.length - 1])
    : fitText(clean, max).replace(/…$/, '');
  return `${trimDanglingText(fitted)}…`;
}

function trimDanglingText(text: string): string {
  return text.replace(/(?:\s*[—–,،-]|\s+(?:and|or|but|و|أو|لكن))+$/gi, '').trim();
}

function titleBase(text: string): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
    .replace(/(?:\s*[·—|]\s*(?:Khargny|5argny|خرجني))+$/i, '')
    .replace(/^(?:Khargny|5argny|خرجني)\s*[·—|]\s*/i, '');
}

export function fitTitle(text: string, locale: Locale): string {
  const suffix = locale === 'ar' ? ' | خرجني' : ' | 5argny'; // no "·" on screen (owner rule); the brand as written
  const fitted = fitText(titleBase(text), 60 - suffix.length);
  const truncated = fitted.endsWith('…');
  return `${trimDanglingText(fitted.replace(/…$/, ''))}${truncated ? '…' : ''}${suffix}`;
}

export function fitPlaceTitle(parts: { name: string; category?: string | null; area?: string | null; city?: string | null }, locale: Locale): string {
  const name = titleBase(parts.name);
  const location = [parts.area, parts.city].filter(Boolean).join(', ');
  const candidates = [
    [name, parts.category, location],
    [name, parts.category, parts.city],
    [name, parts.city],
    [name],
  ].map((candidate) => candidate.filter(Boolean).join(' — '));
  const suffix = locale === 'ar' ? ' | خرجني' : ' | 5argny'; // no "·" on screen (owner rule); the brand as written
  return fitTitle(candidates.find((candidate) => candidate.length + suffix.length <= 60) ?? name, locale);
}

export function fitCityTitle(base: string, count: number | null, locale: Locale): string {
  const counted = count ? `${base}${locale === 'ar' ? ` (${count} مكان)` : ` — ${count} ${count === 1 ? 'place' : 'places'}`}` : base;
  const suffix = locale === 'ar' ? ' | خرجني' : ' | 5argny'; // no "·" on screen (owner rule); the brand as written
  return fitTitle(titleBase(counted).length + suffix.length <= 60 ? counted : base, locale);
}

export const defaultShareImage = () => ({
  url: `${SITE_URL}/og/default.png`, width: 1200, height: 630, alt: 'خرجني · Khargny',
});

type ShareImage = { url: string; width?: number; height?: number; alt?: string };

export function shareImageFor(place: {
  images?: Photo[];
  coverImage?: string | null;
  coverImageDimensions?: { width?: number | null; height?: number | null } | null;
}): ShareImage {
  const detail = place.images?.[0];
  const photo = detail && (detail.urls || detail.singleUrl || detail.url)
    ? detail : normalizePhoto(place.coverImage);
  const rendition = photo.urls?.large ? 'large' : photo.urls?.medium ? 'medium' : photo.urls?.small ? 'small' : null;
  const source = (rendition ? photo.urls?.[rendition] : null) || photo.singleUrl || photo.url || photo.urls?.original || place.coverImage;
  if (!source) return defaultShareImage();
  const dimensions = photo === detail ? detail : place.coverImageDimensions;
  const width = dimensions?.width;
  const height = dimensions?.height;
  const hasDimensions = typeof width === 'number' && typeof height === 'number'
    && Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
  const targetWidth = hasDimensions ? Math.min(width, rendition === 'large' ? 1600 : rendition === 'medium' ? 960 : rendition === 'small' ? 480 : width) : undefined;
  return {
    url: new URL(source, SITE_URL).href,
    ...(hasDimensions && targetWidth ? { width: targetWidth, height: Math.round(height * targetWidth / width) } : {}),
  };
}

export function robotsFor(noindex = false): Metadata['robots'] {
  const index = !noindex && !isPreviewDeployment();
  return {
    index, follow: true,
    googleBot: { index, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  };
}

/**
 * The name as people type it. The logo reads 5ARGNY and the domain is 5argny.com, but a search
 * engine cannot read a logo: while the site wrote only "Khargny" and "خرجني" in text, Google
 * treated a search for "5argny" as a spelling mistake. So the spelling is stated where a
 * crawler reads names: the structured data, the home page's title and the footer.
 */
export const BRAND_SPELLING = '5argny';

export function brandAlternateNames(): string[] {
  // One list in both languages (SEO-DIRECTION 4.5 item 4): every spelling people type is tied to the same entity.
  return ['5argny', 'خرجني', 'Khargny', '5argny.com'];
}

/** The home page's title is the one place a title carries both spellings. */
export function homeTitle(locale: Locale): string {
  return locale === 'ar'
    ? `اكتشف أحلى أماكن تخرج فيها في مصر · خرجني (${BRAND_SPELLING})`
    : `Find your next outing in Egypt · ${BRAND_SPELLING} (Khargny)`;
}

export function pageMetadata({ path, locale, title, description, image = defaultShareImage(), type = 'website', noindex = false }: {
  path: string;
  locale: Locale;
  title: string;
  description: string;
  image?: ShareImage;
  type?: 'website' | 'article';
  noindex?: boolean;
}): Metadata {
  const fittedTitle = fitTitle(title, locale);
  const fittedDescription = clampDescription(description);
  const absoluteImage = { ...image, url: new URL(image.url, SITE_URL).href };
  return {
    title: { absolute: fittedTitle },
    description: fittedDescription,
    alternates: alternatesFor(path, locale),
    robots: robotsFor(noindex),
    openGraph: {
      type, title: fittedTitle, description: fittedDescription, url: urlFor(path, locale),
      siteName: locale === 'ar' ? 'خرجني' : BRAND_SPELLING,
      locale: ogLocale(locale), alternateLocale: ogAlternateLocale(locale), images: [absoluteImage],
    },
    twitter: { card: 'summary_large_image', title: fittedTitle, description: fittedDescription, images: [absoluteImage] },
  };
}

/**
 * Serialise JSON-LD for a <script> tag. `<` is escaped because a description containing
 * "</script>" would otherwise end the tag early and break the page.
 */
export const jsonLdScript = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');

/** The publisher, referenced by the other schemas rather than repeated in each. */
export function organizationSchema(locale: Locale, rawSettings?: unknown) {
  const settings = normalizeSiteSettings(rawSettings);
  const sameAs = siteSocialUrls(settings);
  const contactPoint = settings?.phone || settings?.email ? {
    '@type': 'ContactPoint',
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
  } : undefined;
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    // On the Arabic site the Arabic name is the name, not a footnote to the Latin one.
    name: locale === 'ar' ? 'خرجني' : BRAND_SPELLING,
    alternateName: brandAlternateNames(),
    url: urlFor('/', locale),
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/logo-en.png` },
    ...(sameAs.length ? { sameAs } : {}),
    ...(contactPoint ? { contactPoint } : {}),
  };
}

/** Site-level schema with the search action, so Google can offer a sitelinks search box. */
export function webSiteSchema(locale: Locale) {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: urlFor('/', locale),
    name: locale === 'ar' ? 'خرجني' : BRAND_SPELLING,
    alternateName: brandAlternateNames(),
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
