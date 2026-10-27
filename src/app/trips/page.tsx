import { Suspense } from 'react';
import type { Metadata } from 'next';
import { currentLocale, pageMetadata } from '@/lib/seo';
import { TripsClient } from './TripsClient';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return locale === 'ar'
    ? pageMetadata({
        path: '/trips',
        locale,
        title: 'رحلات وفعاليات في مصر',
        description:
          'خرجني سوق مجاني للرحلات والفعاليات: دهب، سيوة، الفيوم وأكتر. احجز ببلاش والاتفاق بينك وبين المنظّم.',
      })
    : pageMetadata({
        path: '/trips',
        locale,
        title: 'Trips and events in Egypt',
        description:
          '5argny is a free marketplace for trips and events: Dahab, Siwa, Fayoum and more. Booking is free; the deal is between you and the organizer.',
      });
}

export default function TripsPage() {
  return (
    <Suspense>
      <TripsClient />
    </Suspense>
  );
}
