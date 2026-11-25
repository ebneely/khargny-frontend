import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingRoute, landingMetadata } from '@/components/landing/landing-page';
import { localeOf } from '@/lib/seo';

export const revalidate = 300;
// On-demand ISR: rendered on the first request, then kept for 5 minutes (revalidate above).
export const dynamic = 'force-static';

type Params = { lang: string; citySlug: string; categorySlug: string; n: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, citySlug, categorySlug } = await params;
  return landingMetadata('city-category', { citySlug, categorySlug }, localeOf(lang));
}

export default async function CityCategoryLandingListPage({ params }: { params: Promise<Params> }) {
  const { lang, citySlug, categorySlug, n } = await params;
  const page = Number(n);
  if (!Number.isSafeInteger(page) || page < 2) notFound();
  return <LandingRoute type="city-category" query={{ citySlug, categorySlug }} page={page} locale={localeOf(lang)} />;
}
