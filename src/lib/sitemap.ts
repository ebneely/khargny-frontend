import type { MetadataRoute } from 'next';
import { isPreviewDeployment } from '@/lib/seo-environment';
import { loadSeoContent, loadTrips } from '@/lib/seo-content';
import { lastModified, placeEntries, imageEntries, staticEntries } from '@/lib/sitemap-entries';
import type { ImageSitemapEntry } from '@/lib/crawler-responses';
import { SITE_URL } from '@/lib/config';

/**
 * The split sitemaps: /sitemap.xml is an index, and each child is built from the public catalogue
 * rather than from a clock. The builders are pure (src/lib/sitemap-entries.ts); this file only
 * fetches and decides what a preview deployment publishes.
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

export async function placesSitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreviewDeployment()) return [];
  const content = await loadSeoContent();
  return placeEntries(content.cities, content.places);
}

export async function imagesSitemap(): Promise<ImageSitemapEntry[]> {
  if (isPreviewDeployment()) return [];
  const content = await loadSeoContent();
  return imageEntries(content.cities, content.places);
}

/** The three child maps, addressed under /sitemaps/. */
export function sitemapIndexEntries(siteUrl: string = SITE_URL): { loc: string }[] {
  return ['static', 'places', 'images'].map((name) => ({ loc: `${siteUrl}/sitemaps/${name}.xml` }));
}
