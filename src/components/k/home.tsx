'use client';
/* eslint-disable @next/next/no-img-element -- the prototype's <img> markup, ported as is (photos come from the storage CDN in their sizes) */
// Home from proto/app.js Home(): Stories, TakeMe, Near you, Earned, Collections by 5argny, 5argny Social, and the right rail.
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { L, Ic } from './icons';
import { Brand, Tag, Bit } from './bits';
import { INTENTS, moment, t12, k, openState as openStateOf, type Intent } from './rules';
import { placeHref, type KPlace } from './data';
import { Post, Tile, Go5, StatePill, Meta, BadgeTags, usePlaceStats, catIcon } from './place';
import { Shell, usePlaceName } from './Shell';
import { useK, haptic, reduce, spring } from './KProvider';
import { useTrips, coverSrc } from '@/lib/trips/api';

export type HomeCollection = { id: string; slug: string; title: string; places: KPlace[] };
export type HomeData = { pool: KPlace[]; trending: KPlace[]; collections: HomeCollection[]; categories: { id: string; en: string; label: string }[]; openByCategory: Record<string, number> | null; totalByCategory: Record<string, number | null> };

/** "Earned on {brand}" with the brand drawn as the brand. */
export function withBrand(s: string) { const [a, b = ''] = s.split('{brand}'); return <>{a}<Brand />{b}</>; }

export function HomeView({ data }: { data: HomeData }) {
  const { c, loc, lang } = useK();
  const here = data.pool.filter((p) => (!loc.city || p.citySlug === loc.city) && (!loc.area || p.area === loc.area));
  const pool = here.length ? here : data.pool;
  const feed = pool.slice(0, 14);
  const near = pool.slice(10, 17);
  return (
    <Shell cur="home" right={<><TrendCard list={data.trending} /><MarketCard /></>}>
      <Stories list={pool.slice(0, 8)} />
      <TakeMe data={data} pool={pool} />
      <NearYou list={near.length ? near : pool.slice(0, 7)} />
      <Earned pool={pool} />
      <TeamCollections list={data.collections} />
      <h1 className="t-display page-pad social-h" style={{ margin: '6px 0 10px' }}>{withBrand(c.home.social)}</h1>
      {feed.map((p, i) => <Fragment key={p.id}><Post p={p} />{i === 3 ? <div className="desk-only"><Rail title={c.home.nearYou} list={pool.slice(10, 16)} href={`/${lang}/explorer/`} /></div> : null}</Fragment>)}
    </Shell>
  );
}

function Stories({ list }: { list: KPlace[] }) {
  const { lang } = useK();
  return <div className="rail-row stories" style={{ paddingTop: 4, paddingBottom: 12 }}>{list.map((p) => (
    <Link key={p.id} className="story press" data-item href={placeHref(p, lang)} style={{ flex: 'none', position: 'relative', width: 96, height: 150, borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--sh1)' }}>
      
      <img src={p.photos[0]?.s} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <b style={{ position: 'absolute', left: 8, right: 8, bottom: 7, color: '#fff', fontSize: 12, fontWeight: 750, lineHeight: 1.2, textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>{p.name}</b>
    </Link>))}</div>;
}

// shortcut: distances need the person's location (no prompt on load); the "x km away" bit stays hidden until there is one
const Mini = ({ p }: { p: KPlace }) => <Tile p={p} />;

function Rail({ title, list, href }: { title: string; list: KPlace[]; href: string }) {
  const { c } = useK();
  return <section className="rail"><div className="rail-head"><h2 className="t-head">{title}</h2><Link className="btn plain press" href={href}>{c.common.seeAll}</Link></div><div className="rail-row">{list.map((p) => <Mini key={p.id} p={p} />)}</div></section>;
}

// Phone: Near you is highlighted right under the intents
function NearYou({ list }: { list: KPlace[] }) {
  const { c, lang, loc } = useK();
  const where = usePlaceName();
  return <section className="near phone-only" aria-label={c.home.nearYou}><div className="rail-head"><h2 className="t-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}><Ic n="near" />{c.home.nearYou}</h2><Link className="btn plain press" href={`/${lang}/explorer/`}>{c.common.seeAll}</Link></div>
    <p className="t-small page-pad" style={{ margin: '-4px 0 8px' }}>{loc.city ? fill(c.home.nearestFirstIn, { place: where }) : c.home.nearestFirst}</p><div className="rail-row">{list.map((p) => <Mini key={p.id} p={p} />)}</div></section>;
}

function Earned({ pool }: { pool: KPlace[] }) {
  const { c, lang } = useK();
  const list = pool.filter((p) => p.badges.length).sort((a, b) => b.badges.length - a.badges.length);
  if (!list.length) return null;
  return <section className="rail earned"><div className="rail-head"><h2 className="t-head"><L n="award" /> {withBrand(c.home.earned)}</h2><Link className="btn plain press" href={`/${lang}/explorer/?badge=1`}>{fill(c.home.earnedAll, { n: list.length })}</Link></div>
    <div className="rail-row">{list.map((p) => <Tile key={p.id} p={p} extra={<span className="earned-tags"><BadgeTags p={p} /></span>} />)}</div></section>;
}

function TeamCollections({ list }: { list: HomeCollection[] }) {
  const { c, lang, toast } = useK();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  if (!list.length) return null;
  return <section className="rail cols"><div className="rail-head"><h2 className="t-head"><L n="library" /> {withBrand(c.home.teamCollections)}</h2></div>
    <div className="rail-row">{list.map((col) => {
      const ph = col.places.slice(0, 4), on = saved.has(col.id);
      return <div key={col.id} className="col-card" data-item>
        <Link className="card press" href={`/${lang}/c/${col.slug}/`}><span className={`col-cover n${Math.max(1, ph.length)}`}>{ph.length ? ph.map((p) => <img key={p.id} src={p.photos[0]?.s} alt="" loading="lazy" />) : <span className="col-empty"><L n="images" /></span>}</span>
          <span className="col-body"><b>{col.title}</b><span className="t-small"><span className="bit"><L n="badge-check" />{fill(c.collections.byTeam, { brand: '' })}<Brand /></span><span className="bit"><L n="map-pin" />{fill(c.collections.places, { n: col.places.length })}</span></span></span></Link>
        {/* TODO(T024): PUT /v1/home/sections/:id/save once it exists; the toggle is local until then */}
        <button className={`icon-btn col-save press ${on ? 'on' : ''}`} data-act="col-save" aria-pressed={on} aria-label={fill(c.collections.saveAria, { title: col.title })} onClick={(e) => { haptic(); const svg = e.currentTarget.querySelector('svg'); if (svg) animate(svg, { transform: ['scale(.7)', 'scale(1)'] }, spring(0.3, 0.35)); setSaved((s) => { const n = new Set(s); if (on) n.delete(col.id); else n.add(col.id); return n; }); toast(on ? c.collections.removedToast : c.collections.savedToast); }}><Ic n="saved" /></button>
      </div>;
    })}</div></section>;
}

/* ---------- "Take me out" card: answer first, photo tiles, Surprise me ---------- */
function TakeMe({ data, pool }: { data: HomeData; pool: KPlace[] }) {
  const { c, lang, now, openSheet } = useK();
  const where = usePlaceName();
  const m = moment(now), lead = m.x, rest = INTENTS.filter((x) => x.key !== lead.key).slice(0, 5);
  const inCats = (x: Intent) => pool.filter((p) => (x.cats as readonly string[]).includes(p.cat));
  const photoFor = (cats: readonly string[], n = 0) => { const list = pool.filter((p) => cats.includes(p.cat)); const pl = list[n % Math.max(1, list.length)] || pool[n % Math.max(1, pool.length)]; return pl?.photos[0]?.m || ''; };
  const leadPhotos = inCats(lead).slice(0, 4).map((p) => p.photos[0]?.m).filter(Boolean);
  // counts per category come from GET /v1/places/counts?when=now; without it the count pills stay hidden
  const openCount = (x: Intent) => (data.openByCategory ? data.categories.filter((cat) => (x.cats as readonly string[]).includes(cat.en)).reduce((a, cat) => a + (data.openByCategory![cat.id] ?? 0), 0) : null);
  const open = openCount(lead);
  const total = (x: Intent) => { const ns = data.categories.filter((cat) => (x.cats as readonly string[]).includes(cat.en)).map((cat) => data.totalByCategory[cat.id]); return ns.some((n) => n == null) ? null : ns.reduce<number>((a, n) => a + (n ?? 0), 0); };
  const card = useRef<HTMLElement>(null);
  const [deal, setDeal] = useState<KPlace | null>(null);
  const [flipped, setFlipped] = useState(false);

  // the route line runs from "Can't pick?" to Surprise me
  useLayoutEffect(() => {
    const draw = () => {
      const head = card.current?.querySelector<HTMLElement>('.tm-head'); if (!head) return;
      const svg = head.querySelector<SVGSVGElement>('.tm-route'), from = head.querySelector('.tm-nudge'), to = head.querySelector('.tm-dice'); if (!svg || !from || !to) return;
      const H = head.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), rtl = lang === 'ar';
      const sx = (rtl ? a.left - 8 : a.right + 8) - H.left, sy = a.top + a.height / 2 - H.top, by = b.top + b.height / 2 - H.top;
      const ex = (rtl ? b.right + 5 : b.left - 5) - H.left, w = ex - sx;
      const d = `M${sx},${sy} C${sx + w * 0.38},${sy + 7} ${ex - w * 0.38},${by - 7} ${ex},${by}`;
      svg.querySelectorAll('path').forEach((pa) => pa.setAttribute('d', d)); const ci = svg.querySelector('circle')!; ci.setAttribute('cx', String(ex)); ci.setAttribute('cy', String(by));
      svg.style.setProperty('--len', String(svg.querySelector('path')!.getTotalLength()));
    };
    draw(); addEventListener('resize', draw); document.fonts?.ready.then(draw);
    return () => removeEventListener('resize', draw);
  }, [lang]);
  // the lead photos cross-fade every 4.5 s
  useEffect(() => {
    const id = setInterval(() => { if (reduce() || document.hidden) return; const box = card.current?.querySelector('.tm-photos'); if (!box || box.children.length < 2) return;
      const imgs = [...box.children], i = imgs.findIndex((x) => x.classList.contains('on')); imgs[i]?.classList.remove('on'); imgs[(i + 1) % imgs.length].classList.add('on'); }, 4500);
    return () => clearInterval(id);
  }, []);

  const shuffle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const dice = e.currentTarget.querySelector('.lucide'); if (dice) animate(dice, { transform: ['rotate(0deg)', 'rotate(360deg)'] }, spring(0.2, 0.6));
    haptic(); setDeal(pool[Math.floor(Math.random() * pool.length)] ?? null);
    const flip = card.current!.querySelector<HTMLElement>('.tm-flip')!;
    if (!flipped) { setFlipped(true); animate(flip, { transform: ['rotateY(0deg)', 'rotateY(180deg)'] }, spring(0.12, 0.6)); }
    else requestAnimationFrame(() => { const d = card.current!.querySelector('.tm-deal'); if (d) animate(d, { opacity: [0, 1], transform: ['scale(.94)', 'scale(1)'] }, spring(0.3, 0.45)); });
  };
  const unflip = () => { setFlipped(false); animate(card.current!.querySelector<HTMLElement>('.tm-flip')!, { transform: ['rotateY(180deg)', 'rotateY(0deg)'] }, spring(0.1, 0.55)); };
  const allCats = () => {
    openSheet(c.home.takeMe.everythingSheet, <div className="tm-sheet">{data.categories.map((cat) => <Link key={cat.id} className="tm-tile press" href={`/${lang}/explorer/?cat=${encodeURIComponent(cat.en)}`}><img src={photoFor([cat.en], 0)} alt="" loading="lazy" /><span className="tm-fade" /><span className="tm-label"><L n={catIcon(cat.en)} /><b>{cat.label}</b></span>{data.totalByCategory[cat.id] != null ? <span className="tm-count"><i className="live" />{data.totalByCategory[cat.id]}</span> : null}</Link>)}</div>);
    requestAnimationFrame(() => document.querySelectorAll('.sheet .tm-sheet .tm-tile').forEach((tl, n) => animate(tl, { opacity: [0, 1], transform: ['translateY(14px) scale(.96)', 'translateY(0) scale(1)'] }, { ...spring(0, 0.45), delay: 0.04 + n * 0.03 })));
  };
  const tile = (x: Intent, n: number) => { const t = total(x); return <Link key={x.key} className="tm-pick press" href={`/${lang}/explorer/?intent=${x.key}`}><span className="tm-pick-img"><img src={photoFor(x.cats, n)} alt="" loading="lazy" /></span>
    <span className="tm-pick-name"><L n={x.icon} /><b>{c.intents[x.key]}</b></span>{t != null ? <span className="tm-pick-n">{fill(c.common.places, { n: t })}</span> : null}</Link>; };
  return (
    <section className={`tm tm3 ${flipped ? 'flipped' : ''}`} aria-label={c.home.takeMe.aria} ref={card}>
      <div className="tm-flip"><div className="tm-front">
        <div className="tm-head"><div><b className="tm-q">{lang === 'ar' ? 'خرجني فين؟' : c.home.takeMe.question}</b><span className="tm-time" aria-label={`${c.home.takeMe.timeNow} ${t12(now, lang)}`} suppressHydrationWarning><L n="clock" />{t12(now, lang)}<span className="tm-nudge">{c.home.takeMe.cantPick}</span></span></div>
          <svg className="tm-route" aria-hidden="true"><path className="tm-route-base" /><path className="tm-route-line" /><circle className="tm-route-end" r="3" /></svg>
          <button className="tm-dice press" data-act="shuffle" aria-label={c.home.takeMe.surprise} onClick={shuffle}><L n="dices" /><span>{c.home.takeMe.surprise}</span></button></div>
        <Link className="tm-lead press" href={`/${lang}/explorer/?intent=${lead.key}${open ? '&when=now' : ''}`}><span className="tm-photos">{(leadPhotos.length ? leadPhotos : [photoFor(lead.cats)]).map((u, n) => <img key={u + n} src={u} alt="" className={n ? '' : 'on'} />)}</span><span className="tm-fade" />
          <span className="tm-lead-text"><b>{c.moments[m.title]}</b>{open ? <span className="tm-sub"><i className="live" />{fill(c.home.takeMe.leadOpen, { n: open, place: where })}</span> : total(lead) != null ? <span className="tm-sub">{fill(c.home.takeMe.leadPlaces, { n: total(lead)!, place: where })}</span> : null}</span>
          <span className="tm-go"><L n="arrow-right" /></span></Link>
        <div className="tm-picks">{rest.map(tile)}<button className="tm-pick tm-pick-all press" data-act="all-cats" onClick={allCats}><span className="tm-pick-img"><L n="layout-grid" /></span><span className="tm-pick-name"><b>{c.home.takeMe.all}</b></span><span className="tm-pick-n">{fill(c.home.takeMe.kinds, { n: data.categories.length })}</span></button></div>
      </div><div className="tm-back" aria-live="polite">{deal ? <DealCard p={deal} onShuffle={shuffle} onBack={unflip} /> : null}</div></div>
    </section>
  );
}

// Surprise me: one random place that fits the city and area (variable reward)
function DealCard({ p, onShuffle, onBack }: { p: KPlace; onShuffle: (e: React.MouseEvent<HTMLButtonElement>) => void; onBack: () => void }) {
  const { c, lang, now } = useK();
  const st = openStateOf(p, now, lang);
  return <div className="tm-deal"><img src={p.photos[0]?.m} alt="" /><span className="tm-fade" />
    <div className="tm-deal-top"><span className="tm-kicker"><L n="dices" />{c.home.takeMe.yourPick}</span><button className="icon-btn press tm-x" data-act="unflip" aria-label={c.common.back} onClick={onBack}><L n="x" /></button></div>
    <div className="tm-deal-text"><b>{p.name}</b><Meta p={p} extra={st ? <StatePill st={st} /> : null} />
      <div className="tm-deal-actions"><Go5 p={p} /><button className="btn secondary press" data-act="shuffle" onClick={onShuffle}><L n="dices" />{c.home.takeMe.shuffleAgain}</button></div></div></div>;
}

/* ---------- right rail: Trending with its window menu ---------- */
const WINDOWS = ['live', '24h', '7d', '30d'] as const;
type Win = (typeof WINDOWS)[number];
function TrendCard({ list }: { list: KPlace[] }) {
  const { c, lang } = useK();
  const where = usePlaceName();
  const [win, setWin] = useState<Win>('24h');
  const [menu, setMenu] = useState(false);
  const rows = useRef<HTMLDivElement>(null);
  useEffect(() => { rows.current?.querySelectorAll('.trend-row').forEach((r, n) => animate(r, { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] }, { ...spring(0, 0.35), delay: 0.03 * n })); }, [win]);
  if (!list.length) return null;
  return <section className="card rail-card trend-card"><div className="trend-head"><h2 className="t-head"><L n="flame" /> {c.trending.title} <span className="t-small">{fill(c.trending.in, { place: where })}</span></h2>
    <span className="trend-pick"><button className="trend-win press" data-act="trend-win" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu((x) => !x)}>{win === 'live' ? <i className="live" /> : <L n="clock" />}{c.trending.windows[win]}<L n="chevron-down" /></button>
      {menu ? <TrendMenu win={win} onPick={(w) => { haptic(); setWin(w); setMenu(false); }} /> : null}</span></div>
    <div ref={rows} style={{ display: 'contents' }}>{list.slice(0, 5).map((p, i) => <TrendRow key={p.id} p={p} i={i} win={win} href={placeHref(p, lang)} />)}</div></section>;
}
function TrendMenu({ win, onPick }: { win: Win; onPick: (w: Win) => void }) {
  const { c } = useK();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) animate(ref.current, { opacity: [0, 1], transform: ['scale(.94)', 'scale(1)'] }, spring(0, 0.3)); }, []);
  return <div className="trend-menu" role="menu" ref={ref}>{WINDOWS.map((v) => <button key={v} className="option press" role="menuitemradio" aria-checked={v === win} data-act="trend-set" onClick={() => onPick(v)}>{v === 'live' ? <i className="live" /> : <L n="clock" />}<span className="grow">{c.trending.windows[v]}</span><Ic n="check" cls="check" /></button>)}</div>;
}
// views in the window and growth against the window before it come from the stats route; hidden until it answers
function TrendRow({ p, i, win, href }: { p: KPlace; i: number; win: Win; href: string }) {
  const { c } = useK();
  const s = usePlaceStats(p.id);
  const n = win === 'live' ? s?.live?.views : win === '24h' ? s?.d1?.views : win === '7d' ? s?.d7?.views : s?.d30?.views;
  return <div className="trend-row" data-item><span className="trend-n">{i + 1}</span><Link className="trend-main press" href={href}><img src={p.photos[0]?.s} alt="" /><span className="grow"><b>{p.name}</b>
    <span className="trend-stat">{n == null ? null : win === 'live' ? <span className="live-pill"><i className="live" />{fill(c.trending.hereNow, { n })}</span> : <span><Ic n="eye" />{k(n)}</span>}</span></span></Link><Go5 p={p} small /></div>;
}


/* ---------- right rail: the Marketplace, two real experiences ---------- */
function MarketCard() {
  const { c, lang } = useK();
  const { data: trips = [] } = useTrips({});
  const list = trips.slice(0, 2);
  if (!list.length) return null;
  return <section className="card rail-card"><h2 className="t-head"><L n="store" /> {c.trending.marketRail}</h2>
    {list.map((t) => <Link key={t.id} className="trend-main press" href={`/${lang}/trips/${t.id}/`}><img src={coverSrc(t)} alt="" /><span className="grow"><b>{(lang === 'en' && t.titleEn) || t.title}</b>
      <span className="bits"><Bit icon="wallet">{fill(c.units.egp, { n: t.priceEgp })}</Bit><Bit icon="calendar">{new Date(t.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')}</Bit></span>
      {t.agency.verified ? <Tag label={c.market.verified} tone="good" icon="shield-check" /> : <Tag label={c.market.notVerified} tone="warn" icon="shield-alert" />}</span></Link>)}
    <Link className="btn plain press" href={`/${lang}/marketplace/`}>{c.trending.seeAllExperiences} <L n="arrow-right" /></Link></section>;
}
