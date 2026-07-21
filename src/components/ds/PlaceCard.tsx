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
import { Heart, Navigation, Eye } from "lucide-react";
import { IconButton } from "./IconButton";
import { useSaveToggle } from "@/lib/api/hooks/use-saved-places";
import { useI18n } from "@/i18n/LocaleProvider";

// Bookmark (save-to-plan) icon — clearer intent than a heart for "add to my plan".
const SaveIcon = ({ filled }: { filled: boolean }) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? "var(--brand-600)" : "none"} stroke={filled ? "var(--brand-600)" : "var(--gray-700)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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
  /** Price tier 1-4 — rendered as a word (Cheap … Expensive), never "level 3". */
  priceRange?: number | null;
  badge?: string;
  /** Optional — if provided, the heart icon wires to the saved-places backend. */
  placeId?: string;
  /** External saved state — used by the homepage rails (no per-card useSavedPlaces query, no useSaveToggle). */
  favorite?: boolean;
  /** Optional: if `placeId` is provided, this becomes a no-op (useSaveToggle is used internally). */
  onToggleFavorite?: (saved: boolean) => void;
  size?: "sm" | "md";
  onTitleClick?: () => void;
  /** Public engagement counts, shown as a small stat row: saves · directions · views. */
  metrics?: { saves?: number; directions?: number; views?: number };
};

/** 1234 → "1.2k", 1000000 → "1m". Keeps the stat row compact. */
function formatCount(n: number | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}m`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}k`;
  return String(v);
}

/**
 * PlaceCard. Renders the design-system PlaceCard. If `placeId` is provided, the
 * heart icon wires to the saved-places backend via `useSaveToggle(placeId)` —
 * TASK-0009. If `placeId` is NOT provided (the homepage rails use placeholder
 * data, no real `placeId`), the heart is a visual no-op and `onToggleFavorite`
 * is the caller-supplied callback (homepage uses this to fire a Toast).
 */
// Price tiers read as words, in the reader's language — so an Arabic card shows مرتفع, not
// "Pricey". Kept in step with the app's price.* strings and the place-detail PRICE_AR/EN.
const PRICE_WORDS_EN = ["Cheap", "Moderate", "Pricey", "Expensive"];
const PRICE_WORDS_AR = ["رخيص", "متوسط", "مرتفع", "غالي"];

export function PlaceCard({
  image,
  title,
  area,
  rating,
  priceRange,
  badge,
  placeId,
  favorite = false,
  onToggleFavorite,
  size = "md",
  onTitleClick,
  metrics,
}: PlaceCardProps) {
  const { locale } = useI18n();
  const [hover, setHover] = React.useState(false);
  // If a real placeId is provided, use the saved-places backend for the heart state.
  // Otherwise (homepage placeholder data), fall back to the external `favorite` prop
  // + `onToggleFavorite` callback.
  const useBackend = Boolean(placeId);
  const backend = useSaveToggle(useBackend ? placeId! : null);
  const [localSaved, setLocalSaved] = React.useState(favorite);
  const [bump, setBump] = React.useState(0); // re-triggers the pop animation on each toggle
  const saved = useBackend ? backend.saved : localSaved;
  // Fluid: fills its grid cell (a fixed width left dead, still-clickable space in
  // 1fr cells). `size` sets the floor so horizontal rails keep their rhythm.
  const minW = size === "sm" ? 168 : 200;
  const priceWord =
    typeof priceRange === "number" && priceRange >= 1 && priceRange <= 4
      ? (locale === "ar" ? PRICE_WORDS_AR : PRICE_WORDS_EN)[priceRange - 1]
      : null;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        minWidth: minW,
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
                icon={
                  <span key={bump} className={bump > 0 ? "khg-pop-anim" : undefined} style={{ display: "inline-flex" }}>
                    <SaveIcon filled={saved} />
                  </span>
                }
                onClick={() => {
                  setBump((b) => b + 1);
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
        style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}
      >
        {/* Name owns the line — it's the thing being scanned. */}
        <span
          style={{
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-medium)",
            color: "var(--text-primary)",
            lineHeight: 1.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={title}
        >
          {title}
        </span>

        {/* Meta: rating + price, the two things that drive the choice. */}
        {(rating || priceWord) && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            {rating && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <StarIcon />
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{rating}</span>
              </span>
            )}
            {rating && priceWord && <span aria-hidden style={{ color: "var(--gray-300)" }}>·</span>}
            {priceWord && <span>{priceWord}</span>}
          </span>
        )}

        {/* Area is context, not the headline — one line, never a 3-line address dump. */}
        {area && (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-tertiary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={area}
          >
            {area}
          </span>
        )}

        {/* Public engagement, at a glance: saves · directions · views. Muted so it reads as
            supporting context under the name, not competing with it. Rendered whenever the
            card is given metrics, so a brand-new place honestly shows 0s rather than hiding. */}
        {metrics && (
          <span
            aria-label={`${formatCount(metrics.saves)} saves, ${formatCount(metrics.directions)} directions, ${formatCount(metrics.views)} views`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 2,
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Heart size={13} aria-hidden="true" />
              {formatCount(metrics.saves)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Navigation size={13} aria-hidden="true" />
              {formatCount(metrics.directions)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Eye size={13} aria-hidden="true" />
              {formatCount(metrics.views)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
