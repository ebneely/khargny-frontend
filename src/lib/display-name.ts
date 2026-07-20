/**
 * Localized display names for visitor-facing UI.
 *
 * A slug is a URL identifier, never a label. `hylywbwlys` and `mtaam` are transliterations
 * generated for routing — showing them to a visitor reads as broken text, and in Arabic it
 * reads as nothing at all. Every one of these helpers falls back to the OTHER language and
 * then to an empty string, deliberately never to `.slug`.
 *
 * If both names are missing the caller gets "" and should skip rendering that element; that
 * is a content problem for an admin to fix, and a blank chip is a smaller lie than a slug
 * presented as a name.
 */

type Locale = string;

/** Entities named `name` (Arabic) + `nameEn` — cities, places, amenities, tags. */
export function displayName(
  entity: { name?: string | null; nameEn?: string | null } | null | undefined,
  locale: Locale,
): string {
  if (!entity) return "";
  const ar = entity.name?.trim() || "";
  const en = entity.nameEn?.trim() || "";
  return (locale === "ar" ? ar || en : en || ar) || "";
}

/** Entities named `nameAr` + `nameEn` — categories. */
export function displayNameAr(
  entity: { nameAr?: string | null; nameEn?: string | null } | null | undefined,
  locale: Locale,
): string {
  if (!entity) return "";
  const ar = entity.nameAr?.trim() || "";
  const en = entity.nameEn?.trim() || "";
  return (locale === "ar" ? ar || en : en || ar) || "";
}
