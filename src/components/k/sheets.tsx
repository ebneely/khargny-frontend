'use client';
// What a content sheet shows on a phone, by address (proto render(key)): a place, a collection, a listing, a host.
// Each body is its own chunk (next/dynamic): the frame's shared JS no longer carries the place page, the marketplace or
// the collection view. prefetchSheetChunks warms them once the page is idle, so a tap finds them already here.
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { QueryClient } from '@tanstack/react-query';
import { placesKeys } from '@/lib/api/hooks/use-places';
import { bare } from '@5argny/core/rules/locale';
import { isPlacePath } from './data';
import type { Lang } from './rules';
import { Sk } from './states';

const PlaceSheetBody = dynamic(() => import('./placeview').then((m) => m.PlaceSheetBody), { ssr: false, loading: () => <SheetSkel /> });
const PlaceSheetFoot = dynamic(() => import('./placeview').then((m) => m.PlaceSheetFoot), { ssr: false });
const CollectionView = dynamic(() => import('./collections').then((m) => m.CollectionView), { ssr: false, loading: () => <SheetSkel /> });
const ListingBody = dynamic(() => import('./market').then((m) => m.ListingBody), { ssr: false, loading: () => <SheetSkel /> });
const HostBody = dynamic(() => import('./market').then((m) => m.HostBody), { ssr: false, loading: () => <SheetSkel /> });

/** What a sheet body shows while its chunk lands: its own skeleton's shape, so nothing moves when it arrives. */
function SheetSkel() {
  return <div className="skel" aria-hidden="true">
    <Sk h={190} r={16} />
    <Sk w="70%" h={22} style={{ marginTop: 14 }} />
    <Sk w="45%" h={14} style={{ marginTop: 8 }} />
    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><Sk w={44} h={44} r={22} /><Sk w={44} h={44} r={22} /><Sk w={44} h={44} r={22} /></div>
  </div>;
}

/** The sheets' chunks, one per idle slot so no single idle moment pays for all of them: a tap on a card never waits. */
export function prefetchSheetChunks() {
  const loaders = [() => import('./placeview'), () => import('./filters-sheet'), () => import('./getapp-prompt'), () => import('./market'), () => import('./collections')];
  const idle = (fn: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 5000 }) : setTimeout(fn, 1200));
  const step = () => { const load = loaders.shift(); if (!load) return; void load(); if (loaders.length) idle(step); };
  idle(step);
}

export type SheetView = { label: string; body: ReactNode; foot?: ReactNode };
type Named = { name?: string | null; nameEn?: string | null };

export function renderSheet(path: string, qc: QueryClient, lang: Lang): SheetView {
  const parts = bare(path).split('/').filter(Boolean); // [explorer, city, slug] | [c|marketplace|host, id]
  if (isPlacePath(path)) {
    const slug = parts[2] ?? '';
    const p = qc.getQueryData<Named>(placesKeys.detail(slug));
    const label = (lang === 'ar' ? p?.name || p?.nameEn : p?.nameEn || p?.name) || '';
    return { label, body: <PlaceSheetBody key="body" slug={slug} />, foot: <PlaceSheetFoot slug={slug} /> };
  }
  // FORK B: collection, listing, host
  const id = parts[1] ?? '';
  if (parts[0] === 'c') { const col = qc.getQueryData<{ title?: string; titleEn?: string | null; by?: string } | null>(['c', id]); return { label: (col?.by === '5argny' && lang !== 'ar' ? col?.titleEn || col?.title : col?.title) || '', body: <CollectionView key={id} slug={id} sheet /> }; }
  if (parts[0] === 'marketplace') { const t = qc.getQueryData<{ title?: string; titleEn?: string | null }>(['trips', 'one', id]); return { label: (lang === 'en' && t?.titleEn) || t?.title || '', body: <ListingBody key={id} id={id} /> }; }
  if (parts[0] === 'host') return { label: qc.getQueryData<{ name?: string }>(['trips', 'lister', id])?.name || '', body: <HostBody key={id} id={id} /> };
  return { label: '', body: null };
}
