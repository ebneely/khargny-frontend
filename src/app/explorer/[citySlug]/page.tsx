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

export default function CityExplorerPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const citySlug = params.citySlug as string;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The list used to send no limit or skip at all, so the backend's default of 20 applied and
  // "All" showed a city's first twenty places as though they were the whole set — Cairo has
  // 147. Paged properly now, with the page reported from the server's total.
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ActiveFilters>({});

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
    Boolean(currentCity?.id),
  );

  const { data: searchData } = useSearchPlaces({ q: search || undefined });

  const displayedPlaces = search ? searchData?.items : placesData?.items;
  // Only meaningful for the browse list; search has its own endpoint and its own paging.
  const totalMatching = placesData?.total ?? 0;
  const totalPages = search ? 0 : Math.ceil(totalMatching / PAGE_SIZE);
  const pageNumbers = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);

  // A new filter is a new list; keep the window at one page so it does not inherit a
  // large size from whatever was being browsed before.
  useEffect(() => {
    setPage(0);
  }, [activeCategory, activeRegion, filters, citySlug, search]);

  // Moving between pages should start you at the top of the new one, not halfway down it.
  useEffect(() => {
    if (page > 0) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

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
          {placesData && (
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-tertiary)",
                marginTop: "var(--space-1)",
              }}
            >
              {/* The count of what matches, not the count of what this page returned. */}
              {t("explorer.placesFound", { count: placesData.total ?? placesData.items.length })}
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
        ) : isLoading || (loadingCities && !currentCity) ? (
          <LoadingSkeleton count={6} />
        ) : isError ? (
          <ErrorState message={t("explorer.loadFailed")} onRetry={() => refetch()} />
        ) : displayedPlaces && displayedPlaces.length > 0 ? (
          <div className="khg-place-grid">
            {displayedPlaces.map((place) => (
              <div
                key={place.id}
                onClick={() => router.push(`/explorer/${citySlug}/${place.slug}`)}
                style={{ cursor: "pointer" }}
              >
                {/* No `rating` prop: no review system yet — places.rating is always 0. */}
                <PlaceCard
                  size="md"
                  placeId={place.id}
                  title={locale === "ar" ? place.name : place.nameEn || place.name}
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
                  disabled={page === 0}
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
                      onClick={() => setPage(n)}
                    >
                      {n + 1}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  className="khg-page-btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label={t("explorer.nextPage")}
                >
                  <ChevronRight className="khg-page-next" size={18} aria-hidden />
                </button>
              </nav>
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
              {search ? t("explorer.searchNoResults", { q: search }) : t("explorer.noPlacesInCity")}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
