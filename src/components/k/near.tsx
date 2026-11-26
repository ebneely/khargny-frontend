'use client';
// The person's position, only after they ask for it (Near you, Explore "Nearest"): never a prompt on load. Kept coarse
// (3 decimals) for the session, so Home, Explore and Surprise me reuse it. Places near it come from the API with distanceKm.
import { useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fill } from '@5argny/core/copy';
import { coarse, inEgypt, kmText, isApproxFix } from '@5argny/core/rules';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { setAnalyticsGeo } from '@/lib/analytics/track';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { Bit } from './bits';
import { L } from './icons';
import { useRoadKm } from './road';
import { toK, type KPlace } from './data';
import { useK, haptic } from './KProvider';

type Pos = { lat: number; lng: number; acc: number | null };
const KEY = 'kh.here', APPROX_KEY = 'kh.approxSaid', listeners = new Set<() => void>();
let cache: { raw: string | null; pos: Pos | null } = { raw: null, pos: null };
const read = (): Pos | null => {
  let raw: string | null = null; try { raw = sessionStorage.getItem(KEY); } catch {}
  if (raw !== cache.raw) { let pos: Pos | null = null; try { pos = raw ? JSON.parse(raw) : null; } catch {} cache = { raw, pos }; }
  return cache.pos;
};
const subscribe = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

// A position kept from earlier in this tab goes to analytics too (the city viewers are in), without asking again.
if (typeof window !== 'undefined') { const kept = read(); if (kept) setAnalyticsGeo(kept); }

export const usePosition = () => useSyncExternalStore(subscribe, read, () => null);
/** The position right now (after askPosition resolved, before the next render). */
export const readPosition = read;
/** "lat,lng" for the API, or null. */
export const nearParam = (p: Pos | null) => (p ? `${p.lat},${p.lng}` : null);
/** The browser's own accuracy circle in metres (null when it did not say): the map draws it, nothing else prints it. */
export const posAccuracy = (p: Pos | null) => p?.acc ?? null;
/** The fix is coarser than 1 km (a desktop Wi-Fi or IP position): no km figure is printed from it, the area is shown. */
export const useApproxHere = () => { const pos = usePosition(); return !!pos && isApproxFix(pos.acc); };

// "Location is approximate" is said once a session: set when a coarse fix is first taken, cleared by the next page load.
let approxNew = false;
const markApprox = (pos: Pos) => {
  if (!isApproxFix(pos.acc)) return;
  try { if (sessionStorage.getItem(APPROX_KEY)) return; sessionStorage.setItem(APPROX_KEY, '1'); } catch { return; }
  approxNew = true;
};

/** Why the last ask gave no position: refused, not found, or outside Egypt; null when it worked or was never asked. */
export type AskFail = 'denied' | 'unavailable' | 'outside';
let fail: AskFail | null = null;
export const askFail = () => fail;
export const useAskFail = () => useSyncExternalStore(subscribe, askFail, () => null);

/**
 * Asks the browser once (a tap, never on load). Resolves false when denied, unavailable or outside Egypt (askFail says
 * which). A precise fix is asked for (a 10-minute-old Wi-Fi position can be kilometres off) and up to a minute old is
 * accepted, which is the instant first paint after a reload; the accuracy the browser reports rides along, and a fix
 * worse than 1 km never prints a km figure (useApproxHere).
 */
export function askPosition(): Promise<boolean> {
  const end = (done: (ok: boolean) => void, why: AskFail | null) => { fail = why; listeners.forEach((f) => f()); done(!why); };
  return new Promise((done) => {
    if (!navigator.geolocation) return end(done, 'unavailable');
    navigator.geolocation.getCurrentPosition((g) => {
      const pos: Pos = { ...coarse({ lat: g.coords.latitude, lng: g.coords.longitude }), acc: Number.isFinite(g.coords.accuracy) ? g.coords.accuracy : null };
      setAnalyticsGeo(pos, g.coords.accuracy); // outside Egypt too: the dashboard counts it as outside Egypt
      if (!inEgypt(pos)) return end(done, 'outside'); // outside Egypt the API has no nearest; nothing changes
      markApprox(pos); // a Wi-Fi fix worse than 1 km: "Location is approximate" once this session, no km figures
      try { sessionStorage.setItem(KEY, JSON.stringify(pos)); } catch {}
      end(done, null);
    }, (e) => end(done, e.code === 1 ? 'denied' : 'unavailable'), { enableHighAccuracy: true, maximumAge: 60_000, timeout: 20_000 });
  });
}

/** The nearest places to the person (GET /v1/places?near=&sort=distance), nearest first, each with distanceKm. */
export function useNearPlaces(limit = 20): KPlace[] | null { return useNearQuery(limit).list; }
/** The same, with its query, for Near you's loading, failed and empty states. */
export function useNearQuery(limit = 20) {
  const { lang } = useK();
  const near = nearParam(usePosition());
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const q = useQuery({
    queryKey: ['places', 'near', near, limit], enabled: !!near, staleTime: 5 * 60_000,
    queryFn: async () => normalizePlaceList(await apiRequest<unknown>('GET', '/v1/places', { params: { near: near!, sort: 'distance', limit } })).items,
  });
  return { q, list: near && q.data ? q.data.map((r) => toK(r as never, { cities, categories }, lang)).filter((p) => p.photos.length) : null };
}

/**
 * Surprise me's pool (contracts/api.md): places open now within 10 km, nearest first; fewer than 5 widens to 25, then 50 km.
 * Fetched when the position is known, so the dice deals at once; Home asks for it through the query client after a first tap.
 */
export const surpriseQuery = (near: string | null) => ({
  queryKey: ['places', 'surprise', near], enabled: !!near, staleTime: 5 * 60_000,
  queryFn: async () => {
    let items: unknown[] = [];
    for (const radiusKm of [10, 25, 50]) {
      items = normalizePlaceList(await apiRequest<unknown>('GET', '/v1/places', { params: { near: near!, sort: 'distance', when: 'now', radiusKm, limit: 20 } })).items;
      if (items.length >= 5) break;
    }
    return items;
  },
});

/** Use my location: the browser asks on this tap, never on load (Near you on phones and desktop). */
export function NearAsk() {
  const { c } = useK();
  const [asking, setAsking] = useState(false);
  const why = useAskFail();
  return <div className="near-ask">
    <span className="near-ask-ic"><L n="map-pin" /></span>
    <h2 className="near-ask-title">{c.home.nearYou}</h2>
    <p className="near-ask-body">{c.home.nearAskBody}</p>
    <button className="btn primary press" data-act="near-ask" disabled={asking} onClick={() => { haptic(); setAsking(true); void askPosition().finally(() => setAsking(false)); }}><L n="navigation" />{c.home.nearAsk}</button>
    {why ? <p className="t-small near-ask-why" role="alert"><L n="map-pin-off" />{c.states.near[why]}</p> : null}
  </div>;
}

/**
 * "~N km away" on a card, only when the card came with a real distance; from a fix worse than 1 km the area is shown
 * instead (a km figure from a Wi-Fi position would be wrong, and the road distance would be 1.3-2x it anyway). When the
 * road answer arrives it replaces the straight line as "N km away" (no "~"), in the number's own slot.
 */
export function KmAway({ p, cls }: { p: Pick<KPlace, 'id' | 'distanceKm' | 'area' | 'city'>; cls?: 'meta-area' }) {
  const { c } = useK();
  const approx = useApproxHere();
  const pos = usePosition();
  const km = approx ? null : p.distanceKm;
  const road = useRoadKm(km == null ? null : p.id, pos);
  const text = approx ? p.area || p.city : km == null ? null : fill(road ? c.units.km : c.units.kmAway, { km: kmText(road ? road.km : km) });
  if (!text) return null;
  return cls === 'meta-area' ? <span className="meta-area"><L n="map-pin" />{text}</span> : <Bit icon="map-pin">{text}</Bit>;
}

/**
 * "Location is approximate", once per session, beside a list built from a coarse fix: the person can move to a window or
 * a phone and ask again instead of reading distances that are kilometres off.
 */
export function ApproxNote({ className }: { className?: string }) {
  const { c } = useK();
  const approx = useApproxHere();
  const fresh = useSyncExternalStore(subscribe, () => approxNew, () => false);
  if (!approx || !fresh) return null;
  return <p className={`t-small near-approx ${className ?? ''}`} role="status"><L n="map-pin-off" />{c.states.near.approximate}</p>;
}
