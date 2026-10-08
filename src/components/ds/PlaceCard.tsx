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
import { PhotoImage } from "./PhotoImage";
import * as React from "react";
import Link from "next/link";
import { Heart, Navigation, Eye, Star } from "lucide-react";
import { IconButton } from "./IconButton";
import { useSaveToggle } from "@/lib/api/hooks/use-saved-places";
import { useI18n } from "@/i18n/LocaleProvider";
import { PlaceBadges } from "./PlaceBadges";
import { priceBandLabel } from "@/lib/price-bands";

const SaveIcon = ({ filled }: { filled: boolean }) => (
  <Heart size={18} fill={filled ? "var(--brand-600)" : "none"} stroke={filled ? "var(--brand-600)" : "var(--gray-700)"} aria-hidden="true" />
);

// Bundled, not fetched from unpkg.com at runtime: a third-party request on the render path
// fails offline, fails behind a strict CSP, and costs a DNS + TLS round trip before an icon
// appears. lucide-react is already a dependency.
const StarIcon = () => <Star size={14} aria-hidden />;

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
  imageSizes?: string;
  title: string;
  searchReason?: string;
  area: string;
  rating?: string;
  priceRange?: number | null;
  hasMenu?: boolean;
  priceVerified?: boolean;
  visitedByUs?: boolean;
  badge?: string;
  /** Optional — if provided, the heart icon wires to the saved-places backend. */
  placeId?: string;
  /** External saved state — used by the homepage rails (no per-card useSavedPlaces query, no useSaveToggle). */
  favorite?: boolean;
  /** Optional: if `placeId` is provided, this becomes a no-op (useSaveToggle is used internally). */
  onToggleFavorite?: (saved: boolean) => void;
  size?: "sm" | "md";
  onTitleClick?: () => void;
  href?: string;
  /** Public engagement counts, shown as a small stat row: saves · directions · views. */
  metrics?: { saves?: number; directions?: number; views?: number };
};

function PlaceCardLink({ href, onTitleClick, children }: Pick<PlaceCardProps, "href" | "onTitleClick"> & { children: React.ReactNode }) {
  // Warm the route when the visitor shows intent (pointer over the card, finger down, keyboard
  // focus), not for every card on screen: a grid of 24 would otherwise ask the server for 24
  // pages nobody opens. With the explorer's loading boundary the tap then lands instantly.
  const [intent, setIntent] = React.useState(false);
  const warm = React.useCallback(() => setIntent(true), []);
  if (!href) return <>{children}</>;
  return (
    <Link href={href} prefetch={intent ? null : false} onClick={onTitleClick} onPointerEnter={warm} onTouchStart={warm} onFocus={warm} className="khg-place-card-link" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
      {children}
    </Link>
  );
}

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
export function PlaceCard({
  image,
  imageSizes,
  title,
  searchReason,
  area,
  rating,
  priceRange,
  hasMenu = false,
  priceVerified = false,
  visitedByUs = false,
  badge,
  placeId,
  favorite = false,
  onToggleFavorite,
  size = "md",
  onTitleClick,
  href,
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
  // Fully fluid: the card fills whatever cell it is given and never sets its own floor.
  // It used to carry minWidth 200, which is a grid item's min-content — so a `1fr` track
  // could not shrink below it and the results grid overflowed the page on any viewport
  // narrower than columns x 200 + gaps. Containers own width: .khg-home-rail sizes its
  // children explicitly, and .khg-place-grid uses minmax(min(100%, 200px), 1fr).
  const priceLabel = priceBandLabel(priceRange, locale);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        minWidth: 0,
        position: "relative",
        fontFamily: "var(--font-body)",
        cursor: "pointer",
        transition: "var(--motion-shadow)",
      }}
    >
      <PlaceCardLink href={href} onTitleClick={onTitleClick}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          background: "var(--gradient-sunset)",
          boxShadow: hover ? "var(--shadow-md)" : "none",
          transition: "var(--motion-shadow), var(--motion-transform)",
          transform: hover ? "translateY(-2px)" : "none",
        }}
      >
        {/* A real <img>, not a CSS background. As a background none of these photos could be
            indexed by image search and no alt text existed for them — on a directory whose
            content IS the places, that was the whole photo library invisible. The gradient
            behind stays as the fallback for a place with no photo. */}
        <PhotoImage photo={image} alt={title} frame="card" sizes={imageSizes} />
        <div
          style={{
            position: "absolute",
            insetBlockStart: 8,
            insetInlineStart: 8,
            insetInlineEnd: 8,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <div style={{ minWidth: 0, flex: badge ? "0 1 auto" : "0 0 0" }}>
            {badge && <Badge>{badge}</Badge>}
          </div>
        </div>
      </div>
      <div
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

        {searchReason !== undefined && (
          <span data-search-reason style={{ height: '1.35em', lineHeight: 1.35, fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={searchReason || undefined}>
            {searchReason || '\u00a0'}
          </span>
        )}

        {/* Meta: rating + price, the two things that drive the choice. */}
        {(rating || priceLabel) && (
          <span
            style={{
              display: "flex",
              flexWrap: "wrap",
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
            {rating && priceLabel && <span aria-hidden style={{ color: "var(--gray-300)" }}>·</span>}
            <PlaceBadges priceRange={priceRange} variant="price" />
          </span>
        )}

        <PlaceBadges hasMenu={hasMenu} priceVerified={priceVerified} visitedByUs={visitedByUs} variant="compact" />

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
      </PlaceCardLink>
      {onToggleFavorite && (
        <div style={{ position: "absolute", insetBlockStart: 8, insetInlineEnd: 8, zIndex: 1 }}>
          <IconButton
            ariaLabel={saved ? `Remove ${title} from your plan` : `Add ${title} to your plan`}
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
  );
}
