"use client";
/**
 * CitySelector — the governorate picker in the explorer header.
 *
 * Rebuilt on SelectPill so it and the area picker are literally the same control. The
 * hand-rolled popover this replaces had no keyboard support, no focus-visible ring, no
 * outside-click or Escape handling, and fetched its chevron icon from unpkg.com on every
 * render — a third-party request on the critical path that fails offline or behind a
 * strict CSP. All of that now comes from the shared primitive.
 */
import * as React from "react";
import { useI18n } from "@/i18n/LocaleProvider";
import { displayName } from "@/lib/display-name";
import type { City } from "@/lib/api/types";
import { SelectPill, type SelectPillOption } from "./SelectPill";

type CitySelectorProps = {
  cities: City[];
  currentCitySlug?: string;
  onChange: (slug: string) => void;
};

export function CitySelector({ cities, currentCitySlug, onChange }: CitySelectorProps) {
  const { t, locale } = useI18n();

  const options: SelectPillOption[] = React.useMemo(
    () =>
      cities.map((c) => ({
        value: c.slug,
        label: displayName(c, locale) || c.slug,
      })),
    [cities, locale],
  );

  return (
    <SelectPill
      options={options}
      value={currentCitySlug ?? null}
      onChange={onChange}
      label={t("explorer.cities")}
      placeholder={t("explorer.pickCity")}
      emptyLabel={t("explorer.noCities")}
    />
  );
}
