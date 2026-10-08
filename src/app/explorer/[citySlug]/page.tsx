"use client";
/**
 * Explorer city page — `/explorer/{citySlug}`.
 * Restyled against the Khargny Design System (TASK-0008).
 * See `UI_UX/explorer/structure/explorer-city/wireframe.md` for the layout spec.
 *
 * The `{citySlug}` dynamic segment is resolved to the city's id via `cities.find(c => c.slug === citySlug)?.id`,
 * per the §33 cell named in `UI_UX/explorer/page-tree.md`.
 */
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { CitySelector } from "@/components/explorer/CitySelector";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { SearchBar } from "@/components/explorer/SearchBar";
import { CategoryChip } from "@/components/ds/CategoryChip";
import { LoadingSkeleton } from "@/components/explorer/LoadingSkeleton";
import { ErrorState } from "@/components/explorer/ErrorState";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { FilterPanel, type ActiveFilters } from "@/components/explorer/FilterPanel";
import { PlaceFilters } from "@/components/explorer/PlaceFilters";
import { useCities } from "@/lib/api/hooks/use-cities";
import { usePlaces } from "@/lib/api/hooks/use-places";
import { useCategories } from "@/lib/api/hooks/use-categories";
import { useSearchPlaces } from "@/lib/api/hooks/use-search";
import { useI18n } from "@/i18n/LocaleProvider";
import { displayName, displayNameAr } from "@/lib/display-name";
import { RegionSelector } from "@/components/explorer/RegionSelector";
import { regionLocation } from "@/lib/region-location";
import { icon } from "@/lib/icon-catalog";
import { ChevronRight } from "lucide-react";
import { useSearchTerm } from '@/lib/use-search-term';
import { matchReason, searchTerm, SEARCH_PAGE_SIZE } from '@/lib/place-search';

/** Grid-friendly page size: divides evenly by 2, 3 and 4 columns. */
const PAGE_SIZE = 24;

/**
 * Page numbers to show: the first, the last, and a window around the current one, with the
 * gaps elided. The same shape as the dashboard's list.
 */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set<number>([0, total - 1, current]);
  for (const n of [current - 1, current + 1]) if (n > 0 && n < total - 1) pages.add(n);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let previous: number | null = null;
  for (const n of sorted) {
    if (previous !== null && n - previous > 1) out.push(null);
    out.push(n);
    previous = n;
  }
  return out;
}

function CityExplorerPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const citySlug = params.citySlug as string;

  const { search, setSearch, debouncedSearch, isDebouncing } = useSearchTerm();
  const searching = Boolean(searchTerm(search));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The list used to send no limit or skip at all, so the backend's default of 20 applied and
  // "All" showed a city's first twenty places as though they were the whole set — Cairo has
  // 147. Paged properly now, with the page reported from the server's total.
  const [pageState, setPageState] = useState({ scope: '', page: 0 });
  const [filters, setFilters] = useState<ActiveFilters>({});
  const scope = JSON.stringify([citySlug, debouncedSearch, activeCategory, activeRegion, filters, locale]);
  const page = pageState.scope === scope ? pageState.page : 0;
  const setPage = (next: number | ((previous: number) => number)) => setPageState({ scope, page: typeof next === 'function' ? next(page) : next });

  const { data: cities, isLoading: loadingCities } = useCities();
  const { data: categories } = useCategories();
  const currentCity = cities?.find((c) => c.slug === citySlug);
  // cities are loaded but this slug isn't among them → the city doesn't exist
  const cityNotFound = !loadingCities && !!cities && !currentCity;

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const k of currentCity?.areaKeys ?? []) {
      if (k) set.add(k);
    }
    return Array.from(set).sort();
  }, [currentCity]);

  const cityName = currentCity?.nameEn || currentCity?.name || citySlug;
  const cityNameById = useMemo(
    () => new Map((cities ?? []).map((city) => [city.id, city.nameEn || city.name || city.slug])),
    [cities],
  );
  const { data: placesData, isLoading, isError, refetch } = usePlaces(
    {
      cityId: currentCity?.id,
      categoryId: activeCategory || undefined,
      region: activeRegion || undefined,
      priceRange: filters.priceRange?.length ? filters.priceRange.join(",") : undefined,
      featured: filters.featured || undefined,
      amenityIds: filters.amenityIds?.length ? filters.amenityIds.join(",") : undefined,
      tagIds: filters.tagIds?.length ? filters.tagIds.join(",") : undefined,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    },
    Boolean(currentCity?.id) && !searching,
  );

  const searchQuery = useSearchPlaces({
    q: debouncedSearch || undefined,
    cityId: currentCity?.id,
    categoryIds: activeCategory ? [activeCategory] : undefined,
    skip: page * SEARCH_PAGE_SIZE,
    limit: SEARCH_PAGE_SIZE,
  }, { enabled: Boolean(currentCity?.id) && searching && !isDebouncing, locale, local: { ...filters, region: activeRegion } });
  const searchData = searchQuery.data;
  const searchBusy = searching && (isDebouncing || searchQuery.isFetching || (!searchData && !searchQuery.isError));
  const displayedPlaces = searching ? searchData?.items ?? (searchQuery.isError ? undefined : placesData?.items) : placesData?.items;
  const totalMatching = searching ? searchData?.total : placesData?.total;
  const totalPages = Math.ceil((totalMatching ?? 0) / (searching ? SEARCH_PAGE_SIZE : PAGE_SIZE));
  const pageNumbers = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);

  // Moving between pages should start you at the top of the new one, not halfway down it.
  useEffect(() => {
    if (page > 0 && (!searching || totalMatching !== undefined)) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, searching, totalMatching]);

  const handleCityChange = (slug: string) => {
    router.push(`/explorer/${slug}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-app)",
        fontFamily: "var(--font-body)",
      }}
    >
      <SiteHeader active="explore" />

      {/* Location filters live in their own bar under the header, not crammed into the top
          nav. City then area — the two levels of "where", in that order. Cramming both
          selectors plus the language and menu buttons onto one header line overflowed a
          phone; a dedicated bar reads cleanly at every width and is the right home for a
          filter anyway. It scrolls horizontally rather than wrapping if a label is long. */}
      <div
        className="no-scrollbar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          overflowX: "auto",
          padding: "var(--space-2) clamp(16px, 4vw, 32px)",
          background: "var(--surface-app)",
          borderBottom: "1px solid var(--gray-200)",
        }}
      >
        <CitySelector
          cities={cities || []}
          currentCitySlug={citySlug}
          onChange={handleCityChange}
        />
        <RegionSelector
          regions={regionOptions}
          city={cityName}
          value={activeRegion}
          onChange={setActiveRegion}
        />
      </div>

      {/* Same measure and inset as the home page and the header (1120 + clamp), so the page
          edge is one continuous line from the logo down to the last card. This used to be
          1200 wide with a flat 16px inset, which disagreed with the filter bar directly above
          it and made the grid look like it had slipped out of the page. */}
      <main
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          width: "100%",
          padding: "var(--space-6) clamp(16px, 4vw, 32px)",
        }}
      >
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-3xl)",
              fontWeight: 600,
              lineHeight: 1.3,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {currentCity ? displayName(currentCity, locale) : t("common.loading")}
          </h1>
          {(searching ? searchData : placesData) && (
            <p
              role="status"
              aria-live="polite"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-tertiary)",
                marginTop: "var(--space-1)",
              }}
            >
              {/* The count of what matches, not the count of what this page returned. */}
              {searching
                ? t(searchData?.total === undefined ? 'explorer.searchMatchesLoaded' : 'explorer.searchMatches', { count: searchData?.total ?? searchData?.items.length ?? 0, q: debouncedSearch })
                : t('explorer.placesFound', { count: placesData?.total ?? placesData?.items.length ?? 0 })}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            marginBottom: "var(--space-6)",
          }}
        >
          <div style={{ flex: 1 }}>
            <SearchBar value={search} onChange={setSearch} placeholder={t("common.searchPlaces")} />
          </div>
          <FilterPanel
            isOpen={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeFilters={filters}
            onFilterChange={setFilters}
            onClear={() => setFilters({})}
          >
            <PlaceFilters value={filters} onChange={setFilters} />
          </FilterPanel>
        </div>

        {/* The area filter is the RegionSelector in the header (next to the city), so the
            old horizontal chip row here was a second control for the same state — removed to
            avoid two area pickers that could disagree. Category chips stay. */}
        {/* .khg-cat-row is the shared strip: a swipeable rail on phones, and a centred block
            that wraps onto as many rows as it needs from 1024px up. This page previously
            re-implemented the scroller inline, so it never wrapped on desktop and the last
            categories stayed hidden off the right edge with nothing to suggest they existed. */}
        {categories && categories.length > 0 && (
          <div className="khg-cat-row no-scrollbar">
            <CategoryChip
              label={t("explorer.all")}
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {/* A category with no name in either language renders nothing rather than
                leaking its slug — see lib/display-name.ts. */}
            {categories.filter((cat) => displayNameAr(cat, locale)).map((cat) => (
              <CategoryChip
                key={cat.id}
                label={displayNameAr(cat, locale)}
                // Render the category's own icon (from the dashboard) when it has one, so the
                // rail matches the app's icon chips.
                icon={cat.icon ? icon(cat.icon, 20) : undefined}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              />
            ))}
          </div>
        )}

        {cityNotFound ? (
          <div style={{ textAlign: "center", padding: "var(--space-12) var(--space-4)" }}>
            <p style={{ fontSize: "var(--text-base)", color: "var(--text-tertiary)", margin: 0 }}>
              {t("explorer.cityNotFound")}
            </p>
          </div>
        ) : (loadingCities && !currentCity) || (!displayedPlaces && (searching ? searchBusy : isLoading)) ? (
          <LoadingSkeleton count={6} />
        ) : searching && searchQuery.isError ? (
          <ErrorState message={t('explorer.loadFailed')} onRetry={() => searchQuery.refetch()} />
        ) : !searching && isError ? (
          <ErrorState message={t("explorer.loadFailed")} onRetry={() => refetch()} />
        ) : displayedPlaces && displayedPlaces.length > 0 ? (
          <div className="khg-place-grid" aria-busy={searchBusy} style={{ opacity: searchBusy ? 0.5 : 1 }}>
            {displayedPlaces.map((place) => (
              <div
                key={place.id}
                style={{ cursor: "pointer" }}
              >
                {/* No `rating` prop: no review system yet — places.rating is always 0. */}
                <PlaceCard
                  href={`/explorer/${currentCity?.slug || citySlug}/${place.slug}`}
                  size="md"
                  placeId={place.id}
                  title={locale === "ar" ? place.name : place.nameEn || place.name}
                  searchReason={searching ? matchReason(place.matchedOn) : undefined}
                  area={regionLocation(
                    place.region,
                    place.address,
                    locale,
                    cityNameById.get(place.cityId) || place.cityId,
                  )}
                  image={place.coverImage || undefined}
                  priceRange={place.priceRange}
                  hasMenu={place.hasMenu}
                  priceVerified={place.priceVerified}
                  visitedByUs={place.visitedByUs}
                  metrics={{ saves: place.saveCount, directions: place.directionsCount, views: place.viewCount }}
                  onToggleFavorite={() => {}}
                />
              </div>
            ))}
            {totalPages > 1 && (
              <nav className="khg-pager" aria-label={t("explorer.pagination")}>
                <button
                  type="button"
                  className="khg-page-btn"
                  disabled={page === 0 || searchBusy}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label={t("explorer.prevPage")}
                >
                  <ChevronRight className="khg-page-prev" size={18} aria-hidden />
                </button>

                {pageNumbers.map((n, i) =>
                  n === null ? (
                    <span key={`gap-${i}`} className="khg-page-gap">…</span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      className="khg-page-btn"
                      data-current={n === page ? "true" : undefined}
                      aria-current={n === page ? "page" : undefined}
                      disabled={searchBusy}
                      onClick={() => setPage(n)}
                    >
                      {n + 1}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  className="khg-page-btn"
                  disabled={page >= totalPages - 1 || searchBusy}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label={t("explorer.nextPage")}
                >
                  <ChevronRight className="khg-page-next" size={18} aria-hidden />
                </button>
              </nav>
            )}
            {searching && searchData?.total === undefined && searchData?.hasMore && (
              <button type="button" className="khg-page-btn" style={{ gridColumn: '1 / -1', justifySelf: 'center' }} disabled={searchBusy} onClick={() => setPage((previous) => previous + 1)}>{t('explorer.loadMore')}</button>
            )}
            <style>{`
              .khg-pager {
                grid-column: 1 / -1;
                display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
                gap: 8px; margin-top: var(--space-8);
              }
              .khg-page-btn {
                min-width: 40px; height: 40px; padding: 0 12px;
                display: inline-flex; align-items: center; justify-content: center;
                border-radius: var(--radius-full);
                border: 1px solid var(--gray-300);
                background: var(--white); color: var(--text-primary);
                font-family: var(--font-body); font-size: var(--text-sm); font-weight: 500;
                font-variant-numeric: tabular-nums;
                cursor: pointer;
                transition: background var(--duration-fast) var(--ease-standard),
                            border-color var(--duration-fast) var(--ease-standard);
              }
              .khg-page-btn:hover:not(:disabled) { background: var(--brand-50); border-color: var(--brand-200); }
              .khg-page-btn:disabled { opacity: .45; cursor: default; }
              .khg-page-btn[data-current="true"] {
                background: var(--brand-600); border-color: var(--brand-600); color: var(--white);
              }
              .khg-page-gap { padding: 0 2px; color: var(--text-tertiary); user-select: none; }
              /* One chevron glyph, turned. The arrows must follow reading direction, so in
                 Arabic "previous" points right and "next" points left. */
              .khg-page-prev { transform: rotate(180deg); }
              [dir="rtl"] .khg-page-prev { transform: none; }
              [dir="rtl"] .khg-page-next { transform: rotate(180deg); }
            `}</style>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-12) var(--space-4)",
            }}
          >
            <p
              style={{
                fontSize: "var(--text-base)",
                lineHeight: 1.5,
                color: "var(--text-tertiary)",
                margin: 0,
              }}
            >
              {searching ? t('explorer.searchNoResults', { q: debouncedSearch }) : t('explorer.noPlacesInCity')}
            </p>
            {searching && (
              <>
                {searchBusy && <p role="status">{t('common.loading')}</p>}
                {searchData?.otherCities.length ? (
                  <section aria-busy={searchBusy} style={{ textAlign: 'start', marginTop: 'var(--space-6)', opacity: searchBusy ? 0.5 : 1 }}>
                    <h2>{t('explorer.otherCities')}</h2>
                    <div className="khg-place-grid">
                      {searchData.otherCities.map((place) => {
                        const city = cities?.find((item) => item.id === place.cityId);
                        if (!city) return null;
                        return <PlaceCard key={place.id} href={`/explorer/${city.slug}/${place.slug}`} size="md" placeId={place.id} title={displayName(place, locale)} area={displayName(city, locale)} searchReason={matchReason(place.matchedOn)} image={place.coverImage || undefined} priceRange={place.priceRange} hasMenu={place.hasMenu} priceVerified={place.priceVerified} visitedByUs={place.visitedByUs} metrics={{ saves: place.saveCount, directions: place.directionsCount, views: place.viewCount }} onToggleFavorite={() => {}} />;
                      })}
                    </div>
                  </section>
                ) : !searchBusy && <p>{t('explorer.noMatchesAnywhere')}</p>}
                {!searchBusy && <button type="button" onClick={() => setSearch('')}>{t('explorer.clearSearch')}</button>}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CitySearchPage() {
  return <React.Suspense fallback={<LoadingSkeleton count={6} />}><CityExplorerPage /></React.Suspense>;
}
