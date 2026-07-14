'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ExplorerHeader } from '@/components/explorer/ExplorerHeader';
import { PlaceCard } from '@/components/explorer/PlaceCard';
import { CategoryPill } from '@/components/explorer/CategoryPill';
import { SearchBar } from '@/components/explorer/SearchBar';
import { FilterPanel } from '@/components/explorer/FilterPanel';
import { LoadingSkeleton } from '@/components/explorer/LoadingSkeleton';
import { ErrorState } from '@/components/explorer/ErrorState';
import { useCities } from '@/lib/api/hooks/use-cities';
import { usePlaces } from '@/lib/api/hooks/use-places';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useSearchPlaces } from '@/lib/api/hooks/use-search';
import type { ActiveFilters } from '@/components/explorer/FilterPanel';

export default function CityExplorerPage() {
  const params = useParams();
  const citySlug = params.citySlug as string;

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>({});

  const { data: cities } = useCities();
  const { data: categories } = useCategories();
  const { data: placesData, isLoading, isError, refetch } = usePlaces({
    cityId: cities?.find((c) => c.slug === citySlug)?.id,
    categoryId: activeCategory || undefined,
  });
  const { data: searchData } = useSearchPlaces({ q: search || undefined });

  const currentCity = cities?.find((c) => c.slug === citySlug);
  const displayedPlaces = search ? searchData?.items : placesData?.items;

  const handleCityChange = (slug: string) => {
    window.location.href = `/explorer/${slug}`;
  };

  return (
    <div className="min-h-screen bg-[#FCFAF7]">
      <ExplorerHeader
        cities={cities || []}
        currentCitySlug={citySlug}
        onCityChange={handleCityChange}
      />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* City header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{currentCity?.name}</h1>
          {placesData && (
            <p className="text-sm text-muted-foreground mt-1">
              {placesData.items.length} places found
            </p>
          )}
        </div>

        {/* Search + Filter bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
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

        {/* Category pills */}
        {categories && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
            <CategoryPill
              label="All"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                label={cat.nameAr || cat.nameEn || cat.slug}
                icon={cat.icon || undefined}
                active={activeCategory === cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              />
            ))}
          </div>
        )}

        {/* Place cards */}
        {isLoading ? (
          <LoadingSkeleton count={6} />
        ) : isError ? (
          <ErrorState message="Failed to load places" onRetry={() => refetch()} />
        ) : displayedPlaces && displayedPlaces.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {displayedPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                title={place.name}
                area={place.address || ''}
                rating={place.rating > 0 ? place.rating.toString() : undefined}
                image={undefined}
                citySlug={citySlug}
                placeSlug={place.slug}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              {search ? `No results for "${search}"` : 'No places found in this city'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
