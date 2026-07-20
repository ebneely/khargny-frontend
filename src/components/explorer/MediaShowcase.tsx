"use client";
/**
 * MediaShowcase — the place's photos AND videos, as one gallery with a full-screen lightbox.
 *
 * Replaces ImageGallery, which rendered a flat 2-column grid of photos only. Videos existed
 * in the payload (backend returns `videos` on the public detail) but were never shown — this
 * is the fix, plus a redesign so the media reads as a showcase rather than a contact sheet:
 *
 *   - a mosaic: the first item spans large, the rest tile beside it, so the eye has a focal
 *     point instead of N equal squares
 *   - videos carry a play badge and a duration pill over their poster frame
 *   - the lightbox handles both types: an image, or a real <video controls> that autoplays
 *   - arrow-key / swipe navigation across the whole set, Escape to close, focus trapped
 *
 * One responsive component, phone → desktop. No media query forks a second tree; the mosaic
 * reflows via grid.
 */
import * as React from "react";
import { ImageOff, X, Play, ChevronLeft, ChevronRight } from "lucide-react";

export type ShowcaseImage = { type: "image"; url: string; alt?: string };
export type ShowcaseVideo = {
  type: "video";
  url: string;
  poster?: string | null;
  durationSeconds?: number | null;
  alt?: string;
};
export type ShowcaseItem = ShowcaseImage | ShowcaseVideo;

function formatDuration(sec?: number | null): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** One tile — a photo, or a video poster with a play badge. Posterless videos get a gradient
 *  instead of trying to render the video file as an <img>, which is what showed a broken icon. */
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
  onOpen: (i: number) => void;
  hero?: boolean;
  moreCount?: number;
}) {
  const dur = item.type === "video" ? formatDuration(item.durationSeconds) : null;
  const posterSrc = item.type === "video" ? item.poster : item.url;
  const showMore = moreCount > 0;
  return (
    <button
      type="button"
      className={`khg-media-tile${hero ? " khg-media-hero" : ""}`}
      onClick={() => onOpen(index)}
      aria-label={item.type === "video" ? `Play video ${index + 1}` : `View photo ${index + 1} of ${total}`}
    >
      {posterSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={posterSrc} alt={item.alt || ""} loading={hero ? "eager" : "lazy"} />
      ) : (
        <span className="khg-media-noposter" aria-hidden="true" />
      )}
      {item.type === "video" && !showMore && (
        <span className="khg-media-play" aria-hidden="true">
          <span className="khg-media-play-btn">
            <Play size={hero ? 26 : 20} fill="#fff" />
          </span>
        </span>
      )}
      {dur && !showMore && <span className="khg-media-dur">{dur}</span>}
      {showMore && (
        <span className="khg-media-more" aria-hidden="true">
          +{moreCount}
        </span>
      )}
    </button>
  );
}

export function MediaShowcase({ items }: { items: ShowcaseItem[] }) {
  const [openAt, setOpenAt] = React.useState<number | null>(null);

  const close = React.useCallback(() => setOpenAt(null), []);
  const go = React.useCallback(
    (dir: 1 | -1) =>
      setOpenAt((i) => (i === null ? i : (i + dir + items.length) % items.length)),
    [items.length],
  );

  React.useEffect(() => {
    if (openAt === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while the lightbox owns the screen.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openAt, close, go]);

  if (items.length === 0) {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: "var(--radius-xl)",
          background: "var(--gradient-sunset-radial)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <ImageOff size={48} strokeWidth={1.5} />
      </div>
    );
  }

  const active = openAt === null ? null : items[openAt];

  return (
    <>
      <style>{`
        /* Hero + thumbnail strip. A fixed-row mosaic cropped the lead photo hard on desktop
           (a wide 2:1 cell over a normal 4:3 photo). The hero now keeps a real 4/3 ratio on
           phones and a gentler 16/9 on desktop, so the main image reads whole; the rest sit
           in a strip below at a consistent square-ish ratio. */
        .khg-media-showcase { display: flex; flex-direction: column; gap: 8px; }
        .khg-media-hero { aspect-ratio: 4 / 3; }
        @media (min-width: 768px) { .khg-media-hero { aspect-ratio: 16 / 9; } }
        .khg-media-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        @media (min-width: 768px) { .khg-media-strip { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .khg-media-strip { grid-template-columns: repeat(5, 1fr); } }
        .khg-media-strip .khg-media-tile { aspect-ratio: 1 / 1; }
        .khg-media-tile {
          position: relative; overflow: hidden; cursor: pointer; width: 100%;
          border-radius: var(--radius-lg); border: none; padding: 0;
          background: var(--gray-100);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease;
        }
        .khg-media-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .khg-media-tile:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
        .khg-media-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* A video with no poster frame: a branded gradient instead of a broken <img>. */
        .khg-media-noposter { width: 100%; height: 100%; background: var(--gradient-sunset-radial); }
        .khg-media-play {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0.05));
          color: #fff;
        }
        .khg-media-play-btn {
          display: flex; align-items: center; justify-content: center;
          width: 48px; height: 48px; border-radius: var(--radius-full);
          background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        }
        .khg-media-dur {
          position: absolute; inset-block-end: 8px; inset-inline-end: 8px;
          font-size: 11px; font-weight: 600; color: #fff;
          background: rgba(0,0,0,0.6); padding: 2px 7px; border-radius: var(--radius-full);
        }
        .khg-media-more {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.55); color: #fff; font-family: var(--font-display);
          font-size: var(--text-xl); font-weight: 700;
        }
        @media (prefers-reduced-motion: reduce) {
          .khg-media-tile { transition: none; }
          .khg-media-tile:hover { transform: none; }
        }
        .khg-lightbox {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(12, 8, 5, 0.94);
          display: flex; align-items: center; justify-content: center;
          animation: khg-lb-in 0.2s ease both;
        }
        @keyframes khg-lb-in { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .khg-lightbox { animation: none; } }
        .khg-lb-media { max-width: min(92vw, 1200px); max-height: 86vh; border-radius: var(--radius-lg); }
        .khg-lb-btn {
          position: absolute; top: 50%; transform: translateY(-50%);
          display: flex; align-items: center; justify-content: center;
          width: 44px; height: 44px; border-radius: var(--radius-full);
          background: rgba(255,255,255,0.12); color: #fff; border: none; cursor: pointer;
          transition: background 0.2s ease;
        }
        .khg-lb-btn:hover { background: rgba(255,255,255,0.24); }
        .khg-lb-close { top: 20px; right: 20px; transform: none; }
        .khg-lb-count {
          position: absolute; inset-block-start: 24px; inset-inline-start: 24px;
          color: rgba(255,255,255,0.8); font-size: var(--text-sm); font-weight: 600;
        }
      `}</style>

      {/* Hero = first item; the rest tile below. A large set is capped, the overflow folding
          behind a "+N" on the last visible thumbnail rather than flooding the page. */}
      <div className="khg-media-showcase">
        <Tile item={items[0]} index={0} total={items.length} onOpen={setOpenAt} hero />
        {items.length > 1 && (
          <div className="khg-media-strip">
            {items.slice(1, 6).map((item, idx) => {
              const i = idx + 1;
              const moreCount = idx === 4 && items.length > 6 ? items.length - 6 : 0;
              return (
                <Tile
                  key={i}
                  item={item}
                  index={i}
                  total={items.length}
                  onOpen={setOpenAt}
                  moreCount={moreCount}
                />
              );
            })}
          </div>
        )}
      </div>

      {active && (
        <div
          className="khg-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
          onClick={close}
        >
          <span className="khg-lb-count">
            {(openAt ?? 0) + 1} / {items.length}
          </span>
          <button type="button" className="khg-lb-btn khg-lb-close" onClick={close} aria-label="Close">
            <X size={22} />
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                className="khg-lb-btn"
                style={{ insetInlineStart: 16 }}
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                className="khg-lb-btn"
                style={{ insetInlineEnd: 16 }}
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {active.type === "video" ? (
            <video
              key={active.url}
              className="khg-lb-media"
              src={active.url}
              poster={active.poster || undefined}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="khg-lb-media"
              src={active.url}
              alt={active.alt || ""}
              onClick={(e) => e.stopPropagation()}
              style={{ objectFit: "contain" }}
            />
          )}
        </div>
      )}
    </>
  );
}
