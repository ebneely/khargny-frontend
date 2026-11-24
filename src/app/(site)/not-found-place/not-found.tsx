import type { Metadata } from 'next';
import { SiteHeader } from '@/components/ds/SiteHeader';
import { NotFoundState } from '@/components/explorer/NotFoundState';
import { currentLocale } from '@/lib/seo';
import { langPrefix } from '@5argny/core/rules/locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale();
  return {
    title: locale === 'ar' ? 'المكان ده مش موجود' : 'Place not found',
    robots: { index: false, follow: true },
  };
}

export default async function PlaceNotFound() {
  const locale = await currentLocale();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-app)' }}>
      <SiteHeader active="explore" />
      <NotFoundState
        backHref={`${langPrefix(locale)}/explorer/`}
        backLabel={locale === 'ar' ? 'ارجع للأماكن' : 'Back to places'}
        title={locale === 'ar' ? 'المكان ده مش موجود' : 'Place not found'}
        description={
          locale === 'ar'
            ? 'المكان ده مش متاح — يمكن اتشال، أو اللينك قديم.'
            : "This place isn't available — it may have been removed, or the link is from an older URL."
        }
      />
    </div>
  );
}
