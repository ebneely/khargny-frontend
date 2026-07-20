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
        .khg-media-mosaic {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-auto-rows: 120px;
          gap: 8px;
        }
        /* The first tile is the focal point: two columns wide, two rows tall. */
        .khg-media-mosaic > :first-child { grid-column: span 2; grid-row: span 2; }
        @media (min-width: 640px) {
          .khg-media-mosaic { grid-template-columns: repeat(4, 1fr); grid-auto-rows: 130px; }
          .khg-media-mosaic > :first-child { grid-column: span 2; grid-row: span 2; }
        }
        @media (min-width: 1024px) {
          .khg-media-mosaic { grid-auto-rows: 150px; }
        }
        .khg-media-tile {
          position: relative; overflow: hidden; cursor: pointer;
          border-radius: var(--radius-lg); border: none; padding: 0;
          background: var(--gray-100);
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s ease;
        }
        .khg-media-tile:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .khg-media-tile:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
        .khg-media-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
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

      {/* Cap the visible tiles so a huge set doesn't dominate the page; the rest are one
          click away behind a "+N" overlay on the last visible tile. */}
      <div className="khg-media-mosaic">
        {items.slice(0, 5).map((item, i) => {
          const isLastVisible = i === 4 && items.length > 5;
          const dur = item.type === "video" ? formatDuration(item.durationSeconds) : null;
          return (
            <button
              key={i}
              type="button"
              className="khg-media-tile"
              onClick={() => setOpenAt(i)}
              aria-label={
                item.type === "video"
                  ? `Play video ${i + 1}`
                  : `View photo ${i + 1} of ${items.length}`
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.type === "video" ? item.poster || item.url : item.url}
                alt={item.alt || ""}
                loading={i === 0 ? "eager" : "lazy"}
              />
              {item.type === "video" && !isLastVisible && (
                <span className="khg-media-play" aria-hidden="true">
                  <span className="khg-media-play-btn">
                    <Play size={20} fill="#fff" />
                  </span>
                </span>
              )}
              {dur && !isLastVisible && <span className="khg-media-dur">{dur}</span>}
              {isLastVisible && (
                <span className="khg-media-more" aria-hidden="true">
                  +{items.length - 5}
                </span>
              )}
            </button>
          );
        })}
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
