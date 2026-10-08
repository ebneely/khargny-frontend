"use client";
/**
 * FilterPanel — the Filters button and the sheet it opens, the same pattern as the app's
 * ExploreFiltersSheet: a title, Reset beside it, the filter groups, and one button at the
 * bottom that says what the visitor will get ("Show 12 places").
 *
 * Everything that narrows WHAT is shown lives here, category first. WHERE (city, area) is the
 * two pills beside the search. The button carries the number of filters that are on, so a
 * choice made inside the sheet is never invisible once it closes.
 */
import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ds/Sheet";
import { useI18n } from "@/i18n/LocaleProvider";
import type { PriceLevel } from "@/lib/price-bands";

export type ActiveFilters = {
  priceRange?: `${PriceLevel}`[];
  featured?: boolean;
  amenityIds?: string[];
  tagIds?: string[];
};

type FilterPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** How many filters are on, category included. */
  activeCount: number;
  onClear: () => void;
  /** Places matching the current choice; undefined while it is being counted. */
  resultCount?: number;
  children?: React.ReactNode;
};

export function FilterPanel({ isOpen, onOpenChange, activeCount, onClear, resultCount, children }: FilterPanelProps) {
  const { t, locale } = useI18n();
  // Western digits in both languages, as on the cards.
  void locale;
  const number = (n: number) => n.toLocaleString("en-US");
  const cta =
    resultCount === undefined
      ? t("explorer.showResults")
      : resultCount === 0
        ? t("explorer.showNone")
        : t(resultCount === 1 ? "explorer.showPlacesOne" : "explorer.showPlaces", { count: number(resultCount) });

  return (
    <>
      <style>{`
        .khg-filter-btn {
          position: relative; flex: none;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 44px; padding: 0 16px;
          border: 1px solid var(--border-default); border-radius: var(--radius-full);
          background: var(--white); color: var(--text-primary);
          font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500;
          cursor: pointer; transition: var(--motion-color);
        }
        .khg-filter-btn:hover { background: var(--surface-sunken); }
        .khg-filter-btn:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
        .khg-filter-btn[data-on="true"] { border-color: var(--brand-400); background: var(--brand-50); color: var(--brand-700); }
        .khg-filter-count {
          min-width: 20px; height: 20px; padding: 0 6px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--radius-full); background: var(--brand-600); color: var(--white);
          font-size: var(--text-xs); font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1;
        }
        .khg-sheet-reset {
          flex: none; min-height: 44px; padding: 0 10px;
          border: none; border-radius: var(--radius-full); background: transparent;
          color: var(--brand-700); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600;
          cursor: pointer;
        }
        .khg-sheet-reset:hover:not(:disabled) { background: var(--brand-50); }
        .khg-sheet-reset:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
        .khg-sheet-reset:disabled { color: var(--text-tertiary); cursor: default; }
        .khg-sheet-cta {
          width: 100%; height: 52px;
          border: none; border-radius: var(--radius-lg);
          background: var(--brand-600); color: var(--white);
          font-family: var(--font-body); font-size: var(--text-base); font-weight: 600;
          cursor: pointer; transition: var(--motion-color);
        }
        .khg-sheet-cta:hover { background: var(--brand-700); }
        .khg-sheet-cta:active { transform: scale(0.99); }
        .khg-sheet-cta:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 3px; }
        .khg-sheet-cta[data-empty="true"] { background: var(--surface-sunken); color: var(--text-secondary); }
        @media (max-width: 359px) { .khg-filter-btn { padding: 0 12px; gap: 6px; } }
      `}</style>

      <button
        type="button"
        className="khg-filter-btn"
        data-on={activeCount > 0 ? "true" : undefined}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={activeCount > 0 ? t("explorer.filtersOn", { count: number(activeCount) }) : t("explorer.filters")}
        onClick={() => onOpenChange(true)}
      >
        <SlidersHorizontal size={18} aria-hidden />
        <span className="khg-filter-btn-label">{t("explorer.filters")}</span>
        {activeCount > 0 && <span className="khg-filter-count" aria-hidden>{number(activeCount)}</span>}
      </button>

      <Sheet
        open={isOpen}
        onClose={() => onOpenChange(false)}
        title={t("explorer.filters")}
        closeLabel={t("common.close")}
        headerAction={
          <button type="button" className="khg-sheet-reset" onClick={onClear} disabled={activeCount === 0}>
            {t("explorer.reset")}
          </button>
        }
        footer={
          <button type="button" className="khg-sheet-cta" data-empty={resultCount === 0 ? "true" : undefined} onClick={() => onOpenChange(false)}>
            {cta}
          </button>
        }
      >
        {children}
      </Sheet>
    </>
  );
}
