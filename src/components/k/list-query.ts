// The filter state -> the /v1/places question Explore asks (filters.tsx). Pure and separate so the screen's own query and
// the prefetch on a tap cannot drift apart: both build their key here. The intent's categories come from the caller,
// which owns the intent list (components/k/rules.ts).
import type { Category } from '@/lib/api/types';

export type FilterState = { intent: string; cat: string; when: string; filters: Set<string> };

/** The category ids a filter state names: one category, or every category of an intent. */
export function catIdsOf(f: Pick<FilterState, 'intent' | 'cat'>, categories: Category[], intentCats: readonly string[] = []) {
  return categories.filter((c) => (f.cat ? (c.nameEn || c.nameAr) === f.cat || c.slug === f.cat || c.id === f.cat : intentCats.includes(c.nameEn || '')));
}

/** The /v1/places question a filter state asks: one request per category of an intent (the route takes one categoryId). */
export function listQueryOf(f: FilterState, cityId: string | null, area: string | null, categories: Category[], intentCats: readonly string[] = []) {
  const cats = catIdsOf(f, categories, intentCats);
  const bands = [...f.filters].filter((x) => x.startsWith('band:')).map((x) => x.slice(5)).join(',');
  const amen = [...f.filters].filter((x) => !x.startsWith('band:')).join(',');
  const wantCats = !!(f.intent || f.cat);
  return {
    // categories still loading: wait, never the whole of Egypt by mistake; a category name that matches none finds nothing
    ready: !wantCats || cats.length > 0, none: wantCats && categories.length > 0 && !cats.length,
    catIds: wantCats ? cats.map((x) => x.id) : [null],
    params: { cityId: cityId ?? undefined, region: area ?? undefined, priceRange: bands || undefined, amenityIds: amen || undefined, when: f.when || undefined },
    key: [cats.map((x) => x.id).join(','), cityId ?? '', area ?? '', bands, amen, f.when] as const,
  };
}
