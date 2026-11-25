import type { MetadataRoute } from 'next';
import { isPreviewDeployment } from '@/lib/seo-environment';
import { loadSeoContent, loadTrips } from '@/lib/seo-content';
import { lastModified, placeEntries, imageEntries, staticEntries, chunkPlaces, newestUpdate, sitemapFileCount, sitemapIndexFor } from '@/lib/sitemap-entries';
import type { ImageSitemapEntry } from '@/lib/crawler-responses';
import { SITE_URL } from '@/lib/config';
import type { SeoPlace } from '@/lib/seo-content';

/**
 * The split sitemaps: /sitemap.xml is an index, and each child is built from the public catalogue
 * rather than from a clock. The builders are pure (src/lib/sitemap-entries.ts); this file only
 * fetches and decides what a preview deployment publishes.
 *
 * At 20,000 places per file a catalogue of millions is served as places-1.xml … places-N.xml and
 * images-1.xml … images-N.xml, each with its own honest lastmod, so no file ever passes Google's
 * 50,000-URL limit. A catalogue that size needs the dedicated cached page endpoint described in
 * the report; today the loader pages the existing public list (50 per request) once per cache
 * window and every numbered file reads its slice of that one list.
 */

function buildDate(): Date {
  const date = lastModified(process.env.SEO_BUILD_DATE);
  if (!date) throw new Error('Sitemap build date is not configured');
  return date;
}

export async function staticSitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreviewDeployment()) return [];
  const trips = await loadTrips();
  return staticEntries(buildDate(), trips);
}

/** Every public place, in catalogue order, shared by every numbered file of one cache window. */
async function catalogue(): Promise<{ cities: Parameters<typeof placeEntries>[0]; places: SeoPlace[] }> {
  const content = await loadSeoContent();
  return { cities: content.cities, places: content.places };
}

/** How many places-*.xml (and images-*.xml) files the catalogue needs right now. */
export async function placesSitemapFileCount(): Promise<number> {
  if (isPreviewDeployment()) return 1;
  const { places } = await catalogue();
  return sitemapFileCount(places.length);
}

/** One numbered place sitemap (1-based), or null when the catalogue has fewer files. */
export async function placesSitemapFile(index: number): Promise<MetadataRoute.Sitemap | null> {
  if (isPreviewDeployment()) return [];
  const { cities, places } = await catalogue();
  const count = sitemapFileCount(places.length);
  if (!Number.isInteger(index) || index < 1 || index > count) return null;
  return placeEntries(cities, chunkPlaces(places, index - 1));
}

/** One numbered image sitemap (1-based), or null when the catalogue has fewer files. */
export async function imagesSitemapFile(index: number): Promise<ImageSitemapEntry[] | null> {
  if (isPreviewDeployment()) return [];
  const { cities, places } = await catalogue();
  const count = sitemapFileCount(places.length);
  if (!Number.isInteger(index) || index < 1 || index > count) return null;
  return imageEntries(cities, chunkPlaces(places, index - 1));
}

/** The newest update inside one numbered place file, for the index's lastmod. */
export async function placesSitemapFileDate(index: number): Promise<Date | undefined> {
  if (isPreviewDeployment()) return undefined;
  const { places } = await catalogue();
  const count = sitemapFileCount(places.length);
  if (!Number.isInteger(index) || index < 1 || index > count) return undefined;
  return newestUpdate(chunkPlaces(places, index - 1));
}

/** The index: static once, then every numbered place and image file, one hop each. */
export async function sitemapIndexEntries(siteUrl: string = SITE_URL): Promise<{ loc: string; lastModified?: Date }[]> {
  if (isPreviewDeployment()) return [];
  const count = await placesSitemapFileCount();
  const dates = await Promise.all(Array.from({ length: count }, (_, i) => placesSitemapFileDate(i + 1)));
  return sitemapIndexFor(siteUrl, count, dates);
}
