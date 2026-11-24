import { Suspense } from 'react';
import { PageFallback } from '@/components/k/PageFallback';
import { HostBody, MarketPage, MarketView } from '@/components/k/market';
import { SheetRoot } from '@/components/k/landing';

// A host's public profile (spec 002 T025): their trips and the reviews of people who went.
export default async function HostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={<PageFallback />}><SheetRoot page={<MarketPage><HostBody id={id} /></MarketPage>} base={<MarketView />} /></Suspense>;
}
