import { Suspense } from 'react';
import { ExploreFallback } from '@/components/k/explore-fallback';
import type { Metadata } from 'next';
import { localeOf, pageMetadata } from '@/lib/seo';
import { ExploreView } from '@/components/k/explore';

// Explore (spec 002 T023): the location bar, Filters, the results. Everything it shows is read from the URL.
// The language comes from the [lang] segment, so this page (and its metadata) renders once per language and is cached.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = localeOf((await params).lang);
  return locale === 'ar'
    ? pageMetadata({ path: '/explorer', locale, title: 'استكشف مصر', description: 'مطاعم وكافيهات وشواطئ وفنادق ومعالم في كل مصر، مفتوحة دلوقتي أو بالليل أو الويك إند.' })
    : pageMetadata({ path: '/explorer', locale, title: 'Explore Egypt', description: 'Restaurants, cafes, beaches, hotels and landmarks across Egypt, open now, tonight or this weekend.' });
}

export default function ExplorePage() {
  return <Suspense fallback={<ExploreFallback />}><ExploreView /></Suspense>;
}
