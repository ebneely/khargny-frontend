"use client";
/**
 * PlaceCard — port of `design/builds/Khargny Design System/components/discovery/PlaceCard.jsx`.
 * Used in the homepage rails (size="sm") and the place-detail's similar-places row
 * (size="md" — 220px wide).
 *
 * The card has NO surface color or border — it floats on the page bg. The image is
 * square (1:1 aspect ratio) with a var(--radius-xl) = 20px corner radius. The image
 * placeholder is var(--gradient-sunset) when no `image` is supplied.
 *
 * The heart IconButton's icon is an inline SVG so the fill can animate. The
 * `onToggleFavorite` callback is what TASK-0009 wires to the saved-places backend.
 * For the homepage this pass, the callback is a no-op (heart is a visual only).
 */
import * as React from "react";
import { IconButton } from "./IconButton";
import { useSaveToggle } from "@/lib/api/hooks/use-saved-places";

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? "var(--brand-600)" : "rgba(0,0,0,0.5)"} stroke="white" strokeWidth="1.5">
    <path d="M12 21s-7.5-4.6-10-9.3C0.4 8.1 2 4.5 5.6 4.5c2 0 3.6 1.1 4.4 2.6.8-1.5 2.4-2.6 4.4-2.6 3.6 0 5.2 3.6 3.6 7.2C19.5 16.4 12 21 12 21z" />
  </svg>
);

const StarIcon = () => (
  <img
    src="https://unpkg.com/lucide-static@0.462.0/icons/star.svg"
    width={14}
    height={14}
    alt=""
    style={{ filter: "invert(0)" }}
  />
);

type BadgeProps = { children: React.ReactNode; tone?: "white" };
const Badge = ({ children, tone = "white" }: BadgeProps) => (
  <span
    style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: "var(--radius-full)",
      background: tone === "white" ? "rgba(255,255,255,0.95)" : "var(--surface-sunken)",
      color: "var(--gray-900)",
      fontSize: "var(--text-xs)",
      fontWeight: 500,
      boxShadow: tone === "white" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
    }}
  >
    {children}
  </span>
);

type PlaceCardProps = {
  image?: string;
  title: string;
  area: string;
  rating?: string;
  badge?: string;
  /** Optional — if provided, the heart icon wires to the saved-places backend. */
  placeId?: string;
  /** External saved state — used by the homepage rails (no per-card useSavedPlaces query, no useSaveToggle). */
  favorite?: boolean;
  /** Optional: if `placeId` is provided, this becomes a no-op (useSaveToggle is used internally). */
  onToggleFavorite?: (saved: boolean) => void;
  size?: "sm" | "md";
  onTitleClick?: () => void;
};

/**
 * PlaceCard. Renders the design-system PlaceCard. If `placeId` is provided, the
 * heart icon wires to the saved-places backend via `useSaveToggle(placeId)` —
 * TASK-0009. If `placeId` is NOT provided (the homepage rails use placeholder
 * data, no real `placeId`), the heart is a visual no-op and `onToggleFavorite`
 * is the caller-supplied callback (homepage uses this to fire a Toast).
 */
export function PlaceCard({
  image,
  title,
  area,
  rating,
  badge,
  placeId,
  favorite = false,
  onToggleFavorite,
  size = "md",
  onTitleClick,
}: PlaceCardProps) {
  const [hover, setHover] = React.useState(false);
  // If a real placeId is provided, use the saved-places backend for the heart state.
  // Otherwise (homepage placeholder data), fall back to the external `favorite` prop
  // + `onToggleFavorite` callback.
  const useBackend = Boolean(placeId);
  const backend = useSaveToggle(useBackend ? placeId! : null);
  const [localSaved, setLocalSaved] = React.useState(favorite);
  const saved = useBackend ? backend.saved : localSaved;
  const w = size === "sm" ? 168 : 220;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: w,
        fontFamily: "var(--font-body)",
        cursor: "pointer",
        transition: "var(--motion-shadow)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          background: image ? `center/cover no-repeat url(${image})` : "var(--gradient-sunset)",
          boxShadow: hover ? "var(--shadow-md)" : "none",
          transition: "var(--motion-shadow), var(--motion-transform)",
          transform: hover ? "translateY(-2px)" : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <div style={{ minWidth: 0, flex: badge ? "0 1 auto" : "0 0 0" }}>
            {badge && <Badge>{badge}</Badge>}
          </div>
          {onToggleFavorite && (
            <div style={{ flexShrink: 0 }}>
              <IconButton
                ariaLabel={
                  saved
                    ? `Remove ${title} from your plan`
                    : `Add ${title} to your plan`
                }
                selected={saved}
                icon={<HeartIcon filled={saved} />}
                onClick={() => {
                  if (useBackend) {
                    backend.toggle();
                  } else {
                    setLocalSaved(!saved);
                    onToggleFavorite(!saved);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
      <div
        onClick={onTitleClick}
        style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              fontSize: "var(--text-base)",
              fontWeight: "var(--weight-medium)",
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
          {rating && (
            <span
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
                display: "flex",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
              }}
            >
              <StarIcon /> {rating}
            </span>
          )}
        </div>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>{area}</span>
      </div>
    </div>
  );
}
