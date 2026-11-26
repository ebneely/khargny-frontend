'use client';
// Explore's filter state and the Filters sheet (proto app.js readF/FiltersBody/FiltersFoot/refreshFilters).
// The state lives in the URL (?intent ?cat ?when ?f=amenityId,band:N ?q ?sort ?badge) so the query is kept on reload and Back.
import { useRef, useState } from 'react';
import { langPrefix } from '@5argny/core/rules/locale';
import { useQuery } from '@tanstack/react-query';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { amenityIcons, amenityIconFallback, mustHaveAmenities } from '@5argny/core/icons';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useAmenities } from '@/lib/api/hooks/use-taxonomy';
import { regionLabel } from '@/lib/egypt-regions';
import { L, Ic } from './icons';
import { catIcon } from './place';
import { searchNormalize } from '@5argny/core/rules';
import { Btn, Seg } from './bits';
import { INTENTS } from './rules';
import { useK, useKS, haptic, spring } from './KProvider';
import { catTotals, catTotalsKey } from './data';

export type When = '' | 'now' | 'tonight' | 'weekend';
/** The list order. Popular and Nearest are on the Explore row; Open first lives inside Filters (owner 2026-11-26). */
export type Sort = 'popular' | 'near' | 'open';
export const SORTS: Sort[] = ['popular', 'near', 'open'];
export type F = { intent: string; cat: string; when: When; filters: Set<string>; sort: Sort };
export const WHENS: When[] = ['', 'now', 'tonight', 'weekend'];

export function readF(q: URLSearchParams): F {
  const when = q.get('when') as When, sort = q.get('sort') as Sort;
  return { intent: q.get('intent') || '', cat: q.get('cat') || '', when: WHENS.includes(when) ? when : '', filters: new Set((q.get('f') || '').split(',').filter(Boolean)), sort: SORTS.includes(sort) ? sort : 'popular' };
}
/** The Filters badge counts only what lives inside the sheet (owner 2026-11-26, round 2): the category is the Mood pill's, never counted here. */
export const nF = (f: F) => (f.when ? 1 : 0) + f.filters.size + (f.sort !== 'popular' ? 1 : 0);
export function writeF(f: F, keep: URLSearchParams) {
  const q = new URLSearchParams();
  if (f.intent) q.set('intent', f.intent); if (f.cat) q.set('cat', f.cat); if (f.when) q.set('when', f.when); if (f.filters.size) q.set('f', [...f.filters].join(','));
  if (f.sort !== 'popular') q.set('sort', f.sort);
  ['q', 'badge'].forEach((k) => { const v = keep.get(k); if (v) q.set(k, v); });
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

/** The category ids a filter state names: one category, or every category of an intent. */
export function useCatIds(f: Pick<F, 'intent' | 'cat'>) {
  const { data: categories = [] } = useCategories();
  const intent = INTENTS.find((x) => x.key === f.intent);
  return categories.filter((c) => (f.cat ? (c.nameEn || c.nameAr) === f.cat || c.slug === f.cat || c.id === f.cat : intent ? (intent.cats as readonly string[]).includes(c.nameEn || '') : false));
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

/** Every category, stacked over Filters: counts for the chosen When (grey dot at 0), a search box when the list is long. */
function AllCats({ when, cur, onPick }: { when: When; cur: string; onPick: (cat: string) => void }) {
  const { c, lang } = useK();
  const { data: categories = [] } = useCategories();
  const count = useCounts(when);
  const [q, setQ] = useState('');
  const n = searchNormalize(q);
  const rows = categories.map((x) => ({ x, key: x.nameEn || x.nameAr, label: (lang === 'ar' ? x.nameAr : x.nameEn || x.nameAr) || x.slug, n: count([x.nameEn || '']) }))
    .filter((r) => !n || searchNormalize(`${r.x.nameEn ?? ''} ${r.x.nameAr ?? ''}`).includes(n));
  return <>
    {categories.length > 8 ? <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--card)', paddingBottom: 8 }}><label className="search"><Ic n="search" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.filters.findCat} aria-label={c.filters.findCat} autoComplete="off" enterKeyHint="search" /></label></div> : null}
    {rows.map((r) => <button key={r.x.id} className="option press" role="radio" aria-checked={cur === r.key} data-act="f-cat" onClick={() => onPick(r.key)}><L n={catIcon(r.x.nameEn || '')} /><span className="grow">{r.label}</span>{r.n != null ? <em className="sg-n"><i className={`live ${r.n ? '' : 'off'}`} />{r.n}</em> : null}<Ic n="check" cls="check" /></button>)}
    {rows.length ? null : <div className="empty" style={{ padding: 18 }}><L n="search-x" /><p className="t-head">{fill(c.filters.noCat, { q: q.trim() })}</p></div>}
  </>;
}

/**
 * The category picker the Mood pill opens (owner 2026-11-26, round 2): our own default category names exactly as they
 * are — an intent or a single category — with "All categories" opening the full list stacked over this sheet. It only
 * reports the choice; the caller applies it to the address (the same ?intent / ?cat Filters writes).
 */
export function CategoryPicker({ intent, cat, onPick }: { intent: string; cat: string; onPick: (next: { intent: string; cat: string }) => void }) {
  const { c, lang, openSheet, closeTop } = useK();
  const { data: categories = [] } = useCategories();
  const count = useCounts('');
  const picked = cat ? categories.find((x) => (x.nameEn || x.nameAr) === cat || x.slug === cat || x.id === cat) : null;
  const chip = (key: string, on: boolean, label: string, icon: string | null, n: number | null | undefined, onClick: () => void) =>
    <button key={key} className="chip press" aria-pressed={on} data-act="pick-mood" onClick={onClick}>{icon ? <L n={icon} /> : null}{label}{n != null ? <em><i className={`live ${n ? '' : 'off'}`} />{n}</em> : null}</button>;
  return <div className="amen">
    {INTENTS.map((x) => chip(x.key, intent === x.key, c.intents[x.key], x.icon, count(x.cats), () => onPick({ intent: intent === x.key ? '' : x.key, cat: '' })))}
    {picked ? chip('cat', true, (lang === 'ar' ? picked.nameAr : picked.nameEn || picked.nameAr) || picked.slug, catIcon(picked.nameEn || ''), count([picked.nameEn || '']), () => onPick({ intent: '', cat: '' })) : null}
    <button className="chip press" data-act="all-cats" onClick={() => openSheet(c.filters.allCats, <AllCats when="" cur={cat} onPick={(next) => { onPick({ intent: '', cat: next }); closeTop(); }} />)}><L n="layout-grid" />{c.filters.seeAllCats}<L n="chevron-right" /></button>
  </div>;
}

function FiltersBody({ f, onChange }: { f: F; onChange: (f: F) => void }) {
  const { c, lang } = useK();
  const bands = usePriceBands();
  const { data: amenities = [] } = useAmenities();
  const must = mustHaveAmenities.map((n) => amenities.find((a) => a.nameEn === n)).filter(Boolean) as typeof amenities;
  const toggle = (v: string) => { const s = new Set(f.filters); if (s.has(v)) s.delete(v); else s.add(v); onChange({ ...f, filters: s }); };
  const chip = (key: string, on: boolean, label: string, icon: string | null, n: number | null | undefined, onClick: () => void) =>
    <button key={key} className="chip press" aria-pressed={on} onClick={onClick}>{icon ? <L n={icon} /> : null}{label}{n != null ? <em><i className={`live ${n ? '' : 'off'}`} />{n}</em> : null}</button>;
  return <>
    <h3 className="group-title"><L n="clock" /> {c.filters.when}</h3>
    <div style={{ marginBottom: 16 }}><Seg opts={WHENS.map((w) => [w, c.explore.when[w || 'any']] as [When, string])} val={f.when} onPick={(w) => onChange({ ...f, when: w })} /></div>
    {/* the category is the Mood pill's own dropdown now (owner 2026-11-26, round 2): Filters holds no Category section */}
    {bands.length ? <><h3 className="group-title"><L n="banknote" /> {c.filters.price}</h3>
      <div className="amen" style={{ marginBottom: 16 }}>{bands.map((b) => chip('b' + b.level, f.filters.has('band:' + b.level), b.label, null, null, () => toggle('band:' + b.level)))}</div></> : null}
    {must.length ? <><h3 className="group-title"><L n="list-checks" /> {c.filters.mustHave}</h3>
      <div className="amen" style={{ marginBottom: 16 }}>{must.map((a) => chip(a.id, f.filters.has(a.id), (lang === 'ar' ? a.name : a.nameEn) || a.name, amenityIcons[a.nameEn || ''] || amenityIconFallback, null, () => toggle(a.id)))}</div></> : null}
    {/* Open first lives inside Filters (owner 2026-11-26): the Explore row offers Popular and Nearest only */}
    <h3 className="group-title"><L n="arrow-down-wide-narrow" /> {c.filters.sort}</h3>
    <div style={{ marginBottom: 8 }}><Seg opts={[['popular', c.explore.sort.popular], ['near', c.explore.sort.near], ['open', c.explore.sort.open]] as [Sort, string][]} val={f.sort} onPick={(v) => onChange({ ...f, sort: v })} /></div>
  </>;
}

/** The /v1/places question a filter state asks: one request per category of an intent (the route takes one categoryId). */
export function useListQuery(f: F) {
  const { cityId, area } = useLocIds();
  const cats = useCatIds(f);
  const { data: categories = [] } = useCategories();
  const bands = [...f.filters].filter((x) => x.startsWith('band:')).map((x) => x.slice(5)).join(',');
  const amen = [...f.filters].filter((x) => !x.startsWith('band:')).join(',');
  const wantCats = !!(f.intent || f.cat);
  return {
    // categories still loading: wait, never the whole of Egypt by mistake; a category name that matches none finds nothing
    ready: !wantCats || cats.length > 0, none: wantCats && categories.length > 0 && !cats.length,
    catIds: wantCats ? cats.map((x) => x.id) : [null],
    params: { cityId: cityId ?? undefined, region: area ?? undefined, priceRange: bands || undefined, amenityIds: amen || undefined, when: f.when || undefined },
    key: [cats.map((x) => x.id).join(','), cityId ?? '', area ?? '', bands, amen, f.when] as const,
  };
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

function FiltersFoot({ get, onApply, onClear }: { get: () => F; onApply: () => void; onClear: () => void }) {
  const { c } = useK();
  const f = get();
  const n = useResultCount(f, '', false);
  return <><Btn label={c.filters.clear} act="filters-clear" onClick={onClear} /><Btn label={n == null ? c.filters.showPlaces : fill(c.filters.show, { n })} kind="primary" act="filters-apply" wide onClick={onApply} /></>;
}

/** Filters: staged, nothing behind the sheet changes until "Show N places"; the count is live. */
export function useOpenFilters() {
  const { openSheet, closeTop, c, go, lang } = useK();
  return () => {
    const keep = new URLSearchParams(location.search);
    let staged = readF(keep);
    const listeners = new Set<() => void>();
    const set = (f: F) => { staged = f; haptic(); listeners.forEach((l) => l()); requestAnimationFrame(() => { const b = document.querySelector('.sheet [data-act="filters-apply"]'); if (b) animate(b, { transform: ['scale(.97)', 'scale(1)'] }, spring(0.3, 0.3)); }); };
    const Live = ({ part }: { part: 'body' | 'foot' }) => {
      const [, tick] = useState(0);
      const sub = useRef(false); if (!sub.current) { sub.current = true; listeners.add(() => tick((n) => n + 1)); }
      return part === 'body' ? <FiltersBody f={staged} onChange={set} />
        : <FiltersFoot get={() => staged} onClear={() => set({ intent: '', cat: '', when: '', filters: new Set(), sort: 'popular' })} onApply={() => { closeTop(); const q = writeF(staged, keep); go(`${langPrefix(lang)}/explorer/${q.toString() ? '?' + q : ''}`); }} />;
    };
    openSheet(c.filters.title, <Live part="body" />, <Live part="foot" />);
  };
}
