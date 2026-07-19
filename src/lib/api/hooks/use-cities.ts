import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/hooks/use-places';
import type { CityWithAreas, PlaceListByCity } from '@/lib/api/types';

export const citiesKeys = {
  all: ['cities'] as const,
  detail: (slug: string) => ['cities', slug] as const,
  places: (slug: string) => ['cities', slug, 'places'] as const,
};

/** GET /v1/cities — public list, includes nested areas. */
export function useCities() {
  return useQuery({
    queryKey: citiesKeys.all,
    queryFn: () => apiRequest<CityWithAreas[]>('GET', '/v1/cities'),
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /v1/cities/:slug */
export function useCity(slug: string | null | undefined) {
  return useQuery({
    queryKey: citiesKeys.detail(slug ?? ''),
    queryFn: () => apiRequest<CityWithAreas>('GET', `/v1/cities/${slug}`),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * GET /v1/cities/:slug/places
 *
 * The backend returns the paginated envelope `{ data: Place[], meta }`, NOT
 * `{ items }`. Reading `.items` off that raw shape yields `undefined` → the city
 * cards showed "0 مكان" though the city had places. Normalize to `{ items, … }`.
 */
export function useCityPlaces(slug: string | null | undefined) {
  return useQuery({
    queryKey: citiesKeys.places(slug ?? ''),
    queryFn: async (): Promise<PlaceListByCity> =>
      normalizePlaceList(
        await apiRequest<unknown>('GET', `/v1/cities/${slug}/places`),
      ),
    enabled: Boolean(slug),
    staleTime: 60 * 1000,
  });
}
