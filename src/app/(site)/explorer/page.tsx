import { HydrationBoundary } from '@tanstack/react-query';
import ExplorerClient from './ExplorerClient';
import { getCities, publicHydration } from '@/lib/server/public-data';
import { serverCityCounts } from '@/components/ServerCityCounts';

export default async function ExplorerPage() {
  const cities = await getCities();
  return <HydrationBoundary state={publicHydration([[['cities'], cities]])}>
    <ExplorerClient cityCounts={serverCityCounts(cities)} />
  </HydrationBoundary>;
}
