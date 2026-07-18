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
import { ExplorerHeader } from "@/components/explorer/ExplorerHeader";
import { SearchBar } from "@/components/explorer/SearchBar";
import { CategoryChip } from "@/components/ds/CategoryChip";
import { LoadingSkeleton } from "@/components/explorer/LoadingSkeleton";
import { ErrorState } from "@/components/explorer/ErrorState";
import { PlaceCard } from "@/components/ds/PlaceCard";
import { FilterPanel } from "@/components/explorer/FilterPanel";
import { useCities } from "@/lib/api/hooks/use-cities";
import { usePlaces } from "@/lib/api/hooks/use-places";
import { useCategories } from "@/lib/api/hooks/use-categories";
import { useSearchPlaces } from "@/lib/api/hooks/use-search";
import { useI18n } from "@/i18n/LocaleProvider";

export default function CityExplorerPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const citySlug = params.citySlug as string;

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{}>({});

  const { data: cities } = useCities();
  const { data: categories } = useCategories();
  const currentCity = cities?.find((c) => c.slug === citySlug);

  const { data: placesData, isLoading, isError, refetch } = usePlaces({
    cityId: currentCity?.id,
    categoryId: activeCategory || undefined,
  });
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
      <ExplorerHeader
        cities={cities || []}
        currentCitySlug={citySlug}
        onCityChange={handleCityChange}
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
            {currentCity?.name ?? "Loading…"}
          </h1>
          {placesData && (
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-tertiary)",
                marginTop: "var(--space-1)",
              }}
            >
              {placesData.items.length} places found
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
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <FilterPanel
            isOpen={filtersOpen}
            onOpenChange={setFiltersOpen}
            activeFilters={filters}
            onFilterChange={setFilters}
            onClear={() => setFilters({})}
          />
        </div>

        {categories && categories.length > 0 && (
          <div
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
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.nameAr || cat.nameEn || cat.slug}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              />
            ))}
          </div>
        )}

        {isLoading ? (
          <LoadingSkeleton count={6} />
        ) : isError ? (
          <ErrorState message="Failed to load places" onRetry={() => refetch()} />
        ) : displayedPlaces && displayedPlaces.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: "var(--space-4)",
              overflowX: "auto",
              paddingBottom: "var(--space-4)",
            }}
          >
            {displayedPlaces.map((place) => (
              <div
                key={place.id}
                onClick={() => router.push(`/explorer/${citySlug}/${place.slug}`)}
                style={{ cursor: "pointer" }}
              >
                <PlaceCard
                  size="sm"
                  placeId={place.id}
                  title={place.name}
                  area={place.address || ""}
                  rating={place.rating > 0 ? place.rating.toString() : undefined}
                  onToggleFavorite={() => {
                    // no-op callback — `placeId` above wires the heart to the saved-places
                    // backend (TASK-0009) automatically. The callback is unused in this path.
                  }}
                />
              </div>
            ))}
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
              {search ? `No results for "${search}"` : "No places found in this city"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
