"use client";
/**
 * FilterPanel — restyled against the Khargny Design System (TASK-0008).
 * A side-rail Sheet that opens when the visitor taps "Filters".
 * Visual tokens from `UI_UX/explorer/beauty/filter-panel/spec.md`.
 */
import * as React from "react";
import { Sheet } from "@/components/ds/Sheet";
import { useI18n } from "@/i18n/LocaleProvider";

export type ActiveFilters = {
  priceRange?: string[];
  featured?: boolean;
  amenityIds?: string[];
  tagIds?: string[];
};

type FilterPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  onClear: () => void;
  children?: React.ReactNode;
};

export function FilterPanel({
  isOpen,
  onOpenChange,
  activeFilters,
  onFilterChange,
  onClear,
  children,
}: FilterPanelProps) {
  const { t } = useI18n();
  const hasFilters = Object.values(activeFilters).some(
    (v) => v !== undefined && v !== false && (Array.isArray(v) ? v.length > 0 : true),
  );

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 36,
          padding: "0 16px",
          background: "var(--white)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-full)",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          cursor: "pointer",
          transition: "var(--motion-color)",
          position: "relative",
        }}
      >
        <img
          src="https://unpkg.com/lucide-static@0.462.0/icons/sliders-horizontal.svg"
          width={16}
          height={16}
          alt=""
        />
        Filters
        {hasFilters && (
          <span
            aria-label="Active filters"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--brand-500)",
            }}
          />
        )}
      </button>
      <Sheet open={isOpen} onClose={() => onOpenChange(false)} title={t("explorer.filters")}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {children}
          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Clear all filters
            </button>
          )}
        </div>
      </Sheet>
    </>
  );
}
