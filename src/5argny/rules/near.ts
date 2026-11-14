// Distances and the nearby pick (owner 2026-11-14: Near you is the truly nearest places, "N km away" on every card).

/** "0.2", "2.0", "12": one decimal under 10 km, whole km above; never "0" (the nearest still reads as a distance). */
export function kmText(km: number): string {
  const r = Math.round(km * 10) / 10;
  return r < 10 ? Math.max(0.1, r).toFixed(1) : String(Math.round(km));
}

/** A position kept to 3 decimals (about 100 m): enough for "nearest", not a precise trace of the person. */
export const coarse = (p: { lat: number; lng: number }) => ({ lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 });

/** The API ranks by distance only from inside Egypt (backend readNear: lat 22-32, lng 24-37); outside, there is no "near you". */
export const inEgypt = (p: { lat: number; lng: number }) => p.lat >= 22 && p.lat <= 32 && p.lng >= 24 && p.lng <= 37;

/** Surprise me with a position: a random place among the nearest 20 (the list is nearest first), not the last pick again. */
export function pickNear<T extends { id: string }>(nearestFirst: T[], lastId: string | null, rand: () => number): T | null {
  const pool = nearestFirst.slice(0, 20), rest = pool.filter((p) => p.id !== lastId), from = rest.length ? rest : pool;
  return from.length ? from[Math.floor(rand() * from.length)] : null;
}
