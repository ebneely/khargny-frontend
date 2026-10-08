import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceFlags } from '@/lib/api/normalize-place';
import type { Place, PlaceDetail, PlaceFilters } from '@/lib/api/types';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
export { normalizePlaceList } from '@/lib/api/normalize-place-list';

export const placesKeys = {
  all: ['places'] as const,
  list: (filters?: PlaceFilters) => ['places', 'list', filters ?? {}] as const,
  detail: (slug: string) => ['places', 'detail', slug] as const,
  similar: (id: string) => ['places', 'similar', id] as const,
};

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
    queryFn: async () => normalizePlaceFlags(await apiRequest<PlaceDetail>('GET', `/v1/places/${slug}`)),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /v1/places/:id/similar */
export function useSimilarPlaces(id: string | null | undefined) {
  return useQuery({
    queryKey: placesKeys.similar(id ?? ''),
    queryFn: async () => (await apiRequest<Place[]>('GET', `/v1/places/${id}/similar`)).map(normalizePlaceFlags),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
