import 'server-only';
import { cache } from 'react';
import { QueryClient, dehydrate, type QueryKey } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/lib/config';
import { ApiError } from '@/lib/api/client';
import { normalizePlaceFlags } from '@/lib/api/normalize-place';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { normalizeMenu } from '@/lib/api/normalize-menu';
import { normalizeFeaturedPlaces, normalizeTopPlaces } from '@/lib/ads/placements';
import { CITY_PAGE_SIZE, cityPageNumber } from '@/lib/city-pagination';
import type { Category, CityWithAreas, Place, PlaceDetail, PlaceFilters, SearchPlacesQuery } from '@/lib/api/types';
import type { HomeSection } from '@/lib/api/hooks/use-home';
import { currentLocale } from '@/lib/seo';
import type { Locale } from '@/i18n/dictionaries';
import { browseQueries, readBrowseAddress } from '@/lib/browse-address';
import { hasLocalSearchFilters, loadSearchPage } from '@/lib/place-search';

export function markPublicError(error: unknown, locale: Locale) {
  const failure = error && typeof error === 'object' ? error : new Error('Public page data unavailable');
  return Object.assign(failure, { digest: `khargny-public-${locale}` });
}

const read = cache(async (path: string, fresh = false, locale?: Locale): Promise<unknown> => {
  try {
    if (!getApiBaseUrl({ browser: false })) throw new ApiError(503, null);
    const response = await fetch(`${getApiBaseUrl({ browser: false })}${path}`, {
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 300, tags: ['public-discovery', path.split('?')[0]] } }),
      signal: AbortSignal.timeout(10000),
      ...(locale ? { headers: { 'Accept-Language': locale } } : {}),
    });
    if (!response.ok) throw new ApiError(response.status, null);
    const json = await response.json();
    if (!json || json.success === false || !('data' in json)) throw new ApiError(502, null);
    return json.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw error;
    throw markPublicError(error, await currentLocale());
  }
});

function list<Data>(value: unknown): Data[] {
  if (Array.isArray(value)) return value;
  const data = (value as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) throw new ApiError(502, null);
  return data as Data[];
}

function placeList(value: unknown) {
  const payload = value as { items?: unknown; data?: unknown } | null;
  if (!Array.isArray(value) && !Array.isArray(payload?.items) && !Array.isArray(payload?.data)) throw new ApiError(502, null);
  return normalizePlaceList(value);
}

export const getCities = cache(async () => list<CityWithAreas>(await read('/v1/cities')));
export const getCategories = cache(async () => list<Category>(await read('/v1/categories')));
export const getCity = cache(async (slug: string) => {
  const raw = await read(`/v1/cities/${encodeURIComponent(slug)}`) as CityWithAreas & { city?: CityWithAreas };
  const city = raw?.city ?? raw;
  if (!city?.slug || !city.name) throw new ApiError(502, null);
  return city;
});
export const getPlace = cache(async (slug: string) => {
  const place = await read(`/v1/places/${encodeURIComponent(slug)}`) as PlaceDetail;
  if (!place?.slug || !place.name) throw new ApiError(502, null);
  return normalizePlaceFlags(place);
});
export const getCityCount = cache(async (slug: string) => placeList(await read(`/v1/cities/${encodeURIComponent(slug)}/places?limit=1`)));

export const getPlaceList = cache(async (cityId: string, page = 1, categoryId = '', limit = CITY_PAGE_SIZE) => {
  const params = new URLSearchParams({ cityId, skip: String((page - 1) * limit), limit: String(limit) });
  if (categoryId) params.set('categoryId', categoryId);
  return placeList(await read(`/v1/places?${params}`));
});

export const getHomeSections = cache(async () => list<HomeSection>(await read('/v1/home'))
  .map((section) => ({ ...section, places: (section.places ?? []).map(normalizePlaceFlags) })));
export const getFeatured = cache(async () => normalizeFeaturedPlaces(await read('/v1/home/featured', true)));
export const getTopPlaces = cache(async () => normalizeTopPlaces(await read('/v1/home/top-places', true)));
export const getMenu = cache(async (slug: string) => normalizeMenu(await read(`/v1/places/${encodeURIComponent(slug)}/menu`)));
export const getSimilar = cache(async (id: string) => list<Place>(await read(`/v1/places/${encodeURIComponent(id)}/similar`)).map(normalizePlaceFlags));

export async function optional<Data>(promise: Promise<Data>, fallback: Data): Promise<Data> {
  try { return await promise; } catch { return fallback; }
}

export function publicHydration(entries: [QueryKey, unknown][]) {
  const client = new QueryClient();
  for (const [queryKey, data] of entries) client.setQueryData(queryKey, data);
  return dehydrate(client);
}

export const getCatalog = cache(async () => {
  const [cities, categories] = await Promise.all([getCities(), getCategories()]);
  return { cities, categories };
});

export const getCityPage = cache(async (slug: string, page: number, search = '') => {
  const [city, catalog] = await Promise.all([getCity(slug), getCatalog()]);
  const state = readBrowseAddress(search);
  state.page = page;
  const queries = browseQueries(city.id, state, city.areaKeys);
  const locale = await currentLocale();
  const searching = Boolean(queries.search.q);
  const dataset = hasLocalSearchFilters(queries.local) ? { ...queries.search, skip: 0 } : queries.search;
  const searchQuery = hasLocalSearchFilters(queries.local) ? { ...dataset, limit: Number.MAX_SAFE_INTEGER } : dataset;
  const request = (path: string, params?: SearchPlacesQuery | PlaceFilters) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null) query.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
    return read(`${path}${query.size ? `?${query}` : ''}`, false, searching ? locale : undefined);
  };
  const places = searching
    ? await loadSearchPage(searchQuery, queries.local, request)
    : placeList(await request('/v1/places', queries.places));
  const queryKey: QueryKey = searching ? ['search', locale, city.id, dataset, queries.local] : ['places', 'list', queries.places];
  return { ...catalog, city, places, queryKey, searching };
});

export const getPlacePage = cache(async (slug: string) => {
  const [place, catalog] = await Promise.all([getPlace(slug), getCatalog()]);
  const city = catalog.cities.find((item) => item.id === place.cityId);
  if (!city) throw new ApiError(502, null);
  return { ...catalog, city, place };
});

export async function primePublicRoute(path: string, search: string) {
  const parts = path.split('/').filter(Boolean);
  try {
    if (!parts.length || (parts[0] === 'explorer' && parts.length === 1)) await getCities();
    else if (parts[0] === 'explorer' && parts.length === 2) await getCityPage(decodeURIComponent(parts[1]), cityPageNumber(new URLSearchParams(search).get('page')), search);
    else if (parts[0] === 'explorer' && parts.length === 3) await getPlacePage(decodeURIComponent(parts[2]));
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
}
