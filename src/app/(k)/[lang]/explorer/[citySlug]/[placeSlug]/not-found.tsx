'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { bare, langOf, langPrefix } from '@5argny/core/rules/locale';

// A place that does not exist (or no longer does): say so in the 5argny look and point back to the city.
// Client-side on purpose: the address is the only source of the language and the city, so the 404 page needs no
// per-request header and the route above it stays cacheable.
export default function PlaceNotFound() {
  const path = bare(usePathname() || '/');
  const locale = langOf(usePathname() || '/');
  const citySlug = path.split('/').filter(Boolean)[1];
  return (
    <main className="page" id="view" style={{ paddingTop: 80 }}>
      <div className="group empty"><h1 className="t-head" style={{ margin: 0 }}>{locale === 'ar' ? 'المكان ده مش موجود' : 'This place is not here'}</h1>
        <Link className="btn primary press" href={`${langPrefix(locale)}/explorer/${citySlug ? `${encodeURIComponent(citySlug)}/` : ''}`}>{locale === 'ar' ? 'ارجع للأماكن' : 'Back to places'}</Link></div>
    </main>
  );
}
