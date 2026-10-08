import { regionLabel } from "./egypt-regions";

export function regionLocation(
  region: string | null | undefined,
  address: string | null | undefined,
  locale: string,
  city?: string | null,
): string {
  return [regionLabel(region, locale, city), address].filter(Boolean).join(" · ");
}

/**
 * What a card says about where a place is: its area, and nothing else.
 *
 * Cards used to append the street address ("Elephantine Island · Elephantine Island، شياخة
 * أولى، ..."), which repeated the area, mixed languages and was cut mid-word. The full address
 * belongs on the place page, where there is room for it.
 */
export function cardArea(
  region: string | null | undefined,
  locale: string,
  city?: string | null,
): string {
  return regionLabel(region, locale, city);
}
