'use client';
// Explore from proto/app.js Explore(): the location bar with Filters, a title that names what and where, the count and
// the sort, then the results grid. Everything comes from the URL, so the query is kept.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { matchesWhen } from '@5argny/core/rules';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { regionLabel } from '@/lib/egypt-regions';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { Ic } from './icons';
import { Brand, Seg } from './bits';
import { INTENTS, openState } from './rules';
import { toK, type KPlace } from './data';
import { Tile, TileSkel, BadgeTags } from './place';
import { Shell, usePlaceName } from './Shell';
import { readF, useCatIds, useLocIds, useCounts, usePriceBands, useListQuery, useEarned, totalKey, type When } from './filters';
import { useAmenities } from '@/lib/api/hooks/use-taxonomy';
import { useK, reduce } from './KProvider';
import { usePosition, askPosition, nearParam } from './near';

type Sort = 'popular' | 'near' | 'open';
const PAGE = 24;
type Cursors = Record<string, string | null>; // per category ('all' without one): '' = first page, null = no more
type Page = { items: unknown[]; total: number; next: Cursors };

/**
 * The results, a page at a time: GET /v1/places with meta.nextCursor (one cursor per category of an intent), or the
 * search route by skip for ?q=, or the places that earned a badge. The first page's total is the count line, and it also
 * answers the Filters sheet's "Show N" for the same filters (no second request).
 */
function useResults(f: ReturnType<typeof readF>, q: string, badge: boolean, near: string | null, byDistance: boolean) {
  const { lang } = useK();
  const qc = useQueryClient();
  const L = useListQuery(f);
  const cats = useCatIds(f);
  const { cityId } = useLocIds();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const list = useInfiniteQuery({
    queryKey: ['explore', ...L.key, near ?? '', byDistance], enabled: !q && !badge && L.ready && !L.none, staleTime: 60_000,
    initialPageParam: Object.fromEntries(L.catIds.map((id) => [id ?? 'all', ''])) as Cursors,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const open = Object.entries(pageParam).filter(([, cur]) => cur !== null);
      const answers = await Promise.all(open.map(async ([id, cur]) => [id, await apiRequest<{ meta?: { nextCursor?: string | null } }>('GET', '/v1/places', { params: { ...L.params, categoryId: id === 'all' ? undefined : id, near: near ?? undefined, sort: byDistance ? 'distance' : undefined, cursor: cur || undefined, limit: PAGE } })] as const));
      const next: Cursors = { ...pageParam };
      for (const [id, raw] of answers) next[id] = raw.meta?.nextCursor || null;
      const pages = answers.map(([, raw]) => normalizePlaceList(raw));
      return { items: pages.flatMap((x) => x.items), total: pages.reduce((a, x) => a + (x.total ?? x.items.length), 0), next };
    },
    getNextPageParam: (last) => (Object.values(last.next).some(Boolean) ? last.next : undefined),
  });
  const search = useInfiniteQuery({
    queryKey: ['explore', 'q', q, lang, cityId ?? '', cats.map((x) => x.id).join(',')], enabled: !!q && !badge, staleTime: 60_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page & { skip: number }> => {
      const raw = normalizePlaceList(await apiRequest<unknown>('GET', '/v1/search/places', { params: { q, skip: pageParam, limit: PAGE, cityId: cityId ?? undefined, categoryIds: cats.length && (f.intent || f.cat) ? cats.map((x) => x.id).join(',') : undefined, platform: 'web', locale: lang }, headers: { 'Accept-Language': lang } }));
      return { items: raw.items, total: raw.total ?? raw.items.length, next: {}, skip: pageParam + PAGE };
    },
    getNextPageParam: (last, all) => (all.reduce((a, x) => a + x.items.length, 0) < last.total && last.items.length ? last.skip : undefined),
  });
  const earned = useEarned(badge);
  const src = badge ? null : q ? search : list;
  const first = src?.data?.pages[0];
  // the applied filters' total also answers Filters' "Show N" (same key as useResultCount), so the sheet opens with its number
  useEffect(() => { if (!q && !badge && first) qc.setQueryData(totalKey(L.key), first.total); }, [first, q, badge]); // eslint-disable-line react-hooks/exhaustive-deps
  const k = (r: unknown) => toK(r as never, { cities, categories }, lang);
  const pages = badge ? (earned ? [earned.map(k)] : []) : (src?.data?.pages ?? []).map((pg) => pg.items.map(k));
  return {
    pages: pages.map((pg) => pg.filter((p) => p.photos.length)),
    total: badge ? earned?.length ?? null : L.none && !q ? 0 : first?.total ?? null,
    loading: badge ? !earned : L.none && !q ? false : !!src?.isPending,
    more: !badge && !!src?.hasNextPage, fetchingMore: !!src?.isFetchingNextPage, loadMore: () => { if (src?.hasNextPage && !src.isFetchingNextPage) void src.fetchNextPage(); },
  };
}

export function ExploreView() {
  const { c, lang, now, loc, content, setLoc } = useK();
  // an old city page (/explorer/<city>/?area=) lands here as ?city=&area=: set the location bar once, then drop them from the address
  const { data: allCities = [] } = useCities();
  const seed = useSearchParams();
  useEffect(() => {
    const slug = seed.get('city'); if (!slug || !allCities.length) return;
    const city = allCities.find((x) => x.slug === slug); const key = seed.get('area');
    if (city) setLoc({ city: city.slug, area: key ? regionLabel(key, lang, city.nameEn || city.name) || key : null });
    const u = new URL(location.href); u.searchParams.delete('city'); u.searchParams.delete('area'); history.replaceState(history.state, '', u.pathname + u.search);
  }, [allCities.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // a sheet over Explore changes the address; the page underneath keeps the query it was showing (no refetch, no reset)
  const live = useSearchParams();
  const kept = useRef(live);
  if (!content) kept.current = live;
  const sp = kept.current;
  const f = readF(sp);
  const q = (sp.get('q') || '').trim(), badge = sp.get('badge') === '1';
  const sort = (['near', 'open'].includes(sp.get('sort') || '') ? sp.get('sort') : 'popular') as Sort;
  const where = usePlaceName();
  const pos = usePosition();
  const res0 = useResults(f, q, badge, nearParam(pos), sort === 'near' && !!pos); // list cards carry their week of hours, so Open first works on them
  // warm what the Filters sheet shows (category counts, price bands, amenities), so it opens complete
  useCounts(''); usePriceBands(); useAmenities();
  // "Nearest" is the person's own choice, so it may ask for the location then; the list then comes nearest first from the API
  useEffect(() => { if (sort === 'near' && !pos) void askPosition(); }, [sort, pos]);
  const here = pos;
  // shortcut: search results (q) carry no distanceKm (the search route takes no near=), so Nearest orders them by the cards' own coordinates
  const km = (p: KPlace) => p.distanceKm ?? (here && p.lat != null && p.lng != null ? Math.hypot((p.lat - here.lat) * 111, (p.lng - here.lng) * 111 * Math.cos((here.lat * Math.PI) / 180)) : Infinity);
  const score = { popular: (p: KPlace) => p.d30?.views ?? 0, near: (p: KPlace) => -km(p), open: (p: KPlace) => (openState(p, now, lang)?.open ? 1 : 0) }[sort];
  // the list route filters by When itself; search does not, so its pages are filtered here (and the count is what is listed)
  const fit = (pg: KPlace[]) => (q && f.when ? pg.filter((p) => matchesWhen(p.hours, f.when as When, now.date)) : pg);
  // shortcut: each page is ordered on its own and appended, so loading more never reshuffles what is on screen
  const res = res0.pages.flatMap((pg) => [...fit(pg)].sort((a, b) => Number(b.promoted) - Number(a.promoted) || score(b) - score(a))); // paid places first inside a match, looking like any other
  const total = q && f.when ? (res0.more ? null : res.length) : res0.total;
  const intent = INTENTS.find((x) => x.key === f.intent);
  const { data: categories = [] } = useCategories();
  const catLabel = f.cat ? (categories.find((x) => (x.nameEn || x.nameAr) === f.cat || x.slug === f.cat || x.id === f.cat)?.[lang === 'ar' ? 'nameAr' : 'nameEn'] || f.cat) : '';
  const head = badge ? <>{fill(c.explore.earned, { brand: '' }).trim()} <Brand /></> : catLabel || (intent ? c.intents[intent.key] : q ? `“${q}”` : c.explore.everything);
  const headText = badge ? fill(c.explore.earned, { brand: c.brand }) : String(head);
  const whenText = f.when ? c.explore.when[f.when] : '';
  const setSort = (v: Sort) => { const n = new URLSearchParams(sp); if (v === 'popular') n.delete('sort'); else n.set('sort', v); history.replaceState(null, '', `${location.pathname}${n.toString() ? '?' + n : ''}`); };
  const busy = res0.loading;
  // the next page starts loading a screen before the end of the grid
  const end = useRef<HTMLDivElement>(null);
  const loadMore = useRef(res0.loadMore); loadMore.current = res0.loadMore;
  useEffect(() => {
    const el = end.current; if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([en]) => { if (en?.isIntersecting) loadMore.current(); }, { rootMargin: '0px 0px 900px 0px' });
    io.observe(el); return () => io.disconnect();
  }, [busy]);
  const skel = (n: number) => Array.from({ length: n }, (_, i) => <TileSkel key={'s' + i} />);
  return (
    <Shell cur="explore" wide withFilters>
      <h1 className="t-display page-pad" style={{ margin: '2px 0 10px' }}>{head} <span style={{ color: 'var(--ink3)', fontWeight: 800 }}>{c.explore.in} <PlaceWord word={where} key={loc.city + '|' + loc.area} /></span></h1>
      <div className="ctl-row page-pad" style={{ justifyContent: 'space-between' }}><span className="t-small">{total == null ? <span className="count-skel" aria-hidden="true" /> : <><b style={{ color: 'var(--ink)' }}>{total}</b> {fill(c.explore.results, { n: '' }).trim()}{whenText ? ` ${whenText.toLowerCase()}` : ''}</>}</span>
        <Seg opts={[['popular', c.explore.sort.popular], ['near', c.explore.sort.near], ['open', c.explore.sort.open]] as [Sort, string][]} val={sort} onPick={setSort} /></div>
      {busy ? <div className="grid" aria-busy="true">{skel(8)}</div> : res.length ? <><div className="grid">{res.map((p) => <Tile key={p.id} p={p} extra={badge ? <span className="earned-tags"><BadgeTags p={p} /></span> : undefined} />)}{res0.fetchingMore ? skel(4) : null}</div><div ref={end} aria-hidden="true" /></>
        : <div className="group empty"><Ic n="search" /><p className="t-head">{fill(c.explore.empty, { what: headText.toLowerCase(), when: whenText.toLowerCase(), place: where }).replace(/\s+/g, ' ')}</p></div>}
    </Shell>
  );
}

/** The place name in the title flips in letter by letter when it changes (proto playWord). */
function PlaceWord({ word }: { word: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const w = ref.current; if (!w || reduce()) return;
    [...w.children].forEach((ch, n) => animate(ch, { opacity: [0, 1], transform: ['translateY(55%) rotateX(-70deg)', 'translateY(0%) rotateX(0deg)'] }, { type: 'spring', bounce: 0.25, duration: 0.5, delay: 0.08 + n * 0.028 }));
  }, []);
  return <span className="place-word" data-word={word} ref={ref}>{[...word].map((ch, i) => <i key={i}>{ch === ' ' ? ' ' : ch}</i>)}</span>;
}
