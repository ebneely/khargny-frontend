'use client';
/* eslint-disable @next/next/no-img-element -- the prototype's <img> markup, ported as is (photos come from the storage CDN in their sizes) */
// Home from proto/app.js Home(): Stories, TakeMe, Near you, Earned, Collections by 5argny, 5argny Social, and the right rail.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { langPrefix } from '@5argny/core/rules/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { blend, pickNear, kmText, type BlendPlace } from '@5argny/core/rules';
import { apiRequest } from '@/lib/api/client';
import { normalizePlaceList } from '@/lib/api/normalize-place-list';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { likeStore } from '@/lib/likes';
import { saveStore } from '@/lib/saves';
import Link from 'next/link';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { L, Ic } from './icons';
import { Brand, Btn, Tag, Bit } from './bits';
import { INTENTS, moment, t12, k, openState as openStateOf, type Intent } from './rules';
import { placeHref, toK, type KPlace } from './data';
import { Post, PostSkel, Tile, TileSkel, Go5, StatePill, Meta, BadgeTags, useShowing, usePlaceStats, catIcon, type CardTrack } from './place';
import { Shell, usePlaceName, useLocKeys } from './Shell';
import { useK, haptic, reduce, spring } from './KProvider';
import { ColCard, useGroupViews } from './collections';
import { MarketCard } from './market';
import { usePosition, askPosition, useNearPlaces, useNearQuery, readPosition, nearParam, surpriseQuery, NearAsk } from './near';
import { useCatTotals, useEarned } from './filters';
import { Failed, Sk, StateBlock, useReveal } from './states';

export type HomeCollection = { id: string; slug: string; title: string; places: KPlace[] };
export type HomeData = { pool: KPlace[]; trending: KPlace[]; collections: HomeCollection[]; categories: { id: string; en: string; label: string }[]; openByCategory: Record<string, number> | null };

/** "Earned on {brand}" with the brand drawn as the brand. */
export function withBrand(s: string) { const [a, b = ''] = s.split('{brand}'); return <>{a}<Brand />{b}</>; }

/**
 * Home's rows for the location bar: the server's Egypt-wide rows until a city is picked, then the pool and the counts
 * fetched again for that city and area, so every number says what it counts.
 */
/** Home's pool for a city and area (the feed and Stories read its loading and failed states too). */
const poolQuery = (scope: { cityId?: string; region?: string }) => ({
  queryKey: ['home', 'pool', scope.cityId ?? '', scope.region ?? ''], staleTime: 60_000,
  queryFn: async () => normalizePlaceList(await apiRequest('GET', '/v1/places', { params: { limit: 40, ...scope } })).items,
});
/** The pool's state once a city is picked: Egypt-wide, the rows come with the page and never load here. */
function usePoolState() {
  const { city, areaKey } = useLocKeys();
  const q = useQuery({ ...poolQuery({ cityId: city?.id, ...(areaKey ? { region: areaKey } : {}) }), enabled: !!city });
  return { on: !!city, loading: !!city && q.isPending, error: !!city && q.isError && !q.data ? q.error : null, retry: q.refetch, busy: q.isFetching, empty: !!city && !!q.data && q.data.length === 0 };
}

function useHere(data: HomeData) {
  const { lang } = useK();
  const { city, areaKey } = useLocKeys();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const on = !!city;
  const scope = { cityId: city?.id, ...(areaKey ? { region: areaKey } : {}) };
  const { data: pool } = useQuery({ ...poolQuery(scope), enabled: on, placeholderData: (prev) => prev,
  });
  // places and a photo per category: one shared query with Filters (Egypt-wide it arrives with the page)
  const totals = useCatTotals();
  const byId = (r: Record<string, number | string | null> | undefined) => Object.fromEntries(categories.map((x) => [x.id, r?.[x.slug] ?? null]));
  const counts = { totalByCategory: totals ? byId(totals.n) as Record<string, number | null> : {}, coverByCategory: byId(totals?.cover) as Record<string, string | null> };
  if (!on) return { pool: data.pool, ...counts, areaKey: null, city: null };
  return {
    pool: (pool ?? []).map((raw) => toK(raw as never, { cities, categories }, lang)).filter((p) => p.photos.length),
    ...counts, areaKey, city: city.slug,
  };
}

// ads shown this session and per place today (proto SEEN/SHOWN); production counts them server-side
const adSeen = new Set<string>(), adShown: Record<string, number> = {};
const DAY = 864e5;
/** Stories and 5argny Social through the one blend (organic rank, paid places blended in under the caps and the relevance floor). */
function useBlend(pool: KPlace[], city: string | null, area: string | null) {
  const out = useMemo(() => {
    const affinity: Record<string, number> = {};
    for (const p of pool) affinity[p.cat] = (affinity[p.cat] ?? 0) + (likeStore.liked(p.id) ? 3 : 0) + (saveStore.saved(p.id) ? 5 : 0);
    const byId = new Map(pool.map((p) => [p.id, p]));
    // popularity is the card's 30-day views; the tap rate reads loves and 5argny taps, which are all-time by design
    const bp: BlendPlace[] = pool.map((p) => ({ id: p.id, cat: p.cat, city: p.citySlug, area: p.region, promoted: p.promoted, views30: p.d30?.views ?? 0, likes30: p.likes, go30: p.dir,
      photos: p.photos.length, hasHours: p.hours.length > 0, amenities: p.amen.length, badges: p.badges.length,
      freshness: p.updatedAt ? Math.max(0, 1 - (Date.now() - Date.parse(p.updatedAt)) / (90 * DAY)) : 0 }));
    const ctx = { affinity, city, area, seen: adSeen, shownToday: adShown };
    const pick = (list: ReturnType<typeof blend>) => list.map((x) => byId.get(x.p.id)!);
    const stories = blend('stories', bp, 8, ctx), social = blend('social', bp, 14, ctx);
    return { stories: pick(stories), social: pick(social), ads: [...stories, ...social].filter((x) => x.ad).map((x) => x.p.id) };
  }, [pool, city, area]);
  useEffect(() => { out.ads.forEach((id) => { adSeen.add(id); adShown[id] = (adShown[id] ?? 0) + 1; }); }, [out]);
  return out;
}

/**
 * Decision 0006: Stories and 5argny Social come from GET /v1/feed (hype, fair-chance and ad slots filled by the backend).
 * Until it answers, or when it fails or is not deployed (404), the client-side blend above fills in, so Home never breaks.
 * Each item's `mark` ("rising" / "new") becomes the small chip; scores never reach the client.
 */
type FeedMark = CardTrack['mark'];
function useFeed(surface: 'stories' | 'social', limit: number, fallback: KPlace[]): { list: KPlace[]; marks: Record<string, FeedMark> } {
  const { lang } = useK();
  const { city, areaKey } = useLocKeys();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const near = nearParam(usePosition());
  const { data } = useQuery({
    queryKey: ['feed', surface, city?.id ?? '', areaKey ?? '', near ?? ''], staleTime: 60_000, retry: false,
    queryFn: () => apiRequest<{ items: { place: unknown; mark?: FeedMark }[] }>('GET', '/v1/feed', { params: { surface, limit, cityId: city?.id, region: areaKey, near } }).then((r) => r.items),
  });
  return useMemo(() => {
    const rows = (data ?? []).map((it) => ({ p: toK(it.place as never, { cities, categories }, lang), mark: it.mark ?? null })).filter((x) => x.p.photos.length);
    if (!rows.length) return { list: fallback, marks: {} };
    return { list: rows.map((x) => x.p), marks: Object.fromEntries(rows.map((x) => [x.p.id, x.mark])) };
  }, [data, cities, categories, lang, fallback]);
}

export function HomeView({ data }: { data: HomeData }) {
  const { c, lang } = useK();
  const here = useHere(data);
  const pool = here.pool;
  const blended = useBlend(pool, here.city, here.areaKey);
  const stories = useFeed('stories', 8, blended.stories), social = useFeed('social', 14, blended.social);
  const near = useNearPlaces(); // null until the person shares their location (a tap, never on load)
  return (
    <Shell cur="home" right={<><TrendCard list={data.trending} /><MarketCard /></>}>
      <Stories {...stories} />
      <TakeMe data={data} totalByCategory={here.totalByCategory} coverByCategory={here.coverByCategory} pool={pool} />
      <NearYou list={near} />
      <Earned />
      <TeamCollections list={data.collections} />
      <h1 className="t-display page-pad social-h" style={{ margin: '6px 0 10px' }}>{withBrand(c.home.social)}</h1>
      <Social {...social} near={near} />
    </Shell>
  );
}

// the feed after a city is picked: its skeleton, what failed, or a city with nothing yet and a way back to all of Egypt
function Social({ list, marks, near }: { list: KPlace[]; marks: Record<string, FeedMark>; near: KPlace[] | null }) {
  const { c, setLoc } = useK();
  const where = usePlaceName();
  const st = usePoolState();
  const reveal = useReveal(st.loading);
  if (st.loading) return <><PostSkel /><PostSkel /></>;
  if (st.error) return <Failed error={st.error} retry={st.retry} busy={st.busy} />;
  if (st.empty) return <StateBlock icon="map-pin-off" title={fill(c.states.feed.empty, { place: where })} body={c.states.feed.emptyBody} action={<Btn label={c.states.feed.allEgypt} kind="primary" act="all-egypt" onClick={() => setLoc({ city: null, area: null })} />} />;
  return <div className={reveal}>{list.map((p, i) => <Fragment key={p.id}><Post p={p} surface="social" position={i + 1} mark={marks[p.id]} />{i === 3 ? <div className="desk-only"><NearYou list={near} desk /></div> : null}</Fragment>)}</div>;
}

function Stories({ list, marks }: { list: KPlace[]; marks: Record<string, FeedMark> }) {
  const { lang } = useK();
  if (usePoolState().loading) return <div className="rail-row stories skel" aria-hidden="true" style={{ paddingTop: 4, paddingBottom: 12 }}>{Array.from({ length: 8 }, (_, i) => <Sk key={i} w={96} h={150} r={16} style={{ flex: 'none' }} />)}</div>;
  return <div className="rail-row stories" style={{ paddingTop: 4, paddingBottom: 12 }}>{list.map((p, i) => <Story key={p.id} p={p} position={i + 1} mark={marks[p.id]} />)}</div>;
}
      
function Story({ p, position, mark }: { p: KPlace; position: number; mark: FeedMark }) {
  const { lang } = useK();
  const ref = useRef<HTMLAnchorElement>(null);
  useShowing(ref, 'stories', p.id, position);
  return (
    <Link ref={ref} className="story press" data-item href={placeHref(p, lang)} style={{ flex: 'none', position: 'relative', width: 96, height: 150, borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--sh1)' }}>
      <img src={p.photos[0]?.s} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <b dir="auto" style={{ position: 'absolute', left: 8, right: 8, bottom: 7, color: '#fff', fontSize: 12, fontWeight: 750, lineHeight: 1.2, textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>{p.name}</b>
    </Link>
  );
}


// Near you: on a phone right under Take me out, highlighted (proto NearYou); on desktop a rail inside the feed after the
// 4th post (proto Rail(nearYou, ..., true)). Until the person shares their location it only offers to use it: the browser
// asks on that tap, never on load, and no distance is shown that we don't know.
function NearYou({ list, desk }: { list: KPlace[] | null; desk?: boolean }) {
  const { c, lang } = useK();
  const pos = usePosition();
  const head = desk ? <h2 className="t-head">{c.home.nearYou}</h2> : <h2 className="t-title" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}><Ic n="near" />{c.home.nearYou}</h2>;
  const cls = desk ? 'rail near' : 'near phone-only';
  const { q } = useNearQuery(); // the same query as `list`: its loading, failed and empty states
  if (!pos) return <section className={desk ? 'rail' : 'phone-only'} aria-label={c.home.nearYou}><NearAsk /></section>;
  if (q.isPending) return <section className={cls} aria-label={c.home.nearYou} aria-busy="true"><div className="rail-head">{head}</div><div className="rail-row">{[0, 1, 2, 3].map((i) => <TileSkel key={i} />)}</div></section>;
  if (q.isError) return <section className={cls} aria-label={c.home.nearYou}><div className="rail-head">{head}</div><Failed compact error={q.error} retry={q.refetch} busy={q.isFetching} /></section>;
  if (!list?.length) return <section className={cls} aria-label={c.home.nearYou}><div className="rail-head">{head}</div><StateBlock compact icon="map-pin-off" title={c.states.near.empty} body={c.states.near.emptyBody} action={<Link className="btn secondary press" href={`${langPrefix(lang)}/explorer/`}>{c.states.near.seeEgypt}</Link>} /></section>;
  return <section className={cls} aria-label={c.home.nearYou}><div className="rail-head">{head}<Link className="btn plain press" href={`${langPrefix(lang)}/explorer/?sort=near`}>{c.common.seeAll}</Link></div>
    {desk ? null : <p className="t-small page-pad" style={{ margin: '-4px 0 8px' }}>{c.home.nearestFirst}</p>}<div className="rail-row">{list.slice(0, desk ? 6 : 7).map((p, i) => <Tile key={p.id} p={p} surface="near" position={i + 1} />)}</div></section>;
}

// Earned on 5argny: the places holding a badge in the location bar (asked of the API: they are rarely in Home's pool)
function Earned() {
  const { c, lang } = useK();
  const raw = useEarned();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const list = (raw ?? []).map((r) => toK(r as never, { cities, categories }, lang)).filter((p) => p.photos.length && p.badges.length).sort((a, b) => b.badges.length - a.badges.length);
  if (!list.length) return null;
  return <section className="rail earned"><div className="rail-head"><h2 className="t-head"><L n="award" /> {withBrand(c.home.earned)}</h2><Link className="btn plain press" href={`${langPrefix(lang)}/explorer/?badge=1`}>{fill(c.home.earnedAll, { n: list.length })}</Link></div>
    <div className="rail-row">{list.map((p) => <Tile key={p.id} p={p} extra={<span className="earned-tags"><BadgeTags p={p} /></span>} />)}</div></section>;
}

function TeamCollections({ list }: { list: HomeCollection[] }) {
  const { c } = useK();
  const views = useGroupViews(list.map((col) => col.id));
  if (!list.length) return null;
  return <section className="rail cols"><div className="rail-head"><h2 className="t-head"><L n="library" /> {withBrand(c.home.teamCollections)}</h2></div>
    <div className="rail-row">{list.map((col) => <ColCard key={col.id} col={col} views={views[col.id]} />)}</div></section>;
}

/* ---------- "Take me out" card: answer first, photo tiles, Surprise me ---------- */
function TakeMe({ data, pool, totalByCategory, coverByCategory }: { data: HomeData; pool: KPlace[]; totalByCategory: Record<string, number | null>; coverByCategory: Record<string, string | null> }) {
  const { c, lang, now, openSheet, setLoc } = useK();
  const m = moment(now), lead = m.x, rest = INTENTS.filter((x) => x.key !== lead.key).slice(0, 5);
  const inCats = (x: Intent) => pool.filter((p) => (x.cats as readonly string[]).includes(p.cat));
  const photoFor = (cats: readonly string[], n = 0) => { const list = pool.filter((p) => cats.includes(p.cat)); const pl = list[n % Math.max(1, list.length)] || pool[n % Math.max(1, pool.length)]; return pl?.photos[0]?.m || undefined; };
  const leadPhotos = inCats(lead).slice(0, 4).map((p) => p.photos[0]?.m).filter(Boolean);
  const total = (x: Intent) => { const ns = data.categories.filter((cat) => (x.cats as readonly string[]).includes(cat.en)).map((cat) => totalByCategory[cat.id]); return ns.some((n) => n == null) ? null : ns.reduce<number>((a, n) => a + (n ?? 0), 0); };
  const card = useRef<HTMLElement>(null);
  const [deal, setDeal] = useState<KPlace | null>(null);
  const nearList = useNearPlaces();
  const [flipped, setFlipped] = useState(false);
  const qc = useQueryClient();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const pos = usePosition();
  const { data: surprise } = useQuery(surpriseQuery(nearParam(pos)));
  const recent = useRef<string[]>([]);
  // the lead names the person's real city: the nearest place's city (Near you's position, never asked for here), else Cairo;
  // its number is that city's open-now count (GET /v1/places/counts?when=now), the same places Explore lists for it
  const leadCity = cities.find((x) => x.id === nearList?.[0]?.cityId) ?? cities.find((x) => x.slug === 'cairo') ?? null;
  const leadName = leadCity ? (lang === 'ar' ? leadCity.name : leadCity.nameEn || leadCity.name) : '';
  const { data: leadNow } = useQuery({
    queryKey: ['places', 'counts', 'now', leadCity?.slug ?? '', ''], enabled: !!leadCity, staleTime: 60_000,
    queryFn: () => apiRequest<{ byCategory: Record<string, number> }>('GET', '/v1/places/counts', { params: { when: 'now', city: leadCity!.slug } }).catch(() => null),
  });
  const open = leadNow ? categories.filter((x) => (lead.cats as readonly string[]).includes(x.nameEn || '')).reduce((a, x) => a + (leadNow.byCategory[x.slug] ?? 0), 0) : null;

  // the route line runs from "Can't pick?" to Surprise me. It is measured on screen, so never while the card is turned
  // (a phone's address bar resizes the page mid-flip); it is redrawn once the card has turned back.
  const drawRoute = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    const draw = () => {
      if (card.current?.classList.contains('flipped')) return;
      const head = card.current?.querySelector<HTMLElement>('.tm-head'); if (!head) return;
      const svg = head.querySelector<SVGSVGElement>('.tm-route'), from = head.querySelector('.tm-nudge'), to = head.querySelector('.tm-dice'); if (!svg || !from || !to) return;
      const H = head.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect(), rtl = lang === 'ar';
      const sx = (rtl ? a.left - 8 : a.right + 8) - H.left, sy = a.top + a.height / 2 - H.top, by = b.top + b.height / 2 - H.top;
      const ex = (rtl ? b.right + 5 : b.left - 5) - H.left, w = ex - sx;
      const d = `M${sx},${sy} C${sx + w * 0.38},${sy + 7} ${ex - w * 0.38},${by - 7} ${ex},${by}`;
      svg.querySelectorAll('path').forEach((pa) => pa.setAttribute('d', d)); const ci = svg.querySelector('circle')!; ci.setAttribute('cx', String(ex)); ci.setAttribute('cy', String(by));
      svg.style.setProperty('--len', String(svg.querySelector('path')!.getTotalLength()));
    };
    drawRoute.current = draw; draw(); addEventListener('resize', draw); document.fonts?.ready.then(draw);
    return () => removeEventListener('resize', draw);
  }, [lang]);
  // the lead photos cross-fade every 4.5 s
  useEffect(() => {
    const id = setInterval(() => { if (reduce() || document.hidden) return; const box = card.current?.querySelector('.tm-photos'); if (!box || box.children.length < 2) return;
      const imgs = [...box.children], i = imgs.findIndex((x) => x.classList.contains('on')); imgs[i]?.classList.remove('on'); imgs[(i + 1) % imgs.length].classList.add('on'); }, 4500);
    return () => clearInterval(id);
  }, []);

  const shuffle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const dice = e.currentTarget.querySelector('.lucide'); if (dice) animate(dice, { transform: ['rotate(0deg)', 'rotate(360deg)'] }, spring(0.2, 0.6));
    haptic();
    // near the person: a random place open now among the nearest (10 km, widening to 25 and 50), never one of the last 5 picks.
    // Without a position it asks, like Near you; refused or outside Egypt, the location bar's places as before.
    let near = surprise;
    if (!pos && (await askPosition())) near = await qc.fetchQuery(surpriseQuery(nearParam(readPosition()))).catch(() => undefined);
    const list = near?.length ? near.map((r) => toK(r as never, { cities, categories }, lang)).filter((p) => p.photos.length) : nearList ?? [];
    const next = list.length ? pickNear(list, recent.current, Math.random) : pool[Math.floor(Math.random() * pool.length)] ?? null;
    if (!next) return;
    recent.current = [...recent.current, next.id].slice(-5); setDeal(next);
    const flip = card.current!.querySelector<HTMLElement>('.tm-flip')!;
    if (!flipped) { setFlipped(true); animate(flip, { transform: ['rotateY(0deg)', 'rotateY(180deg)'] }, spring(0.12, 0.6)); card.current!.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    else requestAnimationFrame(() => { const d = card.current!.querySelector('.tm-deal'); if (d) animate(d, { opacity: [0, 1], transform: ['scale(.94)', 'scale(1)'] }, spring(0.3, 0.45)); });
  };
  const unflip = () => { setFlipped(false); animate(card.current!.querySelector<HTMLElement>('.tm-flip')!, { transform: ['rotateY(180deg)', 'rotateY(0deg)'] }, spring(0.1, 0.55)).then(() => drawRoute.current()); };
  // most places first (proto), each with a photo of its own: the pool's, else the one its count request brought
  const cats = [...data.categories].sort((a, b) => (totalByCategory[b.id] ?? -1) - (totalByCategory[a.id] ?? -1));
  const photo = (cat: HomeData['categories'][number]) => pool.find((p) => p.cat === cat.en)?.photos[0]?.m || coverByCategory[cat.id] || photoFor([cat.en], 0);
  const allCats = () => {
    openSheet(c.home.takeMe.everythingSheet, <div className="tm-sheet">{cats.map((cat) => <Link key={cat.id} className="tm-tile press" href={`${langPrefix(lang)}/explorer/?cat=${encodeURIComponent(cat.en)}`}><img src={photo(cat)} alt="" loading="lazy" /><span className="tm-fade" /><span className="tm-label"><L n={catIcon(cat.en)} /><b>{cat.label}</b></span>{totalByCategory[cat.id] != null ? <span className="tm-count"><i className="live" />{totalByCategory[cat.id]}</span> : null}</Link>)}</div>);
    requestAnimationFrame(() => document.querySelectorAll('.sheet .tm-sheet .tm-tile').forEach((tl, n) => animate(tl, { opacity: [0, 1], transform: ['translateY(14px) scale(.96)', 'translateY(0) scale(1)'] }, { ...spring(0, 0.45), delay: 0.04 + n * 0.03 })));
  };
  const tile = (x: Intent, n: number) => { const t = total(x); return <Link key={x.key} className="tm-pick press" href={`${langPrefix(lang)}/explorer/?intent=${x.key}`}><span className="tm-pick-img"><img src={photoFor(x.cats, n)} alt="" loading="lazy" /></span>
    <span className="tm-pick-name"><L n={x.icon} /><b>{c.intents[x.key]}</b></span>{t != null ? <span className="tm-pick-n">{fill(c.common.places, { n: t })}</span> : null}</Link>; };
  return (
    <section className={`tm tm3 ${flipped ? 'flipped' : ''}`} aria-label={c.home.takeMe.aria} ref={card}>
      <div className="tm-flip"><div className="tm-front">
        <div className="tm-head"><div><b className="tm-q">{lang === 'ar' ? 'خرجني فين؟' : c.home.takeMe.question}</b><span className="tm-time" aria-label={`${c.home.takeMe.timeNow} ${t12(now, lang)}`} suppressHydrationWarning><L n="clock" />{t12(now, lang)}<span className="tm-nudge">{c.home.takeMe.cantPick}</span></span></div>
          <svg className="tm-route" aria-hidden="true"><path className="tm-route-base" /><path className="tm-route-line" /><circle className="tm-route-end" r="3" /></svg>
          <button className="tm-dice press" data-act="shuffle" aria-label={c.home.takeMe.surprise} onClick={shuffle}><L n="dices" /><span>{c.home.takeMe.surprise}</span></button></div>
        <Link className="tm-lead press" href={`${langPrefix(lang)}/explorer/?intent=${lead.key}${open ? '&when=now' : ''}${leadCity ? `&city=${leadCity.slug}` : ''}`} onClick={() => { if (leadCity) setLoc({ city: leadCity.slug, area: null }); }}><span className="tm-photos">{(leadPhotos.length ? leadPhotos : [photoFor(lead.cats)]).map((u, n) => <img key={String(u) + n} src={u} alt="" className={n ? '' : 'on'} />)}</span><span className="tm-fade" />
          <span className="tm-lead-text"><b>{c.moments[m.title]}</b>{leadCity ? <span className="tm-sub">{open ? <><i className="live" />{fill(c.home.takeMe.leadOpen, { n: open, place: leadName })}</> : <><L n="map-pin" />{leadName}</>}</span> : null}</span>
          <span className="tm-go"><L n="arrow-right" /></span></Link>
        <div className="tm-picks">{rest.map(tile)}<button className="tm-pick tm-pick-all press" data-act="all-cats" onClick={allCats}><span className="tm-pick-img">{cats.slice(0, 4).map((cat) => <img key={cat.id} src={photo(cat)} alt="" loading="lazy" />)}</span><span className="tm-pick-name"><L n="layout-grid" /><b>{c.home.takeMe.all}</b></span><span className="tm-pick-n">{fill(c.home.takeMe.kinds, { n: data.categories.length })}</span></button></div>
      </div><div className="tm-back" aria-live="polite">{deal ? <DealCard p={deal} onShuffle={shuffle} onBack={unflip} /> : null}</div></div>
    </section>
  );
}

// Surprise me: one random place that fits the city and area (variable reward)
function DealCard({ p, onShuffle, onBack }: { p: KPlace; onShuffle: (e: React.MouseEvent<HTMLButtonElement>) => void; onBack: () => void }) {
  const { c, lang, now } = useK();
  const st = openStateOf(p, now, lang);
  const href = placeHref(p, lang);
  const ref = useRef<HTMLDivElement>(null);
  useShowing(ref, 'takeme', p.id, 1);
  // the photo and the name open the place like every other card; the buttons keep their own actions
  return <div className="tm-deal" ref={ref}><Link className="tm-deal-photo press" href={href} tabIndex={-1} aria-hidden="true"><img src={p.photos[0]?.m} alt="" /></Link><span className="tm-fade" />
    <div className="tm-deal-top"><span className="tm-kicker"><L n="dices" />{c.home.takeMe.yourPick}</span><button className="icon-btn press tm-x" data-act="unflip" aria-label={c.common.back} onClick={onBack}><L n="x" /></button></div>
    <div className="tm-deal-text"><Link className="tm-deal-name press" href={href}><b dir="auto">{p.name}</b></Link><Meta p={p} extra={<>{p.distanceKm != null ? <span className="meta-area"><L n="map-pin" />{fill(c.units.kmAway, { km: kmText(p.distanceKm) })}</span> : null}{st ? <StatePill st={st} /> : null}</>} />
      <div className="tm-deal-actions"><Go5 p={p} /><button className="btn secondary press" data-act="shuffle" onClick={onShuffle}><L n="dices" />{c.home.takeMe.shuffleAgain}</button></div></div></div>;
}

/* ---------- right rail: Trending with its window menu ---------- */
const WINDOWS = ['live', '24h', '7d', '30d'] as const;
type Win = (typeof WINDOWS)[number];
export function TrendCard({ list }: { list: KPlace[] }) {
  const { c, lang, loc } = useK();
  const where = usePlaceName();
  const [win, setWin] = useState<Win>('24h');
  // ranked for the chosen window in the chosen place: the trending route for 24 h and 7 days (Live reads the last 24 h),
  // the cards' 30-day views for 30 days; the Egypt-wide list only while those load
  const { city, areaKey } = useLocKeys();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const api = win === '30d' ? null : win === '7d' ? '7d' : '24h';
  const { data: ranked } = useQuery({
    queryKey: ['places', 'trending', api ?? '', city?.slug ?? '', areaKey ?? ''], enabled: !!api, staleTime: 60_000,
    queryFn: () => apiRequest<{ places: unknown[] }>('GET', '/v1/places/trending', { params: { window: api, limit: 5, ...(city ? { city: city.slug } : {}), ...(areaKey ? { area: areaKey } : {}) } }).then((r) => r.places).catch(() => null),
  });
  const here = list.filter((p) => (!loc.city || p.citySlug === loc.city) && (!loc.area || p.area === loc.area));
  const base = here.length >= 3 ? here : list;
  const shown = (api && ranked?.length ? ranked.map((r) => toK(r as never, { cities, categories }, lang)) : win === '30d' ? [...base].sort((a, b) => (b.d30?.views ?? 0) - (a.d30?.views ?? 0)) : base).filter((p) => p.photos.length);
  const [menu, setMenu] = useState(false);
  const rows = useRef<HTMLDivElement>(null);
  useEffect(() => { rows.current?.querySelectorAll('.trend-row').forEach((r, n) => animate(r, { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0)'] }, { ...spring(0, 0.35), delay: 0.03 * n })); }, [win]);
  if (!shown.length) return null;
  return <section className="card rail-card trend-card"><div className="trend-head"><h2 className="t-head"><L n="flame" /> {c.trending.title} <span className="t-small">{fill(c.trending.in, { place: where })}</span></h2>
    <span className="trend-pick"><button className="trend-win press" data-act="trend-win" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu((x) => !x)}>{win === 'live' ? <i className="live" /> : <L n="clock" />}{c.trending.windows[win]}<L n="chevron-down" /></button>
      {menu ? <TrendMenu win={win} onPick={(w) => { haptic(); setWin(w); setMenu(false); }} /> : null}</span></div>
    <div ref={rows} style={{ display: 'contents' }}>{shown.slice(0, 5).map((p, i) => <TrendRow key={p.id} p={p} i={i} win={win} href={placeHref(p, lang)} />)}</div></section>;
}
function TrendMenu({ win, onPick }: { win: Win; onPick: (w: Win) => void }) {
  const { c } = useK();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) animate(ref.current, { opacity: [0, 1], transform: ['scale(.94)', 'scale(1)'] }, spring(0, 0.3)); }, []);
  return <div className="trend-menu" role="menu" ref={ref}>{WINDOWS.map((v) => <button key={v} className="option press" role="menuitemradio" aria-checked={v === win} data-act="trend-set" onClick={() => onPick(v)}>{v === 'live' ? <i className="live" /> : <L n="clock" />}<span className="grow">{c.trending.windows[v]}</span><Ic n="check" cls="check" /></button>)}</div>;
}
// views in the window and growth against the window before it (viewsPrev) come from the stats route; hidden until it answers
function TrendRow({ p, i, win, href }: { p: KPlace; i: number; win: Win; href: string }) {
  const { c } = useK();
  const s = usePlaceStats(p.id);
  const w = win === 'live' ? s?.live : win === '24h' ? s?.d1 : win === '7d' ? s?.d7 : s?.d30;
  const n = w?.views, g = w?.viewsPrev ? w.views / w.viewsPrev - 1 : 0; // nothing before: no growth figure (proto)
  return <div className="trend-row" data-item><span className="trend-n">{i + 1}</span><Link className="trend-main press" href={href}><img src={p.photos[0]?.s} alt="" /><span className="grow"><b dir="auto">{p.name}</b>
    <span className="trend-stat">{n == null ? null : win === 'live' ? <span className="live-pill"><i className="live" />{fill(c.trending.hereNow, { n })}</span> : <><span><Ic n="eye" />{k(n)}</span>
      {g > 0.02 ? <span className="up"><L n="trending-up" />{Math.round(g * 100)}%</span> : g < -0.02 ? <span className="down"><L n="trending-down" />{Math.round(-g * 100)}%</span> : null}</>}</span></span></Link><Go5 p={p} small /></div>;
}


