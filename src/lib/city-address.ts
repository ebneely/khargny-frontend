import type { Locale } from '@/i18n/dictionaries';

export function cityRedirect(requested: { citySlug: string; locale: Locale; search?: string }, city: { slug?: string } | null): string | null {
  if (!city?.slug || city.slug === requested.citySlug) return null;
  const search = requested.search ?? '';
  return `/${requested.locale}/explorer/${encodeURIComponent(city.slug)}/${search && !search.startsWith('?') ? '?' : ''}${search}`;
}
