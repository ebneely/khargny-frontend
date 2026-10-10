'use client';

import { Bookmark, Navigation, Eye } from 'lucide-react';
import { useSaveToggle } from '@/lib/api/hooks/use-saved-places';
import { useI18n } from '@/i18n/LocaleProvider';
import { compactCount } from '@/lib/compact-count';
import { LikeButton } from './LikeButton';
import styles from './PostCard.module.css';

export function PlaceActions({ placeId, name, likeCount, metrics = {}, saved, onSave, saveDisabled = false }: { placeId?: string; name: string; likeCount?: number; metrics?: { saves?: number; directions?: number; views?: number }; saved?: boolean; onSave?: () => void; saveDisabled?: boolean }) {
  const { t } = useI18n();
  const backend = useSaveToggle(placeId && saved === undefined ? placeId : null);
  const selected = saved ?? backend.saved;
  return <div className={styles.actions} data-place-actions>
    {placeId && <LikeButton placeId={placeId} name={name} likeCount={likeCount} />}
    <span role="img" className={styles.stat} aria-label={t('place.directionsCount', { count: metrics.directions ?? 0 })}><Navigation size={18} aria-hidden="true" /><span dir="ltr" aria-hidden="true">{compactCount(metrics.directions)}</span></span>
    <span role="img" className={styles.stat} aria-label={t('place.viewsCount', { count: metrics.views ?? 0 })}><Eye size={18} aria-hidden="true" /><span dir="ltr" aria-hidden="true">{compactCount(metrics.views)}</span></span>
    {(placeId || onSave) && <button type="button" data-save-button className={styles.save} aria-pressed={selected} aria-busy={backend.isPending} disabled={saveDisabled || backend.isPending} aria-label={`${t(selected ? 'place.unsaveLabel' : 'place.saveLabel', { place: name })}: ${t('place.savesCount', { count: metrics.saves ?? 0 })}`}
      onClick={event => { event.preventDefault(); event.stopPropagation(); if (onSave) onSave(); else backend.toggle(); }}>
      <Bookmark size={24} fill={selected ? 'currentColor' : 'none'} aria-hidden="true" /><span dir="ltr" aria-hidden="true">{compactCount(metrics.saves)}</span>
    </button>}
  </div>;
}
