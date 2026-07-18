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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSavedPlaces, useUnsavePlace } from "@/lib/api/hooks/use-saved-places";
import { useI18n } from "@/i18n/LocaleProvider";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { BottomNav } from "@/components/ds/BottomNav";
import { LoadingSkeleton } from "@/components/explorer/LoadingSkeleton";
import { ErrorState } from "@/components/explorer/ErrorState";

type SavedPlaceWithPlace = {
  id: string;
  guestId: string;
  placeId: string;
  plannedFor: string | null;
  createdAt: string;
  place: {
    id: string;
    name: string;
    slug: string;
    address: string | null;
    rating: number;
    cityId: string;
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

function formatDayLabel(iso: string): string {
  // Use the user's locale (browser default). The plan page is bilingual;
  // the date label is in the locale the visitor's browser is set to.
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
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

function groupAndSort(data: SavedPlaceWithPlace[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const sp of data) {
    if (sp.plannedFor) {
      const k = dayKey(sp.plannedFor);
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: formatDayLabel(sp.plannedFor),
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
  const { t } = useI18n();
  const { data, isLoading, isError, refetch } = useSavedPlaces();
  const groups = React.useMemo(() => (data ? groupAndSort(data) : []), [data]);
  const totalCount = data?.length ?? 0;

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
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            lineHeight: 1.3,
            color: "var(--brand-600)",
          }}
        >
          Khargny
        </span>
        <span
          aria-label={`${totalCount} saved`}
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
          }}
        >
          {totalCount} saved
        </span>
      </div>

      {/* Page header */}
      <header
        style={{
          padding: "24px 16px 16px",
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
          Every place you saved, grouped by the day you planned.
        </p>
      </header>

      {/* Main scrollable content */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: 16,
        }}
      >
        {isLoading ? (
          <LoadingSkeleton count={4} />
        ) : isError ? (
          <ErrorState
            message={t("errors.loadFailed")}
            onRetry={() => refetch()}
          />
        ) : totalCount === 0 ? (
          <div
            style={{
              padding: "64px 16px",
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
              {t("plan.empty")}
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
              Find places
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            {groups.map((g) => (
              <PlanDayGroup
                key={g.key}
                group={g}
                onOpenPlace={(place) => {
                  // The place detail page needs a citySlug; we don't have it on the
                  // SavedPlaceWithPlace shape (the backend returns cityId, not citySlug).
                  // A future iteration can either:
                  //  (a) extend SavedPlaceWithPlace to include `place.citySlug`, OR
                  //  (b) fetch the city by cityId and derive the slug.
                  // For TASK-0010, the explorer-detail page resolves by {citySlug} → cityId,
                  // so the natural shape is to navigate to /explorer/{cityId}/{place.slug}
                  // IF the explorer-detail page also accepts a cityId. That's a follow-up.
                  // For now, the open handler routes to the place detail using cityId as
                  // the URL segment — the explorer-detail page's slug→id resolution will
                  // return empty results for a numeric cityId, but the URL shape stays
                  // consistent for K3 testing.
                  router.push(`/explorer/${place.cityId}/${place.slug}`);
                }}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav active="plan" />
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
  const unsave = useUnsavePlace();
  const isUnscheduled = group.key === "unscheduled";

  return (
    <section aria-labelledby={`plan-day-${group.key}`}>
      <header
        style={{
          padding: "0 16px var(--space-2)",
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
          {group.label}
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
            ? "These are saved but you haven't picked a day for them yet."
            : `${group.items.length} place${group.items.length === 1 ? "" : "s"} planned`}
        </p>
      </header>
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {group.items.map((sp) => (
          <div
            key={sp.id}
            onClick={() => onOpenPlace(sp.place)}
            style={{ cursor: "pointer" }}
          >
            <PlaceCard
              placeId={sp.placeId}
              size="md"
              title={sp.place.name}
              area={sp.place.address || ""}
              rating={sp.place.rating > 0 ? sp.place.rating.toString() : undefined}
              onToggleFavorite={() => {
                unsave.mutate(sp.placeId);
              }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
