import { Suspense } from 'react';
import { HydrationBoundary } from '@tanstack/react-query';
import { CountPill } from '@/components/explorer/CityGrid';
import { getCityCount, optional, publicHydration } from '@/lib/server/public-data';
import type { CityWithAreas } from '@/lib/api/types';

async function CityCount({ slug }: { slug: string }) {
  const data = await optional(getCityCount(slug), { items: [], skip: 0, limit: 1, total: 0 });
  return <HydrationBoundary state={publicHydration([[['cities', slug, 'places', 1], data]])}><CountPill slug={slug} /></HydrationBoundary>;
}

export function serverCityCounts(cities: CityWithAreas[]) {
  return Object.fromEntries(cities.map((city) => [city.slug,
    <Suspense key={city.slug} fallback={<span aria-hidden className="khg-city-count" style={{ display: 'inline-block', width: 56, height: 22, borderRadius: 999, background: 'var(--gray-100)' }} />}><CityCount slug={city.slug} /></Suspense>,
  ]));
}
