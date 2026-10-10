'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/LocaleProvider';
import { postGallery, galleryWindow, loadPostPhoto, type CardGallery } from '@/lib/post-gallery';
import { normalizePhoto, CARD_RAIL_SIZES, POST_CARD_SIZES } from '@/lib/place-photo';
import { PhotoImage } from './PhotoImage';
import { usePhotoLike } from './usePhotoLike';
import styles from './PostCard.module.css';

type PostPhotoProps = { image?: string; gallery?: CardGallery; compact?: boolean; title: string; placeId?: string; href?: string; sizes?: string; priority?: boolean; onOpen?: () => void };

export function PostPhoto(props: PostPhotoProps) {
  return <PostPhotoContent key={JSON.stringify([props.image, props.gallery, props.compact])} {...props} />;
}

function PostPhotoContent({ image, gallery, compact = false, title, placeId, href, sizes, priority = false, onOpen }: PostPhotoProps) {
  const { t, locale } = useI18n();
  const media = postGallery(image, gallery, compact);
  const length = Math.max(1, media.images.length) + Number(media.more);
  const [active, setActive] = useState(0);
  const activeIndex = useRef(0);
  const [loaded, setLoaded] = useState(() => new Set([0, 1]));
  const viewport = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const photoLike = usePhotoLike(placeId);
  const move = (index: number) => {
    const next = Math.max(0, Math.min(length - 1, index));
    const element = viewport.current;
    element?.scrollTo({ left: next * element.clientWidth * (locale === 'ar' ? -1 : 1), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <>
    <div ref={surface} className={styles.photo} data-post-photo data-gallery-total={media.total} data-compact={compact || undefined} onPointerDown={photoLike.onPointerDown} onPointerMove={photoLike.onPointerMove} onPointerUp={photoLike.onPointerUp} onPointerCancel={photoLike.onPointerCancel}>
      <div ref={viewport} className={styles.viewport} data-post-gallery role={length > 1 ? 'group' : undefined} aria-label={length > 1 ? t('place.gallery') : undefined} tabIndex={length > 1 ? 0 : undefined}
        onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); photoLike.cancel(); move(active + (event.key === 'ArrowRight' ? 1 : -1) * (locale === 'ar' ? -1 : 1)); } }}
        onScroll={event => {
          photoLike.cancel();
          const element = event.currentTarget;
          const index = Math.min(length - 1, Math.round(Math.abs(element.scrollLeft) / element.clientWidth));
          if (index !== activeIndex.current) {
            activeIndex.current = index;
            setActive(index); setLoaded(previous => new Set([...previous, index, index + 1]));
          }
        }}>
        {Array.from({ length }, (_, index) => {
          const photo = media.images[index];
          const more = !photo && media.more;
          const contents = more ? t('place.seeAllPhotos', { count: media.total }) : <PhotoImage photo={photo ? { ...normalizePhoto(photo.url), width: photo.width ?? undefined, height: photo.height ?? undefined } : undefined} alt={title} frame={compact ? 'card' : 'post'} sizes={sizes ?? (compact ? CARD_RAIL_SIZES : POST_CARD_SIZES)} priority={priority && index === 0} />;
          return <div key={index} data-post-slide className={styles.slide} aria-hidden={index !== active}>
            {href ? <Link href={more ? `${href}?gallery=1` : href} prefetch={false} tabIndex={index === active ? 0 : -1} className={styles.photoLink}
              onClick={event => {
                const anchor = event.currentTarget;
                if (more) { onOpen?.(); return; }
                if (!photoLike.click(event, () => anchor.click(), surface.current ?? anchor)) onOpen?.();
              }}>
              {(loaded.has(index) || loadPostPhoto(index, active) || more) && contents}
            </Link> : contents}
          </div>;
        })}
      </div>
      {length > 1 && <div className={styles.chevrons}>
        {active > 0 && <button type="button" data-post-arrow="previous" aria-label={t('gallery.previous')} onClick={() => move(active - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>}
        {active < length - 1 && <button type="button" data-post-arrow="next" aria-label={t('gallery.next')} onClick={() => move(active + 1)}><ChevronRight size={18} aria-hidden="true" /></button>}
      </div>}
    </div>
    {length > 1 && <div className={styles.dots} data-post-dots>
      {galleryWindow(active, length).map(index => <button key={index} type="button" aria-label={t('gallery.photo', { index: index + 1, total: length })} aria-current={index === active ? 'true' : undefined} data-small={Math.abs(active - index) > 1 || undefined} onClick={() => move(index)} />)}
    </div>}
  </>;
}
