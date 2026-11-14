'use client';
// What a content sheet shows on a phone, by address (proto render(key)): a place, a collection, a listing, a host.
import type { ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { placesKeys } from '@/lib/api/hooks/use-places';
import { bare } from '@5argny/core/rules/locale';
import { isPlacePath } from './data';
import { PlaceSheetBody, PlaceSheetFoot } from './placeview';
import type { Lang } from './rules';
import { CollectionView } from './collections';
import { ListingBody, HostBody } from './market';

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
