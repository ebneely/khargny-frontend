import { HydrationBoundary } from '@tanstack/react-query';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPlacePage, publicHydration } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { localeOf } from '@/lib/seo';
import { placeRedirect } from '@/lib/place-address';
import { PlaceRoot } from '@/components/k/placeview';
import { getHomeData } from '@/components/k/home-data';

// A place (spec 002 T022), landed on directly: a page on desktop; on a phone Home with the place as a sheet over it.
// Opened from inside the site on a phone, the sheet comes up over the page it came from (components/k/KProvider).
export const revalidate = 300;
export const dynamic = 'force-static';

/**
 * A place is one of thousands, so none is prerendered at build: the first request for an address renders and stores it,
 * and the backend calls POST /api/revalidate after a place changes. Returning an empty list (instead of no function at
 * all) is what marks the route as stored-and-revalidated rather than rendered per request.
 */
export function generateStaticParams() {
  return [];
}

export default async function PlaceRoute({ params }: { params: Promise<{ lang: string; citySlug: string; placeSlug: string }> }) {
  const { lang, ...requested } = await params;
  const locale = localeOf(lang);
  // The render is cached (ISR) per address, so it reads nothing from the request: the redirect below carries no query
  // string. A stale address still lands on the right page in one 308; a shared link's tracking parameters are dropped.
  // The place and the rows Home shows behind its sheet are independent reads: ask for both at once, so the render waits
  // for the slower one instead of one after the other.
  const [data, home] = await Promise.all([
    getPlacePage(requested.placeSlug).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getHomeData(locale).catch(() => ({ pool: [], trending: [], collections: [], categories: [], openByCategory: null })),
  ]);
  const target = placeRedirect({ ...requested, locale, search: '' }, { ...data.place, citySlug: data.city.slug });
  if (target) permanentRedirect(target);
  return <HydrationBoundary state={publicHydration([[['places', 'detail', data.place.slug], data.place]])}><PlaceRoot slug={data.place.slug} home={home} /></HydrationBoundary>;
}
