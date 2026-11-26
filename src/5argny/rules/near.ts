// Distances and the nearby pick (owner 2026-11-14: Near you is the truly nearest places, "N km away" on every card).

/** "0.2", "2.0", "12": one decimal under 10 km, whole km above; never "0" (the nearest still reads as a distance). */
export function kmText(km: number): string {
  const r = Math.round(km * 10) / 10;
  return r < 10 ? Math.max(0.1, r).toFixed(1) : String(Math.round(km));
}

/**
 * The straight-line distance between two points in km (haversine, mean Earth radius 6371 km). The website's one
 * distance helper: every km figure that is not the server's `distanceKm` comes from here. A road distance is
 * 1.3-2x this in Cairo, so a number shown from it is written "~N km", never claimed as driving distance.
 */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/**
 * A browser fix coarser than this (desktop browsers answer with Wi-Fi or IP positions, which can be kilometres off) is
 * not good enough for a km figure: the screen shows the area name instead and says once that location is approximate.
 */
export const APPROX_ACCURACY_M = 1000;
export const isApproxFix = (accuracy: number | null | undefined) => accuracy != null && accuracy > APPROX_ACCURACY_M;

/** A position kept to 3 decimals (about 100 m): enough for "nearest", not a precise trace of the person. */
export const coarse = (p: { lat: number; lng: number }) => ({ lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 });

/** The API ranks by distance only from inside Egypt (backend readNear: lat 22-32, lng 24-37); outside, there is no "near you". */
/** The position analytics may keep: 2 decimals (~1 km), the cell the backend names a city for (its readGeo rounds the same). */
export const geoCell = (p: { lat: number; lng: number }) => ({ lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 });

export const inEgypt = (p: { lat: number; lng: number }) => p.lat >= 22 && p.lat <= 32 && p.lng >= 24 && p.lng <= 37;

/**
 * Surprise me with a position: a random place among the nearest 20 (the list is nearest first), skipping the last 5 picks
 * (oldest first in `recent`). When every place was picked lately, anything but the very last; one place is picked again.
 */
export function pickNear<T extends { id: string }>(nearestFirst: T[], recent: string[], rand: () => number): T | null {
  const pool = nearestFirst.slice(0, 20), skip = new Set(recent.slice(-5)), last = recent[recent.length - 1];
  const rest = pool.filter((p) => !skip.has(p.id)), other = pool.filter((p) => p.id !== last);
  const from = rest.length ? rest : other.length ? other : pool;
  return from.length ? from[Math.floor(rand() * from.length)] : null;
}
