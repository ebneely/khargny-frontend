import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCategories, getCities, getLandingIndex, getLandingPage } from '@/lib/server/public-data';
import { ApiError } from '@/lib/api/client';
import { landingDescription, landingPath, landingTitle, type LandingQuery, type LandingType } from '@/lib/landing';
import { localeOf, pageMetadata } from '@/lib/seo';
import type { Locale } from '@/i18n/dictionaries';
import { LandingView } from './LandingView';
import { SiteHeader } from '@/components/ds/SiteHeader';

const TOP_CITIES = 8;

/**
 * Everything a landing route needs: the page's own facts and places, the city/category lookups
 * the place links need, and the top city pages for the footer. A page the API refuses (404:
 * fewer than 5 places, or an unknown slug) becomes a real 404 here — never a thin page.
 */
export async function loadLanding(type: LandingType, query: LandingQuery, page: number, locale: Locale) {
  const [landing, cities, categories, index] = await Promise.all([
    getLandingPage(type, { ...query, page, cursor: undefined }).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getCities().catch(() => []),
    getCategories().catch(() => []),
    getLandingIndex().catch(() => ({ data: [], meta: { count: 0, updatedAt: null } })),
  ]);
  const citySlugById = Object.fromEntries(cities.map((city) => [city.id, city.slug])) as Record<string, string>;
  const categoryNameById = Object.fromEntries(
    categories.map((category) => [category.id, locale === 'ar' ? category.nameAr : category.nameEn || category.nameAr]),
  ) as Record<string, string>;
  const topCities = index.data
    .filter((row) => row.type === 'city' && row.citySlug)
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_CITIES)
    .map((row) => {
      const city = cities.find((item) => item.slug === row.citySlug);
      return {
        href: landingPath('city', { citySlug: row.citySlug }),
        label: city ? (locale === 'ar' ? city.name : city.nameEn || city.name) : row.citySlug!,
        count: row.count,
      };
    });
  return { ...landing, citySlugById, categoryNameById, topCities, page };
}

/** Title, description, canonical and hreflang for a landing page, from its own numbers. */
export async function landingMetadata(type: LandingType, query: LandingQuery, locale: Locale): Promise<Metadata> {
  const landing = await getLandingPage(type, query).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const path = landingPath(type, {
    citySlug: landing.facts.city?.slug ?? query.citySlug,
    areaKey: landing.facts.area?.slug ?? query.areaKey,
    categorySlug: landing.facts.category?.slug ?? query.categorySlug,
  });
  const brand = locale === 'ar' ? 'خرجني' : '5argny';
  return pageMetadata({
    path,
    locale,
    title: `${landingTitle(landing.facts, locale)} | ${brand}`,
    description: landingDescription(landing.facts, locale),
  });
}

/** The page itself: shared chrome plus the server-rendered landing content. */
export async function LandingRoute({
  type,
  query,
  page,
  locale,
}: {
  type: LandingType;
  query: LandingQuery;
  page: number;
  locale: Locale;
}) {
  const { facts, places, citySlugById, categoryNameById, topCities } = await loadLanding(type, query, page, locale);
  // Past the last page is a 404, never an empty list claiming to be page 9.
  if (page > 1 && facts.count <= (page - 1) * 24) notFound();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-app)', fontFamily: 'var(--font-body)' }}>
      <SiteHeader active="explore" />
      <LandingView
        facts={facts}
        places={places}
        locale={locale}
        page={page}
        citySlugById={citySlugById}
        categoryNameById={categoryNameById}
        cityLinks={topCities}
      />
    </div>
  );
}

export const landingLocale = localeOf;
