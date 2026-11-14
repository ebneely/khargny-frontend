'use client';
// The person's position, only after they ask for it (Near you, Explore "Nearest"): never a prompt on load. Kept coarse
// (3 decimals) for the session, so Home, Explore and Surprise me reuse it. Places near it come from the API with distanceKm.
import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fill } from '@5argny/core/copy';
import { coarse, inEgypt, kmText } from '@5argny/core/rules';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { Bit } from './bits';
import { toK, type KPlace } from './data';
import { useK } from './KProvider';

type Pos = { lat: number; lng: number };
const KEY = 'kh.here', listeners = new Set<() => void>();
let cache: { raw: string | null; pos: Pos | null } = { raw: null, pos: null };
const read = (): Pos | null => {
  let raw: string | null = null; try { raw = sessionStorage.getItem(KEY); } catch {}
  if (raw !== cache.raw) { let pos: Pos | null = null; try { pos = raw ? JSON.parse(raw) : null; } catch {} cache = { raw, pos }; }
  return cache.pos;
};
const subscribe = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

export const usePosition = () => useSyncExternalStore(subscribe, read, () => null);
/** "lat,lng" for the API, or null. */
export const nearParam = (p: Pos | null) => (p ? `${p.lat},${p.lng}` : null);

/** Asks the browser once (a tap, never on load). Resolves false when denied or unavailable: nothing changes then. */
export function askPosition(): Promise<boolean> {
  return new Promise((done) => {
    if (!navigator.geolocation) return done(false);
    navigator.geolocation.getCurrentPosition((g) => {
      const pos = coarse({ lat: g.coords.latitude, lng: g.coords.longitude });
      if (!inEgypt(pos)) return done(false); // outside Egypt the API has no nearest; nothing changes
      try { sessionStorage.setItem(KEY, JSON.stringify(pos)); } catch {}
      listeners.forEach((f) => f()); done(true);
    }, () => done(false), { maximumAge: 10 * 60_000, timeout: 15_000 });
  });
}

/** The nearest places to the person (GET /v1/places?near=&sort=distance), nearest first, each with distanceKm. */
export function useNearPlaces(limit = 20): KPlace[] | null {
  const { lang } = useK();
  const near = nearParam(usePosition());
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const { data } = useQuery({
    queryKey: ['places', 'near', near, limit], enabled: !!near, staleTime: 5 * 60_000,
    queryFn: async () => normalizePlaceList(await apiRequest<unknown>('GET', '/v1/places', { params: { near: near!, sort: 'distance', limit } })).items,
  });
  return near && data ? data.map((r) => toK(r as never, { cities, categories }, lang)).filter((p) => p.photos.length) : null;
}

/** "N km away" on a card, only when the card came with a real distance. */
export function KmAway({ p }: { p: Pick<KPlace, 'distanceKm'> }) {
  const { c } = useK();
  return p.distanceKm == null ? null : <Bit icon="map-pin">{fill(c.units.kmAway, { km: kmText(p.distanceKm) })}</Bit>;
}
