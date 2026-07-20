"use client";
/**
 * RegionSelector — the area picker that sits after the city picker.
 *
 * City is the governorate; region is the district a visitor actually thinks in (Zamalek,
 * not Cairo). It only ever offers areas that have at least one place in the current city:
 * the catalog holds 281 regions and listing all of them would be mostly dead ends.
 *
 * The VALUE is the stored English key, which is what the API filters on. Only the label is
 * translated, through the shared catalog — the column has no Arabic side.
 */
import * as React from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { regionLabel } from "@/lib/egypt-regions";
import { SelectPill, type SelectPillOption } from "./SelectPill";

export function RegionSelector({
  regions,
  value,
  onChange,
}: {
  /** Stored region keys present in the current city. */
  regions: string[];
  value: string | null;
  onChange: (region: string | null) => void;
}) {
  const { t, locale } = useI18n();

  const options: SelectPillOption[] = React.useMemo(
    () =>
      regions
        .map((r) => ({ value: r, label: regionLabel(r, locale) || r }))
        // Sort by the LABEL the reader sees; sorting by the stored English key puts Arabic
        // labels in an order that looks arbitrary.
        .sort((a, b) => a.label.localeCompare(b.label, locale === "ar" ? "ar" : "en")),
    [regions, locale],
  );

  return (
    <SelectPill
      options={options}
      value={value}
      onChange={(v) => onChange(v || null)}
      label={t("explorer.region")}
      placeholder={t("explorer.pickRegion")}
      allLabel={t("explorer.regionAll")}
      emptyLabel={t("explorer.regionEmpty")}
    />
  );
}
