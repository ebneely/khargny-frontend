import type { Metadata } from 'next';
import { LandingRoute, landingMetadata } from '@/components/landing/landing-page';
import { localeOf } from '@/lib/seo';

export const revalidate = 300;
// On-demand ISR: rendered on the first request, then kept for 5 minutes (revalidate above).
export const dynamic = 'force-static';

type Params = { lang: string; citySlug: string; areaKey: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, citySlug, areaKey } = await params;
  return landingMetadata('area', { citySlug, areaKey }, localeOf(lang));
}

export default async function AreaLandingPage({ params }: { params: Promise<Params> }) {
  const { lang, citySlug, areaKey } = await params;
  return <LandingRoute type="area" query={{ citySlug, areaKey }} page={1} locale={localeOf(lang)} />;
}
