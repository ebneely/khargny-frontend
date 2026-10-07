import type { Place, PlaceDetail, SearchPlacesQuery, SearchPlacesResult } from '@/lib/api/types';
import { normalizePlaceFlags } from '@/lib/api/normalize-place';

export const SEARCH_PAGE_SIZE = 20;

export type LocalSearchFilters = {
  region?: string | null;
  priceRange?: string[];
  featured?: boolean;
  amenityIds?: string[];
  tagIds?: string[];
};

export type SearchRequest = (path: string, params?: SearchPlacesQuery) => Promise<unknown>;

export function hasLocalSearchFilters(filters: LocalSearchFilters): boolean {
  return Boolean(filters.region || filters.priceRange?.length || filters.featured || filters.amenityIds?.length || filters.tagIds?.length);
}

export function searchTerm(value: string): string {
  return Array.from(value.replace(/\s/g, '')).length >= 2 ? value.trim() : '';
}

export function searchAddress(address: string, value: string): string {
  const url = new URL(address, 'https://khargny.invalid');
  if (value) url.searchParams.set('q', value);
  else url.searchParams.delete('q');
  return `${url.pathname}${url.search}${url.hash}`;
}

export function matchReason(matches?: string[]): string {
  if (matches?.some((match) => match === 'name' || match.startsWith('name:'))) return '';
  for (const match of matches ?? []) {
    const separator = match.indexOf(':');
    if (separator < 0 || match.slice(0, separator) === 'city') continue;
    const reason = match.slice(separator + 1).trim();
    if (reason) return reason;
  }
  return '';
}

function normalize(raw: unknown) {
  const payload = (raw ?? {}) as { items?: Place[]; data?: Place[]; total?: number; meta?: { total?: number } };
  const rows = Array.isArray(raw) ? raw : payload.items ?? payload.data ?? [];
  return { items: (rows as Place[]).map(normalizePlaceFlags), total: payload.total ?? payload.meta?.total };
}

function matchesBasic(place: Place, filters: LocalSearchFilters): boolean {
  return (!filters.region || place.region === filters.region)
    && (!filters.priceRange?.length || filters.priceRange.includes(String(place.priceRange)))
    && (!filters.featured || place.featured === true);
}

async function filterItems(items: Place[], filters: LocalSearchFilters, request: SearchRequest): Promise<Place[]> {
  const basic = items.filter((place) => matchesBasic(place, filters));
  const results = await Promise.all(basic.map(async (place) => {
    let taxonomy = place as PlaceDetail;
    if ((filters.amenityIds?.length && !taxonomy.amenities) || (filters.tagIds?.length && !taxonomy.tags)) {
      taxonomy = await request(`/v1/places/${encodeURIComponent(place.slug)}`) as PlaceDetail;
    }
    const amenitiesMatch = !filters.amenityIds?.length || filters.amenityIds.some((id) => taxonomy.amenities?.some((amenity) => amenity.id === id));
    const tagsMatch = !filters.tagIds?.length || filters.tagIds.some((id) => taxonomy.tags?.some((tag) => tag.id === id));
    return amenitiesMatch && tagsMatch ? place : null;
  }));
  return results.filter((place): place is Place => place !== null);
}

async function collect(
  query: SearchPlacesQuery,
  filters: LocalSearchFilters,
  request: SearchRequest,
  excludeCity?: string,
  stopAfter?: number,
) {
  const items: Place[] = [];
  const seen = new Set<string>();
  let backendTotal: number | undefined;
  let skip = 0;
  while (true) {
    const batch = normalize(await request('/v1/search/places', { ...query, skip, limit: SEARCH_PAGE_SIZE }));
    backendTotal = batch.total;
    const fresh = batch.items.filter((place) => !seen.has(place.id));
    for (const place of fresh) seen.add(place.id);
    const scoped = fresh.filter((place) => (!query.cityId || place.cityId === query.cityId) && place.cityId !== excludeCity);
    items.push(...await filterItems(scoped, filters, request));
    skip += batch.items.length;
    if (!fresh.length || (stopAfter !== undefined && items.length >= stopAfter)
      || (backendTotal !== undefined ? skip >= backendTotal : batch.items.length < SEARCH_PAGE_SIZE)) break;
  }
  return { items, backendTotal };
}

export async function loadSearchPage(
  query: SearchPlacesQuery,
  filters: LocalSearchFilters,
  request: SearchRequest,
): Promise<SearchPlacesResult> {
  const skip = query.skip ?? 0;
  const limit = query.limit ?? SEARCH_PAGE_SIZE;
  const hasLocalFilters = hasLocalSearchFilters(filters);
  let items: Place[];
  let total: number | undefined;
  let hasMore: boolean;
  if (hasLocalFilters) {
    const all = await collect(query, filters, request);
    total = all.backendTotal === undefined ? undefined : all.items.length;
    items = total === undefined ? all.items.slice(0, skip + limit) : all.items.slice(skip, skip + limit);
    hasMore = all.items.length > skip + limit;
  } else {
    const batch = normalize(await request('/v1/search/places', { ...query, skip, limit }));
    total = batch.total;
    items = batch.items.filter((place) => !query.cityId || place.cityId === query.cityId);
    hasMore = total === undefined ? batch.items.length === limit : skip + batch.items.length < total;
    if (total === undefined && skip > 0) {
      const preceding: Place[] = [];
      for (let offset = 0; offset < skip; offset += limit) {
        const earlier = normalize(await request('/v1/search/places', { ...query, skip: offset, limit }));
        preceding.push(...earlier.items.filter((place) => !query.cityId || place.cityId === query.cityId));
      }
      items = [...preceding, ...items];
    }
  }
  let otherCities: Place[] = [];
  if (query.cityId && !items.length && !hasMore && (total === 0 || skip === 0)) {
    const other = await collect({ ...query, cityId: undefined }, filters, request, query.cityId, 6);
    otherCities = other.items.slice(0, 6);
  }
  return { items, total, skip, limit, hasMore, otherCities };
}
