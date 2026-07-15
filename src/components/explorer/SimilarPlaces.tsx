"use client";
/**
 * SimilarPlaces — restyled against the Khargny Design System (TASK-0008).
 * A horizontal rail of `PlaceCard` (sm size) for similar places on the place detail page.
 */
import * as React from "react";
import { PlaceCard } from "@/components/ds/PlaceCard";
import type { Place } from "@/lib/api/types";

type SimilarPlacesProps = {
  places: Place[];
  citySlug: string;
};

export function SimilarPlaces({ places, citySlug }: SimilarPlacesProps) {
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
          padding: "0 var(--space-4)",
          margin: "0 0 var(--space-3)",
        }}
      >
        Similar places
      </h2>
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          overflowX: "auto",
          padding: "0 var(--space-4)",
        }}
      >
        {places.map((p) => (
          <PlaceCard
            key={p.id}
            placeId={p.id}
            size="sm"
            title={p.name}
            area={p.address || ""}
            rating={p.rating > 0 ? p.rating.toString() : undefined}
            onTitleClick={() => {
              window.location.href = `/explorer/${citySlug}/${p.slug}`;
            }}
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
