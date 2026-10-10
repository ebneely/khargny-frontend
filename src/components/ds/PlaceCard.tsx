'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { priceBandLabel } from '@/lib/price-bands';
import type { CardGallery } from '@/lib/post-gallery';
import { PlaceBadges } from './PlaceBadges';
import { PostPhoto } from './PostPhoto';
import { PlaceActions } from './PlaceActions';
import { ShareButton } from './ShareButton';
import styles from './PostCard.module.css';

type PlaceCardProps = {
  image?: string; imageSizes?: string; title: string; category?: string; searchReason?: string; area: string; rating?: string;
  priceRange?: number | null; hasMenu?: boolean; priceVerified?: boolean; visitedByUs?: boolean;
  badge?: string; badgeTone?: 'white' | 'sponsored'; placeId?: string; likeCount?: number; saveExternally?: boolean;
  favorite?: boolean; onToggleFavorite?: (saved: boolean) => void; size?: 'sm' | 'md'; onTitleClick?: () => void; href?: string;
  metrics?: { saves?: number; directions?: number; views?: number }; gallery?: CardGallery; compact?: boolean; priority?: boolean;
};

export function PlaceCard({ image, imageSizes, title, category, searchReason, area, rating, priceRange, hasMenu = false, priceVerified = false, visitedByUs = false, badge, badgeTone, placeId, likeCount, saveExternally = false, favorite = false, onToggleFavorite, onTitleClick, href, metrics, gallery, compact = false, priority = false }: PlaceCardProps) {
  const { locale } = useI18n();
  const [saveState, setSaveState] = useState({ favorite, saved: favorite });
  if (saveState.favorite !== favorite) setSaveState({ favorite, saved: favorite });
  const saved = saveState.favorite === favorite ? saveState.saved : favorite;
  const address = href?.startsWith('/explorer/') ? `/${locale}${href.replace(/\/+$/, '')}/` : href;
  const words = <><span className={styles.title} data-place-title title={title}>{title}</span>
    <span className={styles.meta} title={area || undefined}>{[category, area].filter(Boolean).join(' · ')}{badge && <span data-badge-tone={badgeTone}>{' · '}{badge}</span>}</span>
    {searchReason && <span data-search-reason className={styles.reason} title={searchReason}>{searchReason}</span>}
    {(rating || priceBandLabel(priceRange, locale)) && <span className={styles.meta}>{rating && <span><Star size={14} aria-hidden="true" /> {rating}</span>}<PlaceBadges priceRange={priceRange} variant="price" /></span>}
  </>;
  return <article className={styles.card} data-place-card data-place-id={placeId} data-compact={compact || undefined}>
    <PostPhoto image={image} gallery={gallery} compact={compact} priority={priority} title={title} placeId={placeId} href={address} sizes={imageSizes} onOpen={onTitleClick} />
    <PlaceActions placeId={placeId} name={title} likeCount={likeCount} metrics={metrics} saved={saveExternally || !placeId ? saved : undefined}
      onSave={(saveExternally || !placeId) && onToggleFavorite ? () => { setSaveState({ favorite, saved: !saved }); onToggleFavorite(!saved); } : undefined} />
    {address ? <Link href={address} prefetch={false} className={`khg-place-card-link ${styles.words}`} onClick={onTitleClick} onAuxClick={event => { if (event.button === 1) onTitleClick?.(); }}>{words}</Link> : <div className={styles.words} onClick={onTitleClick}>{words}</div>}
    <div className={styles.badges} data-place-badges-line><span className={styles.badgesContent}><PlaceBadges hasMenu={hasMenu} priceVerified={priceVerified} visitedByUs={visitedByUs} variant="compact" /></span><ShareButton card name={title} category={category} area={area} href={address} placeId={placeId} /></div>
  </article>;
}
