import {
  normalizePhoto,
  photoCandidates,
  photoSource,
  photoSrcSet,
  type Photo,
} from "./place-photo";

export type ShowcaseImage = {
  type: "image";
  url?: string;
  photo?: Photo;
  alt?: string;
};
export type ShowcaseVideo = {
  type: "video";
  url: string;
  poster?: string | null;
  durationSeconds?: number | null;
  alt?: string;
};
export type ShowcaseItem = ShowcaseImage | ShowcaseVideo;
export type MediaDimensions = { width: number; height: number };
export type GalleryItem = {
  type: "image" | "video";
  src?: string;
  srcset?: string;
  width?: number;
  height?: number;
  msrc?: string;
  alt: string;
  videoUrl?: string;
  poster?: string;
  html?: boolean;
};

export function validDimensions(size?: {
  width?: number | null;
  height?: number | null;
}): size is MediaDimensions {
  return Boolean(
    size &&
      Number.isFinite(size.width) &&
      Number.isFinite(size.height) &&
      size.width! > 0 &&
      size.height! > 0,
  );
}

export function galleryItems(
  items: ShowcaseItem[],
  measured: Record<number, MediaDimensions> = {},
  maximum = 1600,
): GalleryItem[] {
  return items.map((item, index) => {
    if (item.type === "video")
      return {
        type: "video",
        html: true,
        videoUrl: item.url,
        poster: item.poster ?? undefined,
        alt: item.alt ?? "",
      };
    const photo = normalizePhoto(item.photo ?? item.url);
    const candidates = photoCandidates(photo, maximum);
    const size = validDimensions(photo)
      ? photo
      : validDimensions(measured[index])
        ? measured[index]
        : undefined;
    return {
      type: "image",
      src: candidates.at(-1)?.url ?? photo.singleUrl,
      srcset: photoSrcSet(photo, maximum),
      msrc: photo.urls?.thumb ?? photoSource(photo),
      width: size?.width ?? undefined,
      height: size?.height ?? undefined,
      alt: item.alt || photo.altText || photo.alt || "",
    };
  });
}
