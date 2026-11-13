import { Suspense } from 'react';
import type { Metadata } from 'next';
import { currentLocale, pageMetadata } from '@/lib/seo';
import { TripsClient } from '../trips/TripsClient';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return locale === 'ar'
    ? pageMetadata({
        path: '/marketplace',
        locale,
        title: 'سوق خرجني المجاني',
        description: 'رحلات وفعاليات من أي حد، معروضة ببلاش على خرجني. مش تحت إشراف خرجني: الاتفاق بينك وبين المنظّم.',
      })
    : pageMetadata({
        path: '/marketplace',
        locale,
        title: '5argny free marketplace',
        description: 'Trips and events from anyone, listed for free on 5argny. Not supervised by 5argny: the deal is between you and the organizer.',
      });
}

export default function MarketplacePage() {
  return (
    <Suspense>
      <TripsClient section="market" />
    </Suspense>
  );
}
