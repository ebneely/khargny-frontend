import type { Metadata } from 'next';
import { currentLocale, pageMetadata } from '@/lib/seo';
import { ReportPage } from '@/components/k/settings';

// Report a problem (spec 002 T026): POST /v1/reports. A page on desktop or when landed on; a sheet from Settings on a phone.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return pageMetadata({ path: '/settings/report', locale, title: locale === 'ar' ? 'بلغ عن مشكلة' : 'Report a problem', description: locale === 'ar' ? 'قولنا إيه اللي حصل.' : 'Tell us what happened.', noindex: true });
}
export default function Report() { return <ReportPage />; }
