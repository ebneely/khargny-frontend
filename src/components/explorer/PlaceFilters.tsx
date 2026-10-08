"use client";
/**
 * PlaceFilters — what goes inside the Filters sheet, in the same order as the app:
 * Category (one), Price, Featured, Amenities (any number). Options come from the
 * admin-managed taxonomy through the public API, not a hardcoded list.
 *
 * Tags are not offered: they are search keywords the team attaches to places, not something
 * a visitor picks from.
 */
import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { useAmenities } from "@/lib/api/hooks/use-taxonomy";
import { useI18n } from "@/i18n/LocaleProvider";
import type { ActiveFilters } from "./FilterPanel";
import { PRICE_LEVELS, priceBandLabel } from "@/lib/price-bands";

export type FilterCategory = { id: string; label: string; icon?: React.ReactNode };

type Props = {
  value: ActiveFilters;
  onChange: (next: ActiveFilters) => void;
  /** Offered when the page has categories; choosing the chosen one again clears it. */
  categories?: FilterCategory[];
  categoryId?: string | null;
  onCategoryChange?: (id: string | null) => void;
};

/** A long amenity list starts folded, as in the app. */
const AMENITIES_FOLDED = 12;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="khg-filter-section">
      <h3 className="khg-filter-title">{title}</h3>
      {hint && <p className="khg-filter-hint">{hint}</p>}
      {children}
    </section>
  );
}

function Chip({ active, label, onClick, icon, multi }: { active: boolean; label: string; onClick: () => void; icon?: React.ReactNode; multi?: boolean }) {
  return (
    <button
      type="button"
      className="khg-filter-chip"
      data-active={active ? "true" : undefined}
      role={multi ? "checkbox" : undefined}
      aria-checked={multi ? active : undefined}
      aria-pressed={multi ? undefined : active}
      onClick={onClick}
    >
      {multi && active ? <Check size={15} aria-hidden /> : icon ? <span className="khg-filter-chip-icon" aria-hidden>{icon}</span> : null}
      <span>{label}</span>
    </button>
  );
}

function AmenityChips({ amenities, chosen, onToggle }: { amenities: { id: string; label: string }[]; chosen: string[]; onToggle: (id: string) => void }) {
  const { t, locale } = useI18n();
  const [all, setAll] = React.useState(false);
  // Folded, but never hiding something that is switched on.
  const shown = all || amenities.length <= AMENITIES_FOLDED ? amenities : amenities.filter((a, i) => i < AMENITIES_FOLDED || chosen.includes(a.id));
  return (
    <>
      <div className="khg-filter-wrap">
        {shown.map((a) => (
          <Chip key={a.id} multi active={chosen.includes(a.id)} label={a.label} onClick={() => onToggle(a.id)} />
        ))}
      </div>
      {amenities.length > AMENITIES_FOLDED && (
        <button type="button" className="khg-filter-more" data-open={all ? "true" : undefined} aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? t("explorer.showLess") : t("explorer.showAll", { count: amenities.length.toLocaleString(locale === "ar" ? "ar-EG" : "en-US") })}
          <ChevronDown size={16} aria-hidden />
        </button>
      )}
    </>
  );
}

export function PlaceFilters({ value, onChange, categories, categoryId, onCategoryChange }: Props) {
  const { t, locale } = useI18n();
  const { data: amenities } = useAmenities();
  const toggle = (key: "priceRange" | "amenityIds", id: string) => {
    const cur = value[key] ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="khg-filters">
      {categories && categories.length > 0 && onCategoryChange && (
        <Section title={t("explorer.filterCategory")}>
          {/* A grid, not a wrap: with twenty categories, equal cells in columns can be read down
              like a list; chips of different widths made a ragged wall. */}
          <div className="khg-filter-grid">
            <Chip active={!categoryId} label={t("explorer.all")} onClick={() => onCategoryChange(null)} />
            {categories.map((category) => (
              <Chip
                key={category.id}
                active={categoryId === category.id}
                label={category.label}
                icon={category.icon}
                onClick={() => onCategoryChange(categoryId === category.id ? null : category.id)}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title={t("explorer.filterPrice")}>
        <div className="khg-filter-wrap">
          {PRICE_LEVELS.map((level) => (
            <Chip
              key={level}
              multi
              active={(value.priceRange ?? []).includes(`${level}` as const)}
              label={priceBandLabel(level, locale)!}
              onClick={() => toggle("priceRange", String(level))}
            />
          ))}
        </div>
      </Section>

      <Section title={t("explorer.filterFeatured")}>
        <div className="khg-filter-wrap">
          <Chip
            multi
            active={!!value.featured}
            label={t("explorer.filterFeaturedOn")}
            onClick={() => onChange({ ...value, featured: !value.featured })}
          />
        </div>
      </Section>

      {amenities && amenities.length > 0 && (
        <Section title={t("explorer.filterAmenities")} hint={t("explorer.filterAmenitiesHint")}>
          <AmenityChips
            amenities={amenities.map((a) => ({ id: a.id, label: locale === "ar" ? a.name : a.nameEn || a.name }))}
            chosen={value.amenityIds ?? []}
            onToggle={(id) => toggle("amenityIds", id)}
          />
        </Section>
      )}

      <style>{`
        .khg-filters { display: flex; flex-direction: column; gap: 28px; padding-top: 8px; }
        .khg-filter-section { display: flex; flex-direction: column; gap: 12px; }
        .khg-filter-title { margin: 0; font-family: var(--font-body); font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
        .khg-filter-hint { margin: -6px 0 0; font-family: var(--font-body); font-size: var(--text-sm); line-height: 1.5; color: var(--text-secondary); }
        .khg-filter-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
        .khg-filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .khg-filter-grid .khg-filter-chip { width: 100%; justify-content: flex-start; min-height: 44px; border-radius: var(--radius-lg); padding: 0 12px; }
        .khg-filter-grid .khg-filter-chip > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        @media (min-width: 768px) { .khg-filter-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .khg-filter-chip {
          display: inline-flex; align-items: center; gap: 6px; max-width: 100%;
          min-height: 40px; padding: 0 14px;
          border: 1px solid var(--border-default); border-radius: var(--radius-full);
          background: var(--white); color: var(--text-secondary);
          font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500;
          cursor: pointer; transition: var(--motion-color);
        }
        .khg-filter-chip:hover { background: var(--surface-sunken); color: var(--text-primary); }
        .khg-filter-chip:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; }
        .khg-filter-chip[data-active="true"] { background: var(--brand-600); border-color: var(--brand-600); color: var(--white); font-weight: 600; }
        .khg-filter-chip[data-active="true"]:hover { background: var(--brand-700); border-color: var(--brand-700); color: var(--white); }
        .khg-filter-chip-icon { display: inline-flex; flex: none; }
        .khg-filter-more {
          align-self: flex-start; display: inline-flex; align-items: center; gap: 4px;
          min-height: 44px; padding: 0 4px; border: none; background: transparent;
          color: var(--brand-700); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; cursor: pointer;
        }
        .khg-filter-more:focus-visible { outline: 2px solid var(--brand-600); outline-offset: 2px; border-radius: var(--radius-sm); }
        .khg-filter-more[data-open="true"] svg { transform: rotate(180deg); }
      `}</style>
    </div>
  );
}
