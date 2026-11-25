import { HydrationBoundary } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CityClient from './CityClient';
import { getCities, getCityPage, getLandingIndex, getLandingPage, publicHydration } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { breadcrumbSchema, graph, jsonLdScript, localeOf, urlFor } from '@/lib/seo';
import type { Locale } from '@/i18n/dictionaries';
import { landingFaq, landingIntro, landingPath, landingTitle, type LandingSummary } from '@/lib/landing';
import { landingMetadata } from '@/components/landing/landing-page';
import { CityLandingLinks, LandingExtras } from '@/components/landing/landing-extras';

export const revalidate = 300;
// The page states the city's numbers and its first 24 places; filters and deeper pages are the
// client's business (and are noindex query URLs). Nothing here reads the request, so the page is
// rendered on first request and kept — the same cache the place pages get.
export const dynamic = 'force-static';

type Params = { lang: string; citySlug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, citySlug } = await params;
  return landingMetadata('city', { citySlug }, localeOf(lang));
}

export default async function CityPage({ params }: { params: Promise<Params> }) {
  const { lang, citySlug } = await params;
  const locale: Locale = localeOf(lang);
  const data = await getCityPage(citySlug, 1, '', locale).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  // The landing page's own numbers: fewer than 5 places and this is not a page (SEO-DIRECTION 4.9).
  const landing = await getLandingPage('city', { citySlug: data.city.slug }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [index, cities] = await Promise.all([
    getLandingIndex().catch(() => ({ data: [] as LandingSummary[], meta: { count: 0, updatedAt: null } })),
    getCities().catch(() => []),
  ]);
  const isAr = locale === 'ar';
  const facts = landing.facts;
  const path = landingPath('city', { citySlug: data.city.slug });
  const canonical = urlFor(path, locale);
  const cityName = isAr ? data.city.name : data.city.nameEn || data.city.name;
  const citySlugById = Object.fromEntries(cities.map((city) => [city.id, city.slug]));
  const topCities = index.data
    .filter((row) => row.type === 'city' && row.citySlug)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((row) => {
      const city = cities.find((item) => item.slug === row.citySlug);
      return {
        href: landingPath('city', { citySlug: row.citySlug }),
        label: city ? (isAr ? city.name : city.nameEn || city.name) : row.citySlug!,
        count: row.count,
      };
    });
  const faq = landingFaq(facts, locale);
  const itemList = {
    '@type': 'ItemList',
    '@id': `${canonical}#places`,
    name: landingTitle(facts, locale),
    numberOfItems: landing.places.total ?? landing.places.items.length,
    itemListElement: landing.places.items.map((place, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: urlFor(`/explorer/${citySlugById[place.cityId] || data.city.slug}/${place.slug}`, locale),
      name: isAr ? place.name : place.nameEn || place.name,
    })),
  };

  const hydratedCities = data.cities.some((city) => city.slug === data.city.slug) ? data.cities.map((city) => city.slug === data.city.slug ? data.city : city) : [...data.cities, data.city];
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
                  { name: cityName, path },
                ],
                locale,
              ),
              itemList,
              {
                '@type': 'FAQPage',
                '@id': `${canonical}#faq`,
                mainEntity: faq.map((item) => ({
                  '@type': 'Question',
                  name: item.question,
                  acceptedAnswer: { '@type': 'Answer', text: item.answer },
                })),
              },
            ),
          ),
        }}
      />
      <HydrationBoundary state={publicHydration([
        [['cities'], hydratedCities], [['categories'], data.categories], [['cities', data.city.slug], data.city],
        [data.queryKey, data.places],
      ])}>
        <CityClient
          citySlug={data.city.slug}
          initialPage={1}
          intro={landingIntro(facts, locale)}
          seoAfter={
            <>
              <LandingExtras facts={facts} locale={locale} />
              <CityLandingLinks links={topCities} locale={locale} />
            </>
          }
        />
      </HydrationBoundary>
    </>
  );
}
