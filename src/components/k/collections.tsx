'use client';
/* eslint-disable @next/next/no-img-element -- the prototype's <img> markup, ported as is (photos come from the storage CDN in their sizes) */
// Collections from proto/app.js: the card (Cover, group views, who made it, places), the collection page or sheet,
// creating one (private or public), adding a place from its ···, saving a team collection, and sharing (a private
// one asks to become public first). People's own collections belong to this device (no accounts).
import { useState, type ReactNode } from 'react';
import { langPrefix } from '@5argny/core/rules/locale';
import Link from 'next/link';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { animate } from 'motion';
import { fill } from '@5argny/core/copy';
import { apiRequest, ApiError } from '@/lib/api/client';
import { useCities } from '@/lib/api/hooks/use-cities';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { L, Ic } from './icons';
import { Brand, Btn, IconBtn, Seg } from './bits';
import { k } from './rules';
import { toK, placeHref, type KPlace } from './data';
import { Tile, useShare } from './place';
import { Shell } from './Shell';
import { useK, haptic, spring } from './KProvider';

export type Mine = { id: string; title: string; isPublic: boolean; slug: string; placeIds: string[] };
type CRaw = { id: string; title: string; titleEn?: string | null; by: '5argny' | 'person'; isPublic?: boolean; mine?: boolean; places: Record<string, unknown>[] };
export type ColItem = { id: string; slug: string; title: string; places: KPlace[]; own?: boolean; pub?: boolean };

export const mineKey = ['collections', 'mine'] as const;
export const useMine = () => useQuery({ queryKey: mineKey, staleTime: 60_000, queryFn: () => apiRequest<Mine[]>('GET', '/v1/collections/mine').catch(() => [] as Mine[]) });
const savedKey = ['collections', 'saved-sections'] as const;
export const useSavedSections = () => useQuery({ queryKey: savedKey, staleTime: 60_000, queryFn: () => apiRequest<{ id: string; key: string; titleAr: string; titleEn: string | null }[]>('GET', '/v1/home/sections/saved').catch(() => []) });
const cFetch = (slug: string) => apiRequest<CRaw>('GET', `/v1/c/${encodeURIComponent(slug)}`).catch((e) => { if (e instanceof ApiError && e.status === 404) return null; throw e; });

/** A collection's places as cards, its title in the reader's language. */
export function useKCollection() {
  const { lang } = useK();
  const { data: cities = [] } = useCities();
  const { data: categories = [] } = useCategories();
  return (raw: CRaw, slug: string): ColItem => ({
    id: raw.id, slug, own: !!raw.mine, pub: raw.by === '5argny' ? true : !!raw.isPublic,
    title: raw.by === '5argny' && lang !== 'ar' ? raw.titleEn || raw.title : raw.title,
    places: raw.places.map((p) => toK(p as never, { cities, categories }, lang)).filter((p) => p.photos.length),
  });
}
/** Several collections by slug (the person's own, the team ones they saved), with their places. */
export function useCollections(slugs: string[]) {
  const make = useKCollection();
  return useQueries({ queries: slugs.map((slug) => ({ queryKey: ['c', slug], staleTime: 60_000, queryFn: () => cFetch(slug) })) })
    .map((r, i) => (r.data ? make(r.data, slugs[i]) : null)).filter(Boolean) as ColItem[];
}

/** Views of a collection's places in the last 30 days (GET /v1/aggregates/views?kind=collection). */
export function useGroupViews(ids: string[]) {
  return useQuery({ queryKey: ['aggregates', 'collection', ids.join(',')], enabled: ids.length > 0, staleTime: 5 * 60_000,
    queryFn: () => apiRequest<Record<string, number>>('GET', '/v1/aggregates/views', { params: { kind: 'collection', ids: ids.join(',') } }).catch(() => ({} as Record<string, number>)) }).data ?? {};
}

/** Save or unsave a team collection (PUT/DELETE /v1/home/sections/:id/save); it then waits in Saved. */
export function useSaveSection() {
  const { c, toast } = useK();
  const qc = useQueryClient();
  const { data: saved = [] } = useSavedSections();
  const on = (id: string) => saved.some((s) => s.id === id);
  return { on, toggle: async (id: string) => {
    const was = on(id); haptic();
    try { await apiRequest(was ? 'DELETE' : 'PUT', `/v1/home/sections/${id}/save`); toast(was ? c.collections.removedToast : c.collections.savedToast); } catch { toast(c.common.failed); }
    await qc.invalidateQueries({ queryKey: savedKey });
  } };
}

export function Cover({ col }: { col: ColItem }) {
  const ph = col.places.slice(0, 4);
  return <span className={`col-cover n${Math.max(1, ph.length)}`}>{ph.length ? ph.map((p) => <img key={p.id} src={p.photos[0]?.s} alt="" loading="lazy" />) : <span className="col-empty"><L n="images" /></span>}</span>;
}
const GV = ({ n, title }: { n: number; title: string }) => <span className="gv" title={title}><Ic n="eye" />{k(n)}</span>;
export function ColMeta({ col, views }: { col: ColItem; views?: number }) {
  const { c } = useK();
  return <>{views != null ? <GV n={views} title={c.stats.views30} /> : null}
    {col.own ? <span className="bit"><L n={col.pub ? 'globe' : 'lock'} />{col.pub ? c.collections.public : c.collections.private}</span> : <span className="bit"><L n="badge-check" />{fill(c.collections.byTeam, { brand: '' })}<Brand /></span>}
    <span className="bit"><L n="map-pin" />{fill(c.collections.places, { n: col.places.length })}</span></>;
}
export function ColSave({ col }: { col: ColItem }) {
  const { c } = useK();
  const save = useSaveSection(), on = save.on(col.id);
  return <button className={`icon-btn col-save press ${on ? 'on' : ''}`} data-act="col-save" aria-pressed={on} aria-label={fill(c.collections.saveAria, { title: col.title })}
    onClick={(e) => { const svg = e.currentTarget.querySelector('svg'); if (svg) animate(svg, { transform: ['scale(.7)', 'scale(1)'] }, spring(0.3, 0.35)); void save.toggle(col.id); }}><Ic n="saved" /></button>;
}
export function ColCard({ col, views }: { col: ColItem; views?: number }) {
  const { lang } = useK();
  return <div className="col-card" data-item><Link className="card press" href={`${langPrefix(lang)}/c/${col.slug}/`}><Cover col={col} /><span className="col-body"><b>{col.title}</b><span className="t-small"><ColMeta col={col} views={views} /></span></span></Link>{col.own ? null : <ColSave col={col} />}</div>;
}

/** "New collection": a name and who can see it; created with the place it came from, if any. */
export function useNewCollection() {
  const { c, openSheet, dismissAll, toast } = useK();
  const qc = useQueryClient();
  return (placeId?: string) => {
    const form = { title: '', pub: false };
    const Body = () => { const [pub, setPub] = useState(false); return <><label className="search" style={{ background: 'var(--fill)' }}><input className="col-name" placeholder={c.collections.namePlaceholder} aria-label={c.collections.nameAria} onChange={(e) => { form.title = e.target.value; }} /></label>
      <div className="corr-field" style={{ marginTop: 12 }}><span>{c.collections.whoCanSee}</span><Seg opts={[['private', c.collections.onlyMe], ['public', c.collections.anyone]]} val={pub ? 'public' : 'private'} onPick={(v) => { haptic(); form.pub = v === 'public'; setPub(form.pub); }} /></div></>; };
    const create = async () => {
      const title = form.title.trim() || c.collections.defaultTitle;
      try { await apiRequest('POST', '/v1/collections', { body: { title, isPublic: form.pub, ...(placeId ? { placeId } : {}) } }); } catch (e) { toast(e instanceof ApiError && e.status === 429 ? c.common.tooMany : c.common.failed); return; }
      haptic(); toast(fill(form.pub ? c.collections.createdPublic : c.collections.createdPrivate, { title })); dismissAll();
      await qc.invalidateQueries({ queryKey: mineKey });
    };
    openSheet(c.collections.newSheet, <Body />, <Btn label={c.common.create} kind="primary" act="collection-create" wide onClick={() => void create()} />);
  };
}

/** The ···: add this place to the person's collections, start a new one with it, or copy its link. */
export function PlaceMoreBody({ p, before }: { p: KPlace; before?: ReactNode }) {
  const { c, lang, toast, closeTop } = useK();
  const qc = useQueryClient();
  const { data: mine = [] } = useMine();
  const newCol = useNewCollection();
  const toggle = async (col: Mine) => {
    const on = !col.placeIds.includes(p.id); haptic();
    qc.setQueryData<Mine[]>(mineKey, (l) => l?.map((x) => (x.id === col.id ? { ...x, placeIds: on ? [...x.placeIds, p.id] : x.placeIds.filter((id) => id !== p.id) } : x)));
    try { await apiRequest(on ? 'PUT' : 'DELETE', `/v1/collections/${col.id}/places/${p.id}`); toast(fill(on ? c.collections.addedTo : c.collections.removedFrom, { title: col.title })); } catch { toast(c.common.failed); }
    void qc.invalidateQueries({ queryKey: mineKey }); void qc.invalidateQueries({ queryKey: ['c', col.slug] });
  };
  return <>{before}<div className="t-micro" style={{ padding: '6px 4px' }}>{c.place.more.addToCollection}</div>
    {mine.map((col) => <button key={col.id} className="option press" role="checkbox" aria-checked={col.placeIds.includes(p.id)} data-act="col-add" onClick={() => void toggle(col)}><L n={col.isPublic ? 'globe' : 'lock'} /><span className="grow">{col.title}</span><Ic n="check" cls="check" /></button>)}
    <button className="option press" data-act="new-collection" onClick={() => newCol(p.id)}><L n="plus" /><span className="grow">{c.place.more.newCollection}</span></button>
    <button className="option press" data-act="copy-link" onClick={() => { void navigator.clipboard?.writeText(new URL(placeHref(p, lang), location.origin).href); closeTop(); toast(c.common.linkCopied); }}><Ic n="copy" /><span className="grow">{c.place.more.copyLink}</span></button></>;
}

/** One collection: a page on desktop (or landed on), the body of a sheet on a phone. */
export function CollectionView({ slug, sheet }: { slug: string; sheet?: boolean }) {
  const { c, lang, go, openSheet, closeTop } = useK();
  const qc = useQueryClient();
  const make = useKCollection();
  const { data: raw, isLoading } = useQuery({ queryKey: ['c', slug], staleTime: 60_000, queryFn: () => cFetch(slug) });
  const col = raw ? make(raw, slug) : null;
  const views = useGroupViews(col ? [col.id] : [])[col?.id ?? ''];
  const save = useSaveSection();
  const share = useShare();
  const back = sheet ? null : <div className="page-pad" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}><IconBtn icon="back" label={c.common.back} cls="filled" act="page-back" onClick={() => (history.length > 1 ? history.back() : go(`${langPrefix(lang)}/`))} /></div>;
  const wrap = (body: ReactNode, own = false) => (sheet ? <div className="col-sheet">{body}</div> : <Shell cur={own ? 'saved' : 'home'} wide noLoc>{body}</Shell>);
  if (isLoading) return wrap(back);
  if (!col) return wrap(<>{back}<div className="group empty"><L n="library" /><p className="t-head">{c.collections.gone}</p></div></>);
  const href = `${langPrefix(lang)}/c/${slug}/`;
  const setPub = async (pub: boolean) => {
    haptic();
    qc.setQueryData<CRaw | null>(['c', slug], (r) => (r ? { ...r, isPublic: pub } : r));
    try { await apiRequest('PATCH', `/v1/collections/${col.id}`, { body: { isPublic: pub } }); } catch { qc.setQueryData<CRaw | null>(['c', slug], (r) => (r ? { ...r, isPublic: !pub } : r)); return false; }
    void qc.invalidateQueries({ queryKey: mineKey }); return true;
  };
  const onShare = () => {
    if (col.own && !col.pub) {
      openSheet(c.collections.shareSheet, <p className="t-small" style={{ padding: '0 4px 12px' }}>{fill(c.collections.sharePrivate, { title: col.title })}</p>,
        <Btn label={c.collections.makePublicShare} kind="primary" icon="globe" act="col-pub-share" wide onClick={async () => { closeTop(); if (await setPub(true)) setTimeout(() => share({ href }), 380); }} />);
      return;
    }
    share({ href });
  };
  const [before, after] = c.collections.emptyBody.split('{more}');
  const actions = col.own
    ? <><Seg opts={[['private', c.collections.private], ['public', c.collections.public]]} val={col.pub ? 'public' : 'private'} onPick={(v) => void setPub(v === 'public')} /><span className="grow" /><IconBtn icon="share" label={c.common.share} act="col-share" onClick={onShare} /></>
    : <><Btn label={save.on(col.id) ? c.collections.saved : c.collections.save} kind={save.on(col.id) ? 'secondary' : 'primary'} icon="saved" act="col-save" onClick={() => void save.toggle(col.id)} /><span className="grow" /><IconBtn icon="share" label={c.common.share} act="col-share" onClick={onShare} /></>;
  return wrap(<>{back}
    <div className="col-head page-pad"><Cover col={col} /><div><h1 className="t-display">{col.title}</h1><p className="t-small col-meta"><ColMeta col={col} views={views} /></p></div></div>
    <div className="col-actions page-pad">{actions}</div>
    {col.places.length ? <div className="grid">{col.places.map((p) => <Tile key={p.id} p={p} />)}</div>
      : <div className="group empty"><L n="bookmark-plus" /><p className="t-head">{c.collections.emptyTitle}</p><p className="t-small">{before}<L n="ellipsis" />{fill(after ?? '', { title: col.title })}</p><Btn label={c.common.findPlaces} kind="primary" act="go-explore" onClick={() => go(`${langPrefix(lang)}/explorer/`)} /></div>}
  </>, col.own);
}
