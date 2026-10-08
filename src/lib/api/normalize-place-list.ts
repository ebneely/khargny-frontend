import { normalizePlaceFlags } from './normalize-place';
import type { Place, PlaceList } from './types';

export function normalizePlaceList(raw: unknown): PlaceList {
  if (Array.isArray(raw)) {
    const items = (raw as Place[]).map(normalizePlaceFlags);
    return { items, skip: 0, limit: items.length, total: items.length };
  }
  const result = (raw ?? {}) as {
    items?: Place[]; data?: Place[]; skip?: number; limit?: number; total?: number;
    meta?: { skip?: number; limit?: number; total?: number };
  };
  const items = (result.items ?? result.data ?? []).map(normalizePlaceFlags);
  return {
    items,
    skip: result.skip ?? result.meta?.skip ?? 0,
    limit: result.limit ?? result.meta?.limit ?? items.length,
    total: result.total ?? result.meta?.total,
  };
}
