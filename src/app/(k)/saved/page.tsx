import { Suspense } from 'react';
import { PageFallback } from '@/components/k/PageFallback';
import type { Metadata } from 'next';
import { currentLocale, pageMetadata } from '@/lib/seo';
import { SavedView } from '@/components/k/saved';

// Saved (spec 002 T024): the places and collections this device kept. Personal, so never indexed.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return pageMetadata({ path: '/saved', locale, title: locale === 'ar' ? 'المحفوظ' : 'Saved', description: locale === 'ar' ? 'الأماكن والمجموعات اللي حفظتها.' : 'The places and collections you saved.', noindex: true });
}
export default function SavedPage() { return <Suspense fallback={<PageFallback />}><SavedView /></Suspense>; }
