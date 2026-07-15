"use client";
/**
 * ExplorerHeader — restyled against the Khargny Design System (TASK-0008).
 * Used on both `/explorer` (city picker) and `/explorer/{citySlug}` (city page).
 * When `currentCitySlug` is provided, the header includes a CitySelector chip.
 */
import * as React from "react";
import Link from "next/link";
import { IconButton } from "@/components/ds/IconButton";
import { CitySelector } from "./CitySelector";
import type { City } from "@/lib/api/types";

type ExplorerHeaderProps = {
  cities: City[];
  currentCitySlug?: string;
  onCityChange?: (slug: string) => void;
};

export function ExplorerHeader({ cities, currentCitySlug, onCityChange }: ExplorerHeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px var(--space-4)",
        background: "var(--white)",
        borderBottom: "1px solid var(--border-default)",
        fontFamily: "var(--font-body)",
      }}
    >
      <Link
        href="/explorer"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-xl)",
          fontWeight: 600,
          lineHeight: 1.3,
          color: "var(--brand-700)",
          textDecoration: "none",
        }}
      >
        Khargny
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        {currentCitySlug !== undefined && onCityChange && (
          <CitySelector
            cities={cities}
            currentCitySlug={currentCitySlug}
            onChange={onCityChange}
          />
        )}
        <IconButton
          ariaLabel="Language"
          icon={
            <img
              src="https://unpkg.com/lucide-static@0.462.0/icons/globe.svg"
              width={16}
              height={16}
              alt=""
            />
          }
        />
      </div>
    </header>
  );
}
