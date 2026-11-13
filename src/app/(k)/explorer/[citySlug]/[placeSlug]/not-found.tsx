import Link from 'next/link';
import { currentLocale, currentPath } from '@/lib/seo';

// A place that does not exist (or no longer does): say so in the 5argny look and point back to the city.
export default async function PlaceNotFound() {
  const locale = await currentLocale();
  const citySlug = (await currentPath()).split('/').filter(Boolean)[1];
  return (
    <main className="page" id="view" style={{ paddingTop: 80 }}>
      <div className="group empty"><p className="t-head">{locale === 'ar' ? 'المكان ده مش موجود' : 'This place is not here'}</p>
        <Link className="btn primary press" href={`/${locale}/explorer/${citySlug ? `${encodeURIComponent(citySlug)}/` : ''}`}>{locale === 'ar' ? 'ارجع للأماكن' : 'Back to places'}</Link></div>
    </main>
  );
}
