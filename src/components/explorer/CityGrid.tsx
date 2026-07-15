"use client";
/**
 * CityGrid — restyled against the Khargny Design System (TASK-0008).
 * 2/3/4-column responsive grid of city cards, each a `<Link>` to `/explorer/{slug}`.
 * Visual tokens cited from `UI_UX/explorer/styling.md` + `beauty/city-grid/spec.md`.
 *
 * Each card shows the per-city active-place count (FR-016, US4 AC#3). The count is
 * fetched per-card via `useCityPlaces(slug)` and cached by React Query; loading state
 * is rendered as a small skeleton dot to avoid layout shift.
 */
import * as React from "react";
import Link from "next/link";
import { useCityPlaces } from "@/lib/api/hooks/use-cities";
import type { City } from "@/lib/api/types";

type CityGridProps = {
  cities: City[];
};

function CityCount({ slug }: { slug: string }) {
  const { data, isLoading } = useCityPlaces(slug);
  if (isLoading) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 48,
          height: 10,
          borderRadius: 999,
          background: "var(--gray-100)",
          marginTop: 4,
        }}
      />
    );
  }
  const n = data?.items?.length ?? 0;
  return (
    <p
      data-trace-id={`city-card-count-${slug}`}
      style={{
        fontSize: "var(--text-xs)",
        lineHeight: 1.5,
        color: "var(--text-tertiary)",
        margin: "var(--space-1) 0 0",
      }}
    >
      {n} {n === 1 ? "place" : "places"}
    </p>
  );
}

export function CityGrid({ cities }: CityGridProps) {
  if (cities.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          padding: "var(--space-12) var(--space-4)",
          textAlign: "center",
          fontFamily: "var(--font-body)",
        }}
      >
        <p
          style={{
            fontSize: "var(--text-base)",
            lineHeight: 1.5,
            color: "var(--text-tertiary)",
            margin: 0,
          }}
        >
          No cities available yet
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "var(--space-4)",
        padding: "0 var(--space-4)",
      }}
    >
      {cities.map((city) => (
        <Link
          key={city.id}
          href={`/explorer/${city.slug}`}
          className="khargny-city-card"
          data-trace-id={`city-card-${city.slug}`}
          style={{
            display: "block",
            padding: "var(--space-6)",
            borderRadius: "var(--radius-lg)",
            background: "var(--white)",
            border: "1px solid var(--border-default)",
            textDecoration: "none",
            transition: "var(--motion-shadow), var(--motion-transform)",
            fontFamily: "var(--font-body)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {city.name}
          </h3>
          <CityCount slug={city.slug} />
        </Link>
      ))}
      <style>{`.khargny-city-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }`}</style>
    </div>
  );
}
