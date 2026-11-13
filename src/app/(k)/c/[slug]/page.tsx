import type { Metadata } from 'next';
import { currentLocale, pageMetadata } from '@/lib/seo';
import { getHomeData } from '@/components/k/home-data';
import { HomeView } from '@/components/k/home';
import { CollectionView } from '@/components/k/collections';
import { SheetRoot } from '@/components/k/landing';

// A collection link (spec 002 T024): a page on desktop; on a phone, Home with the collection as a sheet over it.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const locale = await currentLocale();
  return pageMetadata({ path: `/c/${slug}`, locale, title: locale === 'ar' ? 'مجموعة' : 'Collection', description: locale === 'ar' ? 'مجموعة أماكن على خرجني.' : 'A collection of places on 5argny.', noindex: true });
}
export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SheetRoot page={<CollectionView slug={slug} />} base={<HomeView data={await getHomeData()} />} />;
}
