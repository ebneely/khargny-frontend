"use client";
/**
 * /plan — visitor's plan (a view over saved-places where plannedFor is set, plus unscheduled).
 * Built against TASK-0010 / SPRINT-2.
 * See `UI_UX/plan/structure/plan-list/{wireframe,functional}.md` for the spec.
 *
 * No new backend module — this is a view over the existing `saved_places` table.
 * No booking/payment copy anywhere on this page (per the design system readme §Copy rules
 * and the 2026-07-15 human-confirmed decision: TASK-0010 is folded into saved-places, copy
 * strictly non-transactional).
 */
import * as React from "react";
import { PlaceActions } from '@/components/ds/PlaceActions';
import { LikedPlaces } from '@/components/ds/LikedPlaces';
import { usePhotoLike } from '@/components/ds/usePhotoLike';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSavedPlaces } from "@/lib/api/hooks/use-saved-places";
import { useCities } from "@/lib/api/hooks/use-cities";
import { useI18n } from "@/i18n/LocaleProvider";
import { displayName } from "@/lib/display-name";
import { Bookmark } from "lucide-react";
import { LoadingSkeleton } from "@/components/explorer/LoadingSkeleton";
import { ErrorState } from "@/components/explorer/ErrorState";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { PlaceBadges } from "@/components/ds/PlaceBadges";
import { PhotoImage } from "@/components/ds/PhotoImage";

type SavedPlaceWithPlace = {
  id: string;
  guestId: string;
  placeId: string;
  plannedFor: string | null;
  createdAt: string;
  place: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    address: string | null;
    rating: number;
    cityId: string;
    /** attachCovers() has always sent this; the row just never read it. */
    coverImage?: string | null;
    likeCount?: number;
    saveCount?: number;
    directionsCount?: number;
    viewCount?: number;
    hasMenu?: boolean;
    priceVerified?: boolean;
    visitedByUs?: boolean;
  };
};

type DayGroup = {
  /** "YYYY-MM-DD" key, or "unscheduled" for the no-day group. */
  key: string;
  /** Display label, e.g. "Saturday, July 18" or "No specific day yet". */
  label: string;
  /** Sort key (epoch ms for day groups; a very large number for unscheduled). */
  sortKey: number;
  items: SavedPlaceWithPlace[];
};

function formatDayLabel(iso: string, locale: string): string {
  // Follow the app's chosen language, not the browser default, so the date reads Arabic
  // when Arabic is selected. ar-EG gives the Egyptian Arabic month/day names.
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function dayKey(iso: string): string {
  // YYYY-MM-DD in the user's local time, for grouping.
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daySortKey(iso: string): number {
  return new Date(iso).getTime();
}

function groupAndSort(data: SavedPlaceWithPlace[], locale: string): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const sp of data) {
    if (sp.plannedFor) {
      const k = dayKey(sp.plannedFor);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: formatDayLabel(sp.plannedFor, locale),
          sortKey: daySortKey(sp.plannedFor),
          items: [],
        });
      }
      map.get(k)!.items.push(sp);
    } else {
      if (!map.has("unscheduled")) {
        map.set("unscheduled", {
          key: "unscheduled",
          label: "No specific day yet",
          sortKey: Number.MAX_SAFE_INTEGER,
          items: [],
        });
      }
      map.get("unscheduled")!.items.push(sp);
    }
  }
  // Each day's items: by plannedFor ascending (already grouped by day, so all same day)
  // For the unscheduled group: by createdAt descending.
  for (const g of map.values()) {
    if (g.key === "unscheduled") {
      g.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      g.items.sort((a, b) =>
        (a.plannedFor ?? "").localeCompare(b.plannedFor ?? ""),
      );
    }
  }
  // Day groups themselves: by sortKey ascending; unscheduled last.
  return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
}

export default function PlanPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { data, isLoading, isError, refetch } = useSavedPlaces();
  const { data: cities } = useCities();
  const groups = React.useMemo(() => (data ? groupAndSort(data, locale) : []), [data, locale]);
  const totalCount = data?.length ?? 0;
  const [view, setView] = React.useState<'plan' | 'liked'>('plan');

  // cityId → slug, so a saved place deep-links to the real explorer URL
  // (/explorer/{citySlug}/{placeSlug}) instead of a raw UUID segment.
  const citySlugById = React.useMemo(() => {
    const m = new Map<string, string>();
    cities?.forEach((c) => m.set(c.id, c.slug));
    return m;
  }, [cities]);

  const openPlace = React.useCallback(
    (place: SavedPlaceWithPlace["place"]) => {
      const citySlug = citySlugById.get(place.cityId);
      // Fall back to the slug endpoint even without a resolved city — the detail
      // page loads by placeSlug regardless; the city segment only sets context.
      router.push(`/explorer/${citySlug ?? place.cityId}/${place.slug}`);
    },
    [citySlugById, router],
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--surface-app)",
        fontFamily: "var(--font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* One header at every width. This page used to show SiteHeader on desktop and a
          logo-only bar on mobile, relying on the BottomNav for mobile navigation — with the
          BottomNav removed, that left phones with no way out of the page. */}
      <SiteHeader active="plan" />

      <div
        className="khg-plan-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          // Block only: a shorthand `padding` here cancels the container's side gutter.
          paddingBlock: "14px 0",
          flexShrink: 0,
        }}
      >
        <span
          aria-label={t('place.savedCount', { count: totalCount })}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--brand-700)",
            background: "var(--brand-50)",
            border: "1px solid var(--brand-100)",
            borderRadius: "var(--radius-full)",
            padding: "4px 10px",
          }}
        >
          <Bookmark size={12} fill="var(--brand-600)" color="var(--brand-600)" aria-hidden="true" />
          {totalCount}
        </span>
      </div>

      {/* Page header */}
      <header
        className="khg-plan-container"
        style={{
          paddingBlock: "24px 16px",
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-4xl)",
            fontWeight: 700,
            lineHeight: 1.15,
            color: "var(--text-primary)",
            margin: "0 0 var(--space-2)",
          }}
        >
          {t("plan.title")}
        </h1>
        <p
          style={{
            fontSize: "var(--text-md)",
            lineHeight: 1.5,
            color: "var(--text-tertiary)",
            margin: 0,
          }}
        >
          {t("plan.subtitle")}
        </p>
      </header>

      {/* Main scrollable content */}
      <div className="khg-plan-container" role="tablist" aria-label={t('plan.title')} style={{ display: 'flex', gap: 'var(--space-3)', paddingBlock: 'var(--space-3)' }}>
        {(['plan', 'liked'] as const).map(tab => <button key={tab} type="button" role="tab" aria-selected={view === tab} aria-controls={`plan-${tab}`} id={`tab-${tab}`} onClick={() => setView(tab)} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const next = tab === 'plan' ? 'liked' : 'plan'; setView(next); window.document.getElementById(`tab-${next}`)?.focus(); } }} tabIndex={view === tab ? 0 : -1} style={{ minHeight: 44, paddingInline: 'var(--space-4)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-full)', background: view === tab ? 'var(--brand-50)' : 'var(--surface-card)', color: 'var(--text-primary)', fontWeight: 600 }}>{t(`plan.${tab}`)}</button>)}
      </div>
      <main
        role="tabpanel" id={`plan-${view}`} aria-labelledby={`tab-${view}`}
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 16,
        }}
      >
        {view === 'liked' ? <div className="khg-plan-container"><LikedPlaces /></div> : isLoading ? (
          <LoadingSkeleton count={4} />
        ) : isError ? (
          <ErrorState
            message={t("errors.loadFailed")}
            onRetry={() => refetch()}
          />
        ) : totalCount === 0 ? (
          <div
            className="khg-plan-container"
            style={{
              paddingBlock: 64,
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-4xl)",
                fontWeight: 700,
                lineHeight: 1.15,
                color: "var(--text-primary)",
                margin: "0 0 var(--space-4)",
              }}
            >
              {t("plan.emptyTitle")}
            </h2>
            <p
              style={{
                fontSize: "var(--text-md)",
                lineHeight: 1.5,
                color: "var(--text-secondary)",
                margin: "0 auto var(--space-8)",
                maxWidth: 360,
              }}
            >
              {t("plan.empty")}
            </p>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                height: 52,
                padding: "0 24px",
                background: "var(--brand-600)",
                color: "var(--white)",
                border: "1px solid transparent",
                borderRadius: "var(--radius-xl)",
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-md)",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "var(--shadow-sm)",
                transition: "var(--motion-color), var(--motion-shadow)",
              }}
            >
              {t('plan.startExploring')}
            </Link>
          </div>
        ) : (
          <div
            className="khg-plan-container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}
          >
            {groups.map((g) => (
              <PlanDayGroup key={g.key} group={g} onOpenPlace={openPlace} />
            ))}
          </div>
        )}
      </main>

    </div>
  );
}

function PlanDayGroup({
  group,
  onOpenPlace,
}: {
  group: DayGroup;
  onOpenPlace: (place: SavedPlaceWithPlace["place"]) => void;
}) {
  const { t } = useI18n();
  const isUnscheduled = group.key === "unscheduled";

  return (
    <section aria-labelledby={`plan-day-${group.key}`}>
      <header
        style={{
          padding: "0 0 var(--space-2)",
        }}
      >
        <h2
          id={`plan-day-${group.key}`}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            lineHeight: 1.3,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {isUnscheduled ? t("plan.noDay") : group.label}
        </h2>
        <p
          style={{
            fontSize: "var(--text-xs)",
            lineHeight: 1.5,
            color: "var(--text-tertiary)",
            margin: "4px 0 0",
          }}
        >
          {isUnscheduled
            ? t("plan.noDayHint")
            : t('plan.plannedCount', { count: group.items.length })}
        </p>
      </header>
      <div className="khg-plan-items">
        {group.items.map((sp, index) => (
          <PlanItemCard
            key={sp.id}
            saved={sp}
            priority={index === 0}
            onOpen={() => onOpenPlace(sp.place)}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * A saved place with a compact linked header and a separate action row.
 */
function PlanItemCard({ saved: savedPlace, onOpen, priority = false }: { saved: SavedPlaceWithPlace; onOpen: () => void; priority?: boolean }) {
  const { locale } = useI18n();
  const name = displayName(savedPlace.place, locale) || savedPlace.place.name;
  const photoLike = usePhotoLike(savedPlace.placeId);
  return <article data-plan-card data-place-id={savedPlace.placeId} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', background: 'var(--surface-card)' }}>
    <div className="khg-place-card-link" role="link" tabIndex={0} onClick={onOpen} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }} style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, cursor: 'pointer', padding: 12 }}>
      <div data-post-photo data-compact style={{ position: 'relative', width: 72, height: 72, flexShrink: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', touchAction: 'manipulation' }} onPointerDown={photoLike.onPointerDown} onPointerMove={photoLike.onPointerMove} onPointerUp={photoLike.onPointerUp} onPointerCancel={photoLike.onPointerCancel}
        onClick={event => { photoLike.click(event, onOpen); }}>
        <PhotoImage photo={savedPlace.place.coverImage} alt={name} frame="card" sizes="auto, 72px" priority={priority} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        {savedPlace.place.address && <p style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{savedPlace.place.address}</p>}
        <PlaceBadges hasMenu={savedPlace.place.hasMenu} priceVerified={savedPlace.place.priceVerified} visitedByUs={savedPlace.place.visitedByUs} variant="compact" />
      </div>
    </div>
    <PlaceActions placeId={savedPlace.placeId} name={name} likeCount={savedPlace.place.likeCount} metrics={{ saves: savedPlace.place.saveCount, directions: savedPlace.place.directionsCount, views: savedPlace.place.viewCount }} />
  </article>;
}
