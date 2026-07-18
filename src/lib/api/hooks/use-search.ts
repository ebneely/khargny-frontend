import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/hooks/use-places';
import type { SearchPlacesQuery, SearchPlacesResult } from '@/lib/api/types';

export const searchKeys = {
  places: (query: SearchPlacesQuery) => ['search', 'places', query] as const,
};

/** GET /v1/search/places — cached 600s server-side. */
export function useSearchPlaces(query: SearchPlacesQuery) {
  const hasQuery = Boolean(query.q || query.categoryIds?.length || (query.lat && query.lng));

  return useQuery({
    queryKey: searchKeys.places(query),
    // Backend returns the paginated { data, meta } envelope; normalize to
    // { items } which the explorer/search UI consumes.
    queryFn: async () =>
      normalizePlaceList(
        await apiRequest<unknown>('GET', '/v1/search/places', {
          params: query as Record<string, string | number | string[] | undefined | null>,
        }),
      ) as unknown as SearchPlacesResult,
    enabled: hasQuery,
    staleTime: 60 * 1000,
  });
}
