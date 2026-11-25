import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { HydrationBoundary } from '@tanstack/react-query';
import { ExploreView } from '@/components/k/explore';
import { getSearchFirstPage, publicHydration } from '@/lib/server/public-data';
import { EXPLORE_SEARCH_PAGE, exploreSearchKey, exploreSearchState } from '@/lib/explore-search';
import { localeOf, pageMetadata, urlFor } from '@/lib/seo';

/**
 * The search page behind `/explorer/?q=<term>` (SEO-DIRECTION 4.5 item 2). The proxy rewrites a search URL here, so
 * the address stays a plain, shareable `/explorer/?q=` while this render asks the search API for the first page and
 * hands it to the client view already hydrated: the results are in the HTML on first paint, not after a second
 * request. It renders per request on purpose — a query page is not a page to cache — and stays out of the index.
 */
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const searchTerm = (values: Record<string, string | string[] | undefined>) => {
  const raw = values.q;
  return (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 120);
};

export async function generateMetadata({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SearchParams }): Promise<Metadata> {
  const locale = localeOf((await params).lang);
  const isAr = locale === 'ar';
  const q = searchTerm(await searchParams);
  const term = q ? `“${q}”` : isAr ? 'بحث' : 'Search';
  const base = pageMetadata({
    path: '/explorer',
    locale,
    title: isAr ? `${term} — نتائج البحث` : `${term} — search results`,
    description: isAr
      ? `أماكن خرجني اللي تطابق ${term}: مطاعم وكافيهات وشواطف وفنادق ومعالم في مصر.`
      : `5argny places that match ${term}: restaurants, cafes, beaches, hotels and landmarks in Egypt.`,
    noindex: true,
  });
  // Self-canonical without tracking parameters (the campaign keys are stripped): the query is the page.
  const canonical = q ? `${urlFor('/explorer', locale)}?q=${encodeURIComponent(q)}` : urlFor('/explorer', locale);
  return { ...base, alternates: { canonical }, robots: { index: false, follow: true } };
}

export default async function ExploreSearchPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SearchParams }) {
  const locale = localeOf((await params).lang);
  const q = searchTerm(await searchParams);
  if (!q) return <ExploreView />;

  const page = await getSearchFirstPage(q, locale, await headers(), EXPLORE_SEARCH_PAGE).catch(() => null);
  if (!page) return <ExploreView />;

  const state = publicHydration([[exploreSearchKey(q, locale), exploreSearchState(page.items, page.total)]]);
  return <HydrationBoundary state={state}><ExploreView /></HydrationBoundary>;
}
