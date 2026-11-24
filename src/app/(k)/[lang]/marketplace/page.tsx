import { Suspense } from 'react';
import { PageFallback } from '@/components/k/PageFallback';
import type { Metadata } from 'next';
import { localeOf, pageMetadata } from '@/lib/seo';
import { MarketView } from '@/components/k/market';

// The Marketplace (spec 002 T025): free listings from anyone, ID verified or not.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = localeOf((await params).lang);
  return locale === 'ar'
    ? pageMetadata({ path: '/marketplace', locale, title: 'سوق خرجني المجاني', description: 'رحلات وفعاليات من أي حد، معروضة ببلاش على خرجني. مش تحت إشراف خرجني: الاتفاق بينك وبين المنظّم.' })
    : pageMetadata({ path: '/marketplace', locale, title: '5argny free marketplace', description: 'Trips and events from anyone, listed for free on 5argny. Not supervised by 5argny: the deal is between you and the organizer.' });
}
export default function MarketplacePage() { return <Suspense fallback={<PageFallback />}><MarketView /></Suspense>; }
