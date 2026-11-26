'use client';
// Explore's Filters sheet: the body and the foot, split out of filters.tsx so a first visit to the site does not carry
// them (next/dynamic in useOpenFilters). The staged filter state itself stays in filters.tsx, read through `get`.
import { useEffect, useReducer, useState } from 'react';
import { fill } from '@5argny/core/copy';
import { amenityIcons, amenityIconFallback, mustHaveAmenities } from '@5argny/core/icons';
import { searchNormalize } from '@5argny/core/rules';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useAmenities } from '@/lib/api/hooks/use-taxonomy';
import { L, Ic } from './icons';
import { catIcon } from './place';
import { Btn, Seg } from './bits';
import { INTENTS } from './rules';
import { useK } from './KProvider';
import { useCounts, usePriceBands, usePrefetchList, useResultCount, WHENS, type F, type When } from './filters';

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

function FiltersBody({ f, set }: { f: F; set: (f: F) => void }) {
  const { c, lang, openSheet, closeTop } = useK();
  const prefetch = usePrefetchList();
  const { data: categories = [] } = useCategories();
  const picked = f.cat ? categories.find((x) => (x.nameEn || x.nameAr) === f.cat || x.slug === f.cat || x.id === f.cat) : null;
  const count = useCounts(f.when);
  const bands = usePriceBands();
  const { data: amenities = [] } = useAmenities();
  const must = mustHaveAmenities.map((n) => amenities.find((a) => a.nameEn === n)).filter(Boolean) as typeof amenities;
  const toggle = (v: string) => { const s = new Set(f.filters); if (s.has(v)) s.delete(v); else s.add(v); set({ ...f, filters: s }); };
  const chip = (key: string, on: boolean, label: string, icon: string | null, n: number | null | undefined, onClick: () => void, onDown?: () => void) =>
    <button key={key} className="chip press" aria-pressed={on} onPointerDown={onDown} onClick={onClick}>{icon ? <L n={icon} /> : null}{label}{n != null ? <em><i className={`live ${n ? '' : 'off'}`} />{n}</em> : null}</button>;
  return <>
    <h3 className="group-title"><L n="clock" /> {c.filters.when}</h3>
    <div style={{ marginBottom: 16 }}><Seg opts={WHENS.map((w) => [w, c.explore.when[w || 'any']] as [When, string])} val={f.when} onPick={(w) => set({ ...f, when: w })} /></div>
    <h3 className="group-title"><L n="layout-grid" /> {c.filters.category}</h3>
    <div className="amen" style={{ marginBottom: 16 }}>{INTENTS.map((x) => chip(x.key, f.intent === x.key, c.intents[x.key], x.icon, count(x.cats), () => set({ ...f, intent: f.intent === x.key ? '' : x.key, cat: '' }), () => prefetch({ ...f, intent: x.key, cat: '' })))}
      {picked ? chip('cat', true, (lang === 'ar' ? picked.nameAr : picked.nameEn || picked.nameAr) || picked.slug, catIcon(picked.nameEn || ''), count([picked.nameEn || '']), () => set({ ...f, cat: '' })) : null}
      {/* every category, in a sheet stacked over Filters; picking one comes back here with it selected (still staged) */}
      <button className="chip press" data-act="all-cats" onClick={() => openSheet(c.filters.allCats, <AllCats when={f.when} cur={f.cat} onPick={(cat) => { set({ ...f, cat, intent: '' }); closeTop(); }} />)}><L n="layout-grid" />{c.filters.seeAllCats}<L n="chevron-right" /></button></div>
    {bands.length ? <><h3 className="group-title"><L n="banknote" /> {c.filters.price}</h3>
      <div className="amen" style={{ marginBottom: 16 }}>{bands.map((b) => chip('b' + b.level, f.filters.has('band:' + b.level), b.label, null, null, () => toggle('band:' + b.level)))}</div></> : null}
    {must.length ? <><h3 className="group-title"><L n="list-checks" /> {c.filters.mustHave}</h3>
      <div className="amen">{must.map((a) => chip(a.id, f.filters.has(a.id), (lang === 'ar' ? a.name : a.nameEn) || a.name, amenityIcons[a.nameEn || ''] || amenityIconFallback, null, () => toggle(a.id)))}</div></> : null}
  </>;
}

/** The sheet as the mirror of the staged state: both parts re-read it whenever a chip changes it. */
type SheetProps = { get: () => F; set: (f: F) => void; subscribe: (l: () => void) => () => void };
const useStaged = (subscribe: SheetProps['subscribe']) => { const [, tick] = useReducer((n: number) => n + 1, 0); useEffect(() => subscribe(() => tick()), [subscribe]); };

export function FiltersBodySheet({ get, set, subscribe }: SheetProps) {
  useStaged(subscribe);
  return <FiltersBody f={get()} set={set} />;
}

export function FiltersFootSheet({ get, set, subscribe, onApply }: SheetProps & { onApply: () => void }) {
  const { c } = useK();
  useStaged(subscribe);
  const n = useResultCount(get(), '', false);
  return <><Btn label={c.filters.clear} act="filters-clear" onClick={() => set({ intent: '', cat: '', when: '', filters: new Set() })} /><Btn label={n == null ? c.filters.showPlaces : fill(c.filters.show, { n })} kind="primary" act="filters-apply" wide onClick={onApply} /></>;
}
