import { Suspense } from 'react';
import { HydrationBoundary } from '@tanstack/react-query';
import { notFound, permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';
import PlaceClient from './PlaceClient';
import { getPlacePage, getMenu, getSimilar, getPlaceList, optional, publicHydration } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { currentLocale } from '@/lib/seo';
import { placeRedirect } from '@/lib/place-address';
import { PlaceMenuSection } from '@/components/explorer/PlaceMenuSection';
import { RelatedPlacesClient } from './RelatedPlacesClient';
import type { PlaceDetail, CityWithAreas } from '@/lib/api/types';
import type { Locale } from '@/i18n/dictionaries';

async function Menu({ slug }: { slug: string }) {
  const menu = await optional(getMenu(slug), null);
  return <HydrationBoundary state={publicHydration([[['places', 'menu', slug], menu]])}><PlaceMenuSection slug={slug} hasMenu /></HydrationBoundary>;
}

async function Related({ place, city, locale }: { place: PlaceDetail; city: CityWithAreas; locale: Locale }) {
  const [similar, category, others] = await Promise.all([
    optional(getSimilar(place.id), []),
    optional(getPlaceList(city.id, 1, place.categoryId, 9), { items: [], skip: 0, limit: 9 }),
    optional(getPlaceList(city.id, 1, '', 9), { items: [], skip: 0, limit: 9 }),
  ]);
  const places = [...new Map([...category.items, ...others.items].filter((item) => item.id !== place.id && item.cityId === city.id).map((item) => [item.id, item])).values()].slice(0, 8);
  const cityName = locale === 'ar' ? city.name : city.nameEn || city.name;
  return <>
    <HydrationBoundary state={publicHydration([[['places', 'similar', place.id], similar]])}><RelatedPlacesClient id={place.id} citySlug={city.slug} /></HydrationBoundary>
    {places.length > 0 && <section><h2 className="pd-section-title">{locale === 'ar' ? `أماكن أخرى في ${cityName}` : `More in ${cityName}`}</h2><ul>{places.map((item) => <li key={item.id}><a href={`/${locale}/explorer/${city.slug}/${item.slug}/`}>{locale === 'ar' ? item.name : item.nameEn || item.name}</a></li>)}</ul></section>}
  </>;
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
