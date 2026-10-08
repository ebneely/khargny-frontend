"use client";
/**
 * SimilarPlaces — restyled against the Khargny Design System (TASK-0008).
 * A horizontal rail of `PlaceCard` (sm size) for similar places on the place detail page.
 */
import * as React from "react";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { useI18n } from "@/i18n/LocaleProvider";
import { displayName } from "@/lib/display-name";
import { regionLabel } from "@/lib/egypt-regions";
import { useCities } from "@/lib/api/hooks/use-cities";
import type { Place } from "@/lib/api/types";

type SimilarPlacesProps = {
  /** List items (they carry the cover photo); the similar-places endpoint does not. */
  places: (Place & { coverImage?: string | null })[];
  citySlug: string;
  /** Section heading; defaults to "Similar places". */
  title?: string;
};

export function SimilarPlaces({ places, citySlug, title }: SimilarPlacesProps) {
  const { locale, t } = useI18n();
  const { data: cities } = useCities();
  const cityNameById = new Map((cities ?? []).map((city) => [city.id, city.nameEn || city.name || city.slug]));
  if (places.length === 0) return null;
  return (
    <section
      style={{
        marginBlockStart: "var(--space-6)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          lineHeight: 1.3,
          color: "var(--text-primary)",
          padding: 0,
          margin: "0 0 var(--space-3)",
        }}
      >
        {title ?? t("explorer.similarTitle")}
      </h2>
      {/* The home page's rail: swiped sideways on a phone, a grid on a wide screen, each card
          at its full size. The cards used to share one row and shrink to fit it, which left
          77px tiles with the save button over the photo and the badges running into each other. */}
      <div className="khg-home-rail no-scrollbar">
        {places.map((p) => (
          <PlaceCard
            key={p.id}
            placeId={p.id}
            size="md"
            title={displayName(p, locale)}
            image={p.coverImage || undefined}
            area={regionLabel(p.region, locale, cityNameById.get(p.cityId) || p.cityId)}
            rating={p.rating > 0 ? p.rating.toString() : undefined}
            priceRange={p.priceVerified ? p.priceRange : undefined}
            hasMenu={p.hasMenu}
            priceVerified={p.priceVerified}
            visitedByUs={p.visitedByUs}
            href={`/explorer/${cities?.find((city) => city.id === p.cityId)?.slug || citySlug}/${p.slug}`}
            onToggleFavorite={() => {
              // no-op — `placeId` above wires the heart to the saved-places backend
              // (TASK-0009) automatically. The callback is unused in this path.
            }}
          />
        ))}
      </div>
    </section>
  );
}
