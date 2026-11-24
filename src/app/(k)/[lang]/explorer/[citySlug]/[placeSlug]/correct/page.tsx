import { HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getPlacePage, publicHydration } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { CorrectionRoute } from '@/components/k/correct-route';

// Suggest a correction (spec 002): a page on desktop or when landed on; from the place on a phone it is a stacked sheet.
export const metadata = { robots: { index: false } };
export default async function CorrectPage({ params }: { params: Promise<{ citySlug: string; placeSlug: string }> }) {
  const { placeSlug } = await params;
  const data = await getPlacePage(placeSlug).catch((error: unknown) => { if (error instanceof ApiError && error.status === 404) notFound(); throw error; });
  return <HydrationBoundary state={publicHydration([[['places', 'detail', data.place.slug], data.place]])}><CorrectionRoute slug={data.place.slug} /></HydrationBoundary>;
}
