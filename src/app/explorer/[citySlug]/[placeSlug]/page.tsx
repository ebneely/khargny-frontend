import { Suspense } from 'react';
import { HydrationBoundary } from '@tanstack/react-query';
import { notFound, permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';
import PlaceClient from './PlaceClient';
import { getPlacePage, getMenu, getPlaceList, optional, publicHydration } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { currentLocale } from '@/lib/seo';
import { placeRedirect } from '@/lib/place-address';
import { PlaceMenuSection } from '@/components/explorer/PlaceMenuSection';
import { SimilarPlaces } from '@/components/explorer/SimilarPlaces';
import type { PlaceDetail, CityWithAreas } from '@/lib/api/types';
import type { Locale } from '@/i18n/dictionaries';

async function Menu({ slug }: { slug: string }) {
  const menu = await optional(getMenu(slug), null);
  return <HydrationBoundary state={publicHydration([[['places', 'menu', slug], menu]])}><PlaceMenuSection slug={slug} hasMenu /></HydrationBoundary>;
}

async function Related({ place, city, locale }: { place: PlaceDetail; city: CityWithAreas; locale: Locale }) {
  const [category, others] = await Promise.all([
    optional(getPlaceList(city.id, 1, place.categoryId, 9), { items: [], skip: 0, limit: 9 }),
    optional(getPlaceList(city.id, 1, '', 9), { items: [], skip: 0, limit: 9 }),
  ]);
  // Same category first, then the rest of the city; never the place itself, never one twice.
  const places = [...new Map([...category.items, ...others.items].filter((item) => item.id !== place.id && item.cityId === city.id).map((item) => [item.id, item])).values()].slice(0, 8);
  const cityName = locale === 'ar' ? city.name : city.nameEn || city.name;
  // One rail of real cards. It used to be two blocks: "Similar places" from an endpoint that
  // carries no photo (so every card was an empty box), and a bare list of the same links.
  return places.length > 0
    ? <SimilarPlaces places={places} citySlug={city.slug} title={locale === 'ar' ? `أماكن تانية في ${cityName}` : `More in ${cityName}`} />
    : null;
}

export default async function PlacePage({ params }: { params: Promise<{ citySlug: string; placeSlug: string }> }) {
  const requested = await params;
  const data = await getPlacePage(requested.placeSlug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const locale = await currentLocale();
  const target = placeRedirect({ ...requested, locale, search: (await headers()).get('x-khargny-search') ?? '' }, { ...data.place, citySlug: data.city.slug });
  if (target) permanentRedirect(target);
  return <HydrationBoundary state={publicHydration([
    [['cities'], data.cities], [['categories'], data.categories], [['places', 'detail', data.place.slug], data.place],
  ])}><PlaceClient citySlug={data.city.slug} placeSlug={data.place.slug}
    menu={data.place.hasMenu ? <Suspense fallback={null}><Menu slug={data.place.slug} /></Suspense> : null}
    related={<Suspense fallback={null}><Related place={data.place} city={data.city} locale={locale} /></Suspense>}
  /></HydrationBoundary>;
}
