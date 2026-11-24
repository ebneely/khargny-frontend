'use client';
/* eslint-disable @next/next/no-img-element -- the prototype's <img> markup, ported as is */
// Settings (proto Profile): Appearance, Language, Help > Report a problem. No account, sign-in or notification switches
// (owner rule: identity is the device). Plus the two forms that feed the dashboard Inbox, built once as proto corrBody/
// reportBody: Suggest a correction (POST /v1/places/:id/corrections) and Report a problem (POST /v1/reports).
// A page on desktop or when landed on; a sheet on a phone (the correction stacks over the place sheet).
import { useEffect, useRef, useState } from 'react';
import { bare, langPrefix } from '@5argny/core/rules/locale';
import { FootLinks } from './footlinks';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { animate } from 'motion';
import { apiRequest, ApiError } from '@/lib/api/client';
import { normalizeTopPlaces } from '@/lib/ads/placements';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { L, Ic } from './icons';
import { Btn, IconBtn, Group, Seg } from './bits';
import { toK, placeHref, type KPlace } from './data';
import { Meta } from './place';
import { ProofPicker, useProofBusy } from './proof';
import { Shell } from './Shell';
import { TrendCard } from './home';
import { MarketCard } from './market';
import { useK, haptic, reduce, spring, desk } from './KProvider';

/** The right rail of the tab pages (proto RightRail()): Trending, then the Marketplace. */
export function HomeRail() {
  const { lang } = useK();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  const { data } = useQuery({ queryKey: ['home', 'top-places'], staleTime: 5 * 60_000, queryFn: () => apiRequest<unknown>('GET', '/v1/home/top-places').then(normalizeTopPlaces).catch(() => null) });
  const list = (data?.items ?? []).map((x) => toK(x.place as never, { cities, categories }, lang)).filter((p) => p.photos.length);
  return <><TrendCard list={list} /><MarketCard /></>;
}

type Theme = 'light' | 'dark' | 'auto';
export function SettingsView() {
  const { c, lang } = useK();
  const [theme, setTheme] = useState<Theme>('auto');
  // eslint-disable-next-line react-hooks/set-state-in-effect -- issue #34 deferred: the saved theme is read after mount to avoid a server/client mismatch
  useEffect(() => { setTheme((localStorage.getItem('kh.theme') as Theme) || 'auto'); }, []);
  const pickTheme = (t: Theme) => {
    haptic(); setTheme(t); localStorage.setItem('kh.theme', t);
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches), html = document.documentElement;
    html.classList.add('theme-fade'); html.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14100D' : '#FBF6EE');
    setTimeout(() => html.classList.remove('theme-fade'), 400);
  };
  // the language is part of every address: the same page under the other prefix
  const pickLang = (l: 'en' | 'ar') => { if (l !== lang) location.assign(`${langPrefix(l)}${bare(location.pathname)}${location.search}`); };
  const report = useOpenReport();
  return <Shell cur="profile" right={<HomeRail />}>
    <h1 className="t-display page-pad" style={{ margin: '4px 0 12px' }}>{c.settings.title}</h1>
    <Group title={c.settings.preferences}>
      <div className="row"><span className="grow">{c.settings.appearance}</span><Seg opts={[['light', c.settings.light], ['dark', c.settings.dark], ['auto', c.settings.auto]]} val={theme} onPick={pickTheme} /></div>
      <div className="row"><span className="grow">{c.settings.language}</span><Seg opts={[['en', c.settings.english], ['ar', c.settings.arabic]]} val={lang} onPick={pickLang} /></div>
    </Group>
    <Group title={c.settings.help}><Link className="row press" href={`${langPrefix(lang)}/settings/report/`} data-act="report-open" onClick={(e) => { if (desk()) return; e.preventDefault(); report(); }}><Ic n="flag" /><span className="grow">{c.settings.report}</span><L n="chevron-right" /></Link><Link className="row press" href={`${langPrefix(lang)}/privacy/`}><L n="lock" /><span className="grow">{c.settings.privacy}</span><L n="chevron-right" /></Link></Group>
    <Group title={c.sidebar.follow}><FootLinks cls="row press" skipPrivacy /></Group>
  </Shell>;
}

const ISSUES = [['hours', 'clock'], ['location', 'map-pin'], ['phone', 'phone'], ['closed', 'circle-off'], ['photos', 'image'], ['prices', 'receipt'], ['name', 'tag'], ['other', 'message-circle']] as const;
const REPORT_ISSUES = [['bug', 'bug'], ['wrong', 'badge-alert'], ['slow', 'gauge'], ['idea', 'lightbulb'], ['other', 'message-circle']] as const;
type Kind = (typeof ISSUES)[number][0];

/** Both forms: what is wrong, then the detail for that choice, then thanks. The send button reads the form it belongs to. */
function CorrForm({ p }: { p?: KPlace }) {
  const { c } = useK();
  const [pick, setPick] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const det = useRef<HTMLElement>(null), ok = useRef<HTMLDivElement>(null), first = useRef(true);
  useEffect(() => { const el = det.current?.closest('.corr'); const f = () => setDone(true); el?.addEventListener('k-corr-sent', f); return () => el?.removeEventListener('k-corr-sent', f); }, []);
  useEffect(() => { if (!pick || !det.current) return; animate(det.current, { opacity: [0, 1], transform: [first.current ? 'translateY(12px)' : 'translateY(4px)', 'translateY(0)'] }, spring(0, 0.4)); first.current = false; const d = det.current; setTimeout(() => d.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'nearest' }), 140); }, [pick]);
  useEffect(() => { const o = ok.current; if (!done || !o) return; animate(o.querySelector('.corr-check')!, { transform: ['scale(.4)', 'scale(1)'], opacity: [0, 1] }, spring(0.45, 0.5)); animate(o.querySelector('h2')!, { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0)'] }, { ...spring(0, 0.4), delay: 0.12 }); }, [done]);
  const list = p ? ISSUES.map(([k, i]) => [k, c.correction.issues[k], i] as const) : REPORT_ISSUES.map(([k, i]) => [k, c.report.issues[k], i] as const);
  const seg = (opts: [string, string][], dflt: string, name: string) => <SegField opts={opts} dflt={dflt} name={name} />;
  const f = c.correction.fields;
  const field = (k: Kind) => ({
    hours: <label className="corr-field"><span>{f.hours.label}</span><textarea name="text" rows={3} placeholder={f.hours.placeholder} /></label>,
    location: <label className="corr-field"><span>{f.location.label}</span><input name="text" placeholder={f.location.placeholder} /></label>,
    phone: <label className="corr-field"><span>{f.phone.label}</span><input name="text" type="tel" dir="ltr" placeholder={f.phone.placeholder} /></label>,
    closed: <div className="corr-field"><span>{f.closed.label}</span>{seg([['recent', f.closed.recent], ['months', f.closed.months], ['unsure', f.closed.unsure]], 'recent', 'since')}</div>,
    photos: <label className="corr-field"><span>{f.photos.label}</span><textarea name="text" rows={2} placeholder={f.photos.placeholder} /></label>,
    prices: <label className="corr-field"><span>{f.prices.label}</span><textarea name="text" rows={3} placeholder={f.prices.placeholder} /></label>,
    name: <label className="corr-field"><span>{f.name.label}</span><input name="text" placeholder={f.name.placeholder} /></label>,
    other: <label className="corr-field"><span>{f.other.label}</span><textarea name="text" rows={3} placeholder={f.other.placeholder} /></label>,
  })[k];
  return <>
    {p ? <div className="group corr-place" hidden={done}><img decoding="async" src={p.photos[0]?.s} alt="" /><span className="grow"><b dir="auto">{p.name}</b><Meta p={p} /></span></div> : null}
    <section className="group" data-corr={p ? p.slug : 'app'} hidden={done}><h2 className="group-title"><L n="circle-help" /> {p ? c.correction.whatsWrong : c.report.whatHappened}</h2>
      <div className="corr-list" role="radiogroup">{list.map(([k, l, i]) => <button key={k} className="option press" role="radio" aria-checked={pick === k} data-act="corr-pick" data-v={k} onClick={() => { haptic(); setPick(k); }}><L n={i} /><span className="grow">{l}</span><Ic n="check" cls="check" /></button>)}</div></section>
    <section className="group corr-detail" hidden={!pick || done} ref={det}>{!pick ? null : p ? <><h2 className="group-title"><L n="pencil-line" /> {c.correction.rightAnswer}</h2>{field(pick as Kind)}
      <div className="corr-field"><span>{c.correction.howKnow}</span>{seg([['visit', c.correction.visit], ['staff', c.correction.staff], ['online', c.correction.online]], 'visit', 'source')}</div>
      <ProofPicker kind="corrections" /></>
      : <><h2 className="group-title"><L n="pencil-line" /> {c.report.tellMore}</h2><label className="corr-field"><span>{c.report.whatHappened}</span><textarea name="text" rows={3} placeholder={c.report.detail} /></label>
        <ProofPicker kind="reports" />
        <p className="t-small" style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}><L n="smartphone" />{c.report.device}</p></>}</section>
    <div className="corr-done" hidden={!done} ref={ok}>{done ? <div className="corr-ok"><span className="corr-check"><L n="check" /></span><h2 className="t-title">{c.correction.doneTitle}</h2><p className="t-small">{c.correction.doneBody}</p></div> : null}</div>
  </>;
}
function SegField({ opts, dflt, name }: { opts: [string, string][]; dflt: string; name: string }) {
  const [v, set] = useState(dflt);
  return <span data-seg={name} data-v={v} style={{ display: 'contents' }}><Seg opts={opts} val={v} onPick={(x) => { haptic(); set(x); }} /></span>;
}

/** Send: reads the form this button belongs to (its sheet or the page), posts it, shows thanks, then steps back. */
function useSend(p?: KPlace) {
  const { c, toast, closeTop } = useK();
  return async (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget, scope = btn.closest('.sheet') ?? document, form = scope.querySelector<HTMLElement>('.corr')!;
    const picked = form.querySelector<HTMLElement>('[data-corr] .option[aria-checked="true"]');
    if (!picked) { const g = form.querySelector('[data-corr]'); if (g) animate(g, { transform: ['translateX(0)', 'translateX(-6px)', 'translateX(6px)', 'translateX(0)'] }, { duration: 0.32 }); toast(c.correction.pickFirst); return; }
    if (form.querySelector('.proof-bar')) { toast(c.proof.wait); return; } // the button is disabled too; this covers a fast tap
    const media: string[] = JSON.parse(form.querySelector<HTMLElement>('.corr-proof')?.dataset.media || '[]'), withMedia = media.length ? { media } : {};
    const kind = picked.dataset.v!, text = (form.querySelector<HTMLInputElement>('.corr-detail [name="text"]')?.value || '').trim(), seg = (n: string) => form.querySelector<HTMLElement>(`[data-seg="${n}"]`)?.dataset.v;
    try {
      if (p) await apiRequest('POST', `/v1/places/${p.id}/corrections`, { body: { kind, source: seg('source') || 'visit', answer: { text, ...(kind === 'phone' && text ? { phone: text } : {}), ...(kind === 'name' && text ? { name: text } : {}), ...(kind === 'closed' ? { since: seg('since') } : {}) }, ...withMedia } });
      else await apiRequest('POST', '/v1/reports', { body: { kind, text: text || c.report.issues[kind as keyof typeof c.report.issues], device: { app: 'web', ua: navigator.userAgent.slice(0, 240), w: innerWidth, h: innerHeight, lang: document.documentElement.lang }, ...withMedia } });
    } catch (err) { toast(err instanceof ApiError && err.status === 429 ? c.common.tooMany : c.common.failed); return; }
    haptic(); btn.style.visibility = 'hidden';
    (form.closest('.sheet-body') ?? document.scrollingElement)?.scrollTo({ top: form.closest('.sheet-body') ? 0 : Math.max(0, form.getBoundingClientRect().top + scrollY - 70), behavior: 'instant' });
    form.dispatchEvent(new Event('k-corr-sent'));
    // a stacked sheet closes itself; the full page steps back
    setTimeout(() => { if (btn.closest('.sheet')) closeTop(); else history.back(); }, 1600);
  };
}

function FormPage({ title, tab, p }: { title: string; tab: 'explore' | 'profile'; p?: KPlace }) {
  const { c, go, lang } = useK();
  const send = useSend(p), uploading = useProofBusy();
  useEffect(() => { document.body.classList.add('form-page'); return () => document.body.classList.remove('form-page'); }, []);
  return <Shell cur={tab} wide noLoc actionbar={<Btn label={c.common.sendToTeam} kind="primary" icon="flag" act="corr-send" wide disabled={uploading} onClick={(e) => void send(e)} />}>
    <div className="corr"><div className="page-pad" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}><IconBtn icon="back" label={c.common.back} cls="filled" act="page-back" onClick={() => (history.length > 1 ? history.back() : go(p ? placeHref(p, lang) : `${langPrefix(lang)}/settings/`))} /><h1 className="t-title grow">{title}</h1></div><CorrForm p={p} /></div>
    {/* desktop has no fixed action bar (it hides at 1024 px), so the send button closes the form and sticks to the bottom of the column */}
    <div className="corr-send-desk desk-only"><Btn label={c.common.sendToTeam} kind="primary" icon="flag" act="corr-send" wide disabled={uploading} onClick={(e) => void send(e)} /></div>
  </Shell>;
}
export function ReportPage() { const { c } = useK(); return <FormPage title={c.report.title} tab="profile" />; }
export function CorrectionPage({ p }: { p: KPlace }) { const { c } = useK(); return <FormPage title={c.correction.title} tab="explore" p={p} />; }

function SendBtn({ p }: { p?: KPlace }) { const { c } = useK(); const send = useSend(p), uploading = useProofBusy(); return <Btn label={c.common.sendToTeam} kind="primary" icon="flag" act="corr-send" wide disabled={uploading} onClick={(e) => void send(e)} />; }
/** Phone: Report a problem as a sheet. */
export function useOpenReport() {
  const { c, openSheet } = useK();
  return () => openSheet(c.report.title, <div className="corr"><CorrForm /></div>, <SendBtn />);
}
/** Phone: Suggest a correction as a sheet stacked over the place sheet. */
export function useOpenCorrection() {
  const { c, openSheet } = useK();
  return (p: KPlace) => openSheet(c.correction.title, <div className="corr"><CorrForm p={p} /></div>, <SendBtn p={p} />);
}
