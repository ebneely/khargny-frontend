import 'server-only';
import { getCatalog, getHomePool, getHomeSections, getPlaceCounts, getTopPlaces, optional } from '@/lib/server/public-data';
import type { Locale } from '@/i18n/dictionaries';
import { toK, type KPlace } from './data';
import type { HomeData } from './home';

/**
 * Every Home row from the real API (Home, and the page behind a place sheet on a phone landing).
 * The language is passed in, never read from the request: Home renders once per language and is cached (ISR).
 */
export async function getHomeData(lang: Locale): Promise<HomeData> {
  const [catalog, pool, top, sections, counts] = await Promise.all([
    getCatalog(), optional(getHomePool(), { items: [], skip: 0, limit: 0 }), optional(getTopPlaces(), null), optional(getHomeSections(), []), optional(getPlaceCounts('now'), null),
  ]);
  const k = (raw: object) => toK(raw as never, catalog, lang);
  // Home's cards show a photo, a name and the counters. The medium URL is the same storage file as the small one and is
  // derived on the client (photoMedium), contact links are never rendered on Home, and the hype position is only used by
  // Explore: none of it is sent (issue #39, payload). The place's own page and sheet fetch the full record by slug.
  const card = (p: KPlace): KPlace => ({
    ...p, phone: null, maps: null, ig: null, web: null, popularRank: null,
    photos: p.photos.map((photo) => ({ s: photo.s, m: '' })),
  });
  const bySlug = new Map(catalog.categories.map((c) => [c.slug, c.id]));
  return {
    pool: pool.items.map(k).filter((p) => p.photos.length).map(card),
    trending: (top?.items ?? []).map((item) => k(item.place)).filter((p) => p.photos.length).map(card),
    collections: sections.map((s) => ({ id: s.id, slug: s.key, title: (lang === 'ar' ? s.titleAr : s.titleEn || s.titleAr) || s.key, places: s.places.map(k).filter((p) => p.photos.length).map(card) })).filter((s) => s.places.length),
    categories: catalog.categories.map((c) => ({ id: c.id, en: c.nameEn || c.nameAr, label: (lang === 'ar' ? c.nameAr : c.nameEn || c.nameAr) || c.slug })),
    openByCategory: counts ? Object.fromEntries(Object.entries(counts.byCategory).map(([slug, n]) => [bySlug.get(slug) ?? slug, n])) : null,
  };
}
