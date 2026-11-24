import { getApiBaseUrl } from '@/lib/config';
import { placeRedirect } from '@/lib/place-address';
import type { Locale } from '@/i18n/dictionaries';

/**
 * A place address is resolved before the page renders: the proxy answers 301 for a moved place
 * and 404 for a slug the backend does not know. Doing it here keeps the status real even when the
 * page's layout has already started streaming.
 *
 * Lookups are cached in memory: a stable slug costs one backend request per five minutes.
 */

type PlaceInfo = { slug: string; cityId: string };
type Lookup = { status: 'ok'; place: PlaceInfo } | { status: 'missing' } | { status: 'error' };

const PLACE_TTL_MS = 5 * 60_000;
const CITY_TTL_MS = 60 * 60_000;
const places = new Map<string, { at: number; value: Lookup }>();
let cities: { at: number; value: Map<string, string> } | null = null;

function origin(): string | null {
  return getApiBaseUrl({ browser: false }) || null;
}

async function lookupPlace(slug: string): Promise<Lookup> {
  const cached = places.get(slug);
  if (cached && Date.now() - cached.at < PLACE_TTL_MS) return cached.value;
  const base = origin();
  if (!base) return { status: 'error' };
  try {
    const res = await fetch(`${base}/v1/places/${encodeURIComponent(slug)}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(2000),
    });
    if (res.status === 404) {
      const missing: Lookup = { status: 'missing' };
      places.set(slug, { at: Date.now(), value: missing });
      return missing;
    }
    if (!res.ok) return { status: 'error' };
    const data = (await res.json())?.data;
    const value: Lookup = data?.slug && data?.cityId
      ? { status: 'ok', place: { slug: String(data.slug), cityId: String(data.cityId) } }
      : { status: 'missing' };
    places.set(slug, { at: Date.now(), value });
    return value;
  } catch {
    // A backend hiccup must not become a redirect or a 404; the page handles it.
    return { status: 'error' };
  }
}

async function citySlugs(): Promise<Map<string, string> | null> {
  if (cities && Date.now() - cities.at < CITY_TTL_MS) return cities.value;
  const base = origin();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/v1/cities`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return cities?.value ?? null;
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : Array.isArray(json?.data?.data) ? json.data.data : [];
    const value = new Map<string, string>(
      list
        .filter((city: { id?: string; slug?: string }) => city?.id && city?.slug)
        .map((city: { id: string; slug: string }) => [city.id, city.slug]),
    );
    cities = { at: Date.now(), value };
    return value;
  } catch {
    return cities?.value ?? null;
  }
}

export type PlaceAddressResolution =
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ok'; canonical: string | null };

/** 301 target, 404, or nothing special (the page renders). */
export async function resolvePlaceAddress(
  requested: { citySlug: string; placeSlug: string; locale: Locale; search: string },
): Promise<PlaceAddressResolution> {
  const lookup = await lookupPlace(requested.placeSlug);
  if (lookup.status !== 'ok') return { status: lookup.status };
  const citySlug = (await citySlugs())?.get(lookup.place.cityId) ?? requested.citySlug;
  return { status: 'ok', canonical: placeRedirect(requested, { slug: lookup.place.slug, citySlug }) };
}
