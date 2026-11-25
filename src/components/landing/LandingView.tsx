import Image from 'next/image';
import Link from 'next/link';
import { langPrefix } from '@5argny/core/rules/locale';
import type { PlaceList } from '@/lib/api/types';
import {
  landingFaq,
  landingIntro,
  landingPath,
  landingTitle,
  type LandingFacts,
} from '@/lib/landing';
import { regionLabel } from '@/lib/egypt-regions';
import { breadcrumbSchema, graph, jsonLdScript, urlFor } from '@/lib/seo';
import { CityLandingLinks, LandingExtras } from './landing-extras';
import type { Locale } from '@/i18n/dictionaries';

/**
 * One server-rendered landing page: breadcrumb, the single H1, an intro written from the page's
 * own numbers, the place list with real links, the internal links to areas and categories, and a
 * short FAQ. No client JavaScript is needed to read any of it, so a crawler sees the whole page.
 */
export function LandingView({
  facts,
  places,
  locale,
  page,
  citySlugById,
  categoryNameById,
  cityLinks,
}: {
  facts: LandingFacts;
  places: PlaceList;
  locale: Locale;
  page: number;
  citySlugById: Record<string, string>;
  categoryNameById: Record<string, string>;
  /** The top city pages, for the footer of every landing page. */
  cityLinks: { href: string; label: string; count: number }[];
}) {
  const ar = locale === 'ar';
  const prefix = langPrefix(locale);
  const href = (path: string) => (path === '/' ? `${prefix}/` : `${prefix}${path}/`);
  // Pagination is a real path (`/explorer/cairo/page/2/`), not a query string: the page stays a
  // cached server render, and the address is crawlable and canonicalised to page 1.
  const path = landingPath(facts.type, {
    citySlug: facts.city?.slug,
    areaKey: facts.area?.slug,
    categorySlug: facts.category?.slug,
  });
  const pageLink = (number: number) =>
    number > 1 ? `${prefix}${path}/page/${number}/` : `${prefix}${path}/`;
  const title = landingTitle(facts, locale);
  const intro = landingIntro(facts, locale);
  const faq = landingFaq(facts, locale);
  const canonical = urlFor(path, locale);
  const placeName = (place: { name: string; nameEn: string | null }) =>
    ar ? place.name : place.nameEn || place.name;
  const cityName = facts.city ? (ar ? facts.city.name : facts.city.nameEn || facts.city.name) : '';
  const citySlug = facts.city?.slug ?? '';
  const categoryName = facts.category
    ? ar
      ? facts.category.name
      : facts.category.nameEn || facts.category.name
    : '';
  const areaName = facts.area ? (ar ? facts.area.name : facts.area.nameEn) : '';
  const totalPages = Math.max(1, Math.ceil((places.total ?? places.items.length) / Math.max(1, places.limit || 24)));

  const crumbs = [
    { name: ar ? 'الرئيسية' : 'Home', path: '/' },
    { name: ar ? 'استكشف' : 'Explore', path: '/explorer' },
    ...(citySlug ? [{ name: cityName, path: `/explorer/${citySlug}` }] : []),
    ...(facts.area ? [{ name: areaName, path: `/explorer/${citySlug}/area/${facts.area.slug}` }] : []),
    ...(facts.category ? [{ name: categoryName, path }] : []),
  ];

  const itemList = {
    '@type': 'ItemList',
    '@id': `${canonical}#places`,
    name: title,
    numberOfItems: places.total ?? places.items.length,
    itemListElement: places.items.map((place, index) => ({
      '@type': 'ListItem',
      position: (page - 1) * 24 + index + 1,
      url: urlFor(`/explorer/${citySlugById[place.cityId] || citySlug}/${place.slug}`, locale),
      name: placeName(place),
    })),
  };
  const faqPage = {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  const window: (number | null)[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | null)[] = [];
    let previous: number | null = null;
    for (const n of sorted) {
      if (previous !== null && n - previous > 1) out.push(null);
      out.push(n);
      previous = n;
    }
    return out;
  })();

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-16 pt-6 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            graph(breadcrumbSchema(crumbs, locale), itemList, faqPage),
          ),
        }}
      />

      <nav aria-label={ar ? 'مسار الصفحة' : 'Breadcrumb'} className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {crumbs.map((crumb, index) => (
            <li key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden className="text-border">/</span>}
              {index === crumbs.length - 1 ? (
                <span aria-current="page">{crumb.name}</span>
              ) : (
                <Link href={href(crumb.path)} className="hover:text-foreground hover:underline">
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mt-6 max-w-3xl">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <p id="landing-intro" className="mt-4 text-base leading-7 text-muted-foreground">{intro}</p>
        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">{ar ? 'الأماكن' : 'Places'}</dt>
            <dd className="text-lg font-semibold text-foreground">{facts.count}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{ar ? 'مفتوح دلوقتي' : 'Open now'}</dt>
            <dd className="text-lg font-semibold text-foreground">{facts.openNow}</dd>
          </div>
          {facts.updatedAt && (
            <div>
              <dt className="text-muted-foreground">{ar ? 'آخر تحديث' : 'Last updated'}</dt>
              <dd className="text-lg font-semibold text-foreground">
                {new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  numberingSystem: 'latn',
                }).format(new Date(facts.updatedAt))}
              </dd>
            </div>
          )}
        </dl>
      </header>

      <section aria-labelledby="places-heading" className="mt-10">
        <h2 id="places-heading" className="sr-only">
          {ar ? 'الأماكن' : 'Places'}
        </h2>
        {places.items.length ? (
          <ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {places.items.map((place) => {
              const placeCity = citySlugById[place.cityId] || citySlug;
              const meta = [
                regionLabel(place.region, locale, cityName),
                categoryNameById[place.categoryId],
              ].filter(Boolean);
              return (
                <li key={place.id}>
                  <Link
                    href={href(`/explorer/${placeCity}/${place.slug}`)}
                    className="group block focus:outline-none"
                  >
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                      {place.coverImage ? (
                        <Image
                          src={place.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
                        />
                      ) : null}
                    </span>
                    <span className="mt-3 block text-base font-medium text-foreground group-hover:underline">
                      {placeName(place)}
                    </span>
                    {meta.length > 0 && (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {meta.join(' — ')}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{ar ? 'مفيش أماكن هنا دلوقتي.' : 'No places here right now.'}</p>
        )}

        {totalPages > 1 && (
          <nav aria-label={ar ? 'صفحات القائمة' : 'List pages'} className="mt-10 flex flex-wrap items-center gap-1 text-sm">
            {page > 1 && (
              <Link href={pageLink(page - 1)} rel="prev" className="rounded-md px-3 py-2 hover:bg-muted">
                {ar ? 'السابق' : 'Previous'}
              </Link>
            )}
            {window.map((number, index) =>
              number === null ? (
                <span key={`gap-${index}`} className="px-2 text-muted-foreground" aria-hidden>
                  …
                </span>
              ) : number === page ? (
                <span key={number} aria-current="page" className="rounded-md bg-foreground px-3 py-2 font-medium text-background">
                  {number}
                </span>
              ) : (
                <Link key={number} href={pageLink(number)} className="rounded-md px-3 py-2 hover:bg-muted">
                  {number}
                </Link>
              ),
            )}
            {page < totalPages && (
              <Link href={pageLink(page + 1)} rel="next" className="rounded-md px-3 py-2 hover:bg-muted">
                {ar ? 'التالي' : 'Next'}
              </Link>
            )}
          </nav>
        )}
      </section>

      <LandingExtras facts={facts} locale={locale} />

      <CityLandingLinks links={cityLinks} locale={locale} />
    </main>
  );
}
