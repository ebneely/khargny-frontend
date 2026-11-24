import { Suspense } from 'react';
import { PageFallback } from '@/components/k/PageFallback';
import { ListingBody, MarketPage, MarketView } from '@/components/k/market';
import { SheetRoot } from '@/components/k/landing';

// A Marketplace listing (spec 002 T025): a page on desktop; on a phone, the Marketplace with the listing as a sheet over it.
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={<PageFallback />}><SheetRoot page={<MarketPage pin><ListingBody id={id} /></MarketPage>} base={<MarketView />} /></Suspense>;
}
