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
import { useState, useMemo } from "react";
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

export default function CityExplorerPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const citySlug = params.citySlug as string;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>({});

  const { data: cities, isLoading: loadingCities } = useCities();
  const { data: categories } = useCategories();
  const currentCity = cities?.find((c) => c.slug === citySlug);
  // cities are loaded but this slug isn't among them → the city doesn't exist
  const cityNotFound = !loadingCities && !!cities && !currentCity;

  const { data: placesData, isLoading, isError, refetch } = usePlaces(
    {
      cityId: currentCity?.id,
      categoryId: activeCategory || undefined,
      region: activeRegion || undefined,
      // visitor filters → query params (arrays comma-joined). Options come from the admin taxonomy.
      priceRange: filters.priceRange?.length ? filters.priceRange.join(",") : undefined,
      featured: filters.featured || undefined,
      amenityIds: filters.amenityIds?.length ? filters.amenityIds.join(",") : undefined,
      tagIds: filters.tagIds?.length ? filters.tagIds.join(",") : undefined,
    },
    // gate: only query once we have a real cityId, so it never returns ALL places
    Boolean(currentCity?.id),
  );
  // Unfiltered fetch for the SAME city, used only to work out which areas exist. Kept
  // separate from the filtered list above so selecting a region doesn't collapse the chip
  // row down to the one region you just picked.
  const { data: cityPlaces } = usePlaces(
    { cityId: currentCity?.id, limit: 200 },
    Boolean(currentCity?.id),
  );
  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of cityPlaces?.items ?? []) {
      if (p.region) set.add(p.region);
    }
    return Array.from(set).sort();
  }, [cityPlaces]);

  const { data: searchData } = useSearchPlaces({ q: search || undefined });

  const displayedPlaces = search ? searchData?.items : placesData?.items;

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
      {/* One header at every width. The city switcher used to live in a mobile-only
          ExplorerHeader, so desktop had no way to change city from the header at all. */}
      <SiteHeader
        active="explore"
        extra={
          <CitySelector
            cities={cities || []}
            currentCitySlug={citySlug}
            onChange={handleCityChange}
          />
        }
      />

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--space-6) var(--space-4)",
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
              {t("explorer.placesFound", { count: placesData.items.length })}
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

        {/* Areas inside this city. Derived from an unfiltered fetch of the city's places, so
            the row only ever offers regions that actually have something in them — offering
            all ~180 catalog areas would be mostly dead ends. */}
        {regionOptions.length > 0 && (
          <div
            className="no-scrollbar"
            style={{
              display: "flex",
              gap: "var(--space-2)",
              overflowX: "auto",
              paddingBottom: "var(--space-3)",
            }}
          >
            <CategoryChip
              label={t("explorer.allAreas")}
              active={activeRegion === null}
              onClick={() => setActiveRegion(null)}
            />
            {regionOptions.map((r) => (
              <CategoryChip
                key={r}
                label={r}
                active={activeRegion === r}
                onClick={() => setActiveRegion(activeRegion === r ? null : r)}
              />
            ))}
          </div>
        )}

        {categories && categories.length > 0 && (
          <div
            className="no-scrollbar"
            style={{
              display: "flex",
              gap: "var(--space-2)",
              overflowX: "auto",
              paddingBottom: "var(--space-4)",
              marginBottom: "var(--space-2)",
            }}
          >
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
                  area={place.address || ""}
                  image={place.coverImage || undefined}
                  priceRange={place.priceRange}
                  metrics={{ saves: place.saveCount, directions: place.directionsCount, views: place.viewCount }}
                  onToggleFavorite={() => {}}
                />
              </div>
            ))}
            <style>{`
              .khg-place-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--space-4); }
              @media (min-width:640px){ .khg-place-grid { grid-template-columns:repeat(3,1fr); } }
              @media (min-width:1024px){ .khg-place-grid { grid-template-columns:repeat(4,1fr); } }
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
