import type { ActiveFilters } from '@/components/explorer/FilterPanel';
import type { PlaceFilters, SearchPlacesQuery } from '@/lib/api/types';
import { cityPageNumber, CITY_PAGE_SIZE } from '@/lib/city-pagination';
import { searchTerm, SEARCH_PAGE_SIZE } from '@/lib/place-search';

export type BrowseState = { area: string | null; category: string | null; filters: ActiveFilters; q: string; page: number };

const filterKeys = ['area', 'region', 'category', 'amenities', 'price', 'featured', 'tags', 'q'];
const values = (value: string | null) => [...new Set((value ?? '').split(',').map(part => part.trim()).filter(Boolean))];

export function normalizeBrowseFilters(filters: ActiveFilters): ActiveFilters {
  return {
    ...(filters.priceRange?.length ? { priceRange: filters.priceRange } : {}),
    ...(filters.featured ? { featured: true } : {}),
    ...(filters.amenityIds?.length ? { amenityIds: filters.amenityIds } : {}),
    ...(filters.tagIds?.length ? { tagIds: filters.tagIds } : {}),
  };
}

export function readBrowseAddress(search: string): BrowseState {
  const params = new URLSearchParams(search);
  const priceRange = values(params.get('price')).filter(value => /^[1-4]$/.test(value)) as ActiveFilters['priceRange'];
  const amenityIds = values(params.get('amenities'));
  const tagIds = values(params.get('tags'));
  return {
    area: params.get('area') || params.get('region') || null,
    category: params.get('category') || null,
    filters: normalizeBrowseFilters({ priceRange, featured: ['1', 'true'].includes(params.get('featured') ?? ''), amenityIds, tagIds }),
    q: params.get('q') ?? '',
    page: cityPageNumber(params.get('page')),
  };
}

export function hasBrowseFilters(search: string): boolean {
  const params = new URLSearchParams(search);
  return filterKeys.some(key => params.has(key));
}

export function writeBrowseAddress(address: string, state: BrowseState): string {
  const url = new URL(address, 'https://khargny.invalid');
  for (const key of [...filterKeys, 'page']) url.searchParams.delete(key);
  const fields: Record<string, string | undefined | null> = {
    area: state.area, category: state.category, amenities: state.filters.amenityIds?.join(','),
    price: state.filters.priceRange?.join(','), featured: state.filters.featured ? '1' : null,
    tags: state.filters.tagIds?.join(','), q: state.q,
    page: state.page > 1 ? String(state.page) : null,
  };
  for (const [key, value] of Object.entries(fields)) if (value) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function browseQueries(cityId: string, state: BrowseState, areaKeys?: string[] | null) {
  const region = state.area && areaKeys?.includes(state.area) ? state.area : null;
  const filters = state.filters;
  const places: PlaceFilters = {
    cityId, categoryId: state.category || undefined, region: region || undefined,
    priceRange: filters.priceRange?.length ? filters.priceRange.join(',') : undefined,
    featured: filters.featured || undefined, amenityIds: filters.amenityIds?.length ? filters.amenityIds.join(',') : undefined,
    tagIds: filters.tagIds?.length ? filters.tagIds.join(',') : undefined,
    skip: (state.page - 1) * CITY_PAGE_SIZE, limit: CITY_PAGE_SIZE,
  };
  const search: SearchPlacesQuery = {
    q: searchTerm(state.q) || undefined, cityId, categoryIds: state.category ? [state.category] : undefined,
    skip: (state.page - 1) * SEARCH_PAGE_SIZE, limit: SEARCH_PAGE_SIZE,
  };
  return { places, search, local: { ...filters, region } };
}
