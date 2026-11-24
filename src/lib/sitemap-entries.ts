import type { MetadataRoute } from 'next';
import { hreflangFor } from '@5argny/core/rules/locale';
import { urlFor } from '@/lib/site-url';
import { SITE_URL } from '@/lib/config';
import type { SeoCity, SeoPlace, SeoTrip } from '@/lib/seo-content';
import type { ImageSitemapEntry } from '@/lib/crawler-responses';

/**
 * The pure builders behind the split sitemaps. No fetch, no clock, no Next request: a place's
 * lastmod is its own updatedAt and an entry without one is published without a date rather than
 * stamped with "now". A static page's date is the build that produced it.
 */

export type SitemapEntry = MetadataRoute.Sitemap[number];

/** English first: the plain URL is the primary address, Arabic is the translation under /ar. */
const PAGE_LOCALES = ['en', 'ar'] as const;

/** An ISO value from the API, or undefined. Never the current time. */
export function lastModified(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function localized(
  path: string,
  rest: Omit<SitemapEntry, 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    Object.entries(hreflangFor(path)).map(([language, href]) => [language, `${SITE_URL}${href}`]),
  );
  return PAGE_LOCALES.map((locale) => ({
    url: urlFor(path, locale),
    ...rest,
    alternates: { languages },
  }));
}

/** The site's own pages. /plan is absent: it is one guest's saved list, not a search result. */
export function staticEntries(staticDate: Date, trips: SeoTrip[] = []): MetadataRoute.Sitemap {
  return [
    ...localized('', { lastModified: staticDate, changeFrequency: 'daily', priority: 1 }),
    ...localized('/explorer', { lastModified: staticDate, changeFrequency: 'daily', priority: 0.9 }),
    ...localized('/trips', { lastModified: staticDate, changeFrequency: 'daily', priority: 0.8 }),
    ...localized('/marketplace', { lastModified: staticDate, changeFrequency: 'daily', priority: 0.7 }),
    ...localized('/contact', { lastModified: staticDate, changeFrequency: 'monthly', priority: 0.3 }),
    ...localized('/privacy', { lastModified: staticDate, changeFrequency: 'yearly', priority: 0.2 }),
    ...trips.flatMap((trip) => {
      const updated = lastModified(trip.updatedAt);
      return trip.id
        ? localized(`/trips/${encodeURIComponent(trip.id)}`, {
            ...(updated ? { lastModified: updated } : {}),
            changeFrequency: 'daily',
            priority: 0.6,
          })
        : [];
    }),
  ];
}

/** Every place page in both languages; lastmod is place.updatedAt only. */
export function placeEntries(cities: SeoCity[], places: SeoPlace[]): MetadataRoute.Sitemap {
  const citySlug = new Map(cities.map((city) => [city.id, city.slug]));
  return places.flatMap((place) => {
    const slug = citySlug.get(place.cityId);
    if (!slug || !place.slug) return [];
    const updated = lastModified(place.updatedAt);
    return localized(`/explorer/${encodeURIComponent(slug)}/${encodeURIComponent(place.slug)}`, {
      ...(updated ? { lastModified: updated } : {}),
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  });
}

/** Photos of a place, cover first, without the duplicate the gallery repeats, largest rendition. */
export function placePhotos(place: SeoPlace): string[] {
  const urls = [
    place.coverImage,
    ...(place.gallery?.images ?? []).map((image) => image?.url),
  ]
    .filter((url): url is string => Boolean(url))
    .map((url) => url.replace(/_small\.webp$/i, '_large.webp'));
  return [...new Set(urls)];
}

/** Place photos in the image-sitemap shape, one entry per language page. */
export function imageEntries(cities: SeoCity[], places: SeoPlace[]): ImageSitemapEntry[] {
  const citySlug = new Map(cities.map((city) => [city.id, city.slug]));
  return places.flatMap((place) => {
    const slug = citySlug.get(place.cityId);
    const photos = placePhotos(place);
    if (!slug || !place.slug || !photos.length) return [];
    const path = `/explorer/${encodeURIComponent(slug)}/${encodeURIComponent(place.slug)}`;
    const updated = lastModified(place.updatedAt);
    return PAGE_LOCALES.map((locale) => ({
      url: urlFor(path, locale),
      ...(updated ? { lastModified: updated } : {}),
      images: photos.map((loc) => ({
        loc,
        title: locale === 'ar' ? place.name : place.nameEn || place.name,
      })),
    }));
  });
}

/** The sitemap index's children. */
export const SITEMAPS = ['static', 'places', 'images'] as const;
