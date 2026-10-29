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
        title: 'رحلات المكاتب السياحية',
        description:
          'رحلات من مكاتب سياحية موثّقة من خرجني: دهب، سيوة، الفيوم وأكتر. احجز بدري وخد ٢٥٠ جنيه كاش من المكتب.',
      })
    : pageMetadata({
        path: '/trips',
        locale,
        title: 'Trips from travel offices',
        description:
          'Trips from travel offices verified by 5argny: Dahab, Siwa, Fayoum and more. Book early and collect 250 EGP cash at the office.',
      });
}

export default function TripsPage() {
  return (
    <Suspense>
      <TripsClient />
    </Suspense>
  );
}
