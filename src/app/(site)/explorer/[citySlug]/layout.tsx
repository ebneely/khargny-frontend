import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { headers } from 'next/headers';
import { cityRedirect } from '@/lib/city-address';
import { SITE_URL } from '@/lib/config';
import {
  breadcrumbSchema,
  clampDescription,
  currentLocale,
  currentPath,
  fitCityTitle,
  graph,
  jsonLdScript,
  pageMetadata,
  urlFor,
} from '@/lib/seo';

/**
 * Server wrapper for the (client) city page, which cannot export metadata itself.
 *
 * Without this every city inherited the root layout's metadata verbatim: Cairo, Alexandria
 * and Luxor all shipped the same title, the same description, and a canonical pointing at
 * the site root. Nine of the site's most searchable pages were telling Google they were
 * duplicates of the home page.
 */
import { getCity, getCityPage } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { cityPageNumber, CITY_PAGE_SIZE } from '@/lib/city-pagination';
import { hasBrowseFilters } from '@/lib/browse-address';

type Params = { citySlug: string };

type City = {
  name?: string;
  nameEn?: string | null;
  slug?: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  areaKeys?: string[] | null;
};

async function fetchCity(slug: string): Promise<City> {
  try { return await getCity(slug); } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

async function resolveCity(citySlug: string, locale: 'ar' | 'en'): Promise<City | null> {
  const city = await fetchCity(citySlug);
  const search = (await headers()).get('x-khargny-search') ?? '';
  const target = cityRedirect({ citySlug, locale, search }, city);
  if (target) permanentRedirect(target);
  return city;
}

/** How many places the city has, for a description that states a real number. */
async function fetchCount(slug: string): Promise<number | null> {
  const search = (await headers()).get('x-khargny-search') ?? '';
  return (await getCityPage(slug, cityPageNumber(new URLSearchParams(search).get('page')), new URLSearchParams(search).toString())).places.total ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { citySlug } = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';
  const requestPath = await currentPath();
  const isCityPage = requestPath.replace(/\/+$/, '').split('/').filter(Boolean).length <= 2;
  if (!isCityPage) return {};
  const city = await resolveCity(citySlug, locale);
  const path = `/explorer/${city?.slug || citySlug}`;
  const count = await fetchCount(city?.slug || citySlug);

  const name =
    (isAr ? city?.name : city?.nameEn) || city?.name || city?.nameEn || citySlug;

  // The title carries the words someone actually types: the city, what they want, and the
  // country. "Cairo" alone competes with the whole internet.
  const title = fitCityTitle(isAr
    ? `أماكن ${name} — مطاعم وكافيهات وخروجات`
    : `Things to do in ${name}`, count, locale);

  const editorial = isAr ? city?.descriptionAr : city?.descriptionEn;
  const description =
    clampDescription(editorial || '') ||
    (isAr
      ? `اكتشف أحلى الأماكن في ${name}: مطاعم وكافيهات وشواطئ وفنادق ومعالم${count ? ` — ${count} مكان مختار` : ''}. اتفرج حسب المنطقة والنوع على خرجني.`
      : `Discover the best places in ${name} — restaurants, cafes, beaches, hotels and landmarks${count ? `, ${count} curated spots` : ''}. Browse by area and category on Khargny.`);

  const search = (await headers()).get('x-khargny-search') ?? '';
  const page = hasBrowseFilters(search) ? 1 : cityPageNumber(new URLSearchParams(search).get('page'));
  const metadata = pageMetadata({
    path, locale, title, description,
    image: city?.imageUrl ? { url: city.imageUrl, alt: name } : undefined,
    noindex: !city || hasBrowseFilters(search),
  });
  if (page > 1 && metadata.alternates) {
    metadata.alternates.canonical = `${urlFor(path, locale)}?page=${page}`;
    metadata.alternates.languages = Object.fromEntries(Object.entries(metadata.alternates.languages ?? {}).map(([language, url]) => [language, `${url}?page=${page}`]));
  }
  const pages = Math.ceil((count ?? 0) / CITY_PAGE_SIZE);
  metadata.pagination = {
    previous: page > 1 ? `${urlFor(path, locale)}${page > 2 ? `?page=${page - 1}` : ''}` : null,
    next: page < pages ? `${urlFor(path, locale)}?page=${page + 1}` : null,
  };
  return metadata;
}

export default async function CityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { citySlug } = await params;
  const locale = await currentLocale();
  const isAr = locale === 'ar';

  // A place page renders inside this layout too. Only the city page itself should describe
  // itself as a collection and emit the city breadcrumb; the place page emits its own,
  // longer one, and two BreadcrumbLists on a page is worse than none.
  const path = await currentPath();
  const isCityPage = path.replace(/\/+$/, '').split('/').filter(Boolean).length <= 2;
  if (!isCityPage) return <>{children}</>;

  const city = await resolveCity(citySlug, locale);
  const currentSlug = city?.slug || citySlug;
  const name = (isAr ? city?.name : city?.nameEn) || city?.name || citySlug;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            graph(
              breadcrumbSchema(
                [
                  { name: isAr ? 'الرئيسية' : 'Home', path: '/' },
                  { name: isAr ? 'استكشف' : 'Explore', path: '/explorer' },
                  { name, path: `/explorer/${currentSlug}` },
                ],
                locale,
              ),
              {
                '@type': 'CollectionPage',
                '@id': `${urlFor(`/explorer/${currentSlug}`, locale)}#page`,
                url: urlFor(`/explorer/${currentSlug}`, locale),
                name,
                isPartOf: { '@id': `${SITE_URL}/#website` },
                about: {
                  '@type': 'City',
                  name,
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: name,
                    addressCountry: 'EG',
                  },
                },
              },
            ),
          ),
        }}
      />
      {children}
    </>
  );
}
