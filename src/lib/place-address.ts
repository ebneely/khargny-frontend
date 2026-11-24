import { pathIn } from '@5argny/core/rules/locale';
import type { Locale } from '@/i18n/dictionaries';

type RequestedPlace = { citySlug: string; placeSlug: string; locale: Locale; search?: string };
type CurrentPlace = { slug?: string; citySlug?: string; redirectedFrom?: string };

/** A permanent move of a page: 301, not the 308 Next uses for its own internal redirect helper. */
export const PLACE_REDIRECT_STATUS = 301;

export function placePath(citySlug: string, slug: string): string {
  return `/explorer/${encodeURIComponent(citySlug)}/${encodeURIComponent(slug)}`;
}

/** The two place segments in a path without its language, or null for any other route. */
export function placeSegments(path: string): { citySlug: string; placeSlug: string } | null {
  const match = /^\/explorer\/([^/]+)\/([^/]+)\/?$/.exec(path);
  if (!match) return null;
  try {
    return { citySlug: decodeURIComponent(match[1]), placeSlug: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

/**
 * The one canonical address of a place, or null when the request already has it.
 *
 * The language is part of the address: English is the plain URL and Arabic is under /ar. pathIn
 * adds the trailing slash this site serves (trailingSlash: true), so a moved place reaches its
 * final URL in one permanent hop instead of landing on a second redirect.
 */
export function placeRedirect(requested: RequestedPlace, current: CurrentPlace): string | null {
  if (!current.slug) return null;
  const citySlug = current.citySlug || requested.citySlug;
  if (current.slug === requested.placeSlug && citySlug === requested.citySlug) return null;
  const search = requested.search ?? '';
  return `${pathIn(placePath(citySlug, current.slug), requested.locale)}${search ? (search.startsWith('?') ? search : `?${search}`) : ''}`;
}
