/**
 * Region → citySlug mapping for the marketing-home region Sheet (TASK-0007).
 * Each of the design system's 5 regions resolves to a single primary city (the
 * one most tourists mean when they say that region). The explorer's city
 * picker then lets the visitor refine to a different city in the same region.
 *
 * The mapping is intentionally simple (one default slug per region) so the
 * homepage is a real entry point, not a parallel city picker. If a future
 * iteration wants region → list of cities, the return type can widen.
 */
export type RegionName =
  | "Cairo & Giza"
  | "Alexandria & North Coast"
  | "Red Sea (Sokhna, Sharm, Hurghada)"
  | "Siwa & Western Desert"
  | "Luxor & Aswan";

export const REGIONS: { label: RegionName; labelAr: string; defaultCitySlug: string }[] = [
  { label: "Cairo & Giza", labelAr: "القاهرة والجيزة", defaultCitySlug: "cairo" },
  { label: "Alexandria & North Coast", labelAr: "الإسكندرية والساحل الشمالي", defaultCitySlug: "alexandria" },
  { label: "Red Sea (Sokhna, Sharm, Hurghada)", labelAr: "البحر الأحمر (السخنة، شرم، الغردقة)", defaultCitySlug: "hurghada" },
  { label: "Siwa & Western Desert", labelAr: "سيوة والصحراء الغربية", defaultCitySlug: "siwa" },
  { label: "Luxor & Aswan", labelAr: "الأقصر وأسوان", defaultCitySlug: "luxor" },
];

/**
 * Resolve a region label to its default city slug.
 * Throws if the region label is unknown — by design, so any caller that adds a
 * new region label must update this file (and the design kit stays the source
 * of truth for the literal labels).
 */
export function getRegionToCitySlug(regionLabel: RegionName): string {
  const found = REGIONS.find((r) => r.label === regionLabel);
  if (!found) {
    throw new Error(`getRegionToCitySlug: unknown region label "${regionLabel}"`);
  }
  return found.defaultCitySlug;
}
