export type CardGallery = { total: number; images: { url: string; width: number | null; height: number | null }[] };

export function postGallery(cover?: string, gallery?: CardGallery, compact = false) {
  const images = !compact && gallery?.images.length ? gallery.images.slice(0, 6) : cover ? [{ url: cover, width: 0, height: 0 }] : [];
  return { images, more: !compact && Boolean(gallery && gallery.total > images.length), total: gallery?.total ?? images.length };
}

export function galleryWindow(active: number, length: number) {
  const start = Math.max(0, Math.min(active - 2, length - 5));
  return Array.from({ length: Math.min(5, length) }, (_, offset) => start + offset);
}

export function loadPostPhoto(index: number, active: number) { return index === active || index === active + 1; }
