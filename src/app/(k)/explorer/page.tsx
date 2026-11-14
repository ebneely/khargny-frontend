import { Suspense } from 'react';
import { PageFallback } from '@/components/k/PageFallback';
import type { Metadata } from 'next';
import { currentLocale, pageMetadata } from '@/lib/seo';
import { ExploreView } from '@/components/k/explore';

// Explore (spec 002 T023): the location bar, Filters, the results. Everything it shows is read from the URL.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return locale === 'ar'
    ? pageMetadata({ path: '/explorer', locale, title: 'استكشف مصر', description: 'مطاعم وكافيهات وشواطئ وفنادق ومعالم في كل مصر، مفتوحة دلوقتي أو بالليل أو الويك إند.' })
    : pageMetadata({ path: '/explorer', locale, title: 'Explore Egypt', description: 'Restaurants, cafes, beaches, hotels and landmarks across Egypt, open now, tonight or this weekend.' });
}

export default function ExplorePage() {
  return <Suspense fallback={<PageFallback />}><ExploreView /></Suspense>;
}
