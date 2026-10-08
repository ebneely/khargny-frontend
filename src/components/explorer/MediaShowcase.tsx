"use client";

import * as React from "react";
import { ImageOff, Play } from "lucide-react";
import { PhotoImage } from "@/components/ds/PhotoImage";
import { useI18n } from "@/i18n/LocaleProvider";
import type { ShowcaseItem } from "@/lib/place-gallery";
export type {
  ShowcaseItem,
  ShowcaseImage,
  ShowcaseVideo,
} from "@/lib/place-gallery";

const loadGallery = () => import("./place-lightbox");

export function usePlaceGallery() {
  const { locale, t } = useI18n();
  const [error, setError] = React.useState(false);
  const controller =
    React.useRef<
      Awaited<ReturnType<(typeof import("./place-lightbox"))["openGallery"]>>
    >(null);
  const busy = React.useRef(false);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.close();
    };
  }, []);
  const warm = () => {
    void loadGallery()
      .then((module) => module.warmGallery())
      .catch(() => {});
  };
  const open = async (
    items: ShowcaseItem[],
    index: number,
    trigger: HTMLElement,
    title: string,
  ) => {
    if (busy.current || controller.current?.isOpen) return;
    busy.current = true;
    setError(false);
    try {
      const module = await loadGallery();
      controller.current = await module.openGallery({
        items,
        index,
        trigger,
        root:
          trigger.closest<HTMLElement>("[data-place-gallery]") ?? document.body,
        title,
        rtl: locale === "ar",
        t,
        cancelled: () => !mounted.current,
      });
    } catch {
      if (mounted.current) setError(true);
    } finally {
      busy.current = false;
    }
  };
  return { open, warm, error };
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function Tile({
  item,
  index,
  total,
  onOpen,
  hero,
  moreCount = 0,
}: {
  item: ShowcaseItem;
  index: number;
  total: number;
  onOpen: (index: number, trigger: HTMLElement) => void;
  hero?: boolean;
  moreCount?: number;
}) {
  const { t } = useI18n();
  const duration =
    item.type === "video" ? formatDuration(item.durationSeconds) : null;
  return (
    <button
      type="button"
      data-gallery-index={index}
      className={`khg-media-tile${hero ? " khg-media-hero" : ""}`}
      onClick={(event) =>
        onOpen(moreCount ? index + 1 : index, event.currentTarget)
      }
      aria-label={
        moreCount
          ? t("gallery.more", { count: moreCount })
          : t(item.type === "video" ? "gallery.video" : "gallery.photo", {
              index: index + 1,
              total,
            })
      }
    >
      {item.type === "image" ? (
        <PhotoImage
          photo={item.photo ?? item.url}
          alt={item.alt || ""}
          frame={hero ? "gallery" : "strip"}
        />
      ) : item.poster ? (
        <img
          src={item.poster}
          alt={item.alt || ""}
          loading={hero ? "eager" : "lazy"}
        />
      ) : (
        <video
          className="khg-media-poster-video"
          src={item.url}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      {item.type === "video" && !moreCount && (
        <span className="khg-media-play" aria-hidden="true">
          <span className="khg-media-play-btn">
            <Play size={hero ? 26 : 20} fill="var(--white)" />
          </span>
        </span>
      )}
      {duration && !moreCount && (
        <span className="khg-media-dur">{duration}</span>
      )}
      {moreCount > 0 && (
        <span className="khg-media-more" aria-hidden="true">
          +{moreCount}
        </span>
      )}
    </button>
  );
}

export function MediaShowcase({
  items,
  allItems = items,
  offset = 0,
  title = "",
}: {
  items: ShowcaseItem[];
  allItems?: ShowcaseItem[];
  offset?: number;
  title?: string;
}) {
  const gallery = usePlaceGallery();
  const { t } = useI18n();
  if (!items.length)
    return (
      <div className="khg-media-empty">
        <ImageOff size={48} strokeWidth={1.5} />
      </div>
    );
  const open = (index: number, trigger: HTMLElement) => {
    void gallery.open(allItems, index, trigger, title);
  };
  return (
    <>
      <style>{`
      .khg-media-showcase { display: flex; flex-direction: column; gap: 8px; }
      .khg-media-hero { aspect-ratio: 4 / 3; }
      @media (min-width: 768px) { .khg-media-hero { aspect-ratio: 16 / 9; } }
      .khg-media-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      @media (min-width: 768px) { .khg-media-strip { grid-template-columns: repeat(4, 1fr); } }
      @media (min-width: 1024px) { .khg-media-strip { grid-template-columns: repeat(5, 1fr); } }
      .khg-media-strip .khg-media-tile { aspect-ratio: 1 / 1; }
      .khg-media-tile { position: relative; overflow: hidden; cursor: pointer; width: 100%; border-radius: var(--radius-lg); border: none; padding: 0; background: var(--gray-100); transition: var(--motion-transform), var(--motion-shadow); }
      .khg-media-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
      .khg-media-tile:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
      .khg-media-tile > img, .khg-media-poster-video { width: 100%; height: 100%; object-fit: cover; display: block; }
      .khg-media-poster-video { background: var(--gradient-sunset-radial); pointer-events: none; }
      .khg-media-play, .khg-media-more { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--black) 35%, transparent); color: var(--white); }
      .khg-media-play-btn { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: var(--radius-full); background: color-mix(in srgb, var(--black) 50%, transparent); }
      .khg-media-dur { position: absolute; inset-block-end: 8px; inset-inline-end: 8px; font-size: var(--text-xs); font-weight: 600; color: var(--white); background: var(--gray-900); padding: 2px 7px; border-radius: var(--radius-full); }
      .khg-media-more { background: color-mix(in srgb, var(--black) 55%, transparent); font-family: var(--font-display); font-size: var(--text-xl); font-weight: 700; }
      .khg-media-empty { aspect-ratio: 16 / 9; display: grid; place-items: center; border-radius: var(--radius-xl); background: var(--gradient-sunset-radial); color: var(--white); }
      @media (prefers-reduced-motion: reduce) { .khg-media-tile { transition: none; } .khg-media-tile:hover { transform: none; } }
    `}</style>
      <div
        className="khg-media-showcase"
        onPointerEnter={gallery.warm}
        onTouchStart={gallery.warm}
        onFocus={gallery.warm}
      >
        <Tile
          item={items[0]}
          index={offset}
          total={allItems.length}
          onOpen={open}
          hero
        />
        {items.length > 1 && (
          <div className="khg-media-strip">
            {items.slice(1, 6).map((item, index) => (
              <Tile
                key={index + 1}
                item={item}
                index={offset + index + 1}
                total={allItems.length}
                onOpen={open}
                moreCount={
                  index === 4 && items.length > 6 ? items.length - 6 : 0
                }
              />
            ))}
          </div>
        )}
      </div>
      <noscript>
        {items
          .slice(6)
          .map((item, index) =>
            item.type === "image" ? (
              <PhotoImage
                key={index + 6}
                photo={item.photo ?? item.url}
                alt={item.alt || ""}
                frame="gallery"
              />
            ) : null,
          )}
      </noscript>
      {gallery.error && <p role="alert">{t("gallery.unavailable")}</p>}
    </>
  );
}
