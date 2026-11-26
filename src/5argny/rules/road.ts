// Real road km (PLACES-DIRECTION §7): the rules behind the batched POST /v1/places/road-distance call.
// Every figure the engine answers is a road distance; everything else on the site stays a straight-line "~N km".
import { haversineKm } from './near.ts';

/** The endpoint's own cap: more places than this on screen are asked for in a second call. */
export const ROAD_MAX_IDS = 50;

/** Ask again only after the person moved this far. A closer fix is the same spot on the ground. */
export const ROAD_REFRESH_M = 100;

export type RoadKm = { km: number; min: number };

/**
 * Split the ids on screen into calls of at most `size`, keeping their order and dropping duplicates.
 * One card appears in more than one rail; the same id must not be asked for twice.
 */
export function roadBatches(
  ids: readonly string[],
  size = ROAD_MAX_IDS,
): string[][] {
  if (!Number.isInteger(size) || size < 1)
    throw new RangeError('road batch size must be a positive integer');
  const unique = [...new Set(ids.filter(Boolean))];
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += size)
    out.push(unique.slice(i, i + size));
  return out;
}

/** True when the new fix is far enough from the last one to ask the engine again. */
export function movedEnough(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number },
  meters = ROAD_REFRESH_M,
): boolean {
  return !from || haversineKm(from, to) * 1000 > meters;
}

/**
 * The endpoint answers only the ids it got a value for; a broken or missing entry is dropped so that
 * card keeps "~N km" instead of printing a guess as a road distance.
 */
export function readRoadAnswer(raw: unknown): Record<string, RoadKm> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, RoadKm> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const { km, min } = value as { km?: unknown; min?: unknown };
    if (typeof km !== 'number' || !Number.isFinite(km) || km < 0) continue;
    if (typeof min !== 'number' || !Number.isFinite(min) || min < 0) continue;
    out[id] = { km, min: Math.round(min) };
  }
  return out;
}
