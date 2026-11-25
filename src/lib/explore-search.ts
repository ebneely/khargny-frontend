import type { Locale } from '@/i18n/dictionaries';

/**
 * The search page (?q=) is rendered on the server so the query's results are in the HTML on first paint
 * (SEO-DIRECTION 4.5 item 2: every ad, social post or QR can link to `…/explorer/?q=<term>`), while `/explorer/`
 * without a query stays a cached page. The client component and the server page must agree on the query key, or the
 * client would throw the server's results away and ask again: this module is the one place that key is written.
 */
export const EXPLORE_SEARCH_PAGE = 24;

export function exploreSearchKey(q: string, lang: Locale, cityId = '', categoryIds = '') {
  return ['explore', 'q', q, lang, cityId, categoryIds] as const;
}

/** The first page of a search, in the shape react-query's infinite query keeps it. */
export function exploreSearchState<T>(items: T[], total: number): { pages: { items: T[]; total: number; next: Record<string, never>; skip: number }[]; pageParams: number[] } {
  return { pages: [{ items, total, next: {}, skip: EXPLORE_SEARCH_PAGE }], pageParams: [0] };
}
