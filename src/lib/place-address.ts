import type { Locale } from '@/i18n/dictionaries';

type RequestedPlace = { citySlug: string; placeSlug: string; locale: Locale; search?: string };
type CurrentPlace = { slug?: string; citySlug?: string; redirectedFrom?: string };

export function placePath(citySlug: string, slug: string): string {
  return `/explorer/${encodeURIComponent(citySlug)}/${encodeURIComponent(slug)}`;
}

export function placeRedirect(requested: RequestedPlace, current: CurrentPlace): string | null {
  if (!current.slug) return null;
  const citySlug = current.citySlug || requested.citySlug;
  if (current.slug === requested.placeSlug && citySlug === requested.citySlug) return null;
  const search = requested.search ?? '';
  return `/${requested.locale}${placePath(citySlug, current.slug)}/${search && !search.startsWith('?') ? '?' : ''}${search}`;
}
