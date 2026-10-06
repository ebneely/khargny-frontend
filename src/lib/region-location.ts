import { regionLabel } from "./egypt-regions";

export function regionLocation(
  region: string | null | undefined,
  address: string | null | undefined,
  locale: string,
  city?: string | null,
): string {
  return [regionLabel(region, locale, city), address].filter(Boolean).join(" · ");
}
