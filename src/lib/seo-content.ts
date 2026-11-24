import { unstable_cache } from 'next/cache';
import { getApiBaseUrl } from '@/lib/config';

/**
 * The public catalogue the sitemaps and llms.txt are built from.
 *
 * One loader, so the crawler files can never disagree about which city or place exists, and so a
 * city list is asked for once per cache window instead of once per file. The data is exactly what
 * the public pages read: active, not deleted, and only places whose city is public.
 */
export type PublicRecord = {
  slug?: string;
  status?: string;
  deletedAt?: string | null;
};

export type SeoCity = PublicRecord & {
  id: string;
  name?: string;
  nameEn?: string | null;
  visiblePlacesCount?: number;
};

export type SeoCategory = PublicRecord & {
  id: string;
  slug: string;
  nameAr?: string;
  nameEn?: string | null;
};

export type SeoPlace = PublicRecord & {
  id?: string;
  cityId: string;
  categoryId?: string;
  slug: string;
  name?: string;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  updatedAt?: string;
  coverImage?: string | null;
  gallery?: { images?: { url?: string | null }[] };
};

export type SeoContent = {
  cities: SeoCity[];
  categories: SeoCategory[];
  places: SeoPlace[];
  trips: SeoTrip[];
};

export type SeoTrip = { id?: string; updatedAt?: string };

export function isPublic(record: PublicRecord | null | undefined): boolean {
  return Boolean(record) && (!record!.status || record!.status === 'active') && !record!.deletedAt;
}

async function getJson<T>(path: string): Promise<T[]> {
  const origin = getApiBaseUrl({ browser: false });
  if (!origin) throw new Error('SEO API origin is not configured');
  const res = await fetch(`${origin}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`SEO upstream failed (${res.status})`);
  const json = await res.json();
  if (json?.success === false) throw new Error('SEO upstream reported failure');
  const data = json?.data;
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  throw new Error('SEO upstream returned an invalid list');
}

/**
 * Every page of a list, not just the first. The API caps a page at 100; Cairo has more places than
 * that, and a one-request sitemap silently left the rest out.
 */
async function getAll<T extends { slug?: string }>(pathBase: string): Promise<T[]> {
  const out: T[] = [];
  const seen = new Set<string>();
  const size = 100;
  for (let skip = 0; ; skip += size) {
    const separator = pathBase.includes('?') ? '&' : '?';
    const page = await getJson<T>(`${pathBase}${separator}skip=${skip}&limit=${size}`);
    let added = 0;
    for (const record of page) {
      if (!record?.slug) throw new Error('SEO upstream record has no slug');
      if (seen.has(record.slug)) continue;
      seen.add(record.slug);
      out.push(record);
      added += 1;
    }
    if (page.length < size) break;
    if (!added) throw new Error('SEO upstream pagination did not advance');
  }
  return out;
}

async function fetchSeoContent(): Promise<SeoContent> {
  const [rawCities, rawCategories, trips] = await Promise.all([
    getJson<SeoCity>('/v1/cities'),
    getJson<SeoCategory>('/v1/categories'),
    fetchTrips(),
  ]);
  const cities = rawCities.filter(isPublic);
  if (cities.some((city) => !city?.id || !city.slug)) throw new Error('SEO upstream city is incomplete');
  const categories = rawCategories.filter(isPublic);
  const places: SeoPlace[] = [];
  for (const city of cities) {
    const list = await getAll<SeoPlace>(`/v1/places?cityId=${encodeURIComponent(city.id)}`);
    for (const place of list) {
      if (!isPublic(place) || place.cityId !== city.id) continue;
      places.push(place);
    }
  }
  return { cities, categories, places, trips };
}

async function fetchTrips(): Promise<SeoTrip[]> {
  try {
    const origin = getApiBaseUrl({ browser: false });
    if (!origin) return [];
    const res = await fetch(`${origin}/v1/tourism/trips`, { cache: 'no-store' });
    if (!res.ok) return [];
    const trips = (await res.json())?.data;
    return Array.isArray(trips) ? (trips as SeoTrip[]).filter((trip) => Boolean(trip?.id)) : [];
  } catch {
    // A backend without the tourism module must not take the sitemap down.
    return [];
  }
}

/** Ten minutes, the same window the crawler routes advertise at the edge. */
export const SEO_REVALIDATE_SECONDS = 600;

export const loadSeoContent = unstable_cache(fetchSeoContent, ['seo-content'], {
  revalidate: SEO_REVALIDATE_SECONDS,
  tags: ['seo-content'],
});

export const loadTrips = unstable_cache(fetchTrips, ['seo-trips'], {
  revalidate: SEO_REVALIDATE_SECONDS,
  tags: ['seo-content'],
});
