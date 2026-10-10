/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from 'react';
import { normalizePhoto, nextPhotoAttempt, photoFit, photoSource, photoSrcSet, PHOTO_SIZES, PHOTO_CROP_LIMITS, type Photo } from '@/lib/place-photo';
import styles from './PhotoImage.module.css';

type Props = {
  photo?: Photo | string | null;
  fallbackPhotos?: Photo[];
  alt: string;
  frame: keyof typeof PHOTO_SIZES;
  sizes?: string;
  priority?: boolean;
  fullPhoto?: boolean;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
};

export function PhotoImage({ photo, fallbackPhotos = [], ...props }: Props) {
  const photos = [normalizePhoto(photo), ...fallbackPhotos];
  const identity = JSON.stringify(photos);
  return <PhotoImageContent key={identity} photos={photos} {...props} />;
}

function PhotoImageContent({ photos, alt, frame, sizes = PHOTO_SIZES[frame], priority = false, fullPhoto = false, onClick }: Omit<Props, 'photo' | 'fallbackPhotos'> & { photos: Photo[] }) {
  const [attempt, setAttempt] = React.useState<{ photoIndex: number; url?: string } | null>({ photoIndex: 0 });
  const [loaded, setLoaded] = React.useState<string | null>(null);
  const [naturalRatio, setNaturalRatio] = React.useState<number | null>(null);
  const [frameRatio, setFrameRatio] = React.useState(frame === 'card' || frame === 'post' || frame === 'strip' ? 1 : frame === 'city' ? 16 / 10 : 4 / 3);
  const frameRef = React.useRef<HTMLSpanElement>(null);
  const sharpRef = React.useRef<HTMLImageElement>(null);
  const photo = photos[attempt?.photoIndex ?? 0];
  const src = attempt ? attempt.url ?? photoSource(photo) : undefined;
  const srcSet = attempt && !attempt.url ? photoSrcSet(photo) : undefined;
  const imageSizes = priority ? sizes.replace(/^auto,\s*/, '') : sizes;
  const width = photo.width ?? 0;
  const height = photo.height ?? 0;
  const hasDimensions = width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height);
  const ratio = hasDimensions ? width / height : naturalRatio;
  const fit = fullPhoto ? 'contain' : photoFit(ratio, frameRatio, PHOTO_CROP_LIMITS[frame]);
  const backdrop = fit === 'contain' ? photo.urls?.thumb ?? photo.singleUrl ?? photo.urls?.small : undefined;
  const reveal = React.useCallback((image: HTMLImageElement) => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    setNaturalRatio(image.naturalWidth / image.naturalHeight);
    setLoaded(image.currentSrc || image.src);
  }, []);

  React.useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width && bounds.height) setFrameRatio(bounds.width / bounds.height);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const image = sharpRef.current;
    if (image?.complete) reveal(image);
  }, [src, reveal]);

  return (
    <span ref={frameRef} className={styles.frame} data-photo-frame={frame} data-photo-fit={fit} onClick={onClick}>
      {attempt && backdrop && <img key={backdrop} src={backdrop} alt="" aria-hidden="true" width={240} height={240} loading={priority ? 'eager' : 'lazy'} decoding="async" className={styles.backdrop} onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />}
      {priority && srcSet && <link rel="preload" as="image" imageSrcSet={srcSet} imageSizes={imageSizes} fetchPriority="high" />}
      {src ? (
        <picture>
          {frame === 'card' && srcSet && <source media="(max-width: 639px)" srcSet={photoSrcSet(photo, 480)} sizes={imageSizes} />}
          <img
            key={`${attempt?.photoIndex}:${src}`}
            ref={sharpRef}
            src={src}
            srcSet={srcSet}
            sizes={srcSet ? imageSizes : undefined}
            alt={alt}
            width={hasDimensions ? width : 4}
            height={hasDimensions ? height : 3}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
            className={`${styles.sharp}${loaded ? ` ${styles.loaded}` : ''}`}
            style={{ objectFit: fit, objectPosition: fit === 'cover' ? '50% 40%' : '50% 50%' }}
            onLoad={(event) => reveal(event.currentTarget)}
            onError={(event) => {
              setLoaded(null);
              setNaturalRatio(null);
              setAttempt(nextPhotoAttempt(photos, attempt?.photoIndex ?? 0, event.currentTarget.currentSrc || event.currentTarget.src));
            }}
          />
        </picture>
      ) : <span role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={!alt || undefined} className={styles.placeholder} />}
    </span>
  );
}
