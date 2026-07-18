"use client";
/**
 * PlaceFilters — the real filter controls rendered inside the FilterPanel sheet. Options come from
 * the ADMIN-managed taxonomy (amenities + tags via the public API) plus price tiers and featured —
 * not a hardcoded list. Selecting them updates the ActiveFilters, which the city page turns into
 * query params on GET /v1/places.
 */
import * as React from "react";
import { useAmenities, useTags } from "@/lib/api/hooks/use-taxonomy";
import { useI18n } from "@/i18n/LocaleProvider";
import type { ActiveFilters } from "./FilterPanel";

type Props = {
  value: ActiveFilters;
  onChange: (next: ActiveFilters) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
        {title}
      </span>
      {children}
    </div>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: "var(--radius-full)",
        border: `1px solid ${active ? "var(--brand-600)" : "var(--gray-300)"}`,
        background: active ? "var(--brand-50)" : "var(--white)",
        color: active ? "var(--brand-700)" : "var(--text-secondary)",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-sm)",
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: "var(--motion-color)",
      }}
    >
      {label}
    </button>
  );
}

export function PlaceFilters({ value, onChange }: Props) {
  const { t, locale } = useI18n();
  const { data: amenities } = useAmenities();
  const { data: tags } = useTags();

  const toggle = (key: "priceRange" | "amenityIds" | "tagIds", id: string) => {
    const cur = value[key] ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onChange({ ...value, [key]: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Section title={t("explorer.filterPrice")}>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4].map((n) => (
            <Chip
              key={n}
              active={(value.priceRange ?? []).includes(String(n))}
              label={"$".repeat(n)}
              onClick={() => toggle("priceRange", String(n))}
            />
          ))}
        </div>
      </Section>

      <Section title={t("explorer.filterFeatured")}>
        <Chip
          active={!!value.featured}
          label={t("explorer.filterFeaturedOn")}
          onClick={() => onChange({ ...value, featured: !value.featured })}
        />
      </Section>

      {amenities && amenities.length > 0 && (
        <Section title={t("explorer.filterAmenities")}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {amenities.map((a) => (
              <Chip
                key={a.id}
                active={(value.amenityIds ?? []).includes(a.id)}
                label={locale === "ar" ? a.name : a.nameEn || a.name}
                onClick={() => toggle("amenityIds", a.id)}
              />
            ))}
          </div>
        </Section>
      )}

      {tags && tags.length > 0 && (
        <Section title={t("explorer.filterTags")}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                active={(value.tagIds ?? []).includes(tag.id)}
                label={locale === "ar" ? tag.name : tag.nameEn || tag.name}
                onClick={() => toggle("tagIds", tag.id)}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
