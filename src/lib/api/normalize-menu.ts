import type { MenuImage, MenuItem, MenuSection, PlaceMenu } from "./types";
import { IMAGE_HOSTS } from "@/lib/image-hosts";

const allowedImageHosts = new Set<string>(IMAGE_HOSTS);

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port ||
        !allowedImageHosts.has(parsed.hostname)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeImage(image: unknown): MenuImage | null {
  if (!isRecord(image)) return null;
  const normalized = {
    url: normalizeImageUrl(image.url),
    thumb: normalizeImageUrl(image.thumb),
    small: normalizeImageUrl(image.small),
    medium: normalizeImageUrl(image.medium),
  };
  return Object.values(normalized).some((size) => size !== null) ? normalized : null;
}

export function normalizeMenu(raw: unknown): PlaceMenu | null {
  if (!isRecord(raw) || raw.currency !== "EGP" || typeof raw.placeId !== "string" ||
      typeof raw.slug !== "string" || typeof raw.updatedAt !== "string" || !Array.isArray(raw.sections)) return null;

  const sections: MenuSection[] = [];
  for (const section of raw.sections) {
    if (!isRecord(section) || (section.id !== null && typeof section.id !== "string") ||
        (section.id !== null && (typeof section.nameAr !== "string" || !section.nameAr.trim())) ||
        (section.nameEn != null && typeof section.nameEn !== "string") || !Array.isArray(section.items)) return null;

    const items: MenuItem[] = [];
    for (const item of section.items) {
      if (!isRecord(item) || typeof item.id !== "string" || typeof item.nameAr !== "string" ||
          !item.nameAr.trim() || (item.nameEn != null && typeof item.nameEn !== "string") ||
          typeof item.price !== "string" || !/^\d+\.\d{2}$/.test(item.price) || typeof item.available !== "boolean") return null;
      items.push({
        id: item.id,
        nameAr: item.nameAr.trim(),
        nameEn: typeof item.nameEn === "string" ? item.nameEn.trim() || null : null,
        price: item.price,
        available: item.available,
        image: normalizeImage(item.image),
      });
    }
    if (items.length) sections.push({
      id: section.id as string | null,
      nameAr: section.id === null ? null : (section.nameAr as string).trim(),
      nameEn: section.id === null ? null : typeof section.nameEn === "string" ? section.nameEn.trim() || null : null,
      items,
    });
  }
  sections.sort((first, second) => Number(second.id === null) - Number(first.id === null));
  return { placeId: raw.placeId, slug: raw.slug, currency: "EGP", updatedAt: raw.updatedAt, sections };
}
