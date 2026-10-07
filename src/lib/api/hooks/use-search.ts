import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { hasLocalSearchFilters, loadSearchPage, searchTerm, SEARCH_PAGE_SIZE, type LocalSearchFilters } from '@/lib/place-search';
import type { Locale } from '@/i18n/dictionaries';
import type { SearchPlacesQuery } from '@/lib/api/types';

export const searchKeys = {
  places: (query: SearchPlacesQuery, locale: Locale, local: LocalSearchFilters) => ['search', locale, query.cityId, query, local] as const,
};

/** GET /v1/search/places — cached 600s server-side. */
export function useSearchPlaces(query: SearchPlacesQuery, options: { enabled?: boolean; locale?: Locale; local?: LocalSearchFilters } = {}) {
  const locale = options.locale ?? 'ar';
  const local = options.local ?? {};
  const filteredLocally = hasLocalSearchFilters(local);
  const datasetQuery = filteredLocally ? { ...query, skip: 0 } : query;
  const skip = query.skip ?? 0;
  const limit = query.limit ?? SEARCH_PAGE_SIZE;

  return useQuery({
    queryKey: searchKeys.places(datasetQuery, locale, local),
    queryFn: ({ signal }) => loadSearchPage(filteredLocally ? { ...datasetQuery, limit: Number.MAX_SAFE_INTEGER } : datasetQuery, local, (path, params) => apiRequest<unknown>('GET', path, {
      params: params as Record<string, string | number | string[] | undefined | null>,
      headers: { 'Accept-Language': locale },
      signal,
    })),
    enabled: (options.enabled ?? true) && Boolean(searchTerm(query.q ?? '')),
    select: (data) => filteredLocally ? {
      ...data,
      items: data.total === undefined ? data.items.slice(0, skip + limit) : data.items.slice(skip, skip + limit),
      skip,
      limit,
      hasMore: data.items.length > skip + limit,
    } : data,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[2] === query.cityId && previousQuery?.queryKey[1] === locale ? previous : undefined,
    staleTime: 60 * 1000,
  });
}
