export type Photo = {
  url?: string;
  singleUrl?: string;
  urls?: { thumb?: string | null; small?: string | null; medium?: string | null; large?: string | null; original?: string | null };
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  alt?: string;
};

export const PHOTO_SIZES = {
  hero: '(min-width: 1200px) 1120px, (min-width: 1024px) calc(100vw - 80px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)',
  gallery: 'auto, (min-width: 1200px) 732px, (min-width: 1024px) calc(100vw - 468px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)',
  strip: 'auto, (min-width: 1200px) 140px, (min-width: 1024px) calc((100vw - 500px) / 5), (min-width: 768px) calc((100vw - 72px) / 4), (min-width: 640px) calc((100vw - 64px) / 3), calc((100vw - 48px) / 3)',
  card: 'auto, (min-width: 1120px) 249px, (min-width: 1024px) calc((100vw - 124px) / 4), (min-width: 912px) calc((100vw - 112px) / 4), (min-width: 800px) calc((100vw - 96px) / 3), (min-width: 687px) calc((92vw - 32px) / 3), (min-width: 453px) calc((92vw - 16px) / 2), (min-width: 400px) 92vw, calc(100vw - 32px)',
  city: 'auto, (min-width: 1200px) 379px, (min-width: 1024px) calc((100vw - 64px) / 3), calc((100vw - 48px) / 2)',
} as const;

export const CARD_RAIL_SIZES = 'auto, (min-width: 1120px) 249px, (min-width: 1024px) calc((100vw - 124px) / 4), (min-width: 362px) 260px, 72vw';

export const PHOTO_CROP_LIMITS = { hero: 0.3, gallery: 0.3, strip: 0.3, card: 0.55, city: 0.55 } as const;

export function photoFit(ratio: number | null | undefined, frameRatio: number, maximumLoss = 0.3): 'cover' | 'contain' {
  if (!ratio || ratio <= 0 || !Number.isFinite(ratio) || frameRatio <= 0) return 'cover';
  const loss = 1 - Math.min(ratio / frameRatio, frameRatio / ratio);
  return loss <= maximumLoss + Number.EPSILON ? 'cover' : 'contain';
}

export function normalizePhoto(input: string | Photo | null | undefined): Photo {
  if (typeof input !== 'string') return input ?? {};
  try {
    const parsed = new URL(input);
    if (parsed.protocol === 'https:' && parsed.hostname === 'storage.5argny.com' && /_small\.webp$/i.test(parsed.pathname)) {
      const variant = (name: string) => {
        const result = new URL(input);
        result.pathname = result.pathname.replace(/_small\.webp$/i, `_${name}.webp`);
        return result.href;
      };
      return { urls: { thumb: variant('thumb'), small: input, medium: variant('medium'), large: variant('large') } };
    }
  } catch {}
  return { singleUrl: input };
}

export function photoCandidates(photo: Photo, maximum = 1600) {
  const candidates: { url: string; width: number }[] = [];
  const sourceWidth = photo.width && photo.width > 0 ? photo.width : Infinity;
  for (const [name, nominal] of [['small', 480], ['medium', 960], ['large', 1600]] as const) {
    const url = photo.urls?.[name];
    const width = Math.min(nominal, sourceWidth);
    if (url && nominal <= maximum && !candidates.some((candidate) => candidate.width === width || candidate.url === url)) {
      candidates.push({ url, width });
    }
  }
  return candidates;
}

export function photoSrcSet(photo: Photo, maximum?: number) {
  return photoCandidates(photo, maximum).map(({ url, width }) => `${url} ${width}w`).join(', ') || undefined;
}

export function photoSource(photo: Photo) {
  return photoCandidates(photo)[0]?.url ?? photo.singleUrl;
}

export function nextPhotoAttempt(photos: Photo[], photoIndex: number, failedUrl: string): { photoIndex: number; url?: string } | null {
  const candidates = photoCandidates(photos[photoIndex]);
  const failedIndex = candidates.findIndex((candidate) => {
    try { return new URL(candidate.url, failedUrl).href === failedUrl; } catch { return candidate.url === failedUrl; }
  });
  if (failedIndex > 0) return { photoIndex, url: candidates[failedIndex - 1].url };
  for (let nextIndex = photoIndex + 1; nextIndex < photos.length; nextIndex += 1) {
    if (photoSource(photos[nextIndex])) return { photoIndex: nextIndex };
  }
  return null;
}
