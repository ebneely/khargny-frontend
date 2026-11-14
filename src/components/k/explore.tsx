'use client';
// Explore from proto/app.js Explore(): the location bar with Filters, a title that names what and where, the count and
// the sort, then the results grid. Everything comes from the URL, so the query is kept.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { matchesWhen } from '@5argny/core/rules';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useSearchPlaces } from '@/lib/api/hooks/use-search';
import { Ic } from './icons';
import { Brand, Seg } from './bits';
import { INTENTS, openState } from './rules';
import { toK, type KPlace } from './data';
import { Tile, BadgeTags } from './place';
import { Shell, usePlaceName } from './Shell';
import { readF, useCatIds, useLocIds, useCounts, usePriceBands, useResultCount, type When } from './filters';
import { useAmenities } from '@/lib/api/hooks/use-taxonomy';
import { useK, reduce } from './KProvider';

type Sort = 'popular' | 'near' | 'open';
const LIMIT = 48;

function useResults(f: ReturnType<typeof readF>, q: string, badge: boolean) {
  const { lang } = useK();
  const { cityId, area } = useLocIds();
  const cats = useCatIds(f);
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const bands = [...f.filters].filter((x) => x.startsWith('band:')).map((x) => x.slice(5)).join(',');
  const amen = [...f.filters].filter((x) => !x.startsWith('band:')).join(',');
  const wantCats = !!(f.intent || f.cat);
  const list = useQuery({
    queryKey: ['explore', cats.map((x) => x.id).join(','), cityId ?? '', area ?? '', bands, amen], enabled: !q && (!wantCats || cats.length > 0), staleTime: 60_000,
    queryFn: async () => { const pages = await Promise.all((wantCats ? cats : [null]).map(async (cat) => normalizePlaceList(await apiRequest<unknown>('GET', '/v1/places', { params: { categoryId: cat?.id, cityId: cityId ?? undefined, region: area ?? undefined, priceRange: bands || undefined, amenityIds: amen || undefined, limit: LIMIT } }))));
      return { items: pages.flatMap((x) => x.items), total: pages.reduce((a, x) => a + (x.total ?? x.items.length), 0) }; },
  });
  const search = useSearchPlaces({ q, limit: LIMIT, cityId: cityId ?? undefined, categoryIds: wantCats ? cats.map((x) => x.id) : undefined }, { locale: lang, enabled: !!q });
  const raw = (q ? search.data?.items : list.data?.items) ?? [];
  let places: KPlace[] = raw.map((r) => toK(r as never, { cities, categories }, lang)).filter((p) => p.photos.length);
  if (badge) places = places.filter((p) => p.badges.length);
  // shortcut: the grid shows the first LIMIT per category (no paging yet), and the count says what is listed
  return { places, loading: q ? search.isLoading : list.isLoading };
}

export function ExploreView() {
  const { c, lang, now, loc, content } = useK();
  // a sheet over Explore changes the address; the page underneath keeps the query it was showing (no refetch, no reset)
  const live = useSearchParams();
  const kept = useRef(live);
  if (!content) kept.current = live;
  const sp = kept.current;
  const f = readF(sp);
  const q = (sp.get('q') || '').trim(), badge = sp.get('badge') === '1';
  const sort = (['near', 'open'].includes(sp.get('sort') || '') ? sp.get('sort') : 'popular') as Sort;
  const where = usePlaceName();
  const { places, loading } = useResults(f, q, badge); // list cards carry their week of hours, so When and Open first work on them
  // warm what the Filters sheet shows, so it opens complete
  useCounts(''); usePriceBands(); useAmenities(); useResultCount(f, q, badge);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => { if (sort !== 'near' || here) return; navigator.geolocation?.getCurrentPosition((p) => setHere({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}); }, [sort, here]);
  const km = (p: KPlace) => (here && p.lat != null && p.lng != null ? Math.hypot((p.lat - here.lat) * 111, (p.lng - here.lng) * 111 * Math.cos((here.lat * Math.PI) / 180)) : Infinity);
  let res = f.when ? places.filter((p) => matchesWhen(p.hours, f.when as When, now.date)) : places;
  const score = { popular: (p: KPlace) => p.d30?.views ?? 0, near: (p: KPlace) => -km(p), open: (p: KPlace) => (openState(p, now, lang)?.open ? 1 : 0) }[sort];
  res = [...res].sort((a, b) => Number(b.promoted) - Number(a.promoted) || score(b) - score(a)); // paid places first inside a match, looking like any other
  const intent = INTENTS.find((x) => x.key === f.intent);
  const { data: categories = [] } = useCategories();
  const catLabel = f.cat ? (categories.find((x) => (x.nameEn || x.nameAr) === f.cat || x.slug === f.cat)?.[lang === 'ar' ? 'nameAr' : 'nameEn'] || f.cat) : '';
  const head = badge ? <>{fill(c.explore.earned, { brand: '' }).trim()} <Brand /></> : catLabel || (intent ? c.intents[intent.key] : q ? `“${q}”` : c.explore.everything);
  const headText = badge ? fill(c.explore.earned, { brand: c.brand }) : String(head);
  const whenText = f.when ? c.explore.when[f.when] : '';
  const setSort = (v: Sort) => { const n = new URLSearchParams(sp); if (v === 'popular') n.delete('sort'); else n.set('sort', v); history.replaceState(null, '', `${location.pathname}${n.toString() ? '?' + n : ''}`); };
  const busy = loading;
  return (
    <Shell cur="explore" wide withFilters>
      <h1 className="t-display page-pad" style={{ margin: '2px 0 10px' }}>{head} <span style={{ color: 'var(--ink3)', fontWeight: 800 }}>{c.explore.in} <PlaceWord word={where} key={loc.city + '|' + loc.area} /></span></h1>
      <div className="ctl-row page-pad" style={{ justifyContent: 'space-between' }}><span className="t-small">{busy ? null : <><b style={{ color: 'var(--ink)' }}>{res.length}</b> {fill(c.explore.results, { n: '' }).trim()}{whenText ? ` ${whenText.toLowerCase()}` : ''}</>}</span>
        <Seg opts={[['popular', c.explore.sort.popular], ['near', c.explore.sort.near], ['open', c.explore.sort.open]] as [Sort, string][]} val={sort} onPick={setSort} /></div>
      {busy ? null : res.length ? <div className="grid">{res.map((p) => <Tile key={p.id} p={p} extra={badge ? <span className="earned-tags"><BadgeTags p={p} /></span> : undefined} />)}</div>
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
