import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type { Place, PlaceDetail, PlaceFilters, PlaceList } from '@/lib/api/types';

export const placesKeys = {
  all: ['places'] as const,
  list: (filters?: PlaceFilters) => ['places', 'list', filters ?? {}] as const,
  detail: (slug: string) => ['places', 'detail', slug] as const,
  similar: (id: string) => ['places', 'similar', id] as const,
};

/**
 * Normalize a places-list payload to the `{ items, skip, limit }` shape the UI
 * consumes. The backend's public list endpoints return the paginated envelope
 * `{ data: Place[], meta: { skip, limit, total } }`, not `{ items }`.
 */
export function normalizePlaceList(raw: unknown): PlaceList {
  if (Array.isArray(raw)) {
    return { items: raw as Place[], skip: 0, limit: (raw as Place[]).length };
  }
  const r = (raw ?? {}) as {
    items?: Place[];
    data?: Place[];
    skip?: number;
    limit?: number;
    meta?: { skip?: number; limit?: number };
  };
  const items = r.items ?? r.data ?? [];
  return {
    items,
    skip: r.skip ?? r.meta?.skip ?? 0,
    limit: r.limit ?? r.meta?.limit ?? items.length,
  };
}

/** GET /v1/places. `enabled` gates the query — pass false while a required filter
 *  (e.g. cityId) is still unresolved, so it does NOT fire unscoped and return ALL
 *  places (the "every city shows the same places" bug). */
export function usePlaces(filters?: PlaceFilters, enabled: boolean = true) {
  return useQuery({
    queryKey: placesKeys.list(filters),
    queryFn: async () =>
      normalizePlaceList(
        await apiRequest<unknown>('GET', '/v1/places', {
          params: filters as Record<string, string | number | undefined | null>,
        }),
      ),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * GET /v1/places/:slug
 *
 * NOTE (Modules/places/decisions.md): the response does NOT include hours,
 * amenities, or tags, and reading it does NOT increment viewCount. Do not
 * render UI for those regions as if they work.
 */
export function usePlace(slug: string | null | undefined) {
  return useQuery({
    queryKey: placesKeys.detail(slug ?? ''),
    queryFn: () => apiRequest<PlaceDetail>('GET', `/v1/places/${slug}`),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /v1/places/:id/similar */
export function useSimilarPlaces(id: string | null | undefined) {
  return useQuery({
    queryKey: placesKeys.similar(id ?? ''),
    queryFn: () => apiRequest<Place[]>('GET', `/v1/places/${id}/similar`),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
