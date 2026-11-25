// The prototype's place shape (ui-unify/proto/data.js), built from the real API so every component reads the same fields.
import { normalizePhoto, photoCandidates } from '@/lib/place-photo';
import { langPrefix } from '@5argny/core/rules/locale';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { regionLabel } from '@/lib/egypt-regions';
import type { Category, CityWithAreas } from '@/lib/api/types';
import type { Lang } from './rules';

export type KHour = { d: number; o: string | null; c: string | null; x: boolean };
export type KBadge = { key: string; rank?: number; scope?: { city?: { name?: string; nameEn?: string | null } } };
export type KPlace = {
  id: string; slug: string; citySlug: string; cityId: string; catId: string;
  name: string; region: string | null; cat: string; catLabel: string; city: string; area: string;
  address: string | null; phone: string | null; maps: string | null; ig: string | null; web: string | null;
  lat: number | null; lng: number | null; band: number | null;
  /** all-time counters the place itself carries; 30-day windows come from usePlaceStats */
  likes: number; saves: number; views: number; dir: number;
  badges: KBadge[]; hours: KHour[]; amen: string[]; photos: { s: string; m: string }[];
  /** the API marks a paid card `sponsored`; never labelled on cards, disclosed on the place and in its ··· */
  promoted: boolean; updatedAt: string | null;
  /** the last 30 days, carried by every public card (views, saves, shares); loves and 5argny taps stay all-time */
  d30: { views: number; saves: number; shares: number } | null;
  /** km from the person, only on cards fetched with near= (GET /v1/places?near=lat,lng); never guessed */
  distanceKm: number | null;
  /** position in the dashboard's hype order, only on cards fetched with sort=hype (1 = most popular); never shown, never the score */
  popularRank: number | null;
};
export type KCatalog = { cities: CityWithAreas[]; categories: Category[] };

type Raw = Record<string, unknown> & { id: string; slug: string };
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

function photosOf(raw: Raw) {
  const gallery = (raw.gallery as { images?: unknown[] } | undefined)?.images;
  const list = (Array.isArray(raw.images) && raw.images.length ? raw.images : gallery?.length ? gallery : raw.coverImage ? [raw.coverImage] : []) as unknown[];
  return list.map((item) => {
    const photo = normalizePhoto(typeof item === 'string' ? item : (item as { url?: string; urls?: object }).urls ? (item as never) : (item as { url?: string }).url ?? '');
    const all = photoCandidates(photo).map((c) => c.url);
    const s = photo.urls?.small || photo.urls?.thumb || photo.singleUrl || all[0] || '';
    return { s, m: photo.urls?.medium || photo.urls?.large || s };
  }).filter((p) => p.s);
}

export function toK(raw: Raw, catalog: KCatalog, lang: Lang): KPlace {
  const city = catalog.cities.find((c) => c.id === raw.cityId);
  const cat = catalog.categories.find((c) => c.id === raw.categoryId);
  const cityEn = city?.nameEn || city?.name || '';
  // the detail carries placeHours; every list card (places, search, home) carries the week as `hours` [{d, o, c, x?}]
  const hours = Array.isArray(raw.placeHours)
    ? (raw.placeHours as Array<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }>).map((h) => ({ d: h.dayOfWeek, o: h.openTime, c: h.closeTime, x: !!h.isClosed }))
    : ((raw.hours as Array<{ d: number; o: string | null; c: string | null; x?: boolean }>) ?? []).map((h) => ({ d: h.d, o: h.o, c: h.c, x: !!h.x }));
  const amen = ((raw.amenities as Array<{ name: string; nameEn: string | null }>) ?? []).map((a) => a.nameEn || a.name);
  return {
    id: raw.id, slug: raw.slug, citySlug: city?.slug || '', cityId: String(raw.cityId ?? ''), catId: String(raw.categoryId ?? ''),
    name: (lang === 'ar' ? str(raw.name) || str(raw.nameEn) : str(raw.nameEn) || str(raw.name)) || raw.slug,
    region: str(raw.region),
    cat: cat?.nameEn || cat?.nameAr || '', catLabel: (lang === 'ar' ? cat?.nameAr : cat?.nameEn || cat?.nameAr) || '',
    city: (lang === 'ar' ? city?.name : cityEn) || cityEn,
    area: regionLabel(str(raw.region), lang, cityEn) || (lang === 'ar' ? city?.name || '' : cityEn),
    address: str(raw.address), phone: str(raw.phone), maps: str(raw.mapsUrl), ig: str(raw.instagram), web: str(raw.website),
    lat: raw.lat == null ? null : Number(raw.lat), lng: raw.lng == null ? null : Number(raw.lng), band: (raw.priceRange as number) ?? null,
    likes: num(raw.likeCount), saves: num(raw.saveCount), views: num(raw.viewCount), dir: num(raw.directionsCount),
    badges: (raw.badges as KBadge[]) ?? [], hours, amen, photos: photosOf(raw),
    promoted: raw.sponsored === true, updatedAt: str(raw.updatedAt) || str(raw.createdAt),
    distanceKm: typeof raw.distanceKm === 'number' && Number.isFinite(raw.distanceKm) ? raw.distanceKm : null,
    popularRank: typeof raw.popularRank === 'number' && Number.isFinite(raw.popularRank) ? raw.popularRank : null,
    d30: raw.d30 && typeof raw.d30 === 'object' ? { views: num((raw.d30 as Record<string, unknown>).views), saves: num((raw.d30 as Record<string, unknown>).saves), shares: num((raw.d30 as Record<string, unknown>).shares) } : null,
  };
}

/**
 * Places per category (all time) and one real photo of each. No route counts every category in one answer
 * (/v1/places/counts needs a When), so it is one GET /v1/places?categoryId=&limit=1 per category; Egypt-wide it is
 * fetched once on the server and handed to the page (layout hydration), so the browser asks only once a city is chosen.
 */
export type CatTotals = { n: Record<string, number | null>; cover: Record<string, string> };
export const catTotalsKey = (cityId: string | null | undefined, area: string | null | undefined) => ['places', 'totals', cityId ?? '', area ?? ''] as const;
/** rows: [category slug, the list answer, or null when it failed (its count stays hidden, never a false 0)] */
export function catTotals(rows: [string, unknown][]): CatTotals {
  const out: CatTotals = { n: {}, cover: {} };
  for (const [slug, raw] of rows) {
    const list = raw == null ? null : normalizePlaceList(raw);
    out.n[slug] = list?.total ?? null;
    const first = list?.items[0];
    const photo = first ? toK(first as never, { cities: [], categories: [] }, 'en').photos[0]?.m : '';
    if (photo) out.cover[slug] = photo;
  }
  return out;
}

/**
 * A card's photo at medium size. Home's server payload carries only the small URL (the storage names `_small`/`_medium`
 * are the same file), so the medium is derived from it; a full record from the API keeps its own medium (issue #39,
 * payload). Anything that only has one URL still shows that URL.
 */
export function photoMedium(photo: { s: string; m: string } | undefined): string | undefined {
  if (!photo) return undefined;
  if (photo.m) return photo.m;
  return /_small\.webp$/i.test(photo.s) ? photo.s.replace(/_small\.webp$/i, '_medium.webp') : photo.s || undefined;
}

export const placeHref = (p: Pick<KPlace, 'citySlug' | 'slug'>, lang: Lang) => `${langPrefix(lang)}/explorer/${p.citySlug}/${p.slug}/`;export const isPlacePath = (path: string) => /^(\/ar)?\/explorer\/[^/]+\/[^/]+\/?$/.test(path);
/** Opens as a sheet on a phone and as a depth-1 page on desktop: a place, a collection, a Marketplace listing, a host. */
export const isSheetPath = (path: string) => isPlacePath(path) || /^(\/ar)?\/(c|marketplace|host)\/[^/]+\/?$/.test(path);

/** GET /v1/places/:id/stats (contracts/api.md). Missing route or place -> null: counts stay hidden, never a fake 0. */
export type KStats = {
  live?: { views: number; viewsPrev?: number };
  d1?: Record<'views' | 'likes' | 'saves' | 'shares' | 'goes', number> & { viewsPrev?: number };
  d7?: Record<'views' | 'likes' | 'saves' | 'shares' | 'goes', number> & { viewsPrev?: number };
  d30?: Record<'views' | 'likes' | 'saves' | 'shares' | 'goes', number> & { days?: number[]; viewsPrev?: number };
  all?: Record<'views' | 'likes' | 'saves' | 'shares' | 'goes', number>;
};
