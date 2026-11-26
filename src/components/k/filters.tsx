'use client';
// Explore's filter state and the Filters sheet's staged state (proto app.js readF/refreshFilters); the sheet's own body
// and foot are filters-sheet.tsx, its own chunk. The state lives in the URL (?intent ?cat ?when ?f=amenityId,band:N ?q ?sort
// ?badge) so the query is kept on reload and Back. The query key it builds is in list-query.ts, shared with the prefetch.
import { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { langPrefix } from '@5argny/core/rules/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { animate } from 'motion';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { regionLabel } from '@/lib/egypt-regions';
import { INTENTS } from './rules';
import { catIdsOf, listQueryOf } from './list-query';
import { useK, useKS, haptic, spring } from './KProvider';
import { catTotals, catTotalsKey } from './data';

export type When = '' | 'now' | 'tonight' | 'weekend';
export type F = { intent: string; cat: string; when: When; filters: Set<string> };
export const WHENS: When[] = ['', 'now', 'tonight', 'weekend'];

export function readF(q: URLSearchParams): F {
  const when = q.get('when') as When;
  return { intent: q.get('intent') || '', cat: q.get('cat') || '', when: WHENS.includes(when) ? when : '', filters: new Set((q.get('f') || '').split(',').filter(Boolean)) };
}
export const nF = (f: F) => (f.intent || f.cat ? 1 : 0) + (f.when ? 1 : 0) + f.filters.size;
export function writeF(f: F, keep: URLSearchParams) {
  const q = new URLSearchParams();
  if (f.intent) q.set('intent', f.intent); if (f.cat) q.set('cat', f.cat); if (f.when) q.set('when', f.when); if (f.filters.size) q.set('f', [...f.filters].join(','));
  ['q', 'sort', 'badge'].forEach((k) => { const v = keep.get(k); if (v) q.set(k, v); });
  return q;
}

/** The location bar's city id and area key (the bar keeps the area's label). */
export function useLocIds() {
  const { lang } = useK(), loc = useKS((s) => s.loc);
  const { data: cities = [] } = useCities();
  const city = cities.find((x) => x.slug === loc.city || (x.nameEn || x.name) === loc.city);
  const area = city && loc.area ? (city.areaKeys ?? []).find((k) => k === loc.area || regionLabel(k, lang, city.nameEn || city.name) === loc.area) ?? null : null;
  return { cityId: city?.id ?? null, citySlug: city?.slug ?? null, area };
}

/** The category names an intent asks for (components/k/rules.ts owns the intent list). */
const intentCats = (intent: string) => (INTENTS.find((x) => x.key === intent)?.cats ?? []) as readonly string[];

export function useCatIds(f: Pick<F, 'intent' | 'cat'>) {
  const { data: categories = [] } = useCategories();
  return catIdsOf(f, categories, intentCats(f.intent));
}

/** Places per category for the location bar, all time, with a photo each (one shared query; Egypt-wide it comes with the page). */
export function useCatTotals(enabled = true) {
  const { cityId, area } = useLocIds();
  const { data: categories = [] } = useCategories();
  return useQuery({
    queryKey: catTotalsKey(cityId, area), enabled: enabled && categories.length > 0, staleTime: 5 * 60_000,
    queryFn: async () => catTotals(await Promise.all(categories.map(async (c) => [c.slug, await apiRequest<unknown>('GET', '/v1/places', { params: { categoryId: c.id, cityId: cityId ?? undefined, region: area ?? undefined, limit: 1 } }).catch(() => null)] as [string, unknown]))),
  }).data;
}

/** Places open in a When, per category slug and in total (GET /v1/places/counts, one request). */
export function useTimed(when: When) {
  const { citySlug, area } = useLocIds();
  return useQuery({
    queryKey: ['places', 'counts', when, citySlug ?? '', area ?? ''], enabled: !!when, staleTime: 60_000,
    queryFn: () => apiRequest<{ byCategory: Record<string, number>; total: number }>('GET', '/v1/places/counts', { params: { when, city: citySlug ?? undefined, area: area ?? undefined } }).catch(() => null),
  }).data;
}

/** Places per category: all-time totals, or for a When, GET /v1/places/counts. */
export function useCounts(when: When) {
  const { data: categories = [] } = useCategories();
  const timed = useTimed(when);
  const totals = useCatTotals(!when);
  const by = when ? timed?.byCategory : totals?.n;
  // a count that failed to load stays hidden, never a false 0
  return (cats: readonly string[]) => { if (!by) return null; const ns = categories.filter((c) => cats.includes(c.nameEn || '')).map((c) => by[c.slug]); return ns.some((n) => n === null) ? null : ns.reduce<number>((a, n) => a + (n ?? 0), 0); };
}

/** The price bands with western digits in both languages (the API's Arabic labels use Arabic digits). */
export function usePriceBands() {
  const { lang } = useK();
  const { data = [] } = useQuery({ queryKey: ['price-bands'], staleTime: Infinity, queryFn: () => apiRequest<{ level: number; labelEn: string }[]>('GET', '/v1/price-bands').catch(() => []) });
  return data.map((b) => ({ level: b.level, label: lang === 'ar' ? b.labelEn.replace('EGP', 'جنيه') : b.labelEn }));
}

/** The /v1/places question a filter state asks: one request per category of an intent (the route takes one categoryId). */
export function useListQuery(f: F) {
  const { cityId, area } = useLocIds();
  const { data: categories = [] } = useCategories();
  return listQueryOf(f, cityId, area, categories, intentCats(f.intent));
}
export const totalKey = (key: ReturnType<typeof useListQuery>['key']) => ['places', 'total', ...key] as const;

/** Places per area of the chosen city, in one request (GET /v1/places/counts?by=area). */
export function useAreaCounts(cityId: string | null | undefined) {
  return useQuery({
    queryKey: ['places', 'counts', 'byArea', cityId ?? ''], enabled: !!cityId, staleTime: 5 * 60_000,
    queryFn: () => apiRequest<{ byArea: { area: string; places: number }[] }>('GET', '/v1/places/counts', { params: { city: cityId!, by: 'area' } }).then((r) => Object.fromEntries(r.byArea.map((x) => [x.area, x.places])) as Record<string, number>).catch(() => null),
  }).data;
}

/** How many places the location bar alone holds: the cities already carry their counts, an area is one shared request. */
export function usePlaceCount() {
  const { data: cities = [] } = useCities();
  const { cityId, area } = useLocIds();
  const areas = useAreaCounts(area ? cityId : null);
  if (area) return areas ? areas[area] ?? 0 : null;
  const list = cityId ? cities.filter((x) => x.id === cityId) : cities;
  return list.length && list.every((x) => typeof x.visiblePlacesCount === 'number') ? list.reduce((a, x) => a + x.visiblePlacesCount!, 0) : null;
}

/** How many places a filter state finds, with the fewest requests: none for the location alone, one for a When, else one per category. */
export function useResultCount(f: F, q: string, badge: boolean) {
  const L = useListQuery(f);
  const cats = useCatIds(f);
  const plain = !f.intent && !f.cat && !f.when && !f.filters.size, whenOnly = !!f.when && !f.filters.size;
  const place = usePlaceCount();
  const timed = useTimed(whenOnly ? f.when : '');
  const list = useQuery({
    queryKey: totalKey(L.key), enabled: !q && !badge && !plain && !whenOnly && L.ready && !L.none, staleTime: 60_000,
    queryFn: async () => (await Promise.all(L.catIds.map((cat) => apiRequest<{ meta?: { total?: number } }>('GET', '/v1/places', { params: { ...L.params, categoryId: cat ?? undefined, limit: 1 } }).then((r) => r.meta?.total ?? 0)))).reduce((a, n) => a + n, 0),
  });
  if (q || badge) return null;
  if (L.none) return 0;
  if (plain) return place;
  if (whenOnly) return !timed ? null : f.intent || f.cat ? cats.reduce((a, x) => a + (timed.byCategory[x.slug] ?? 0), 0) : timed.total;
  return list.data ?? null;
}

/** Places that earned a badge (the cards carry achievement badges), for the location bar; one small request per badge kind. */
const EARNED_KEYS = ['most_viewed', 'most_saved', 'most_5argnyd'] as const;
export function useEarned(enabled = true) {
  const { cityId, area } = useLocIds();
  return useQuery({
    queryKey: ['places', 'earned', cityId ?? '', area ?? ''], enabled, staleTime: 5 * 60_000,
    queryFn: async () => {
      const lists = await Promise.all(EARNED_KEYS.map((badge) => apiRequest<unknown>('GET', '/v1/places', { params: { badge, cityId: cityId ?? undefined, region: area ?? undefined, limit: 20 } }).then((r) => normalizePlaceList(r).items).catch(() => [])));
      const seen = new Set<string>();
      return lists.flat().filter((p) => !seen.has(p.id) && seen.add(p.id));
    },
  }).data;
}

/** Explore's first page for a filter state, fetched before the tap: the same key and request as the screen's own query. */
const PAGE = 24; // shortcut: Explore's own page size (explore.tsx:30); the two move together
export function usePrefetchList() {
  const qc = useQueryClient();
  const { cityId, area } = useLocIds();
  const { data: categories = [] } = useCategories();
  return useCallback((f: F) => {
    const L = listQueryOf(f, cityId, area, categories, intentCats(f.intent));
    if (!L.ready || L.none) return;
    const queryKey = ['explore', ...L.key, '', ''] as const;
    if (qc.getQueryData(queryKey)) return; // already on the screen
    void qc.prefetchInfiniteQuery({
      queryKey, staleTime: 60_000,
      initialPageParam: Object.fromEntries(L.catIds.map((id) => [id ?? 'all', ''])) as Record<string, string | null>,
      queryFn: async ({ pageParam }) => {
        const open = Object.entries(pageParam).filter(([, cur]) => cur !== null);
        const answers = await Promise.all(open.map(async ([id, cur]) => [id, await apiRequest<{ meta?: { nextCursor?: string | null } }>('GET', '/v1/places', { params: { ...L.params, categoryId: id === 'all' ? undefined : id, cursor: cur || undefined, limit: PAGE } })] as const));
        const next: Record<string, string | null> = { ...pageParam };
        for (const [id, raw] of answers) next[id] = raw.meta?.nextCursor || null;
        const pages = answers.map(([, raw]) => normalizePlaceList(raw));
        return { items: pages.flatMap((x) => x.items), total: pages.reduce((a, x) => a + (x.total ?? x.items.length), 0), next };
      },
      getNextPageParam: (last: { next: Record<string, string | null> }) => (Object.values(last.next).some(Boolean) ? last.next : undefined),
    });
  }, [qc, cityId, area, categories]);
}

// the sheet body and foot are their own chunk: a first visit never carries them, and the idle prefetch has them ready
const FiltersBodySheet = dynamic(() => import('./filters-sheet').then((m) => m.FiltersBodySheet), { ssr: false });
const FiltersFootSheet = dynamic(() => import('./filters-sheet').then((m) => m.FiltersFootSheet), { ssr: false });

/** Filters: staged, nothing behind the sheet changes until "Show N places"; the count is live. */
export function useOpenFilters() {
  const { openSheet, closeTop, c, go, lang } = useK();
  return () => {
    const keep = new URLSearchParams(location.search);
    let staged = readF(keep);
    const listeners = new Set<() => void>();
    const set = (f: F) => { staged = f; haptic(); listeners.forEach((l) => l()); requestAnimationFrame(() => { const b = document.querySelector('.sheet [data-act="filters-apply"]'); if (b) animate(b, { transform: ['scale(.97)', 'scale(1)'] }, spring(0.3, 0.3)); }); };
    const get = () => staged, subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
    const onApply = () => { closeTop(); const q = writeF(staged, keep); go(`${langPrefix(lang)}/explorer/${q.toString() ? '?' + q : ''}`); };
    openSheet(c.filters.title, <FiltersBodySheet get={get} set={set} subscribe={subscribe} />, <FiltersFootSheet get={get} set={set} subscribe={subscribe} onApply={onApply} />);
  };
}
