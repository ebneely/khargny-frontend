import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import type { Place, PlaceDetail, PlaceFilters, PlaceList } from '@/lib/api/types';

export const placesKeys = {
  all: ['places'] as const,
  list: (filters?: PlaceFilters) => ['places', 'list', filters ?? {}] as const,
  detail: (slug: string) => ['places', 'detail', slug] as const,
  similar: (id: string) => ['places', 'similar', id] as const,
};

/** GET /v1/places */
export function usePlaces(filters?: PlaceFilters) {
  return useQuery({
    queryKey: placesKeys.list(filters),
    queryFn: () =>
      apiRequest<PlaceList>('GET', '/v1/places', {
        params: filters as Record<string, string | number | undefined | null>,
      }),
    staleTime: 60 * 1000,
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
    staleTime: 60 * 1000,
  });
}

/** GET /v1/places/:id/similar */
export function useSimilarPlaces(id: string | null | undefined) {
  return useQuery({
    queryKey: placesKeys.similar(id ?? ''),
    queryFn: () => apiRequest<Place[]>('GET', `/v1/places/${id}/similar`),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}
