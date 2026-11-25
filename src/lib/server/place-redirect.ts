import { getApiBaseUrl } from '@/lib/config';
import { backendHeaders } from '@/lib/backend-headers';
import { placeRedirect } from '@/lib/place-address';
import { BoundedCache } from '@/lib/bounded-cache';
import type { Locale } from '@/i18n/dictionaries';

/**
 * A place address is resolved before the page renders, through the lightweight address endpoint
 * (`/v1/places/:slug/address`). It follows `place_previous_slugs` and does not increment a place's
 * view count, unlike the full detail endpoint.
 *
 * Both caches are bounded: a crawler asking for random slugs must not grow the process's memory.
 */

type PlaceAddress = { slug: string; citySlug: string };
type Lookup = { status: 'ok'; place: PlaceAddress } | { status: 'missing' } | { status: 'error' };

const FOUND_MAX = 5_000;
const FOUND_TTL_MS = 5 * 60_000;
const MISSING_MAX = 1_000;
const MISSING_TTL_MS = 60_000;

const found = new BoundedCache<PlaceAddress>(FOUND_MAX, FOUND_TTL_MS);
const missing = new BoundedCache<true>(MISSING_MAX, MISSING_TTL_MS);

function origin(): string | null {
  return getApiBaseUrl({ browser: false }) || null;
}

/** The address route's own 404 for a known route; only this body means the place is gone. */
function isPlaceMissing(body: unknown): boolean {
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === 'string' && message.startsWith('Place with slug');
}

async function lookupPlace(slug: string, source?: Headers | null): Promise<Lookup> {
  if (missing.get(slug)) return { status: 'missing' };
  const cached = found.get(slug);
  if (cached) return { status: 'ok', place: cached };

  const base = origin();
  if (!base) return { status: 'error' };
  try {
    const res = await fetch(`${base}/v1/places/${encodeURIComponent(slug)}/address`, {
      headers: { accept: 'application/json', ...backendHeaders(source) },
      signal: AbortSignal.timeout(2000),
    });
    if (res.status === 404) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        return { status: 'error' };
      }
      if (!isPlaceMissing(body)) return { status: 'error' };
      missing.set(slug, true);
      return { status: 'missing' };
    }
    if (!res.ok) return { status: 'error' };
    const data = (await res.json())?.data;
    if (!data?.slug || !data?.citySlug) return { status: 'error' };
    const place: PlaceAddress = { slug: String(data.slug), citySlug: String(data.citySlug) };
    found.set(slug, place);
    return { status: 'ok', place };
  } catch {
    // A backend hiccup must not become a redirect or a 404; the page handles it.
    return { status: 'error' };
  }
}

export type PlaceAddressResolution =
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ok'; canonical: string | null };

/** 301 target, 404, or nothing special (the page renders). */
export async function resolvePlaceAddress(
  requested: { citySlug: string; placeSlug: string; locale: Locale; search: string; source?: Headers | null },
): Promise<PlaceAddressResolution> {
  const lookup = await lookupPlace(requested.placeSlug, requested.source);
  if (lookup.status !== 'ok') return { status: lookup.status };
  return {
    status: 'ok',
    canonical: placeRedirect(requested, { slug: lookup.place.slug, citySlug: lookup.place.citySlug }),
  };
}
