'use client';
// Explore's filter state and the Filters sheet (proto app.js readF/FiltersBody/FiltersFoot/refreshFilters).
// The state lives in the URL (?intent ?cat ?when ?f=amenityId,band:N ?q ?sort ?badge) so the query is kept on reload and Back.
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { amenityIcons, amenityIconFallback, mustHaveAmenities } from '@5argny/core/icons';
import { apiRequest } from '@/lib/api/client';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useAmenities } from '@/lib/api/hooks/use-taxonomy';
import { regionLabel } from '@/lib/egypt-regions';
import { L } from './icons';
import { Btn, Seg } from './bits';
import { INTENTS } from './rules';
import { useK, haptic, spring } from './KProvider';

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
  const { loc, lang } = useK();
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

/** Places per category: totals (GET /v1/places meta.total) or, for a When, GET /v1/places/counts. */
export function useCounts(when: When) {
  const { cityId, citySlug, area } = useLocIds();
  const { data: categories = [] } = useCategories();
  const timed = useQuery({
    queryKey: ['places', 'counts', when, citySlug ?? '', area ?? ''], enabled: !!when, staleTime: 60_000,
    queryFn: () => apiRequest<{ byCategory: Record<string, number> }>('GET', '/v1/places/counts', { params: { when, city: citySlug ?? undefined, area: area ?? undefined } }).then((r) => r.byCategory).catch(() => null),
  });
  const totals = useQuery({
    queryKey: ['places', 'totals', cityId ?? '', area ?? '', categories.length], enabled: !when && categories.length > 0, staleTime: 5 * 60_000,
    queryFn: async () => Object.fromEntries(await Promise.all(categories.map(async (c) => [c.slug, await apiRequest<{ meta?: { total?: number } }>('GET', '/v1/places', { params: { categoryId: c.id, cityId: cityId ?? undefined, region: area ?? undefined, limit: 1 } }).then((r) => r.meta?.total ?? 0).catch(() => 0)] as const))),
  });
  const by = when ? timed.data : totals.data;
  return (cats: readonly string[]) => (by ? categories.filter((c) => cats.includes(c.nameEn || '')).reduce((a, c) => a + (by[c.slug] ?? 0), 0) : null);
}

/** The price bands with western digits in both languages (the API's Arabic labels use Arabic digits). */
export function usePriceBands() {
  const { lang } = useK();
  const { data = [] } = useQuery({ queryKey: ['price-bands'], staleTime: Infinity, queryFn: () => apiRequest<{ level: number; labelEn: string }[]>('GET', '/v1/price-bands').catch(() => []) });
  return data.map((b) => ({ level: b.level, label: lang === 'ar' ? b.labelEn.replace('EGP', 'جنيه') : b.labelEn }));
}

function FiltersBody({ f, onChange }: { f: F; onChange: (f: F) => void }) {
  const { c, lang } = useK();
  const count = useCounts(f.when);
  const bands = usePriceBands();
  const { data: amenities = [] } = useAmenities();
  const must = mustHaveAmenities.map((n) => amenities.find((a) => a.nameEn === n)).filter(Boolean) as typeof amenities;
  const toggle = (v: string) => { const s = new Set(f.filters); if (s.has(v)) s.delete(v); else s.add(v); onChange({ ...f, filters: s }); };
  const chip = (key: string, on: boolean, label: string, icon: string | null, n: number | null | undefined, onClick: () => void) =>
    <button key={key} className="chip press" aria-pressed={on} onClick={onClick}>{icon ? <L n={icon} /> : null}{label}{n != null ? <em><i className={`live ${n ? '' : 'off'}`} />{n}</em> : null}</button>;
  return <>
    <h3 className="group-title"><L n="clock" /> {c.filters.when}</h3>
    <div style={{ marginBottom: 16 }}><Seg opts={WHENS.map((w) => [w, c.explore.when[w || 'any']] as [When, string])} val={f.when} onPick={(w) => onChange({ ...f, when: w })} /></div>
    <h3 className="group-title"><L n="layout-grid" /> {c.filters.category}</h3>
    <div className="amen" style={{ marginBottom: 16 }}>{INTENTS.map((x) => chip(x.key, f.intent === x.key, c.intents[x.key], x.icon, count(x.cats), () => onChange({ ...f, intent: f.intent === x.key ? '' : x.key, cat: '' })))}</div>
    {bands.length ? <><h3 className="group-title"><L n="banknote" /> {c.filters.price}</h3>
      <div className="amen" style={{ marginBottom: 16 }}>{bands.map((b) => chip('b' + b.level, f.filters.has('band:' + b.level), b.label, null, null, () => toggle('band:' + b.level)))}</div></> : null}
    {must.length ? <><h3 className="group-title"><L n="list-checks" /> {c.filters.mustHave}</h3>
      <div className="amen">{must.map((a) => chip(a.id, f.filters.has(a.id), (lang === 'ar' ? a.name : a.nameEn) || a.name, amenityIcons[a.nameEn || ''] || amenityIconFallback, null, () => toggle(a.id)))}</div></> : null}
  </>;
}

/** How many places a filter state finds: exact from the list total, or from the counts route for a When alone. */
export function useResultCount(f: F, q: string, badge: boolean) {
  const { cityId, area } = useLocIds();
  const cats = useCatIds(f);
  const count = useCounts(f.when);
  const intent = INTENTS.find((x) => x.key === f.intent);
  const bands = [...f.filters].filter((x) => x.startsWith('band:')).map((x) => x.slice(5)).join(',');
  const amen = [...f.filters].filter((x) => !x.startsWith('band:')).join(',');
  const wantCats = f.intent || f.cat;
  const list = useQuery({
    queryKey: ['places', 'total', cats.map((x) => x.id).join(','), cityId ?? '', area ?? '', bands, amen, badge], enabled: !f.when && !q && (!wantCats || cats.length > 0), staleTime: 60_000,
    queryFn: async () => (await Promise.all((wantCats ? cats : [null]).map((cat) => apiRequest<{ meta?: { total?: number } }>('GET', '/v1/places', { params: { categoryId: cat?.id, cityId: cityId ?? undefined, region: area ?? undefined, priceRange: bands || undefined, amenityIds: amen || undefined, limit: 1 } }).then((r) => r.meta?.total ?? 0)))).reduce((a, n) => a + n, 0),
  });
  if (q || badge) return null;
  if (f.when) return f.filters.size ? null : count(intent ? intent.cats : f.cat ? [f.cat] : cats.map((x) => x.nameEn || ''));
  return list.data ?? null;
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
        : <FiltersFoot get={() => staged} onClear={() => set({ intent: '', cat: '', when: '', filters: new Set() })} onApply={() => { closeTop(); const q = writeF(staged, keep); go(`/${lang}/explorer/${q.toString() ? '?' + q : ''}`); }} />;
    };
    openSheet(c.filters.title, <Live part="body" />, <Live part="foot" />);
  };
}
