import { Suspense } from 'react';
import { HydrationBoundary } from '@tanstack/react-query';
import HomeClient from './_home/HomeClient';
import { HomeRailsClient } from './_home/HomeRailsClient';
import { serverCityCounts } from '@/components/ServerCityCounts';
import { getCities, getCategories, getHomeSections, getFeatured, getTopPlaces, optional, publicHydration } from '@/lib/server/public-data';

async function HomeRails() {
  const [sections, featured, top, categories] = await Promise.all([
    optional(getHomeSections(), []), optional(getFeatured(), null), optional(getTopPlaces(), null), optional(getCategories(), []),
  ]);
  return <HydrationBoundary state={publicHydration([
    [['home', 'sections'], sections], [['home', 'featured'], featured], [['home', 'top-places', null], top], [['categories'], categories],
  ])}><HomeRailsClient /></HydrationBoundary>;
}

export default async function HomePage() {
  const cities = await getCities();
  return <HydrationBoundary state={publicHydration([[['cities'], cities]])}>
    <HomeClient cityCounts={serverCityCounts(cities)} secondary={<Suspense fallback={null}><HomeRails /></Suspense>} />
  </HydrationBoundary>;
}
