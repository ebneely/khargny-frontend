"use client";
/**
 * CitySelector — restyled against the Khargny Design System (TASK-0008).
 * Pill chip that opens a popover with the full city list. Visual tokens from
 * `UI_UX/explorer/beauty/city-selector/spec.md`.
 */
import * as React from "react";
import type { City } from "@/lib/api/types";

type CitySelectorProps = {
  cities: City[];
  currentCitySlug?: string;
  onChange: (slug: string) => void;
};

export function CitySelector({ cities, currentCitySlug, onChange }: CitySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const currentCity = cities.find((c) => c.slug === currentCitySlug);
  const label = currentCity?.name ?? "Pick a city";

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--border-default)",
          background: open ? "var(--surface-sunken)" : "var(--white)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          cursor: "pointer",
          minHeight: 36,
          transition: "var(--motion-color)",
        }}
      >
        {label}
        <img
          src="https://unpkg.com/lucide-static@0.462.0/icons/chevron-down.svg"
          width={14}
          height={14}
          alt=""
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform var(--duration-fast) var(--ease-standard)",
          }}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Cities"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 200,
            maxHeight: 280,
            overflowY: "auto",
            background: "var(--white)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-md)",
            padding: "var(--space-1)",
            zIndex: 20,
            listStyle: "none",
            margin: 0,
          }}
        >
          {cities.map((c) => (
            <li key={c.id} role="option" aria-selected={c.slug === currentCitySlug}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.slug);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "start",
                  padding: "8px 12px",
                  border: "none",
                  background: c.slug === currentCitySlug ? "var(--surface-sunken)" : "transparent",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-sm)",
                  fontWeight: c.slug === currentCitySlug ? 600 : 400,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                }}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
