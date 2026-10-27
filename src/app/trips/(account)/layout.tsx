import type { Metadata } from 'next';
import { currentLocale } from '@/lib/seo';

/** Sign-in, My trips, My cash and the QR are one person's screens: never indexed. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    title: locale === 'ar' ? 'حسابي في الرحلات' : 'My trips account',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

export default function TripsAccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
