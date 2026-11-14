'use client';
/* eslint-disable @next/next/no-img-element -- the prototype's <img> markup, ported as is */
// The Marketplace from proto/app.js Market(), ListingContent(), HostContent(), Reviews(), RightRail('market'):
// free listings from the tourism routes (level=free), the host's public profile, reviews from people who went.
// Bits are icon + text, never "·". Booking and messaging the host come with spec 003, so neither is drawn here.
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { fill } from '@5argny/core/copy';
import { apiRequest } from '@/lib/api/client';
import { useTrips, useTrip, useRatings, useLister, tripsRequest, coverSrc, type Trip, type Rating } from '@/lib/trips/api';
import { L, Ic } from './icons';
import { Btn, IconBtn, Group, Tag, Bit, Seg } from './bits';
import { dur, type Lang } from './rules';
import { useShare } from './place';
import { Shell } from './Shell';
import { useK, haptic } from './KProvider';

const loc = (lang: Lang) => (lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');
export const tripTitle = (t: Pick<Trip, 'title' | 'titleEn'>, lang: Lang) => (lang === 'en' && t.titleEn) || t.title;
export const tripDate = (t: Pick<Trip, 'startsAt'>, lang: Lang) => new Date(t.startsAt).toLocaleDateString(loc(lang), { weekday: 'short', day: 'numeric', month: 'short' }).replace(/[,،]/, '');
function useLength() {
  const { c, lang } = useK();
  return (t: Pick<Trip, 'startsAt' | 'endsAt'>) => { const mins = Math.max(0, (Date.parse(t.endsAt) - Date.parse(t.startsAt)) / 60000); const nights = Math.round(mins / 1440);
    return mins >= 1440 ? (nights === 1 ? c.market.oneNight : fill(c.market.nights, { n: nights })) : dur(Math.round(mins), lang); };
}
const kindOf = (kind: string) => (kind === 'agency' ? 'office' : kind === 'guide' ? 'guide' : 'individual') as 'office' | 'guide' | 'individual';
const kindIcon = { guide: 'compass', office: 'briefcase', individual: 'user' } as const;
const Verified = ({ on }: { on: boolean }) => { const { c } = useK(); return on ? <Tag label={c.market.verified} tone="good" icon="shield-check" /> : <Tag label={c.market.notVerified} tone="warn" icon="shield-alert" />; };
const Price = ({ t, big }: { t: Trip; big?: boolean }) => { const { c } = useK(); return <p style={{ marginTop: 6, fontWeight: 800, ...(big ? { fontSize: 18 } : {}) }}>{fill(c.units.egp, { n: t.priceEgp })} <span className="t-small" style={{ fontWeight: 500 }}>{c.market.perPerson}</span></p>; };

export function Stars({ r }: { r: number }) {
  const { c } = useK();
  return <span className="stars" aria-label={fill(c.market.outOf5, { n: r.toFixed(1) })}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={r >= i - 0.25 ? 'on' : r >= i - 0.75 ? 'half' : ''}><L n="star" /></i>)}</span>;
}
/** Reviews from people who went; the group stays with the prototype's empty line when there are none. */
export function Reviews({ list, title }: { list: Rating[]; title: string }) {
  const { c, lang } = useK();
  if (!list.length) return <Group title={title}><p className="t-small">{c.market.noReviews}</p></Group>;
  const avg = list.reduce((a, r) => a + r.stars, 0) / list.length;
  return <Group title={title}><div className="rev-sum"><b>{avg.toFixed(1)}</b><Stars r={avg} /><span className="t-small">{list.length === 1 ? c.market.reviewFrom : fill(c.market.reviewsFrom, { n: list.length })}</span></div>
    {list.map((r) => <div key={r.id} className="rev"><div className="rev-top"><span className="rev-av">{r.name[0]}</span><b>{r.name}</b><Stars r={r.stars} /><span className="t-small">{new Date(r.createdAt).toLocaleDateString(loc(lang), { month: 'short' })}</span></div>{r.comment ? <p>{r.comment}</p> : null}</div>)}</Group>;
}

/** The right rail on the Marketplace ranks experiences by views ("Trending in Marketplace"). */
export function MarketTrending({ list }: { list: Trip[] }) {
  const { c, lang } = useK();
  // shortcut: ranks by all-time views (trips have no 30-day count yet) and shows no view number; rank by d30 views when trips carry them
  const top = [...list].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  if (!top.length) return null;
  return <section className="card rail-card"><h2 className="t-head"><L n="flame" /> {fill(c.trending.market, { market: c.market.title })}</h2>
    {top.map((t, n) => <div key={t.id} className="trend-row" data-item><span className="trend-n">{n + 1}</span><Link className="trend-main press" href={`/${lang}/marketplace/${t.id}/`}><img src={coverSrc(t)} alt="" /><span className="grow"><b>{tripTitle(t, lang)}</b>
      <span className="bits"><Bit icon="wallet">{fill(c.units.egp, { n: t.priceEgp })}</Bit><Bit icon="calendar">{tripDate(t, lang)}</Bit></span><span className="stats"><Verified on={t.agency.verified} /></span></span></Link></div>)}</section>;
}
/** Home's rail: two experiences and a way into the Marketplace. */
export function MarketCard() {
  const { c, lang } = useK();
  const { data: trips = [] } = useTrips({ level: 'free' });
  const list = trips.slice(0, 2);
  if (!list.length) return null;
  return <section className="card rail-card"><h2 className="t-head"><L n="store" /> {c.trending.marketRail}</h2>
    {list.map((t) => <Link key={t.id} className="trend-main press" href={`/${lang}/marketplace/${t.id}/`}><img src={coverSrc(t)} alt="" /><span className="grow"><b>{tripTitle(t, lang)}</b>
      <span className="bits"><Bit icon="wallet">{fill(c.units.egp, { n: t.priceEgp })}</Bit><Bit icon="calendar">{tripDate(t, lang)}</Bit></span><Verified on={t.agency.verified} /></span></Link>)}
    <Link className="btn plain press" href={`/${lang}/marketplace/`}>{c.trending.seeAllExperiences} <L n="arrow-right" /></Link></section>;
}

export function MarketView() {
  const { c, lang, go } = useK();
  const only = useSearchParams().get('v') === '1';
  const { data: trips = [], isLoading } = useTrips({ level: 'free' });
  const length = useLength();
  const list = trips.filter((t) => !only || t.agency.verified);
  return <Shell cur="market" right={<MarketTrending list={trips} />}>
    <div className="page-pad" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}><h1 className="t-display grow">{c.market.title}</h1></div>
    <div className="page-pad" style={{ marginBottom: 12 }}><Seg opts={[['0', c.market.all], ['1', c.market.verifiedOnly]]} val={only ? '1' : '0'} onPick={(v) => go(`/${lang}/marketplace/${v === '1' ? '?v=1' : ''}`)} /></div>
    {isLoading ? null : list.length ? list.map((t) => { const kind = kindOf(t.agency.kind); return <Link key={t.id} className="card post press" data-item href={`/${lang}/marketplace/${t.id}/`} style={{ display: 'block' }}>
      <div className="media" style={{ aspectRatio: '16/11' }}><img src={coverSrc(t)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      <div style={{ padding: '12px 14px 14px' }}><div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}><Verified on={t.agency.verified} /><span className="t-small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><L n={kindIcon[kind]} />{c.market.hostKinds[kind]}</span><HostTrips id={t.agency.id} /><span className="grow" /></div>
        <b className="t-head" style={{ display: 'block' }}>{tripTitle(t, lang)}</b><p className="bits" style={{ marginTop: 4 }}><Bit icon="calendar">{tripDate(t, lang)}</Bit><Bit icon="clock">{length(t)}</Bit><Bit icon="users">{fill(c.market.seatsLeft, { n: t.seatsLeft })}</Bit></p><Price t={t} /></div></Link>; })
      : <div className="group empty"><L n="store" /><p className="t-head">{c.market.empty}</p><p className="t-small">{c.market.emptyBody}</p></div>}
  </Shell>;
}

/** "Report this trip": the reasons, sent to the team's Reports (no account needed). */
function useReportTrip() {
  const { c, openSheet, dismissActions, toast } = useK();
  return (t: Trip) => openSheet(c.common.more, <button className="option press" data-act="report" onClick={() => {
    let pick = 0;
    const Reasons = () => { const [on, set] = useState(0); return <>{c.market.reasons.map((r, i) => <button key={r} className="option press" role="radio" aria-checked={on === i} data-act="pick-reason" onClick={() => { haptic(); pick = i; set(i); }}><Ic n="flag" /><span className="grow">{r}</span><Ic n="check" cls="check" /></button>)}</>; };
    openSheet(c.market.whatWrong, <Reasons />, <Btn label={c.common.sendToTeam} kind="primary" act="report-send" wide onClick={async () => {
      try { await apiRequest('POST', '/v1/reports', { body: { kind: 'wrong', text: `Marketplace listing ${t.id}: ${c.market.reasons[pick]}` } }); toast(c.market.reported); dismissActions(); } catch { toast(c.common.failed); }
    }} />);
  }}><Ic n="flag" /><span className="grow">{c.market.reportTrip}</span></button>);
}

/** A listing: a page on desktop, the body of a sheet on a phone. */
export function ListingBody({ id }: { id: string }) {
  const { c, lang } = useK();
  const { data: t } = useTrip(id);
  const { data: ratings = [] } = useRatings(id);
  const { data: host } = useLister(t?.agency.id ?? '');
  const length = useLength();
  const share = useShare();
  const report = useReportTrip();
  const [liked, setLiked] = useState<boolean | null>(null);
  if (!t) return null;
  const kind = kindOf(t.agency.kind), on = liked ?? t.liked;
  // Save, as the prototype draws it; a trip's save is the trips API's like (one per device)
  const like = () => { haptic(); setLiked(!on); void tripsRequest(on ? 'DELETE' : 'POST', `/trips/${t.id}/like`).catch(() => setLiked(on)); };
  const includes = (t.includes || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);
  const rate = host?.metrics.rating ?? null;
  return <>
    <div className="place-media"><img src={coverSrc(t)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
    <div className="place-head"><h1 className="t-display">{tripTitle(t, lang)}</h1><p className="bits"><Bit icon="calendar">{tripDate(t, lang)}</Bit><Bit icon="clock">{length(t)}</Bit><Bit icon="users">{fill(c.market.seatsLeft, { n: t.seatsLeft })}</Bit></p><Price t={t} big /></div>
    <div className="place-tools"><IconBtn icon="saved" label={c.common.save} cls={on ? 'on' : ''} act="save" pressed={on} onClick={like} /><IconBtn icon="share" label={c.common.share} act="share" onClick={() => share({ href: `/${lang}/marketplace/${t.id}/` })} /><span className="grow" /><IconBtn icon="more" label={c.common.more} cls="filled" act="listing-more" onClick={() => report(t)} /></div>
    <Group title={c.market.host}><Link className="row press host-link" href={`/${lang}/host/${t.agency.id}/`} style={{ alignItems: 'flex-start', gap: 12 }}><span className="host-av sm">{t.agency.name[0]}</span><span className="grow"><b>{t.agency.name}</b>
      {rate ? <span className="host-rate"><Stars r={rate} /><b>{rate.toFixed(1)}</b><span className="t-small">{fill(c.market.reviewsN, { n: host!.metrics.ratingCount })}</span></span> : null}
      {host ? <span className="t-small" style={{ display: 'block' }}>{fill(host.metrics.trips === 1 ? c.market.hostLineOne : c.market.hostLine, { kind: c.market.hostKinds[kind], n: host.metrics.trips, brand: c.brand })}</span> : null}
      <span className="t-small" style={{ display: 'block', color: t.agency.verified ? 'var(--good)' : 'var(--warn)', marginTop: 4 }}>{t.agency.verified ? (kind === 'office' ? c.market.checkedIdLicence : c.market.checkedId) : c.market.notChecked}</span></span><L n="chevron-right" /></Link></Group>
    {includes.length ? <Group title={c.market.included}>{includes.map((x) => <div key={x} className="row"><Ic n="check" /><span className="grow">{x}</span></div>)}</Group> : null}
    <Reviews list={ratings} title={c.market.reviewsOfTrip} />
  </>;
}

/** A host's public profile: who, verified or not, their trips, and the reviews of all of them. */
export function HostBody({ id }: { id: string }) {
  const { c, lang } = useK();
  const { data: h } = useLister(id);
  const reviews = useQueries({ queries: (h?.trips ?? []).map((t) => ({ queryKey: ['trips', 'ratings', t.id], queryFn: () => tripsRequest<Rating[]>('GET', `/trips/${encodeURIComponent(t.id)}/ratings`) })) })
    .flatMap((r) => r.data ?? []).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (!h) return null;
  const kind = kindOf(h.kind), rate = h.metrics.rating;
  const since = (h as typeof h & { createdAt?: string }).createdAt;
  return <div className="host-page">
    <div className="host-head page-pad"><span className="host-av">{h.name[0]}</span><div><h1 className="t-display">{h.name}</h1>
      <p className="bits"><Bit icon={kindIcon[kind]}>{c.market.hostKinds[kind]}</Bit><Bit icon="route">{h.metrics.trips === 1 ? c.market.oneTrip : fill(c.market.trips, { n: h.metrics.trips })}</Bit>{since ? <Bit icon="calendar">{fill(c.market.since, { brand: c.brand, year: new Date(since).getFullYear() })}</Bit> : null}</p>
      <p className="host-tags">{h.verified ? <Tag label={kind === 'office' ? c.market.idLicence : c.market.verified} tone="good" icon="shield-check" /> : <Tag label={c.market.notVerified} tone="warn" icon="shield-alert" />}{rate ? <span className="host-rate"><Stars r={rate} /><b>{rate.toFixed(1)}</b></span> : null}</p></div></div>
    {h.trips.length ? <Group title={fill(c.market.tripsBy, { name: h.name.split(',')[0] })}><div className="host-trips">{h.trips.map((t) => <Link key={t.id} className="trend-main press" href={`/${lang}/marketplace/${t.id}/`}><img src={coverSrc(t)} alt="" /><span className="grow"><b>{tripTitle(t, lang)}</b><span className="bits"><Bit icon="wallet">{fill(c.units.egp, { n: t.priceEgp })}</Bit><Bit icon="calendar">{tripDate(t, lang)}</Bit></span></span></Link>)}</div></Group> : null}
    <Reviews list={reviews} title={c.market.reviewsOfHost} />
  </div>;
}

/** Desktop (or landed on): the listing or host as a page with its back button (proto asPage). */
export function MarketPage({ children, pin }: { children: ReactNode; pin?: boolean }) {
  const { c, go, lang } = useK();
  const back = () => (history.length > 1 ? history.back() : go(`/${lang}/marketplace/`));
  return <Shell cur="market" wide><div className="place-wrap"><div>{pin ? <div className="back-pin"><IconBtn icon="back" label={c.common.back} cls="page-back" act="page-back" onClick={back} /></div>
    : <div className="page-pad" style={{ margin: '4px 0 4px' }}><IconBtn icon="back" label={c.common.back} cls="filled" act="page-back" onClick={back} /></div>}{children}</div></div></Shell>;
}

/** "N trips" of the host on a listing card (proto Bit route), from the host's public profile. */
function HostTrips({ id }: { id: string }) {
  const { c } = useK();
  const { data: h } = useLister(id);
  return h ? <Bit icon="route">{h.metrics.trips === 1 ? c.market.oneTrip : fill(c.market.trips, { n: h.metrics.trips })}</Bit> : null;
}
