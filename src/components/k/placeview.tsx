'use client';
// A place, from proto/app.js PlaceContent(): one body for the phone sheet and the page; the page adds the back pin,
// the side column (5argny!/Call, On 5argny, Earned) on desktop and the action bar on a phone.
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import { animate } from 'motion';
import { amenityIcons, amenityIconFallback } from '@5argny/core/icons';
import { fill } from '@5argny/core/copy';
import { usePlace, useSimilarPlaces } from '@/lib/api/hooks/use-places';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { priceBandLabel } from '@/lib/price-bands';
import { L, Ic } from './icons';
import { Btn, IconBtn, Group } from './bits';
import { t12, k, hypePath } from './rules';
import { toK, placeHref, type KPlace, type KStats } from './data';
import { Carousel, Meta, OpenPiece, Actions, Go5, Tile, usePlaceStats, badgeIcon, useBadgeLabel, useShare, bumpView, useMyViews } from './place';
import { Shell, putOpened } from './Shell';
import { withBrand, HomeView, type HomeData } from './home';
import { useK, spring, desk } from './KProvider';
import { PlaceMoreBody } from './collections';
import { useOpenCorrection } from './settings';

export function useKPlace(slug: string) {
  const { lang } = useK();
  const { data: raw } = usePlace(slug);
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  return raw ? toK(raw as never, { cities, categories }, lang) : null;
}

/** The hype line: one smooth curve of daily views, dated, with the busiest day and today marked; slide over it to read any day. */
function HypeLine({ days }: { days: number[] }) {
  const { c, now, lang } = useK();
  const loc = lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB'; // Arabic dates, western digits
  const fillId = useId().replace(/:/g, '');
  const W = 300, H = 70, n = days.length;
  const { d, pt, max } = hypePath(days, W, H);
  const dayOf = (i: number) => { const x = new Date(now.date); x.setDate(x.getDate() - (n - 1 - i)); return x; };
  const fmt = (x: Date) => x.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short' });
  const peak = days.lastIndexOf(max), last = pt[n - 1], top = pt[peak]; // a tie goes to the most recent day
  const wk = days.slice(-7).reduce((a, b) => a + b, 0), prev = days.slice(-14, -7).reduce((a, b) => a + b, 0), g = prev ? (wk - prev) / prev : 0;
  const pct = (q: number[]) => ({ left: `${(q[0] / W) * 100}%`, top: `${(q[1] / H) * 100}%` });
  const [cur, setCur] = useState<number | null>(null);
  const read = (e: React.PointerEvent<HTMLDivElement>) => { const r = e.currentTarget.getBoundingClientRect(); setCur(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1))))); };
  const cx = cur == null ? 0 : (pt[cur][0] / W) * 100;
  const say = Math.abs(g) < 0.03 ? c.overview.steady : g > 0 ? fill(c.overview.busier, { pct: Math.round(g * 100) }) : fill(c.overview.quieter, { pct: Math.round(-g * 100) });
  return (
    <div className="hype">
      <p className="hype-say"><L n={g >= 0 ? 'trending-up' : 'trending-down'} /><b className={g >= 0 ? 'up' : 'down'}>{say}</b> {c.overview.thanLastWeek}</p>
      <div className="hype-plot" data-w={W} role="img" aria-label={fill(c.overview.aria, { day: fmt(dayOf(peak)), n: max })}
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} read(e); }} onPointerMove={read} onPointerLeave={() => setCur(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><defs><linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".2" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
          <path className="hype-area" d={`${d} L${last[0]},${H} L${pt[0][0]},${H} Z`} fill={`url(#${fillId})`} /><path className="hype-line" d={d} pathLength={1} /></svg>
        <i className="hype-dot peak" style={pct(top)} /><span className="hype-tag" style={{ left: `clamp(40px, ${(top[0] / W) * 100}%, calc(100% - 40px))`, top: `${(top[1] / H) * 100}%` }}><L n="flame" />{c.overview.busiest}</span><i className="hype-dot now" style={pct(last)} />
        <i className="hype-guide" hidden={cur == null} style={{ left: cx + '%' }} /><i className="hype-dot hype-cur" hidden={cur == null} style={cur == null ? undefined : pct(pt[cur])} />
        <span className="hype-tip" hidden={cur == null} style={{ left: `clamp(40px, ${cx}%, calc(100% - 40px))` }}>{cur == null ? null : <><b>{fill(c.overview.tip, { n: days[cur] })}</b> {cur === n - 1 ? c.days.today : fmt(dayOf(cur))}</>}</span></div>
      <div className="hype-ticks t-micro">{[n - 22, n - 15, n - 8].map((i) => <span key={i} style={{ left: `${(pt[i][0] / W) * 100}%` }}>{dayOf(i).toLocaleDateString(loc, { day: 'numeric', month: 'short' })}</span>)}<span style={{ left: `${(last[0] / W) * 100}%` }}>{c.days.today}</span></div>
      <p className="hype-help t-micro"><L n="hand" />{fill(c.overview.help, { day: fmt(dayOf(peak)), n: max })}</p>
    </div>
  );
}

/** On 5argny: views in the last 30 days, the hype line, then 30 days against all time. Needs the stats route. */
function Overview({ s, id }: { s: KStats; id: string }) {
  const { c } = useK();
  const mine = useMyViews(id); // this session's own view, as the counts show it
  if (!s.d30 || !s.all) return null;
  const row = (icon: 'eye' | 'heart' | 'saved' | 'share' | 'go', l: string, a: number, b: number) => <div className="row"><span className="grow"><Ic n={icon} /> {l}</span><b style={{ minWidth: 64, textAlign: 'end' }}>{k(a)}</b><span className="t-small" style={{ minWidth: 64, textAlign: 'end' }}>{k(b)}</span></div>;
  return (
    <section className="group" aria-label="On khargny"><div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}><h2 className="group-title" style={{ margin: 0 }}>{withBrand(c.overview.title)}</h2></div>
      <p style={{ margin: '8px 0 2px' }}><b style={{ font: '900 24px/1 var(--display)' }}>{k(s.d30.views + mine)}</b> <span className="t-small">{c.overview.viewed}</span></p>{s.d30.days?.length === 30 ? <HypeLine days={s.d30.days} /> : null}
      <div className="row t-micro"><span className="grow" /><span style={{ minWidth: 64, textAlign: 'end' }}>{c.overview.days30}</span><span style={{ minWidth: 64, textAlign: 'end' }}>{c.overview.allTime}</span></div>
      {row('eye', c.overview.rows.views, s.d30.views + mine, s.all.views + mine)}{row('heart', c.overview.rows.likes, s.d30.likes, s.all.likes)}{row('saved', c.overview.rows.saves, s.d30.saves, s.all.saves)}{row('share', c.overview.rows.shares, s.d30.shares, s.all.shares)}{row('go', c.overview.rows.go, s.d30.goes, s.all.goes)}</section>
  );
}

function Badges({ p }: { p: KPlace }) {
  const { c } = useK();
  const label = useBadgeLabel();
  if (!p.badges.length) return null;
  return <section className="group" aria-label="Earned on 5argny"><h2 className="group-title"><L n="award" /> {withBrand(c.home.earned)}</h2>{p.badges.map((b, i) => <div key={b.key + i} className="badge-row"><span className="badge-ic"><L n={badgeIcon(b)} /></span><span className="grow"><b>{label(b)}</b><span className="t-small">{(c.badges.meaning as Record<string, string>)[b.key] || ''}</span></span></div>)}</section>;
}

// amenities: an icon grid with the dashboard's own icons; first 8, then the rest in a bottom sheet
function Amenities({ p, all }: { p: KPlace; all?: boolean }) {
  const { c, openSheet } = useK();
  const list = all ? p.amen : p.amen.slice(0, 8);
  return <><div className="amen-grid">{list.map((a) => <div key={a} className="amen-item"><span className="amen-ic"><L n={amenityIcons[a] || amenityIconFallback} /></span><span>{a}</span></div>)}</div>
    {!all && p.amen.length > 8 ? <div style={{ marginTop: 10 }}><Btn label={fill(c.common.showAll, { n: p.amen.length })} act="amen-all" onClick={() => openSheet(c.place.amenities, <Amenities p={p} all />)} /></div> : null}</>;
}

function Similar({ p }: { p: KPlace }) {
  const { c, lang } = useK();
  const { data = [] } = useSimilarPlaces(p.id);
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const list = data.filter((x) => x.id !== p.id).slice(0, 8).map((x) => toK(x as never, { cities, categories }, lang));
  if (!list.length) return null;
  return <section className="rail"><div className="rail-head"><h2 className="t-head">{c.place.similar}</h2><Link className="btn plain press" href={`/${lang}/explorer/${p.citySlug}/`}>{c.common.seeAll}</Link></div><div className="rail-row">{list.map((x) => <Tile key={x.id} p={x} />)}</div></section>;
}

/** The place itself: body (both layouts), foot (5argny! and Call), side (desktop column). */
export function usePlaceParts(p: KPlace) {
  const { c, lang, now, openSheet, toast, closeTop } = useK();
  const s = usePlaceStats(p.id);
  const today = now.day;
  const band = p.band ? priceBandLabel(p.band, lang) : null;
  const hours = p.hours.length ? <Group title={c.place.hours}>{[...p.hours].sort((a, b) => ((a.d - today + 7) % 7) - ((b.d - today + 7) % 7)).map((h) => <div key={h.d} className={`row ${h.d === today ? 'today' : ''}`}><span className="grow">{c.days.long[h.d]}{h.d === today ? <> <span className="tag accent">{c.days.today}</span></> : null}</span><span>{h.x || !h.o || !h.c ? c.place.closedDay : `${t12(h.o, lang)} – ${t12(h.c, lang)}`}</span></div>)}</Group> : null;
  const amen = p.amen.length ? <Group title={lang === 'ar' ? c.place.amenities : fill(c.place.amenitiesOf, { name: p.name })}><Amenities p={p} /></Group> : null;
  const more = [
    p.ig && <button key="ig" className="row press" data-act="open-link" style={{ width: '100%', textAlign: 'start' }} onClick={() => window.open(p.ig!.startsWith('http') ? p.ig! : `https://instagram.com/${p.ig!.replace(/^@/, '')}`, '_blank', 'noopener')}><Ic n="insta" /><span className="grow">{c.place.instagram}</span></button>,
    p.web && <button key="web" className="row press" data-act="open-link" style={{ width: '100%', textAlign: 'start' }} onClick={() => window.open(p.web!, '_blank', 'noopener')}><Ic n="globe" /><span className="grow">{c.place.website}</span></button>,
    p.address && <button key="addr" className="row press" data-act="copy-address" style={{ width: '100%', textAlign: 'start' }} onClick={() => { void navigator.clipboard?.writeText(p.address!); toast(c.place.addressCopied); }}><Ic n="pin" /><span className="grow">{p.address}</span><Ic n="copy" /></button>,
  ].filter(Boolean);
  const placeMore = () => openSheet(c.common.more, <PlaceMoreBody p={p} before={p.promoted ? <p className="t-small" style={{ padding: '4px 4px 10px' }}>{c.place.promotedMore}</p> : null} />);
  const correct = useOpenCorrection();
  const call = () => openSheet(c.place.call, <><p style={{ font: '900 26px/1.2 var(--display)', textAlign: 'center', padding: '6px 0 4px' }} dir="ltr">{p.phone}</p><p className="t-small" style={{ textAlign: 'center', marginBottom: 12 }}>{p.name}</p></>,
    <a className="btn primary wide press" href={`tel:${(p.phone || '').replace(/\s+/g, '')}`} onClick={() => setTimeout(closeTop, 300)}><Ic n="phone" />{c.place.callNow}</a>);
  const body = <>
    <div className="place-media"><Carousel photos={p.photos} /></div>
    <div className="place-head"><span className="gesture-hint" aria-hidden="true">
      <span><svg className="gh-love" viewBox="0 0 20 20"><circle className="tap t1" cx="10" cy="10" r="3" /><circle className="tap t2" cx="10" cy="10" r="3" /><path className="hrt" d="M10 16.4s-5.6-3.4-7.1-6.7C1.8 7.2 3.4 4.6 6.1 4.6c1.7 0 2.9 1 3.9 2.4 1-1.4 2.2-2.4 3.9-2.4 2.7 0 4.3 2.6 3.2 5.1-1.5 3.3-7.1 6.7-7.1 6.7z" /></svg>{c.place.loveHint}</span>
      <span><svg className="gh-share" viewBox="0 0 20 20"><circle className="tap t1" cx="10" cy="10" r="3" /><circle className="tap t2" cx="10" cy="10" r="3" /><circle className="track" cx="10" cy="10" r="7.5" /><circle className="fill" cx="10" cy="10" r="7.5" pathLength={1} /><path className="arr" d="M10 13V5.5M7 8.2 10 5.2l3 3M5.5 11.5v3h9v-3" /></svg>{c.place.shareHint}</span></span><h1 className="t-display">{p.name}</h1>
      <p style={{ marginTop: 6 }}><Meta p={p} extra={band ? <span className="meta-area"><L n="wallet" />{band}</span> : null} /></p><OpenPiece p={p} /></div>
    <div className="place-tools"><Actions p={p} end={<IconBtn icon="more" label={c.common.more} cls="filled" act="place-more" id={p.id} onClick={placeMore} />} /></div>
    <div className="phone-only"><Badges p={p} />{s ? <Overview s={s} id={p.id} /> : null}</div>
    {/* TODO: "<Place> services" (menu items with "from N EGP") once the backend serves p.services; the prototype's offers are samples */}
    {hours}{amen}{more.length ? <Group title={c.place.contact}>{more}</Group> : null}<Similar p={p} />
    {p.promoted ? <p className="t-micro page-pad" style={{ margin: '4px 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}><L n="info" />{c.place.promoted}</p> : null}
    <Link className="corr-entry page-pad press" href={`${placeHref(p, lang)}correct/`} data-act="corr-open" onClick={(e) => { if (desk()) return; e.preventDefault(); correct(p); }}><L n="flag" /><span className="grow">{c.place.correctionAsk}</span><b>{c.place.correctionCta}</b><L n="chevron-right" /></Link>
  </>;
  const foot = <><Go5 p={p} wide />{p.phone ? <Btn label={c.place.call} icon="phone" act="call" wide onClick={call} /> : null}</>;
  const side = <>{s ? <Overview s={s} id={p.id} /> : null}<Badges p={p} /></>;
  return { body, foot, side };
}

function useSeen(p: KPlace | null) {
  useEffect(() => { if (!p) return; putOpened(p); bumpView(p.id); }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Desktop, or a place landed on directly: a page with the back pin, the side column and (phone) the action bar. */
export function PlacePage({ slug }: { slug: string }) {
  const p = useKPlace(slug);
  useSeen(p);
  if (!p) return <Shell cur="explore" wide>{null}</Shell>;
  return <PlacePageBody p={p} />;
}
function PlacePageBody({ p }: { p: KPlace }) {
  const { c, go, lang } = useK();
  const { body, foot, side } = usePlaceParts(p);
  const back = () => (history.length > 1 ? history.back() : go(`/${lang}`));
  return <Shell cur="explore" wide actionbar={foot}>
    <div className="place-wrap"><div><div className="back-pin"><IconBtn icon="back" label={c.common.back} cls="page-back" act="page-back" onClick={back} /></div>{body}</div>
      <aside className="place-side"><div className="card" style={{ padding: 14, display: 'grid', gap: 8 }}>{foot}</div>{side}</aside></div>
  </Shell>;
}

/** Phone, opened from inside the site: the content of the place sheet; a push inside it slides from the side it goes back to. */
export function PlaceSheetBody({ slug }: { slug: string }) {
  const p = useKPlace(slug);
  const { content, lang } = useK();
  useSeen(p);
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const body = ref.current?.closest('.sheet-body') as HTMLElement | null; if (!body) return;
    if (first.current) { first.current = false; return; }
    body.scrollTop = 0;
    const dir = (content?.dir ?? 1) * (lang === 'ar' ? -1 : 1);
    animate(body, { opacity: [0, 1], transform: [`translateX(${36 * dir}px)`, 'translateX(0)'] }, spring(0, 0.4));
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={ref} style={{ display: 'contents' }}>{p ? <SheetParts p={p} part="body" /> : null}</div>;
}
export function PlaceSheetFoot({ slug }: { slug: string }) {
  const p = useKPlace(slug);
  return p ? <SheetParts p={p} part="foot" /> : null;
}
function SheetParts({ p, part }: { p: KPlace; part: 'body' | 'foot' }): ReactNode {
  const parts = usePlaceParts(p);
  return parts[part];
}

const watchWidth = (f: () => void) => { const mq = matchMedia('(min-width:1024px)'); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); };
/**
 * A place landed on directly. Desktop: the page. Phone: as the prototype, Home with the place as a sheet over it
 * (grabber, close, pull down to close; closing leaves you on Home). The server renders the page, so search engines
 * and a phone before hydration get the full place.
 */
export function PlaceRoot({ slug, home }: { slug: string; home: HomeData }) {
  const phone = useSyncExternalStore(watchWidth, () => !matchMedia('(min-width:1024px)').matches, () => false);
  return phone ? <PhoneLanding home={home} /> : <PlacePage slug={slug} />;
}
function PhoneLanding({ home }: { home: HomeData }) {
  const { openLanded } = useK();
  useEffect(() => { openLanded(location.pathname); }, [openLanded]);
  return <HomeView data={home} />;
}
