import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingRoute, landingMetadata } from '@/components/landing/landing-page';
import { localeOf } from '@/lib/seo';

export const revalidate = 300;
// On-demand ISR: rendered on the first request, then kept for 5 minutes (revalidate above).
export const dynamic = 'force-static';

type Params = { lang: string; citySlug: string; areaKey: string; n: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, citySlug, areaKey } = await params;
  return landingMetadata('area', { citySlug, areaKey }, localeOf(lang));
}

export default async function AreaLandingListPage({ params }: { params: Promise<Params> }) {
  const { lang, citySlug, areaKey, n } = await params;
  const page = Number(n);
  if (!Number.isSafeInteger(page) || page < 2) notFound();
  return <LandingRoute type="area" query={{ citySlug, areaKey }} page={page} locale={localeOf(lang)} />;
}
