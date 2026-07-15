"use client";
/**
 * CityGrid — restyled against the Khargny Design System (TASK-0008).
 * 2/3/4-column responsive grid of city cards, each a `<Link>` to `/explorer/{slug}`.
 * Visual tokens cited from `UI_UX/explorer/styling.md` + `beauty/city-grid/spec.md`.
 */
import * as React from "react";
import Link from "next/link";
import type { City } from "@/lib/api/types";

type CityGridProps = {
  cities: City[];
};

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
          <p
            style={{
              fontSize: "var(--text-xs)",
              lineHeight: 1.5,
              color: "var(--text-tertiary)",
              margin: "var(--space-1) 0 0",
            }}
          >
            Explore places
          </p>
        </Link>
      ))}
      <style>{`.khargny-city-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }`}</style>
    </div>
  );
}
