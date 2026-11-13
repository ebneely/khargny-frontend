import { HydrationBoundary } from '@tanstack/react-query';
import { notFound, permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getPlacePage, publicHydration } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { currentLocale } from '@/lib/seo';
import { placeRedirect } from '@/lib/place-address';
import { PlaceRoot } from '@/components/k/placeview';
import { getHomeData } from '@/components/k/home-data';

// A place (spec 002 T022), landed on directly: a page on desktop; on a phone Home with the place as a sheet over it.
// Opened from inside the site on a phone, the sheet comes up over the page it came from (components/k/KProvider).
export default async function PlaceRoute({ params }: { params: Promise<{ citySlug: string; placeSlug: string }> }) {
  const requested = await params;
  const data = await getPlacePage(requested.placeSlug).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const locale = await currentLocale();
  const target = placeRedirect({ ...requested, locale, search: (await headers()).get('x-khargny-search') ?? '' }, { ...data.place, citySlug: data.city.slug });
  if (target) permanentRedirect(target);
  return <HydrationBoundary state={publicHydration([[['places', 'detail', data.place.slug], data.place]])}><PlaceRoot slug={data.place.slug} home={await getHomeData()} /></HydrationBoundary>;
}
