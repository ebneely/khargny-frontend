'use client';
// Explore from proto/app.js Explore(): the location bar with Filters, a title that names what and where, the count and
// the sort, then the results grid. Everything comes from the URL, so the query is kept.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { langPrefix } from '@5argny/core/rules/locale';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { matchesWhen, haversineKm } from '@5argny/core/rules';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { regionLabel } from '@/lib/egypt-regions';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { L } from './icons';
import { Brand, Btn, Seg } from './bits';
import { Failed, StateBlock, useReveal } from './states';
import { INTENTS, openState } from './rules';
import { toK, type KPlace } from './data';
import { Tile, TileSkel, BadgeTags } from './place';
import { trackSearchResults } from '@/lib/analytics/track';
import { Shell, usePlaceName } from './Shell';
import { readF, nF, useOpenFilters, useCatIds, useLocIds, useCounts, usePriceBands, useListQuery, useEarned, totalKey, type When } from './filters';
import { useAmenities } from '@/lib/api/hooks/use-taxonomy';
import { useK, useKS, reduce, haptic } from './KProvider';
import { usePosition, askPosition, askFail, nearParam, ApproxNote } from './near';
import { EXPLORE_SEARCH_PAGE, exploreSearchKey } from '@/lib/explore-search';

// The map is loaded the first time it is shown (never in a first page load): maplibre-gl rides in this chunk only.
const MapView = dynamic(() => import('./map-view').then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="map-view map-view-loading" aria-busy="true"><span className="sk" aria-hidden="true">Loading the map</span></div>,
});

type Sort = 'popular' | 'near' | 'open';
const PAGE = 24;
// an intent opens one list per category at once: the first page of each is shorter, so the screen fills on one round of
// requests instead of six full pages (issue #39). "Everything" stays a full page.
const FIRST_IN_MANY = 12;
type Cursors = Record<string, string | null>; // per category ('all' without one): '' = first page, null = no more
type Page = { items: unknown[]; total: number; next: Cursors };

/**
 * The results, a page at a time: GET /v1/places with meta.nextCursor (one cursor per category of an intent), or the
 * search route by skip for ?q=, or the places that earned a badge. The first page's total is the count line, and it also
 * answers the Filters sheet's "Show N" for the same filters (no second request).
 */
function useResults(f: ReturnType<typeof readF>, q: string, badge: boolean, near: string | null, byDistance: boolean, popular: boolean) {
  const { lang } = useK();
  const qc = useQueryClient();
  const L = useListQuery(f);
  const cats = useCatIds(f);
  const { cityId } = useLocIds();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  // Popular is the dashboard's hype order (owner 2026-11-14): the API orders the list and each card carries only its position
  const apiSort = byDistance ? 'distance' : popular ? 'hype' : undefined;
  const list = useInfiniteQuery({
    queryKey: ['explore', ...L.key, near ?? '', apiSort ?? ''], enabled: !q && !badge && L.ready && !L.none, staleTime: 60_000,
    initialPageParam: Object.fromEntries(L.catIds.map((id) => [id ?? 'all', ''])) as Cursors,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const open = Object.entries(pageParam).filter(([, cur]) => cur !== null);
      const limit = open.length > 1 ? FIRST_IN_MANY : PAGE;
      const answers = await Promise.all(open.map(async ([id, cur]) => [id, await apiRequest<{ meta?: { nextCursor?: string | null } }>('GET', '/v1/places', { params: { ...L.params, categoryId: id === 'all' ? undefined : id, near: near ?? undefined, sort: apiSort, cursor: cur || undefined, limit } })] as const));
      const next: Cursors = { ...pageParam };
      for (const [id, raw] of answers) next[id] = raw.meta?.nextCursor || null;
      const pages = answers.map(([, raw]) => normalizePlaceList(raw));
      return { items: pages.flatMap((x) => x.items), total: pages.reduce((a, x) => a + (x.total ?? x.items.length), 0), next };
    },
    getNextPageParam: (last) => (Object.values(last.next).some(Boolean) ? last.next : undefined),
  });
  const search = useInfiniteQuery({
    queryKey: exploreSearchKey(q, lang, cityId ?? '', cats.map((x) => x.id).join(',')), enabled: !!q && !badge, staleTime: 60_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page & { skip: number }> => {
      const raw = normalizePlaceList(await apiRequest<unknown>('GET', '/v1/search/places', { params: { q, skip: pageParam, limit: EXPLORE_SEARCH_PAGE, cityId: cityId ?? undefined, categoryIds: cats.length && (f.intent || f.cat) ? cats.map((x) => x.id).join(',') : undefined, platform: 'web', locale: lang }, headers: { 'Accept-Language': lang } }));
      return { items: raw.items, total: raw.total ?? raw.items.length, next: {}, skip: pageParam + EXPLORE_SEARCH_PAGE };
    },
    getNextPageParam: (last, all) => (all.reduce((a, x) => a + x.items.length, 0) < last.total && last.items.length ? last.skip : undefined),
  });
  const earned = useEarned(badge);
  const src = badge ? null : q ? search : list;
  const first = src?.data?.pages[0];
  // the applied filters' total also answers Filters' "Show N" (same key as useResultCount), so the sheet opens with its number
  useEffect(() => { if (!q && !badge && first) qc.setQueryData(totalKey(L.key), first.total); }, [first, q, badge]); // eslint-disable-line react-hooks/exhaustive-deps
  const k = useCallback((r: unknown) => toK(r as never, { cities, categories }, lang), [cities, categories, lang]);
  const dataPages = src?.data?.pages;
  // a stable list per query answer: without this, every render made new cards and a memoized Tile never matched (issue #39)
  const rawPages = useMemo(() => (badge ? (earned ? [earned.map(k)] : []) : (dataPages ?? []).map((pg) => pg.items.map(k))), [badge, earned, k, dataPages]);
  const pages = useMemo(() => rawPages.map((pg) => pg.filter((p) => p.photos.length)), [rawPages]);
  return {
    pages,
    total: badge ? earned?.length ?? null : L.none && !q ? 0 : first?.total ?? null,
    loading: badge ? !earned : L.none && !q ? false : !!src?.isPending,
    more: !badge && !!src?.hasNextPage, fetchingMore: !!src?.isFetchingNextPage, loadMore: () => { if (src?.hasNextPage && !src.isFetchingNextPage && !src.isFetchNextPageError) void src.fetchNextPage(); },
    // the first page failed: the whole list says so; a later page failed: a line under the grid asks again for that page only
    error: src?.isError && !src.isFetchNextPageError ? src.error : null, retry: () => src?.refetch(), retrying: !!src?.isRefetching,
    moreError: !!src?.isFetchNextPageError, retryMore: () => { void src?.fetchNextPage(); },
  };
}

export function ExploreView() {
  const { c, lang, now, setLoc, go, toast } = useK(), loc = useKS((s) => s.loc), content = useKS((s) => s.content);
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
  /* eslint-disable react-hooks/refs -- issue #34 deferred: the ref holds the last query on purpose, so a sheet over Explore keeps showing the page it covered; restructuring needs visual verification */
  const kept = useRef(live);
  if (!content) kept.current = live;
  const sp = kept.current;
  const f = readF(sp);
  const q = (sp.get('q') || '').trim(), badge = sp.get('badge') === '1';
  /* eslint-enable react-hooks/refs */
  // the order and the mood ride in the address with the filters (Open first is chosen inside Filters, owner 2026-11-26)
  const sort = f.sort;
  const where = usePlaceName();
  const pos = usePosition();
  const res0 = useResults(f, q, badge, nearParam(pos), sort === 'near' && !!pos, sort === 'popular'); // list cards carry their week of hours, so Open first works on them
  // warm what the Filters sheet shows (category counts, price bands, amenities), so it opens complete
  useCounts(''); usePriceBands(); useAmenities();
  // "Nearest" is the person's own choice, so it may ask for the location then; the list then comes nearest first from the API
  useEffect(() => { if (sort === 'near' && !pos) void askPosition().then((ok) => { const why = askFail(); if (!ok && why) toast(c.states.near[why]); }); }, [sort, pos]); // eslint-disable-line react-hooks/exhaustive-deps
  const here = pos;
  // one pass per answer, not per render: filtering and sorting the loaded pages is memoised, so a scroll, a hover or a
  // sheet opening no longer re-sorts every loaded page (issue #39)
  const res = useMemo(() => {
    // shortcut: search results (q) carry no distanceKm (the search route takes no near=), so Nearest orders them by the cards' own coordinates
    const km = (p: KPlace) => p.distanceKm ?? (here && p.lat != null && p.lng != null ? haversineKm(here, { lat: p.lat, lng: p.lng }) : Infinity);
    // hype position first (merged category lists keep one order); search results carry no position and keep their 30-day views
    const score = { popular: (p: KPlace) => (p.popularRank != null ? 1e9 - p.popularRank : p.d30?.views ?? 0), near: (p: KPlace) => -km(p), open: (p: KPlace) => (openState(p, now, lang)?.open ? 1 : 0) }[sort];
    // the list route filters by When itself; search does not, so its pages are filtered here (and the count is what is listed)
    const fit = (pg: KPlace[]) => (q && f.when ? pg.filter((p) => matchesWhen(p.hours, f.when as When, now.date)) : pg);
    // shortcut: each page is ordered on its own and appended, so loading more never reshuffles what is on screen
    return res0.pages.flatMap((pg) => [...fit(pg)].sort((a, b) => Number(b.promoted) - Number(a.promoted) || score(b) - score(a))); // paid places first inside a match, looking like any other
  }, [res0.pages, q, f.when, sort, here, now, lang]);
  const total = q && f.when ? (res0.more ? null : res.length) : res0.total;
  // a search answer is shown (its first page, in the order listed)
  const listed = q && !res0.loading ? res.slice(0, 20).map((p) => p.id).join() : '';
  useEffect(() => { if (listed) trackSearchResults(q, listed.split(',')); }, [q, listed]); // eslint-disable-line react-hooks/exhaustive-deps
  const reveal = useReveal(res0.loading);
  const intent = INTENTS.find((x) => x.key === f.intent);
  const { data: categories = [] } = useCategories();
  const catLabel = f.cat ? (categories.find((x) => (x.nameEn || x.nameAr) === f.cat || x.slug === f.cat || x.id === f.cat)?.[lang === 'ar' ? 'nameAr' : 'nameEn'] || f.cat) : '';
  const head = badge ? <>{fill(c.explore.earned, { brand: '' }).trim()} <Brand /></> : catLabel || (intent ? c.intents[intent.key] : q ? `“${q}”` : c.explore.everything);
  const headText = badge ? fill(c.explore.earned, { brand: c.brand }) : String(head);
  const whenText = f.when ? c.explore.when[f.when] : '';
  const setSort = (v: Sort) => { const n = new URLSearchParams(sp); if (v === 'popular') n.delete('sort'); else n.set('sort', v); history.replaceState(null, '', `${location.pathname}${n.toString() ? '?' + n : ''}`); };
  // the same list, on a map: ?view=map keeps the address (a reload, a share and Back all land on the map)
  // eslint-disable-next-line react-hooks/refs -- the kept address, as above
  const mapView = sp.get('view') === 'map';
  const setMapView = (on: boolean) => { haptic(); const n = new URLSearchParams(sp.toString()); if (on) n.set('view', 'map'); else n.delete('view'); history.replaceState(null, '', `${location.pathname}${n.toString() ? '?' + n : ''}`); };
  const openFilters = useOpenFilters();
  const nf = nF(f);
  // Reset clears the filters, the order, the word and the mood; the city and area stay in the bar
  const reset = () => { haptic(); const n = new URLSearchParams(sp.toString()); ['intent', 'cat', 'when', 'f', 'sort', 'q', 'badge', 'mood'].forEach((key) => n.delete(key)); history.replaceState(null, '', `${location.pathname}${n.toString() ? '?' + n : ''}`); };
  const busy = res0.loading;
  const filtered = !!(loc.city || f.intent || f.cat || f.when || q || badge || f.filters.size);
  // the next page starts loading a screen before the end of the grid
  const end = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/refs -- issue #34 deferred: the observer needs the newest loadMore without re-creating it; moving this needs scroll verification
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
      <div className="ctl-row page-pad" style={{ justifyContent: 'space-between' }}><span className="t-small">{total == null ? (res0.error ? null : <span className="sk" aria-hidden="true"><b>000</b> {fill(c.explore.results, { n: '' }).trim()}</span>) : <><b style={{ color: 'var(--ink)' }}>{total}</b> {fill(c.explore.results, { n: '' }).trim()}{whenText ? ` ${whenText.toLowerCase()}` : ''}</>}</span>
        {/* owner 2026-11-26: Popular · Nearest, then Filters with Reset beside it, on one row under the count */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Seg opts={[['popular', c.explore.sort.popular], ['near', c.explore.sort.near]] as [Sort, string][]} val={sort === 'open' ? 'popular' : sort} onPick={setSort} />
          <Seg<'list' | 'map'> opts={[['list', c.explore.list], ['map', c.explore.map]]} val={mapView ? 'map' : 'list'} onPick={(v) => setMapView(v === 'map')} />
          <button className={`btn secondary press ${nf ? 'on' : ''}`} data-act="filters" aria-haspopup="dialog" onClick={openFilters}><L n="sliders-horizontal" />{c.location.filters}{nf ? <em className="n-badge">{nf}</em> : null}</button>
          {nf || q ? <button className="icon-btn reset-btn press" data-act="reset-filters" aria-label={c.location.reset} onClick={reset}><L n="rotate-ccw" /></button> : null}
        </span></div>
      {sort === 'near' && pos ? <ApproxNote className="page-pad" /> : null}
      {mapView ? <MapView /> : busy ? <div className="grid" aria-busy="true">{skel(8)}</div>
        : res0.error && !res.length ? <Failed error={res0.error} retry={res0.retry} busy={res0.retrying} />
        : res.length ? <><div className={`grid ${reveal}`}>{res.map((p, i) => <Tile key={p.id} p={p} surface={q ? 'search' : 'explore'} position={i + 1} term={q || undefined} extra={badge ? <span className="earned-tags"><BadgeTags p={p} /></span> : undefined} />)}{res0.fetchingMore ? skel(4) : null}</div>
          {res0.moreError ? <div className="more-fail" role="alert">{c.states.moreFailed}<button className="btn secondary press" data-act="retry-more" onClick={res0.retryMore}><L n="rotate-ccw" />{c.states.retry}</button></div> : null}<div ref={end} aria-hidden="true" /></>
        : <StateBlock icon="search" title={fill(c.explore.empty, { what: headText.toLowerCase(), when: whenText.toLowerCase(), place: where }).replace(/\s+/g, ' ')}
          action={<Btn label={filtered ? c.states.explore.clear : c.states.explore.everything} kind="primary" act="empty-reset" onClick={() => { setLoc({ city: null, area: null }); go(`${langPrefix(lang)}/explorer/`); }} />} />}
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
