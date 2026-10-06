import { REGION_VALUES, regionLabel, warnDroppedRegion } from "./egypt-regions";

export type RegionOption = {
  value: string;
  label: string;
};

const catalogueKeys = new Set(REGION_VALUES);

export function buildRegionOptions(
  regions: string[],
  locale: string,
  city?: string | null,
): RegionOption[] {
  const byLabel = new Map<string, RegionOption>();
  for (const value of Array.from(new Set(regions)).sort()) {
    const label = regionLabel(value, locale, city);
    if (!label) continue;
    const option = byLabel.get(label);
    if (option) {
      const preferKey = catalogueKeys.has(value) && !catalogueKeys.has(option.value);
      warnDroppedRegion(
        preferKey ? option.value : value,
        city,
        "Dropped duplicate region label:",
      );
      if (preferKey) byLabel.set(label, { value, label });
    } else {
      byLabel.set(label, { value, label });
    }
  }
  return Array.from(byLabel.values()).sort(
    (first, second) => first.label.localeCompare(second.label, locale === "ar" ? "ar" : "en"),
  );
}
