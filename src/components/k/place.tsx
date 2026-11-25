'use client';
/* eslint-disable @next/next/no-img-element -- the prototype's <img> markup, ported as is (photos come from the storage CDN in their sizes) */
// Place patterns from proto/app.js, one component each: Meta, StatePill, OpenBar, AllDay, HoursUnknown, Carousel,
// Actions (ActBtn + Cnt), Go5 (with its flight), Stats, Tile, Post, plus the Share and Which-map sheets they open.
import { createContext, memo, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type MouseEvent } from 'react';
import { langPrefix } from '@5argny/core/rules/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { animate } from 'motion';
import { observeVisibility } from '@/lib/shared-observer';
import { categoryIcons, categoryIconFallback, badgeIcons, badgeIconFallback } from '@5argny/core/icons';
import { fill } from '@5argny/core/copy';
import { apiRequest, ApiError } from '@/lib/api/client';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useCities } from '@/lib/api/hooks/use-cities';
import { regionLabel } from '@/lib/egypt-regions';
import { likeStore } from '@/lib/likes';
import { saveStore } from '@/lib/saves';
import { trackPlaceAction, trackPlaceShowing, trackPlaceView, trackSearchTap, type ShowingSurface } from '@/lib/analytics/track';
import { createShowing } from '@5argny/core/rules';
import { sharePlace } from '@/lib/share-place';
import { L, Ic } from './icons';
import { Cnt, Tag, Bit } from './bits';
import { dur, openState, type OpenState } from './rules';
import { photoMedium, placeHref, type KPlace, type KStats, type KBadge } from './data';
import { useK, haptic, reduce, spring, desk } from './KProvider';
import { useOpenCorrection } from './settings';
import { KmAway } from './near';
import { Sk } from './states';

/** 30-day windows from GET /v1/places/:id/stats; null until that route answers (counts stay hidden). */
export const placeStatsQuery = (id: string, enabled = true) => ({
  queryKey: ['places', 'stats', id],
  // no stats route or no such place (404): null, the counts stay hidden; any other failure is shown where the stats are drawn
  queryFn: () => apiRequest<KStats>('GET', `/v1/places/${id}/stats`).catch((e) => { if (e instanceof ApiError && e.status === 404) return null; throw e; }),
  staleTime: 5 * 60 * 1000, retry: false, enabled,
});
export function usePlaceStats(id: string, enabled = true) {
  return useQuery(placeStatsQuery(id, enabled)).data ?? null;
}

const serverSnap = () => 0;
// this session's own views: opening a place or seeing a feed post adds 1 to its eye count at once (proto viewed())
const myViews = new Map<string, number>(), viewSubs = new Set<() => void>();
export function bumpView(id: string) { trackPlaceView(id); myViews.set(id, (myViews.get(id) ?? 0) + 1); viewSubs.forEach((f) => f()); }
const subViews = (f: () => void) => { viewSubs.add(f); return () => { viewSubs.delete(f); }; };
export const useMyViews = (id: string) => useSyncExternalStore(subViews, () => myViews.get(id) ?? 0, serverSnap);
// this session's own shares, from the button or the double-tap-and-hold, added to the share count at once
const myShares = new Map<string, number>();
export function bumpShare(id: string) { myShares.set(id, (myShares.get(id) ?? 0) + 1); viewSubs.forEach((f) => f()); }
export const useMyShares = (id: string) => useSyncExternalStore(subViews, () => myShares.get(id) ?? 0, serverSnap);
export function useLove(p: KPlace) {
  useSyncExternalStore(likeStore.subscribe, likeStore.snapshot, serverSnap);
  const [local, setLocal] = useState<boolean | null>(null);
  useEffect(() => { likeStore.seed(p.id, p.likes); void likeStore.start(p.id); }, [p.id, p.likes]);
  const on = local ?? likeStore.liked(p.id);
  return { on, count: likeStore.enabled() ? likeStore.count(p.id, p.likes) : p.likes + (local ? 1 : 0), toggle: () => { if (likeStore.enabled()) likeStore.set(p.id, !on); else setLocal(!on); } };
}
export function useSave(p: KPlace) {
  useSyncExternalStore(saveStore.subscribe, saveStore.snapshot, serverSnap);
  const on = saveStore.saved(p.id);
  const [first] = useState(on);
  return { on, delta: Number(on) - Number(first), toggle: () => { trackPlaceAction('save', p.id); void saveStore.set(p.id, !on); } };
}

export const catIcon = (cat: string) => categoryIcons[cat] || categoryIconFallback;
export const badgeIcon = (b: KBadge) => (badgeIcons as Record<string, string>)[b.key] || badgeIconFallback;
export function useBadgeLabel() {
  const { c, lang } = useK();
  const ranked: Record<string, string> = { most_viewed: c.badges.mostViewed, most_saved: c.badges.mostSaved, most_5argnyd: c.badges.most5argnyd };
  const city = (b: KBadge) => (lang === 'ar' ? b.scope?.city?.name || b.scope?.city?.nameEn : b.scope?.city?.nameEn || b.scope?.city?.name) || c.badges.theCity;
  return (b: KBadge) => ranked[b.key] ? fill(ranked[b.key], { rank: b.rank ?? 1, city: city(b) })
    : ({ pricing: c.badges.pricing, price_match: c.badges.priceMatch, visited: c.badges.visited } as Record<string, string>)[b.key] || b.key;
}

export function StatePill({ st, cls = 'live-pill' }: { st: Pick<OpenState, 'open'>; cls?: string }) {
  const { c } = useK();
  return <span className={`${cls} ${st.open ? '' : 'closed'}`}><i className="live" />{st.open ? c.open.open : c.open.closed}</span>;
}

// today's opening in one piece. Open: opened -> closes, time left. Closed (inverse): closed at -> opens, time until it opens.
export function OpenBar({ st }: { st: OpenState }) {
  const { c, lang } = useK();
  const label = st.open ? fill(c.open.left, { dur: dur(st.left ?? 0, lang) }) : fill(c.open.opensIn, { dur: dur(st.left ?? 0, lang) });
  const done = Math.round(Math.min(1, Math.max(0, st.done ?? 0)) * 1000) / 10;
  const aria = st.open ? fill(c.open.openAria, { from: st.from ?? '', until: st.until ?? '', left: label }) : fill(c.open.closedAria, { until: st.until ?? '', left: label });
  return (
    <div className={`open-tl ${st.open ? '' : 'closed'}`} style={{ ['--done' as string]: `${done}%` }} role="img" aria-label={aria}>
      <StatePill st={st} />
      <span className="tl"><span className="tl-left">{label}</span><span className="tl-track"><i className="tl-done" /><i className="tl-run" /></span><i className="tl-now" /><i className="tl-end" />
        <span className="tl-ends"><span><L n={st.open ? 'door-open' : 'door-closed'} />{st.from}</span><span>{st.until}<L n={st.open ? 'door-closed' : 'door-open'} /></span></span></span>
    </div>
  );
}
export function AllDay() {
  const { c } = useK();
  return <div className="open-tl allday"><StatePill st={{ open: true }} /><span className="bits"><Bit icon="infinity">{c.open.allDay}</Bit></span></div>;
}
// no hours yet: say so plainly and let people fill the gap (it lands in Inbox > Corrections as "hours")
export function HoursUnknown({ p }: { p: KPlace }) {
  const { c, lang } = useK();
  const correct = useOpenCorrection();
  return <div className="open-tl unknown"><span className="live-pill unknown"><i className="live" />{c.open.unknown}</span><Link className="hours-ask press" href={`${placeHref(p, lang)}correct/`} onClick={(e) => { if (desk()) return; e.preventDefault(); correct(p); }}><L n="clock-plus" />{c.open.tellUs}</Link></div>;
}
/** The opening piece of a place: one of the four states. */
export function OpenPiece({ p }: { p: KPlace }) {
  const { now, lang } = useK();
  const st = openState(p, now, lang);
  return st ? (st.allDay ? <AllDay /> : st.until ? <OpenBar st={st} /> : <StatePill st={st} />) : <HoursUnknown p={p} />;
}

export function Meta({ p, extra }: { p: KPlace; extra?: ReactNode }) {
  const { openSwap } = useSwap();
  const key = (e: React.KeyboardEvent, kind: 'cat' | 'area') => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSwap(kind, p); } };
  return (
    <span className="meta">
      <span className="cat-bubble press" role="button" tabIndex={0} data-act="meta-cat" data-id={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSwap('cat', p); }} onKeyDown={(e) => key(e, 'cat')}><L n={catIcon(p.cat)} />{p.catLabel}</span>
      <span className="cat-bubble area-bubble press" role="button" tabIndex={0} data-act="meta-area" data-id={p.id} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openSwap('area', p); }} onKeyDown={(e) => key(e, 'area')}><L n="map-pin" />{p.area || p.city}</span>
      {extra}
    </span>
  );
}
// Meta swap: tapping a bubble opens the real list to swap that half (the place's city stays).
// TODO: use src/5argny/rules/metaSwap.ts. Per-row counts and views need /v1/places/counts and /v1/aggregates/views; hidden until then.
function useSwap() {
  const { openSheet, c, lang, go, dismissAll, setLoc } = useK();
  const { data: categories = [] } = useCategories();
  const { data: cities = [] } = useCities();
  return {
    openSwap: (kind: 'cat' | 'area', p: KPlace) => {
      haptic();
      const area = p.area || p.city;
      const city0 = cities.find((x) => x.id === p.cityId);
      // the swap lands on Explore with that half changed: the place's city, the area (if any), the category
      const href = (catId: string, region: string | null) => { const cat = categories.find((x) => x.id === catId); return { to: `${langPrefix(lang)}/explorer/?cat=${encodeURIComponent(cat?.nameEn || cat?.nameAr || '')}`, loc: { city: p.citySlug, area: region ? regionLabel(region, lang, city0?.nameEn || city0?.name) || region : null } }; };
      const row = (key: string, label: string, icon: string, { to, loc }: { to: string; loc: { city: string; area: string | null } }, on: boolean) => <button key={key} className="option press" role="radio" aria-checked={on} data-act="meta-pick" onClick={(e) => { haptic(); e.currentTarget.closest('.sheet')?.querySelectorAll('[role="radio"]').forEach((o) => o.setAttribute('aria-checked', String(o === e.currentTarget))); setTimeout(() => dismissAll(() => { setLoc(loc); go(to); }), 220); }}><L n={icon} /><span className="grow">{label}</span><Ic n="check" cls="check" /></button>;
      if (kind === 'cat') openSheet(fill(c.place.swap.what, { area }), categories.map((x) => { const en = x.nameEn || x.nameAr; return row(x.id, (lang === 'ar' ? x.nameAr : en) || en, catIcon(en), href(x.id, p.region), x.id === p.catId); }));
      else {
        const city = cities.find((x) => x.id === p.cityId);
        const keys = city?.areaKeys?.length ? city.areaKeys : p.region ? [p.region] : [];
        openSheet(fill(c.place.swap.where, { cat: p.catLabel }), keys.map((key) => row(key, regionLabel(key, lang, city?.nameEn || city?.name) || key, 'map-pin', href(p.catId, key), key === p.region)));
      }
    },
  };
}

export function Carousel({ photos }: { photos: KPlace['photos'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const { c, lang } = useK();
  const step = (e: MouseEvent, v: number) => { e.preventDefault(); e.stopPropagation(); const car = ref.current!; car.scrollBy({ left: v * (lang === 'ar' ? -1 : 1) * car.clientWidth, behavior: reduce() ? 'auto' : 'smooth' }); };
  return <>
    <div className="carousel" data-carousel ref={ref} onScroll={(e) => setAt(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}>
      
      {photos.map((ph, i) => <img decoding="async" key={(ph.m || ph.s) + i} src={photoMedium(ph)} alt="" draggable={false} loading={i ? 'lazy' : 'eager'} />)}
    </div>
    {photos.length > 1 ? <div className="dots"><button className="dot-nav press" data-act="car-step" aria-label={c.common.previousPhoto} onClick={(e) => step(e, -1)}><L n="chevron-left" /></button>{photos.map((_, i) => <i key={i} className={i === at ? 'on' : ''} />)}<button className="dot-nav press" data-act="car-step" aria-label={c.common.nextPhoto} onClick={(e) => step(e, 1)}><L n="chevron-right" /></button></div> : null}
  </>;
}

/**
 * Share (owner 2026-11-14): the device's own share sheet straight away (lib/share-place sharePlace); where the browser has
 * none, the link is copied with a toast. The share counts (+1) only when it really went out: shared, or copied.
 */
export function useShare() {
  const { c, toast, lang } = useK();
  return (p?: { id?: string; href: string; name?: string }, onShared?: () => void) => {
    const path = new URL(p ? p.href : location.href, location.origin).pathname;
    void sharePlace({ name: p?.name || document.title, path, locale: lang, placeId: p?.id }).then(async (r) => {
      if (r === 'failed') { // no user activation left (a share after a network wait) or no share sheet: copy instead
        try { await navigator.clipboard.writeText(new URL(path, location.origin).href); r = 'copied'; if (p?.id) trackPlaceAction('share', p.id); } catch { return; }
      }
      if (r === 'copied') toast(c.common.linkCopied);
      if (r === 'shared' || r === 'copied') onShared?.();
    });
  };
}

function useDirections() {
  const { openSheet, c, closeTop, toast } = useK();
  return (p: KPlace) => {
    const ll = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : '';
    const q = encodeURIComponent([p.name, p.address || p.area, p.city].filter(Boolean).join(' '));
    // straight to directions to the place; the name and address only when it has no coordinates
    const links = [ll ? `https://www.google.com/maps/dir/?api=1&destination=${ll}` : `https://www.google.com/maps/dir/?api=1&destination=${q}`, ll ? `https://maps.apple.com/?daddr=${ll}` : `https://maps.apple.com/?daddr=${q}`];
    const icons = ['/maps/google-maps.svg', '/maps/apple-maps.svg'];
    openSheet(c.go5.mapsSheet, <>{p.address || p.area ? <p className="t-small" style={{ padding: '0 4px 8px' }}>{p.address || p.area}</p> : null}{c.go5.maps.map((n, i) => <button key={n} className="option press map-opt" data-act="go-maps" data-v={n} onClick={() => { closeTop(); haptic(); toast(fill(c.common.opening, { name: n })); window.open(links[i], '_blank', 'noopener'); }}><img decoding="async" className="map-ic" src={icons[i]} alt="" width={28} height={28} /><span className="grow">{n}</span></button>)}</>);
  };
}

/** 5argny!: the arrow takes off, the word pops; when it lands the maps choice opens and the arrow comes home. */
export function Go5({ p, wide, small }: { p: KPlace; wide?: boolean; small?: boolean }) {
  const { c } = useK();
  const directions = useDirections();
  const [taps, setTaps] = useState(0);
  const busy = useRef(false);
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation(); if (busy.current) return; busy.current = true; haptic();
    const el = e.currentTarget, icn = el.querySelector<HTMLElement>('.go5-ic')!, word = el.querySelector('b');
    const home = () => { busy.current = false; icn.style.opacity = ''; animate(icn, { transform: ['translate(-8px,8px) scale(.5)', 'translate(0,0) scale(1)'], opacity: [0, 1] }, spring(0.25, 0.4)); };
    const goNow = () => { directions(p); setTaps((n) => n + 1); trackPlaceAction('directions', p.id); /* counted from this event only: the old POST /directions counts nothing */ setTimeout(home, 250); };
    if (reduce()) { goNow(); return; }
    animate(el, { transform: ['scale(1)', 'scale(.94)', 'scale(1.04)', 'scale(1)'] }, { duration: 0.5 });
    if (word) animate(word, { transform: ['translateY(0)', 'translateY(-3px)', 'translateY(0)'] }, { duration: 0.45 });
    const r = icn.getBoundingClientRect(), from = getComputedStyle(icn).color, acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), BIG = 80, s0 = r.width / BIG;
    const fly = document.createElement('div'); fly.className = 'go5-fly'; fly.innerHTML = icn.innerHTML;
    Object.assign(fly.style, { left: r.left + r.width / 2 + 'px', top: r.top + r.height / 2 + 'px', width: BIG + 'px', height: BIG + 'px', color: from, transform: `translate(-50%,-50%) scale(${s0})` });
    (document.getElementById('fx') || document.body).append(fly); icn.style.opacity = '0';
    animate(fly, {
      transform: [`translate(-50%,-50%) scale(${s0}) rotate(0deg)`, `translate(calc(-50% - 2px), calc(-50% + 2px)) scale(${s0 * 0.9}) rotate(-6deg)`, `translate(calc(-50% + 64px), calc(-50% - 52px)) scale(${s0 * 2.4}) rotate(8deg)`, `translate(calc(-50% + 104px), calc(-50% - 88px)) scale(${s0 * 3.6}) rotate(12deg)`],
      color: [from, from, acc, acc], opacity: [1, 1, 1, 0], offset: [0, 0.16, 0.72, 1],
    } as never, { duration: 0.75, ease: [0.4, 0, 0.2, 1] }).finished.then(() => { fly.remove(); setTimeout(goNow, 250); });
  };
  return (
    <button className={`btn primary press go5 ${wide ? 'wide' : ''} ${small ? 'go5-sm' : ''}`} data-act="go5" data-id={p.id} aria-label={c.go5.aria} onClick={onClick}>
      <span className="go5-ic"><L n="navigation" /></span><b>{c.go5.label}</b>
      {small ? null : <em className="go5-n" title={c.stats.goBefore}><L n="users" /><Cnt base={p.dir + taps} /></em>}
    </button>
  );
}

function ActBtn({ icon, label, act, p, base, on, onClick, lang }: { lang: 'en' | 'ar'; icon: 'heart' | 'saved' | 'share'; label: string; act: 'like' | 'save' | 'share'; p: KPlace; base: number | null; on: boolean; onClick: (e: MouseEvent<HTMLButtonElement>) => void }) {
  return <button className={`icon-btn act-btn ${act === 'like' ? 'like' : ''} press ${on ? 'on' : ''}`} aria-label={label} aria-pressed={act === 'share' ? undefined : on} data-act={act} data-id={p.id} data-href={placeHref(p, lang)} onClick={onClick}><Ic n={icon} /><Cnt base={base} /></button>;
}
/** Love, save and share with counts under the icons, plus views. Loves are a total; the rest are the last 30 days. */
export function Actions({ p, end }: { p: KPlace; end?: ReactNode }) {
  const { c, toast, lang } = useK();
  const s = usePlaceStats(p.id, !p.d30);
  const love = useLove(p), save = useSave(p), share = useShare();
  const shares = useMyShares(p.id);
  const d = s?.d30 ?? p.d30; // the card's 30-day numbers when the stats route is not loaded
  const mine = useMyViews(p.id);
  const pop = (e: MouseEvent<HTMLButtonElement>, kf: string[], sp: ReturnType<typeof spring>) => { const svg = e.currentTarget.querySelector('svg'); if (svg) animate(svg, { transform: kf }, sp); };
  return <>
    <ActBtn lang={lang} icon="heart" label={c.common.love} act="like" p={p} base={love.count} on={love.on} onClick={(e) => { e.preventDefault(); haptic(); love.toggle(); pop(e, ['scale(.6)', 'scale(1)'], spring(0.5, 0.45)); }} />
    <ActBtn lang={lang} icon="saved" label={c.common.save} act="save" p={p} base={d ? d.saves + save.delta : null} on={save.on} onClick={(e) => { e.preventDefault(); haptic(); save.toggle(); pop(e, ['scale(.75)', 'scale(1)'], spring(0, 0.35)); toast(save.on ? c.saved.removed : c.saved.added); }} />
    <ActBtn lang={lang} icon="share" label={c.common.share} act="share" p={p} base={d ? d.shares + shares : null} on={false} onClick={(e) => { e.preventDefault(); share({ id: p.id, href: placeHref(p, lang), name: p.name }, () => bumpShare(p.id)); }} />
    <span className="act-views" title={c.stats.opened30}><Ic n="eye" /><Cnt base={d ? d.views + mine : null} /></span>
    <span className="grow" />{end}
  </>;
}

export function Stats({ p }: { p: KPlace }) {
  const { c } = useK();
  const s = usePlaceStats(p.id, !p.d30); // a card carries its own 30-day numbers: no request per card
  const love = useLove(p), save = useSave(p), mine = useMyViews(p.id), shared = useMyShares(p.id);
  const d = s?.d30 ?? p.d30; // the card's 30-day numbers when the stats route is not loaded
  const st = (icon: 'eye' | 'heart' | 'saved' | 'share' | 'go', title: string, base: number | null) => base == null ? null : <span className="views" title={title}><Ic n={icon} /><Cnt base={base} /></span>;
  return <span className="stats">
    {st('eye', c.stats.views30, d ? d.views + mine : null)}{st('heart', c.stats.loves, love.count)}{st('saved', c.stats.saves30, d ? d.saves + save.delta : null)}{st('share', c.stats.shares30, d ? d.shares + shared : null)}{st('go', c.stats.goTotal, p.dir)}
  </span>;
}

export const Tile = memo(function Tile({ p, extra, surface, position, term }: { p: KPlace; extra?: ReactNode } & CardTrack) {
  const { lang, now } = useK();
  const router = useRouter();
  const st = openState(p, now, lang);
  const ref = useRef<HTMLAnchorElement>(null);
  const href = placeHref(p, lang);
  useShowing(ref, surface, p.id, position);
  // the first row of a grid arrives with the page; further cards wait until they are near the screen. The leading photo
  // also asks the browser for it first (issue #39, images).
  const eager = position != null && position <= 4;
  return (
    <Link ref={ref} className={`card tile press ${extra ? 'with-extra' : ''}`} data-item href={href} onPointerDown={() => router.prefetch(href)} onClick={term ? () => trackSearchTap(term, p.id, position ?? 1) : undefined}>
      
      <span className="tile-media"><img decoding="async" src={p.photos[0]?.s} alt="" loading={eager ? 'eager' : 'lazy'} fetchPriority={position === 1 ? 'high' : undefined} />{st ? <StatePill st={st} cls="tm-count" /> : null}</span>
      <div className="tile-body"><b dir="auto">{p.name}</b><span style={{ display: 'block', margin: '3px 0 2px' }}><Stats p={p} /></span><span className="t-small">{p.area || p.city}</span>{p.distanceKm != null ? <span className="bits" style={{ marginTop: 4 }}><KmAway p={p} /></span> : null}{extra}</div>
    </Link>
  );
});

/** A Tile's skeleton: the Tile's own markup with stand-in words (five counts, as a list card carries), so nothing moves when it lands. */
export function TileSkel() {
  return <div className="card tile skel" aria-hidden="true"><span className="tile-media"><Sk cls="sk-img" /></span>
    <div className="tile-body"><b><span className="sk">Place name here</span></b><span style={{ display: 'block', margin: '3px 0 2px' }}><span className="stats">{['eye', 'heart', 'saved', 'share', 'go'].map((n) => <span key={n} className="views sk"><Ic n={n as 'eye'} /><span className="n">0</span></span>)}</span></span><span className="t-small"><span className="sk">Area, City</span></span></div></div>;
}

/** A feed Post's skeleton: the Post's own markup (head, photo, actions and 5argny!) with stand-ins. */
export function PostSkel() {
  const { c } = useK();
  return <article className="card post skel" aria-hidden="true">
    <header className="post-head"><Sk cls="avatar" w={32} h={32} r={999} /><div className="post-who"><b><span className="sk">Place name here</span></b><span className="meta"><span className="cat-bubble sk">Category</span><span className="cat-bubble sk">Area name</span></span></div><span className="live-pill sk">Open</span></header>
    <div className="media"><Sk style={{ position: 'absolute', inset: 0, borderRadius: 0 }} /></div>
    <div className="post-foot"><div className="post-actions">{(['heart', 'saved', 'share'] as const).map((n) => <span key={n} className="icon-btn act-btn sk"><Ic n={n} /><span className="n">00</span></span>)}<span className="act-views sk"><Ic n="eye" /><span className="n">0.0k</span></span><span className="grow" />
      <span className="btn primary go5 sk"><span className="go5-ic"><L n="navigation" /></span><b>{c.go5.label}</b><em className="go5-n"><L n="users" /><span className="n">00</span></em></span></div></div>
  </article>;
}

/**
 * Decision 0006. One tracker per screen visit (Shell mounts the scope); a card reports how visible it is and the rule
 * (rules/showing.ts) decides: half on screen for 1 s, once per card per visit. Only an IntersectionObserver: no per-frame work.
 */
const ShowingCtx = createContext<ReturnType<typeof createShowing> | null>(null);
export function ShowingScope({ children }: { children: ReactNode }) {
  const [tracker] = useState(createShowing);
  useEffect(() => () => tracker.stop(), [tracker]);
  return <ShowingCtx.Provider value={tracker}>{children}</ShowingCtx.Provider>;
}
export type CardTrack = { surface?: ShowingSurface; position?: number; mark?: 'rising' | 'new' | null; term?: string };
export function useShowing(ref: React.RefObject<HTMLElement | null>, surface: ShowingSurface | undefined, id: string, position = 1) {
  const tracker = useContext(ShowingCtx);
  // eslint-disable-next-line react-hooks/refs -- issue #34 deferred: the effect reads the latest position without re-subscribing; restructuring needs scroll verification
  const at = useRef(position); at.current = position;
  useEffect(() => {
    const el = ref.current; if (!tracker || !surface || !el) return;
    const key = `${surface}:${id}`, fire = () => trackPlaceShowing(id, surface, at.current);
    // one observer for every card on the screen, not one each (issue #39)
    const off = observeVisibility(el, 0.5, (ratio) => tracker.visible(key, ratio, fire));
    return () => { off(); tracker.visible(key, 0, fire); };
  }, [ref, tracker, surface, id]);
}


export function BadgeTags({ p }: { p: KPlace }) {
  const label = useBadgeLabel();
  return <>{p.badges.map((b, i) => <Tag key={b.key + i} label={label(b)} tone="good" icon={badgeIcon(b)} />)}</>;
}

// a post seen 60% for 1 s counts as a view, once per session (proto feedIO)
const feedSeen = new Set<string>();
function useFeedView(ref: React.RefObject<HTMLElement | null>, id: string) {
  useEffect(() => {
    const el = ref.current; if (!el || feedSeen.has(id)) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    let off: () => void = () => {};
    off = observeVisibility(el, 0.6, (ratio) => {
      if (ratio < 0.6) { clearTimeout(t); t = undefined; return; }
      if (t) return;
      t = setTimeout(() => { if (feedSeen.has(id)) return; feedSeen.add(id); off(); bumpView(id); }, 1000);
    });
    return () => { clearTimeout(t); off(); };
  }, [ref, id]);
}

export function Post({ p, surface, position, mark }: { p: KPlace } & CardTrack) {
  const { lang, now, go } = useK();
  const st = openState(p, now, lang);
  const ref = useRef<HTMLElement>(null);
  useFeedView(ref, p.id);
  useShowing(ref, surface, p.id, position);
  // a tap opens the place after the double-tap window, unless that tap became a love or the second press of a double tap (love or hold to share)
  const onClick = (e: MouseEvent) => { if ((e.target as Element).closest('button,a,[role="button"]')) return; clearTimeout(openT); if (secondPress) { secondPress = false; return; } openT = setTimeout(() => { if (Date.now() - lastLoveAt() > 450) go(placeHref(p, lang)); }, 300); };
  return (
    <article ref={ref} className="card post press" data-item data-open={p.slug} data-id={p.id} onClick={onClick}>
      
      <header className="post-head"><img decoding="async" className="avatar" src={(p.photos[1] || p.photos[0])?.s} alt="" /><div className="post-who"><b dir="auto">{p.name}</b><Meta p={p} /></div>{st ? <StatePill st={st} /> : null}</header>
      <div className="media"><Carousel photos={p.photos.slice(0, 5)} /></div>
      <div className="post-foot">{p.badges.length ? <p className="post-meta"><BadgeTags p={p} /></p> : null}
        <div className="post-actions"><Actions p={p} end={<Go5 p={p} />} /></div></div>
    </article>
  );
}

let openT: ReturnType<typeof setTimeout> | undefined, secondPress = false;
/** Every press in a love zone says whether it is the second of a double tap; the second one never opens the place (proto app.js:1025). */
export const markPress = (second: boolean) => { secondPress = second; if (second) clearTimeout(openT); };
let loveAt = 0;
export const lastLoveAt = () => loveAt;
export const markLove = () => { loveAt = Date.now(); };
