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
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { CitySelector } from "@/components/explorer/CitySelector";
import { SiteHeader } from "@/components/ds/SiteHeader";
import { SearchBar } from "@/components/explorer/SearchBar";
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
import { cardArea } from "@/lib/region-location";
import { icon } from "@/lib/icon-catalog";
import { ChevronRight, X } from "lucide-react";
import { useAmenities } from "@/lib/api/hooks/use-taxonomy";
import { priceBandLabel, type PriceLevel } from "@/lib/price-bands";
import { useSearchTerm } from '@/lib/use-search-term';
import { matchReason, searchTerm, SEARCH_PAGE_SIZE } from '@/lib/place-search';

/** Grid-friendly page size: divides evenly by 2, 3 and 4 columns. */
import { CITY_PAGE_SIZE as PAGE_SIZE, cityPageHref } from '@/lib/city-pagination';

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

function CityExplorerPage({ citySlug: initialCitySlug, initialPage = 1 }: { citySlug?: string; initialPage?: number }) {
  const { t, locale } = useI18n();
  const address = useSearchParams();
  const params = useParams();
  const citySlug = initialCitySlug ?? params.citySlug as string;
  const router = useRouter();

  const { search, setSearch, debouncedSearch, isDebouncing } = useSearchTerm();
  const searching = Boolean(searchTerm(search));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedRegion, setActiveRegion] = useState<string | null | undefined>(undefined);
  const { data: cities, isLoading: loadingCities } = useCities();
  const { data: categories } = useCategories();
  const { data: amenities } = useAmenities();
  const currentCity = cities?.find((c) => c.slug === citySlug);
  const requestedRegion = address.get('region');
  const activeRegion = selectedRegion !== undefined
    ? selectedRegion
    : requestedRegion && currentCity?.areaKeys?.includes(requestedRegion) ? requestedRegion : null;
  const [filtersOpen, setFiltersOpen] = useState(false);
  // The list used to send no limit or skip at all, so the backend's default of 20 applied and
  // "All" showed a city's first twenty places as though they were the whole set — Cairo has
  // 147. Paged properly now, with the page reported from the server's total.
  const [pageState, setPageState] = useState({ scope: JSON.stringify([citySlug, '', null, null, {}, locale]), page: initialPage - 1 });
  const [filters, setFilters] = useState<ActiveFilters>({});
  const scope = JSON.stringify([citySlug, debouncedSearch, activeCategory, activeRegion, filters, locale]);
  const page = pageState.scope === scope ? pageState.page : 0;
  const setPage = (next: number | ((previous: number) => number)) => {
    const selected = typeof next === 'function' ? next(page) : next;
    if (!searching && !activeCategory && !activeRegion && Object.keys(filters).length === 0) {
      router.push(`/${locale}/explorer/${citySlug}/${cityPageHref(selected + 1, address.toString())}`, { scroll: false });
      return;
    }
    setPageState({ scope, page: selected });
  };

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

  const matchingCount = placesData?.total ?? placesData?.items.length ?? 0;
  const cityIntro = currentCity
    ? (locale === 'ar' ? currentCity.descriptionAr : currentCity.descriptionEn) || (locale === 'ar'
      ? `أحلى الأماكن في ${displayName(currentCity, locale)}: مطاعم وكافيهات وشواطئ وفنادق ومعالم. اختار المنطقة أو دوّر بالاسم.`
      : `The best places in ${displayName(currentCity, locale)}: restaurants, cafes, beaches, hotels and landmarks. Pick an area or search by name.`)
    : '';

  // Categories with a name in the page's language (one with none renders nothing rather than
  // leaking its slug — see lib/display-name.ts), with the icon the dashboard gave each.
  const categoryOptions = useMemo(
    () => (categories ?? [])
      .map((cat) => ({ id: cat.id, label: displayNameAr(cat, locale), icon: cat.icon ? icon(cat.icon, 16) : undefined }))
      .filter((cat) => cat.label),
    [categories, locale],
  );
  const clearFilters = () => {
    setActiveCategory(null);
    setFilters({});
  };
  // Western digits in both languages, as everywhere else on the site (cards, titles).
  const number = (n: number) => n.toLocaleString('en-US');
  // What is narrowing the list right now, each with its own way out.
  const activeChips = [
    ...(activeCategory ? [{ key: `c:${activeCategory}`, label: categoryOptions.find((c) => c.id === activeCategory)?.label ?? t('explorer.filterCategory'), remove: () => setActiveCategory(null) }] : []),
    ...(filters.priceRange ?? []).map((level) => ({ key: `p:${level}`, label: priceBandLabel(Number(level) as PriceLevel, locale) ?? level, remove: () => setFilters({ ...filters, priceRange: (filters.priceRange ?? []).filter((x) => x !== level) }) })),
    ...(filters.featured ? [{ key: 'featured', label: t('explorer.filterFeaturedOn'), remove: () => setFilters({ ...filters, featured: false }) }] : []),
    ...(filters.amenityIds ?? []).map((id) => {
      const amenity = amenities?.find((a) => a.id === id);
      return { key: `a:${id}`, label: amenity ? (locale === 'ar' ? amenity.name : amenity.nameEn || amenity.name) : t('explorer.filterAmenities'), remove: () => setFilters({ ...filters, amenityIds: (filters.amenityIds ?? []).filter((x) => x !== id) }) };
    }),
  ];

  const narrowed = activeChips.length > 0 || Boolean(activeRegion);

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

      {/* Same measure and inset as the home page and the header (1120 + clamp), so the page
          edge is one continuous line from the logo down to the last card. This used to be
          1200 wide with a flat 16px inset, which disagreed with the filter bar directly above
          it and made the grid look like it had slipped out of the page. */}
      <main
        data-city-total={placesData?.total}
        data-page-size={PAGE_SIZE}
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          width: "100%",
          padding: "var(--space-6) clamp(16px, 4vw, 32px)",
        }}
      >
        {/* One header, read top to bottom: where you are and how much is there, then the two
            questions a visitor answers. WHERE is the pair of pills (city, area); WHAT is the
            search and the Filters sheet, where the categories now live. Whatever is narrowing
            the list is spelled out underneath as chips that can be removed one by one. This
            replaces a separate location bar, a search row and a two-row strip of nineteen
            category icons, which between them took half a phone screen before the first place. */}
        <header className="khg-browse">
          <div className="khg-browse-heading">
            <h1 className="khg-browse-title">{currentCity ? displayName(currentCity, locale) : t("common.loading")}</h1>
            {(searching ? searchData : placesData) && (
              <p role="status" aria-live="polite" className="khg-browse-count">
                {/* The count of what matches, not the count of what this page returned. */}
                {searching
                  ? t(searchData?.total === undefined ? 'explorer.searchMatchesLoaded' : 'explorer.searchMatches', { count: searchData?.total ?? searchData?.items.length ?? 0, q: debouncedSearch })
                  : t(matchingCount === 1 ? 'explorer.placesInOne' : 'explorer.placesIn', { count: number(matchingCount) })}
              </p>
            )}
          </div>
          {currentCity && <p className="khg-browse-intro">{cityIntro}</p>}

          <div className="khg-browse-controls">
            <div className="khg-browse-where">
              <CitySelector cities={cities || []} currentCitySlug={citySlug} onChange={handleCityChange} />
              <RegionSelector regions={regionOptions} city={cityName} value={activeRegion} onChange={setActiveRegion} />
            </div>
            <div className="khg-browse-what">
              <div style={{ flex: 1, minWidth: 0 }}>
                <SearchBar value={search} onChange={setSearch} placeholder={t("common.searchPlaces")} />
              </div>
              <FilterPanel
                isOpen={filtersOpen}
                onOpenChange={setFiltersOpen}
                activeCount={activeChips.length}
                onClear={clearFilters}
                resultCount={searchBusy || (!searching && isLoading) ? undefined : totalMatching}
              >
                <PlaceFilters
                  value={filters}
                  onChange={setFilters}
                  categories={categoryOptions}
                  categoryId={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              </FilterPanel>
            </div>
          </div>

          {activeChips.length > 0 && (
            <ul className="khg-browse-active no-scrollbar" aria-label={t("explorer.activeFilters")}>
              {activeChips.map((chip) => (
                <li key={chip.key}>
                  <button type="button" className="khg-active-chip" onClick={chip.remove} aria-label={t("explorer.removeFilter", { name: chip.label })}>
                    <span>{chip.label}</span>
                    <X size={14} aria-hidden />
                  </button>
                </li>
              ))}
              {activeChips.length > 1 && (
                <li>
                  <button type="button" className="khg-active-clear" onClick={clearFilters}>{t("explorer.clearAll")}</button>
                </li>
              )}
            </ul>
          )}
        </header>

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
                  category={categories?.find((category) => category.id === place.categoryId)?.[locale === 'ar' ? 'nameAr' : 'nameEn'] || categories?.find((category) => category.id === place.categoryId)?.nameAr}
                  searchReason={searching ? matchReason(place.matchedOn) : undefined}
                  area={cardArea(
                    place.region,
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
                <a
                  href={page > 0 ? cityPageHref(page, address.toString()) : undefined}
                  rel="prev"
                  className="khg-page-btn"
                  aria-disabled={page === 0 || searchBusy}
                  onClick={(event) => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); if (page > 0 && !searchBusy) setPage((previous) => previous - 1); } }}
                  aria-label={t("explorer.prevPage")}
                >
                  <ChevronRight className="khg-page-prev" size={18} aria-hidden />
                </a>

                {pageNumbers.map((n, i) =>
                  n === null ? (
                    <span key={`gap-${i}`} className="khg-page-gap">…</span>
                  ) : (
                    <a
                      key={n}
                      href={cityPageHref(n + 1, address.toString())}
                      className="khg-page-btn"
                      data-current={n === page ? "true" : undefined}
                      aria-current={n === page ? "page" : undefined}
                      aria-disabled={searchBusy}
                      onClick={(event) => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); if (!searchBusy) setPage(n); } }}
                    >
                      {n + 1}
                    </a>
                  ),
                )}

                <a
                  href={page < totalPages - 1 ? cityPageHref(page + 2, address.toString()) : undefined}
                  rel="next"
                  className="khg-page-btn"
                  aria-disabled={page >= totalPages - 1 || searchBusy}
                  onClick={(event) => { if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); if (page < totalPages - 1 && !searchBusy) setPage((previous) => previous + 1); } }}
                  aria-label={t("explorer.nextPage")}
                >
                  <ChevronRight className="khg-page-next" size={18} aria-hidden />
                </a>
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
                text-decoration: none;
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
              .khg-page-btn[aria-disabled="true"] { opacity: .45; cursor: default; }
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
              {searching ? t('explorer.searchNoResults', { q: debouncedSearch }) : narrowed ? t('explorer.noResults') : t('explorer.noPlacesInCity')}
            </p>
            {/* An empty list caused by the visitor's own choices says so and offers the way out,
                instead of claiming the city has no places. */}
            {!searching && narrowed && (
              <button type="button" className="khg-active-clear" style={{ marginTop: "var(--space-3)" }} onClick={() => { clearFilters(); setActiveRegion(null); }}>
                {t('explorer.clearFilters')}
              </button>
            )}
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

export default function CitySearchPage(props: { citySlug?: string; initialPage?: number } = {}) {
  return <React.Suspense fallback={<LoadingSkeleton count={6} />}><CityExplorerPage key={`${props.citySlug}:${props.initialPage}`} {...props} /></React.Suspense>;
}
