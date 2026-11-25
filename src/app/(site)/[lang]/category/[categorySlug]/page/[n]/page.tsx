import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingRoute, landingMetadata } from '@/components/landing/landing-page';
import { localeOf } from '@/lib/seo';

export const revalidate = 300;
// On-demand ISR: rendered on the first request, then kept for 5 minutes (revalidate above).
export const dynamic = 'force-static';

type Params = { lang: string; categorySlug: string; n: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, categorySlug } = await params;
  return landingMetadata('category', { categorySlug }, localeOf(lang));
}

export default async function CategoryLandingListPage({ params }: { params: Promise<Params> }) {
  const { lang, categorySlug, n } = await params;
  const page = Number(n);
  if (!Number.isSafeInteger(page) || page < 2) notFound();
  return <LandingRoute type="category" query={{ categorySlug }} page={page} locale={localeOf(lang)} />;
}
