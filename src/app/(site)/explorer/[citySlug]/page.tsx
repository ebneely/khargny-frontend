import { HydrationBoundary } from '@tanstack/react-query';
import { notFound, permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';
import CityClient from './CityClient';
import { getCityPage, publicHydration } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { CITY_PAGE_SIZE, cityPageNumber } from '@/lib/city-pagination';
import { SEARCH_PAGE_SIZE } from '@/lib/place-search';
import { cityRedirect } from '@/lib/city-address';
import { currentLocale } from '@/lib/seo';

export default async function CityPage({ params, searchParams }: {
  params: Promise<{ citySlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { citySlug } = await params;
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  const search = query.toString();
  const page = cityPageNumber(values.page);
  const data = await getCityPage(citySlug, page, search).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const locale = await currentLocale();
  const target = cityRedirect({ citySlug, locale, search: (await headers()).get('x-khargny-search') ?? '' }, data.city);
  if (target) permanentRedirect(target);
  if (page > 1 && data.places.total !== undefined && (page - 1) * (data.searching ? SEARCH_PAGE_SIZE : CITY_PAGE_SIZE) >= data.places.total) notFound();
  const cities = data.cities.some((city) => city.slug === data.city.slug) ? data.cities.map((city) => city.slug === data.city.slug ? data.city : city) : [...data.cities, data.city];
  return <HydrationBoundary state={publicHydration([
    [['cities'], cities], [['categories'], data.categories], [['cities', data.city.slug], data.city],
    [data.queryKey, data.places],
  ])}><CityClient citySlug={data.city.slug} initialPage={page} /></HydrationBoundary>;
}
