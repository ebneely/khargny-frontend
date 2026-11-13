import { SiteHeader } from '@/components/ds/SiteHeader';
import { NotFoundState } from '@/components/explorer/NotFoundState';
import { currentLocale, currentPath } from '@/lib/seo';

export default async function PlaceNotFound() {
  const locale = await currentLocale();
  const citySlug = (await currentPath()).split('/').filter(Boolean)[1];
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-app)' }}>
      <SiteHeader active="explore" />
      <NotFoundState backHref={`/${locale}/explorer/${citySlug ? `${encodeURIComponent(citySlug)}/` : ''}`} backLabel={locale === 'ar' ? 'ارجع للأماكن' : 'Back to places'} />
    </div>
  );
}
