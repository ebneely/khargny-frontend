'use client';
/* eslint-disable @next/next/no-img-element -- the prototype's <img> markup, ported as is (photos come from the storage CDN in their sizes) */
// The shell from proto/app.js shell(): one top chrome (top bar with the search, the location bar folding under it),
// the sidebar on desktop, the page, the right rail; the tab bar lives in the layout (TabNav) so it persists across pages.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { langPrefix } from '@5argny/core/rules/locale';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { GlassTabBar } from './GlassTabBar';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useSearchPlaces } from '@/lib/api/hooks/use-search';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { regionLabel } from '@/lib/egypt-regions';
import { L, Ic, Gov } from './icons';
import { slidePill } from './bits';
import { INTENTS, moment, k } from './rules';
import { intentFor, highlightRange } from '@5argny/core/rules';
import { toK, placeHref, type KPlace } from './data';
import { Meta, Stats, ShowingScope, useShowing } from './place';
import { trackSearchResults, trackSearchTap } from '@/lib/analytics/track';
import { Failed, Sk } from './states';
import { FootLinks } from './footlinks';
import { hasLocBar, type Frame } from './frame';
import { usePosition } from './near';
import { useK, useKS, haptic, reduce, spring, type Tab } from './KProvider';
import { useOpenFilters, readF, nF, useAreaCounts } from './filters';
import { useMine, useSavedSections, useCollections } from './collections';
import { usePathname, useSearchParams } from 'next/navigation';

export const NAV: [Tab, string, 'home' | 'explore' | 'market' | 'saved' | 'cog'][] = [['home', '/', 'home'], ['explore', '/explorer/', 'explore'], ['market', '/marketplace/', 'market'], ['saved', '/saved/', 'saved'], ['profile', '/settings/', 'cog']];
let lastNavTab: Tab | null = null;
const noop = () => () => {};

function NavItems({ cur }: { cur: Tab }) {
  const { lang, c, setTab } = useK();
  // the tab takes the selection on press, before the page arrives; prefetch brings the page in while the finger is still on its way
  return <>{NAV.map(([key, href, icon]) => <Link key={key} className="nav-item press" href={`${langPrefix(lang)}${href}`} prefetch onClick={() => setTab(key)} aria-current={cur === key ? 'page' : undefined}><Ic n={icon} /><span>{c.nav[key]}</span></Link>)}</>;
}

/**
 * The brand mark (the خرجني pin, as the app's splash draws it) with the 5argny! arrow at its top right. On hover (a mouse)
 * or keyboard focus the arrow takes a short 5argny! flight and comes home; reduced motion keeps it still.
 */
function BrandMark({ href, label }: { href: string; label: string }) {
  const go = useRef<HTMLSpanElement>(null);
  const run = useRef<{ stop: () => void } | null>(null);
  const fly = () => {
    const el = go.current; if (!el || reduce()) return;
    run.current?.stop(); // interruptible: a new hover restarts from where the arrow is
    run.current = animate(el, { transform: ['translate(0px,0px) scale(1)', 'translate(7px,-7px) scale(1.15)', 'translate(-3px,3px) scale(.7)', 'translate(0px,0px) scale(1)'], opacity: [1, 0, 0, 1], offset: [0, 0.45, 0.5, 1] } as never, { duration: 0.45, ease: [0.3, 0.7, 0.2, 1] });
  };
  return <Link className="wordmark brand-mark press" href={href} aria-label={label}
    onPointerEnter={(e) => { if (e.pointerType === 'mouse') fly(); }} onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) fly(); }}>
    <img src="/brand/khargny-mark.svg" alt="" width={27} height={34} draggable={false} /><span className="mark-go" ref={go}><L n="navigation" /></span></Link>;
}

/** placeName(): the area, else the city, else Egypt. */
export function usePlaceName() {
  const { c, lang } = useK(), loc = useKS((s) => s.loc); const { data: cities = [] } = useCities();
  const city = loc.city ? cities.find((x) => x.slug === loc.city) : null; // loc.city is the slug; people read the name
  return loc.area || (city ? (lang === 'ar' ? city.name : city.nameEn || city.name) : loc.city) || c.location.egypt;
}
/** The location bar as the API reads it: the city row and the area's catalog key (places.region). */
export function useLocKeys() {
  const { lang } = useK(), loc = useKS((s) => s.loc);
  const { data: cities = [] } = useCities();
  const city = cities.find((x) => x.slug === loc.city) ?? null;
  const areaKey = city && loc.area ? (city.areaKeys ?? []).find((key) => (regionLabel(key, lang, city.nameEn || city.name) || key) === loc.area) ?? null : null;
  return { city, areaKey };
}

const FrameCtx = createContext<(f: Frame) => void>(() => {});
let popped = false; // a back or forward move keeps the browser's own scroll; every other move starts at the top
if (typeof window !== 'undefined') addEventListener('popstate', () => { popped = true; });

/**
 * The frame every page shares, mounted once in the layout (owner 2026-11-14): the top bar, the location bar and the sidebar
 * never unmount when you change page, so their icons and the sliding pill stay exactly as they are. The page between them
 * is the only thing that changes.
 */
export function FrameHost({ initial, children }: { initial: Frame; children: ReactNode }) {
  const [frame, setFrame] = useState(initial);
  const tab = useKS((s) => s.tab);
  const set = useCallback((f: Frame) => setFrame((was) => (was.wide === f.wide && was.noLoc === f.noLoc && was.withFilters === f.withFilters ? was : f)), []);
  const showLoc = hasLocBar(tab, frame.noLoc);
  // one CSS variable for the sticky header's full height: every sticky column (sidebar, right rail, place card) sits below it in either scroll direction
  useLayoutEffect(() => {
    const top = document.querySelector('.chrome-top'); if (!top) return;
    const put = () => document.documentElement.style.setProperty('--chrome-h', `${top.getBoundingClientRect().height}px`);
    put(); const ro = new ResizeObserver(put); ro.observe(top); return () => ro.disconnect();
  }, []);
  // one showing tracker for the frame (search results in the top bar); each page opens its own inside (one visit = one scope)
  return <FrameCtx.Provider value={set}><ShowingScope>
    <div className="chrome-top"><TopBar />{showLoc ? <div className="locbar-wrap"><div className="locbar-in"><LocBar withFilters={frame.withFilters} /></div></div> : null}</div>
    {/* desktop: a page without the location bar keeps its height, so the sidebar and the page start at the same place on every page */}
    {showLoc ? null : <div className="locbar-space" aria-hidden="true" />}
    <div className={`layout ${frame.wide ? 'wide' : ''}`}>
      <Sidebar cur={tab} />
      {children}
    </div>
  </ShowingScope></FrameCtx.Provider>;
}

/** A page: its column and (unless wide) its right rail, set into the shared frame. */
export function Shell({ cur, wide, right, noLoc, withFilters, actionbar, children }: { cur: Tab; wide?: boolean; right?: ReactNode; noLoc?: boolean; withFilters?: boolean; actionbar?: ReactNode; children: ReactNode }) {
  const { setTab } = useK();
  const setFrame = useContext(FrameCtx);
  const filters = withFilters ?? cur === 'explore';
  useLayoutEffect(() => { setTab(cur); setFrame({ wide: !!wide, noLoc: !!noLoc, withFilters: filters }); }, [cur, wide, noLoc, filters, setTab, setFrame]);
  const chrome = useSyncExternalStore(noop, () => document.getElementById('chrome'), () => null);
  useEffect(() => { if (!popped) window.scrollTo(0, 0); popped = false; }, []);
  return <ShowingScope>
    <main className="page" id="view">{children}</main>
    {wide ? null : <aside className="rail-right">{right}</aside>}
    {actionbar && chrome ? createPortal(<div className="actionbar">{actionbar}</div>, chrome) : null}
  </ShowingScope>;
}

function Sidebar({ cur }: { cur: Tab }) {
  const { lang, c } = useK();
  // the person's own collections (device id, no accounts) and the team ones they saved, each with its first photo
  const { data: mine = [] } = useMine();
  const { data: saved = [] } = useSavedSections();
  const cols = useCollections([...mine.map((m) => m.slug), ...saved.map((x) => x.key)]);
  const nav = useRef<HTMLElement>(null);
  // 5 random shortcuts per visit: the same first 5 render on the server, the pick is made after mount and kept in sessionStorage
  const [picked, setPicked] = useState<string[] | null>(null);
  useEffect(() => {
    let keys: string[] | null = null;
    try { keys = JSON.parse(sessionStorage.getItem('k-shortcuts') || 'null'); } catch { /* storage blocked: pick without keeping */ }
    if (!Array.isArray(keys) || keys.length !== 5 || !keys.every((x) => INTENTS.some((i) => i.key === x))) {
      keys = INTENTS.map((x) => x.key).sort(() => Math.random() - 0.5).slice(0, 5);
      try { sessionStorage.setItem('k-shortcuts', JSON.stringify(keys)); } catch { /* ignore */ }
    }
    setPicked(keys);
  }, []);
  const shortcuts = picked ? picked.map((key) => INTENTS.find((i) => i.key === key)!) : INTENTS.slice(0, 5);
  useLayoutEffect(() => {
    const el = nav.current; if (!el) return;
    const from = lastNavTab && lastNavTab !== cur ? el.querySelectorAll('.nav-item')[NAV.findIndex((n) => n[0] === lastNavTab)] : null;
    slidePill(el, !!from, from); lastNavTab = cur;
  }, [cur]);
  return (
    <aside className="sidebar"><nav data-slider="nav" ref={nav}><span className="pill" /><NavItems cur={cur} /></nav>
      <div className="side-section"><div className="t-micro">{c.sidebar.shortcuts}</div>{shortcuts.map((x) => <Link key={x.key} className="side-link press" href={`${langPrefix(lang)}/explorer/?intent=${x.key}`}><L n={x.icon} />{c.intents[x.key]}</Link>)}</div>
      {cols.length ? <div className="side-section"><div className="t-micro">{c.sidebar.collections}</div>{cols.map((col) => <Link key={col.id} className="side-link press" href={`${langPrefix(lang)}/c/${col.slug}/`}>{col.places[0] ? <img decoding="async" src={col.places[0].photos[0]?.s} alt="" /> : <L n="library" />}{col.title}</Link>)}</div> : null}
      <div className="side-section side-quiet"><FootLinks cls="side-link press" /></div>
    </aside>
  );
}

/** The phone tab bar (GlassTabBar: Liquid Glass, compositor-only motion). It lives in the layout, so it never remounts. */
/** The phone tab bar: one bar on every phone (owner 2026-11-14: smooth on iOS too once its spring ran as keyframes). */
export function TabNav() {
  const { lang, c } = useK(), tab = useKS((s) => s.tab);
  const items = useMemo(() => NAV.map(([key, href, icon]) => ({ key, href: `${langPrefix(lang)}${href}`, label: c.nav[key], icon })), [lang, c]);
  return <>
    <div id="chrome" />
    <GlassTabBar items={items} current={tab} label={c.nav.tabsAria} dir={lang === 'ar' ? 'rtl' : 'ltr'} />
  </>;
}

// the searched word stays in the bar across pages until it is cleared (proto S.q); Explore's ?q= is the truth there
let barQ = '';
// the page the search was opened from: the × on the search field returns there (no origin, e.g. a direct link: Home)
let searchOrigin: string | null = null;
const onExplore = () => /^(\/ar)?\/explorer\/?$/.test(location.pathname);

function TopBar() {
  const { c, lang, go } = useK();
  const urlQ = useSearchParams().get('q');
  const [q, setQ] = useState(() => barQ);
  // an Explore deep link (or a new ?q= on it) puts its word in the bar; the server render starts empty, so no mismatch
  useEffect(() => { if (onExplore()) { barQ = (urlQ ?? '').trim(); setQ(barQ); } else { setQ(barQ); searchOrigin = null; } }, [urlQ]);
  const commit = (v: string) => { barQ = v.trim(); setQ(barQ); };
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const from = useRef<{ path: string; y: number } | null>(null);
  const hintEl = useRef<HTMLSpanElement>(null);
  // the hint rolls through real examples, like a voice inviting a tap
  useEffect(() => {
    const id = setInterval(() => {
      const h = hintEl.current; if (reduce() || document.hidden || !h || q) return;
      animate(h, { opacity: [1, 0], transform: ['translateY(0)', 'translateY(-60%)'] }, { duration: 0.22 }).finished.then(() => { setHint((n) => n + 1); animate(h, { opacity: [0, 1], transform: ['translateY(60%)', 'translateY(0)'] }, spring(0, 0.4)); });
    }, 3200);
    return () => clearInterval(id);
  }, [q]);
  const enter = () => { if (searching) return; from.current = { path: location.pathname + location.search, y: scrollY }; if (!(onExplore() && urlQ)) searchOrigin = from.current.path; setSearching(true); document.querySelector('.chrome-top')?.classList.remove('compact'); };
  const exit = () => { setSearching(false); input.current?.blur(); };
  const cancel = () => { const back = from.current; if (!(onExplore() && urlQ)) searchOrigin = null; exit(); setQ(barQ); if (back) requestAnimationFrame(() => scrollTo({ top: back.y, behavior: 'instant' })); };
  // the × clears the word and takes the person back to the page they started the search from (Home when there is none)
  const clear = () => {
    barQ = ''; setQ(''); haptic();
    const target = searchOrigin;
    if (searching && (!target || target === location.pathname + location.search)) { cancel(); return; }
    if (searching || (onExplore() && urlQ != null)) { searchOrigin = null; exit(); go(target ?? `${langPrefix(lang)}/`); }
  };
  useEffect(() => { document.querySelector('.chrome-top')?.classList.toggle('searching', searching); }, [searching]);
  useEffect(() => { if (!searching) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); });
  const hints = c.search.hints;
  return <>
    <header className="topbar"><BrandMark href={`${langPrefix(lang)}/`} label={c.nav.homeAria} />
      <label className={`search gsearch ${q ? 'has-text' : ''}`}><Ic n="search" /><span className="gs-hint" aria-hidden="true"><span ref={hintEl}>{hints[hint % hints.length]}</span></span>
        <input ref={input} type="search" placeholder={c.search.placeholder} data-act="gsearch" value={q} aria-label={c.search.placeholder} autoComplete="off" enterKeyHint="search"
          onFocus={enter} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { putRecent(q); commit(q); exit(); go(`${langPrefix(lang)}/explorer/${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); } }} />
        <button type="button" className="gs-clear press" data-act="gs-clear" aria-label={c.search.clear} onClick={(e) => { e.preventDefault(); clear(); }}><L n="x" /></button></label>
      <button className="gs-cancel press" data-act="gs-cancel" onClick={cancel}>{c.search.cancel}</button>
    </header>
    {searching ? <SearchPanel q={q} onCancel={cancel} onGo={(term) => { if (term) { putRecent(term); commit(term); } exit(); }} /> : null}
  </>;
}

const RECENT_KEY = 'kh.recent', OPENED_KEY = 'kh.opened';
type Opened = { slug: string; citySlug: string; name: string; s: string };
const getL = <T,>(key: string): T[] => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
const putRecent = (q: string) => { q = q.trim(); if (!q) return; localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...getL<string>(RECENT_KEY).filter((x) => x !== q)].slice(0, 6))); };
export const putOpened = (p: KPlace) => { try { localStorage.setItem(OPENED_KEY, JSON.stringify([{ slug: p.slug, citySlug: p.citySlug, name: p.name, s: p.photos[0]?.s || '' }, ...getL<Opened>(OPENED_KEY).filter((x) => x.slug !== p.slug)].slice(0, 8))); } catch {} };

function SearchPanel({ q, onCancel, onGo }: { q: string; onCancel: () => void; onGo: (term: string) => void }) {
  const { c, lang, now, go } = useK();
  const panel = useRef<HTMLDivElement>(null);
  // mounted only after the search field is focused, so the browser is there
  const [top] = useState(() => document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0);
  const [recent, setRecent] = useState(() => getL<string>(RECENT_KEY));
  const [opened] = useState(() => getL<Opened>(OPENED_KEY).slice(0, 6));
  const where = usePlaceName();
  const { city } = useLocKeys(); // terms are recorded per city: an area reads its city's terms
  const { data: trending = [] } = useQuery({
    queryKey: ['search', 'trending', city?.id ?? ''], staleTime: 5 * 60_000,
    queryFn: () => apiRequest<{ terms: { term: string; searches: number }[] }>('GET', '/v1/search/trending', { params: { limit: 5, ...(city ? { cityId: city.id } : {}) } }).then((r) => r.terms).catch(() => []),
  });
  useEffect(() => {
    const p = panel.current; if (!p) return;
    animate(p, { opacity: [0, 1], transform: ['translateY(-8px) scale(.985)', 'translateY(0) scale(1)'] }, spring(0, 0.32));
    [...p.children].forEach((ch, n) => animate(ch, { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] }, { ...spring(0, 0.35), delay: 0.02 * n }));
  }, []);
  const m = moment(now);
  const chips: [string, string, string][] = [[c.moments[m.title], `${langPrefix(lang)}/explorer/?intent=${m.x.key}&when=now`, m.x.icon], [c.search.zero.openLate, `${langPrefix(lang)}/explorer/?when=tonight`, 'moon'], [c.search.zero.workFrom, `${langPrefix(lang)}/explorer/?intent=coffee`, 'laptop']];
  const body = q.trim() ? <Results q={q} onGo={onGo} /> : <>
    <div className="sg-sec"><L n="sparkles" /> {c.search.zero.rightNow}</div>
    <div className="sg-chips">{chips.map(([l, h, i]) => <Link key={l} className="chip press" href={h} data-act="sg-go" onClick={() => onGo(l)}><L n={i} />{l}</Link>)}<button className="chip press" data-act="shuffle-search" onClick={() => { onGo(''); go(`${langPrefix(lang)}/`); setTimeout(() => document.querySelector<HTMLElement>('[data-act="shuffle"]')?.click(), 450); }}><L n="dices" />{c.search.zero.surprise}</button></div>
    {recent.length ? <><div className="sg-sec"><L n="history" /> {c.search.zero.recent}</div>{recent.map((r) => <div key={r} className="sg-row"><Link className="grow press" href={`${langPrefix(lang)}/explorer/?q=${encodeURIComponent(r)}`} data-act="sg-go" onClick={() => onGo(r)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><L n="clock" /><b>{r}</b></Link><button className="icon-btn press" aria-label={c.search.remove} data-act="sg-forget" onClick={(e) => { const row = e.currentTarget.closest('.sg-row') as HTMLElement; localStorage.setItem(RECENT_KEY, JSON.stringify(getL<string>(RECENT_KEY).filter((x) => x !== r))); animate(row, { opacity: [1, 0], transform: ['translateX(0px)', 'translateX(-12px)'] }, spring(0, 0.25)).finished.then(() => setRecent((l) => l.filter((x) => x !== r))); }}><L n="x" /></button></div>)}</> : null}
    {trending.length ? <><div className="sg-sec"><L n="flame" /> {fill(c.search.zero.trendingIn, { place: where })}</div>{trending.map((x, n) => <Link key={x.term} className="sg-row press" href={`${langPrefix(lang)}/explorer/?q=${encodeURIComponent(x.term)}`} data-act="sg-go" onClick={() => onGo(x.term)}><span className="sg-rank">{n + 1}</span><b className="grow" dir="auto">{x.term}</b><em className="sg-n">{fill(x.searches === 1 ? c.search.zero.oneSearch : c.search.zero.searches, { n: x.searches })}</em></Link>)}</> : null}
    {opened.length ? <><div className="sg-sec"><L n="eye" /> {c.search.zero.youOpened}</div><div className="sg-opened">{opened.map((p) => <Link key={p.slug} className="press" href={placeHref(p, lang)} data-act="sg-go" onClick={() => onGo('')}><img decoding="async" src={p.s} alt="" /><b dir="auto">{p.name}</b></Link>)}</div></> : null}
  </>;
  return createPortal(<>
    <div id="search-scrim" style={{ top }} onPointerDown={onCancel} />
    <div id="suggest" role="listbox" ref={panel} style={{ top: top + 6 }}>{body}</div>
  </>, document.body);
}

// "Go": the intent a query names, in the chosen place and open now, with real counts (rows at 0 are left out)
/** The dashboard's search settings (Search tab); the built-in values apply until it answers or when it fails. */
const SEARCH_DEFAULTS = { defaultCitySlug: 'cairo', suggestInCity: true, suggestOpenNow: true, suggestPlaces: true };
function useSearchSettings() {
  const { data } = useQuery({ queryKey: ['settings', 'search'], staleTime: 5 * 60_000, retry: false,
    queryFn: () => apiRequest<Partial<typeof SEARCH_DEFAULTS>>('GET', '/v1/settings/search').catch(() => ({})) });
  return { ...SEARCH_DEFAULTS, ...data };
}

/** The city suggestions speak about: the one chosen in the location bar, else the nearest to the person, else the default city. Never Egypt. */
function useSuggestionCity() {
  const loc = useKS((s) => s.loc);
  const { data: cities = [] } = useCities();
  const pos = usePosition();
  const s = useSearchSettings();
  const chosen = cities.find((x) => x.slug === loc.city);
  if (chosen) return chosen;
  const km = (x: (typeof cities)[number]) => (x.lat != null && x.lng != null && pos ? Math.hypot((x.lat - pos.lat) * 111, (x.lng - pos.lng) * 111 * Math.cos((pos.lat * Math.PI) / 180)) : Infinity);
  const near = pos ? [...cities].sort((a, b) => km(a) - km(b))[0] : null;
  return (near && km(near) < Infinity ? near : null) ?? cities.find((x) => x.slug === s.defaultCitySlug) ?? cities.find((x) => x.slug === 'cairo') ?? null;
}

function useGo(q: string) {
  const city = useSuggestionCity();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const it = intentFor(q);
  const cats = it ? categories.filter((cat) => (it.cats as readonly string[]).includes(cat.nameEn || cat.nameAr)) : [];
  const cityId = city?.id;
  const { data: open } = useQuery({ queryKey: ['places', 'counts', 'now', city?.slug ?? ''], queryFn: () => apiRequest<{ byCategory: Record<string, number> }>('GET', '/v1/places/counts', { params: { when: 'now', city: city?.slug } }).catch(() => null), enabled: !!it, staleTime: 60_000 });
  const { data: total } = useQuery({
    queryKey: ['places', 'total', cats.map((x) => x.id).join(','), cityId ?? ''], enabled: cats.length > 0, staleTime: 5 * 60_000,
    queryFn: async () => (await Promise.all(cats.map((cat) => apiRequest<{ meta?: { total?: number } }>('GET', '/v1/places', { params: { categoryId: cat.id, limit: 1, cityId } }).then((r) => r.meta?.total ?? 0).catch(() => 0)))).reduce((a, n) => a + n, 0),
  });
  if (!it) return null;
  return { key: it.key, icon: INTENTS.find((x) => x.key === it.key)!.icon, total: total ?? null, open: open ? cats.reduce((a, cat) => a + (open.byCategory[cat.slug] ?? 0), 0) : null };
}

function SearchRow({ p, q, position, onGo, hl }: { p: KPlace; q: string; position: number; onGo: (term: string) => void; hl: (text: string) => ReactNode }) {
  const { lang } = useK();
  const ref = useRef<HTMLAnchorElement>(null);
  useShowing(ref, 'search', p.id, position);
  return <Link ref={ref} className="sg-row press" href={placeHref(p, lang)} data-act="sg-go" onClick={() => { trackSearchTap(q, p.id, position); onGo(q); }}><span className="tile-media sg-thumb"><img decoding="async" src={p.photos[0]?.s} alt="" /></span><span className="grow"><b dir="auto">{hl(p.name)}</b><Meta p={p} /></span><Stats p={p} /></Link>;
}

function Results({ q, onGo }: { q: string; onGo: (term: string) => void }) {
  const { c, lang, setLoc } = useK(), loc = useKS((s) => s.loc);
  const sug = useSearchSettings(), sugCity = useSuggestionCity();
  const go = useGo(q);
  const cityName = sugCity ? (lang === 'ar' ? sugCity.name : sugCity.nameEn || sugCity.name) : '';
  const comp = go && sugCity ? ([[fill(c.search.results.intentIn, { intent: c.intents[go.key], place: cityName }), `${langPrefix(lang)}/explorer/?intent=${go.key}`, go.icon, go.total, sug.suggestInCity], [fill(c.search.results.intentOpenNow, { intent: c.intents[go.key] }), `${langPrefix(lang)}/explorer/?intent=${go.key}&when=now`, 'clock', go.open, sug.suggestOpenNow]] as [string, string, string, number | null, boolean][]).filter((r) => r[4] && (r[3] ?? 0) > 0) : [];
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const { data, isFetching, isPlaceholderData, isError, error, refetch } = useSearchPlaces({ q, limit: 20 }, { locale: lang });
  // the location bar first, then paid places, then the 30-day views (proto results())
  const inLoc = (p: KPlace) => (!loc.city || p.citySlug === loc.city) && (!loc.area || p.area === loc.area);
  const places = (data?.items ?? []).map((raw) => toK(raw as never, { cities, categories }, lang))
    .sort((a, b) => Number(inLoc(b)) - Number(inLoc(a)) || Number(b.promoted) - Number(a.promoted) || (b.d30?.views ?? 0) - (a.d30?.views ?? 0)).slice(0, 5);
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  const s = norm(q);
  const areas = cities.flatMap((city) => (city.areaKeys ?? []).map((key) => ({ city, key, n: regionLabel(key, lang, city.nameEn || city.name) || key }))).filter((a) => norm(a.n).includes(s)).slice(0, 3);
  // a search answer is shown: the term and the places in order (once per term and answer)
  const shown = data && !isPlaceholderData ? places.map((x) => x.id).join() : '';
  useEffect(() => { if (shown) trackSearchResults(q, shown.split(',')); }, [q, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const hl = (text: string) => { const r = highlightRange(text, q); return !r ? text : <>{text.slice(0, r[0])}<mark>{text.slice(r[0], r[1])}</mark>{text.slice(r[1])}</>; };
  // the first answer for this query: rows in the result rows' own markup; failed: what failed and Try again (the typed query stays)
  if (!data && isFetching) return <><div className="sg-sec skel" aria-hidden="true"><span className="sk">{c.search.results.places}</span></div>{[0, 1, 2].map((i) => <div key={i} className="sg-row skel" aria-hidden="true"><span className="tile-media sg-thumb"><Sk w={36} h={36} r={9} /></span><span className="grow"><b><span className="sk">Place name here</span></b><span className="meta"><span className="cat-bubble sk">Restaurants</span><span className="cat-bubble sk">Area name here</span></span></span><span className="stats">{(['eye', 'heart', 'saved'] as const).map((n) => <span key={n} className="views sk"><Ic n={n} /><span className="n">00</span></span>)}</span></div>)}</>;
  if (!data && isError) return <Failed compact error={error} retry={refetch} />;
  return <>
    {comp.length ? <><div className="sg-sec"><L n="navigation" /> {c.search.results.go}</div>{comp.map(([l, h, i, n]) => <Link key={h} className="sg-row sg-comp press" href={h} data-act="sg-go" onClick={() => { onGo(q); if (sugCity && loc.city !== sugCity.slug) setLoc({ city: sugCity.slug, area: null }); }}><span className="sg-ic"><L n={i} /></span><b className="grow">{l}</b><em className="sg-n"><i className="live" />{n}</em></Link>)}</> : null}
    {places.length && sug.suggestPlaces ? <><div className="sg-sec"><L n="map-pin" /> {c.search.results.places}</div>{places.map((p, i) => <SearchRow key={p.id} p={p} q={q} position={i + 1} onGo={onGo} hl={hl} />)}</> : null}
    {areas.length ? <><div className="sg-sec"><L n="map" /> {c.search.results.areas}</div>{areas.map((a) => <Link key={a.city.id + a.key} className="sg-row press" href={`${langPrefix(lang)}/explorer/`} data-act="sg-area" onClick={() => { onGo(a.n); setLoc({ city: a.city.slug, area: a.n }); }}><span className="sg-ic"><Gov name={a.city.slug} fallback={<L n="map-pin" />} /></span><span className="grow"><b>{hl(a.n)}</b><span className="t-small">{lang === 'ar' ? a.city.name : a.city.nameEn || a.city.name}</span></span></Link>)}</> : null}
    {places.length || areas.length || comp.length
      ? <Link className="sg-row sg-all press" href={`${langPrefix(lang)}/explorer/?q=${encodeURIComponent(q.trim())}`} data-act="sg-go" onClick={() => onGo(q)}><L n="search" /><span className="grow">{fill(c.search.results.seeEverything, { q: q.trim() })}</span><L n="arrow-right" /></Link>
      : <div className="empty" style={{ padding: 18 }}><L n="search-x" /><p className="t-head">{fill(c.search.results.nothing, { q: q.trim() })}</p><Link className="btn secondary press" href={`${langPrefix(lang)}/explorer/`} data-act="sg-go" onClick={() => onGo('')}>{c.states.search.action}</Link></div>}
  </>;
}

/** Views in the last 30 days per city or area (GET /v1/aggregates/views): one request for a whole sheet, asked before it opens. */
function useGroupViews(kind: 'city' | 'area', ids: string[]) {
  return useQuery({
    queryKey: ['aggregates', 'views', kind, ids.join(',')], enabled: ids.length > 0, staleTime: 5 * 60_000,
    queryFn: () => apiRequest<Record<string, number>>('GET', '/v1/aggregates/views', { params: { kind, ids: ids.join(',') } }).catch(() => null),
  }).data;
}
/** A city or area row's numbers (proto Options): views in the last 30 days and how many places. Hidden until known. */
function LocNums({ v, count }: { v?: number | null; count?: number | null }) {
  const { c } = useK();
  return <>{v != null ? <span className="gv" title={c.stats.viewsGroup}><Ic n="eye" />{k(v)}</span> : null}{count != null ? <span className="t-small">{count}</span> : null}</>;
}
type City = NonNullable<ReturnType<typeof useCities>['data']>[number];
const cityLabel = (x: City, lang: string) => (lang === 'ar' ? x.name : x.nameEn || x.name);
function LocOption({ on, icon, label, act, then, nums }: { on: boolean; icon: ReactNode; label: string; act: string; then: () => void; nums?: ReactNode }) {
  const { closeTop } = useK();
  // a choice closes the sheet at once, then applies
  return <button className="option press" role="radio" aria-checked={on} data-act={act} onClick={() => { haptic(); closeTop(); then(); }}>{icon}<span className="grow">{label}</span>{nums}<Ic n="check" cls="check" /></button>;
}
/** The Area sheet of one city: places per area in one request, areas with the most places first. */
function AreaSheet({ city }: { city: City }) {
  const { setLoc, c, lang } = useK(), loc = useKS((s) => s.loc);
  const counts = useAreaCounts(city.id), ids = city.areaKeys ?? [], views = useGroupViews('area', ids);
  const keys = [...ids].sort((a, b) => (counts?.[b] ?? -1) - (counts?.[a] ?? -1)), here = loc.city === city.slug ? loc.area : null;
  return <div role="radiogroup">
    <LocOption on={!here} icon={<L n="layers" />} label={c.location.allAreas} act="pick-area" then={() => setLoc({ city: city.slug, area: null })} nums={<LocNums count={city.visiblePlacesCount} />} />
    {keys.map((key) => { const n = regionLabel(key, lang, city.nameEn || city.name) || key; return <LocOption key={key} on={here === n} icon={<L n="map-pin" />} label={n} act="pick-area" then={() => setLoc({ city: city.slug, area: n })} nums={<LocNums v={views?.[key]} count={counts ? counts[key] ?? 0 : null} />} />; })}
  </div>;
}
/** The City sheet: cities by most places (they carry their counts, so the order never changes). Opened from the Area pill
 *  with no city yet (`thenArea`), a pick opens that city's areas next. */
function CitySheet({ thenArea }: { thenArea: boolean }) {
  const { setLoc, c, lang, toast, openSheet } = useK(), loc = useKS((s) => s.loc);
  const { data: cities = [] } = useCities(), views = useGroupViews('city', cities.map((x) => x.id));
  const byCount = [...cities].sort((a, b) => (b.visiblePlacesCount ?? -1) - (a.visiblePlacesCount ?? -1));
  const egypt = cities.length && cities.every((x) => typeof x.visiblePlacesCount === 'number') ? cities.reduce((a, x) => a + x.visiblePlacesCount!, 0) : null;
  return <div role="radiogroup">
    <LocOption on={!loc.city} icon={<L n="map" />} label={c.location.allEgypt} act="pick-city" then={() => setLoc({ city: null, area: null })} nums={<LocNums count={egypt} />} />
    {byCount.map((x) => { const n = cityLabel(x, lang); return <LocOption key={x.id} on={x.slug === loc.city} icon={<Gov name={x.slug} fallback={<Ic n="pin" />} />} label={n} act="pick-city"
      then={() => { setLoc({ city: x.slug, area: null }); if (thenArea) openSheet(fill(c.location.areaSheet, { city: n }), <AreaSheet city={x} />); else toast(fill(c.location.cityPicked, { city: n })); }}
      nums={<LocNums v={views?.[x.id]} count={x.visiblePlacesCount} />} />; })}
  </div>;
}

/** ONE location bar, pinned under the top bar on Home, Explore and Marketplace; Filters joins it on Explore only.
 *  City and Area are sheets (owner 2026-11-14, "all sheets"). */
function LocBar({ withFilters }: { withFilters: boolean }) {
  const { setLoc, c, lang, toast, go, openSheet } = useK(), loc = useKS((s) => s.loc);
  const { data: cities = [] } = useCities();
  const city = cities.find((x) => x.slug === loc.city || (x.nameEn || x.name) === loc.city);
  const cityName = city ? cityLabel(city, lang) : null;
  useGroupViews('city', cities.map((x) => x.id)); useGroupViews('area', city?.areaKeys ?? []); useAreaCounts(city?.id); // asked now, so the sheets open with their numbers
  const openCity = (thenArea: boolean) => openSheet(c.location.citySheet, <CitySheet thenArea={thenArea} />);
  const openArea = (cty: City) => openSheet(fill(c.location.areaSheet, { city: cityLabel(cty, lang) }), <AreaSheet city={cty} />);
  const reset = (e: React.MouseEvent<HTMLButtonElement>) => { const ic = e.currentTarget.querySelector('.lucide'); if (ic) animate(ic, { transform: ['rotate(0deg)', 'rotate(-360deg)'] }, spring(0, 0.5)); haptic(); setTimeout(() => { setLoc({ city: null, area: null }); if (n) { const keep = new URLSearchParams(location.search); ['intent', 'cat', 'when', 'f'].forEach((k) => keep.delete(k)); go(`${location.pathname}${keep.toString() ? '?' + keep : ''}`); } toast(c.location.cleared); }, 220); };
  const openFilters = useOpenFilters();
  const sp = useSearchParams();
  const n = withFilters ? nF(readF(sp)) : 0;
  return (
    <div className="locbar" role="group" aria-label={c.location.aria}>
      <button className={`loc-pill press ${loc.city ? 'on' : ''}`} data-act="city" aria-haspopup="dialog" onClick={() => openCity(false)}>{loc.city ? <Gov name={loc.city} fallback={<L n="map-pin" />} /> : <L n="map" />}<b>{cityName || c.location.allEgypt}</b><L n="chevron-down" cls="chev" /></button>
      <button className={`loc-pill press ${loc.area ? 'on' : ''}`} data-act="area" aria-haspopup="dialog" onClick={() => (city ? openArea(city) : openCity(true))}><L n="map-pin" /><b>{loc.area || (loc.city ? c.location.allAreas : c.location.area)}</b><L n="chevron-down" cls="chev" /></button>
      {withFilters ? <button className={`loc-pill filters press ${n ? 'on' : ''}`} data-act="filters" onClick={openFilters}><L n="sliders-horizontal" /><b>{c.location.filters}</b>{n ? <em className="n-badge">{n}</em> : null}</button> : null}
      {loc.city || loc.area || n ? <button className="icon-btn reset-btn press" data-act="reset-all" aria-label={c.location.reset} onClick={reset}><L n="rotate-ccw" /></button> : null}
    </div>
  );
}
