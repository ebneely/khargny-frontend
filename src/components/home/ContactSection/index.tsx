/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React from "react";
import { useModal } from "@/hooks/use-modal";
import { useQuery } from "@tanstack/react-query";
import { useGlobalStore } from "@/store/useGlobalStore";

// Custom hooks
import { useFilters } from "./hooks/use-filters";
import { useViewMode } from "./hooks/use-view-mode";

// Components
import { Header } from "./components/header";
import { OutingCard } from "./components/outing-card";
import { OutingCardList } from "./components/outing-card-list";
import { EmptyMapView } from "./components/empty-map-view";
import { OutingDetailModal } from "./components/outing-detail-modal";
import { FilterModal } from "./components/filter-modal";
import { ViewModeModal } from "./components/view-mode-modal";
import { LocationSelector } from "./components/location-selector";
import { mapPlaceDetailsToOuting } from "./utils/place-mapper";
import Navbar from "@/components/ui/Navbar";

// Types
import type { Outing } from "@/types";
import RevealCards from "./components/reveal-cards";
import { clientApi } from "@/lib/api-client";

export default function ContactSection() {
  // Global store for navbar
  const { isActive, setisActive } = useGlobalStore();
  
  // View mode (list or map)
  const { viewMode, setViewMode } = useViewMode();
  
  // Card layout mode (grid or list) - mobile only
  const [cardLayout, setCardLayout] = React.useState<"grid" | "list">("grid");

  const [outingsData, setOutingsData] = React.useState<Outing[]>([]);

  // Keep location in component state separate from filters
  const [selectedLocation, setSelectedLocation] = React.useState<string>("");

  // Filters and filtering logic - now using outingsData
  const {
    filters,
    setFilters,
    filteredAreas,
    filteredOutings,
    activeFiltersCount,
    resetTrigger,
    handleReset,
    handleCategoryChange,
    defaultFilters, // Make sure this is destructured from the hook
  } = useFilters(outingsData);

  // Add a local reset trigger state for our own resets
  const [localResetTrigger, setLocalResetTrigger] = React.useState(0);

  // Handle location selection separately from filters
  const handleLocationChange = (location: string) => {
    // Clear outingsData immediately when location changes
    setOutingsData([]);
    setSelectedLocation(location);

    // Update location in filters too (for compatibility with existing code)
    setFilters((prev) => ({
      ...prev,
      location,
    }));
  };

  // Clear all filters and location
  const handleClearAll = () => {
    setSelectedLocation("");
    setOutingsData([]);
    setFilters({ ...defaultFilters }); // Now defaultFilters is properly defined
    setLocalResetTrigger((prev) => prev + 1); // Use our local reset trigger instead of setResetTrigger
  };

  // Fetch all outings from the backend - based on selectedLocation instead of filters.location
  const {
    data: tablefilter = [],
    isLoading: tableloading,
    refetch: refetchplaces,
    error: placesError,
  } = useQuery<Outing[]>({
    queryKey: [
      "tablefilter",
      {
        locationFilter: selectedLocation || "", // Use selectedLocation instead
      },
    ],
    queryFn: async (): Promise<Outing[]> => {
      try {
        const places = await clientApi.places.search({
          locationFilter: selectedLocation || "",
        });

        // Transform Place[] to Outing[]
        return (places || []).map((place): Outing => ({
          title: place.name || '',
          image: place.photos?.[0]?.url || '',
          images: place.photos?.map(p => p.url).filter((url): url is string => Boolean(url)) || [],
          rating: place.rating || 0,
          reviewCount: 0, // Place doesn't have reviewCount
          user_ratings_total: place.rating ? Math.floor(place.rating * 10) : 0,
          price: place.price || '$',
          price_level: place.price ? place.price.length : 1,
          area: place.area || place.city || '',
          location: place.address || '',
          category: place.age || 'Restaurant', // Use age as category fallback
          open_now: true, // Assume open
          placeId: place.placeId || '',
          description: place.description || '',
        }));
      } catch (error) {
        console.error("Error fetching places:", error);
        return [];
      }
    },
    enabled: Boolean(selectedLocation), // Use selectedLocation instead
    refetchOnWindowFocus: false,
    staleTime: 0, // Don't use cached data
    gcTime: 0, // Clear from cache immediately
  });

  // Extract placeIds from database results
  const placeIds = React.useMemo(() => {
    if (!tablefilter || !Array.isArray(tablefilter) || tablefilter.length === 0) {
      return [];
    }

    const ids = tablefilter
      .map((o: Outing) => o.placeId)
      .filter((id: string | undefined): id is string => !!id && typeof id === 'string');

    return ids;
  }, [tablefilter]);

  // Clear outingsData when placeIds change or become empty
  React.useEffect(() => {
    if (!tableloading && placeIds.length === 0 && outingsData.length > 0) {
      setOutingsData([]);
    }
  }, [placeIds, tableloading, outingsData.length]);

  const { data: rawPlaceDetails = [], isLoading: detailsLoading } = useQuery({
    queryKey: ["PLACE_DETAILS", placeIds, selectedLocation],
    queryFn: async () => {
      if (placeIds.length === 0) {
        return [];
      }
      const results = await Promise.all(
        placeIds.map(async (id: string) => {
          try {
            const details = await clientApi.places.getDetails(id);
            return details;
          } catch (error) {
            console.error(`Error fetching details for ${id}:`, error);
            return null;
          }
        })
      );
      return results.filter((r: any): r is NonNullable<typeof r> => r !== null);
    },
    enabled: !tableloading && placeIds.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 0, // Don't use cached data
    gcTime: 0, // Clear from cache immediately
  });

  // Process place details and update outingsData state
  React.useEffect(() => {
    if (!rawPlaceDetails || rawPlaceDetails.length === 0) {
      // Only clear if there's data to clear
      if (outingsData.length > 0) {
        setOutingsData([]);
      }
      return;
    }
    
    const mappedDetails = rawPlaceDetails.map((placeDetail: any) => {
      // getDetails() returns Google data directly, not wrapped in result
      // Also add placeId from the original data if not in Google response
      const googleData = placeDetail || {};
      const mapped = mapPlaceDetailsToOuting(googleData);

      // Add the selected location to ensure proper filtering
      return {
        ...mapped,
        location: selectedLocation || mapped.location,
        placeId: googleData.place_id || googleData.placeId || mapped.placeId,
      };
    });

    // Only update if the data has actually changed (compare stringified versions)
    const currentData = JSON.stringify(outingsData);
    const newData = JSON.stringify(mappedDetails);
    if (currentData !== newData) {
      setOutingsData(mappedDetails);
    }
  }, [rawPlaceDetails, selectedLocation, outingsData]);


  // Modal states
  const [selectedOuting, setSelectedOuting] = React.useState<Outing | null>(
    null,
  );
  const detailModal = useModal();
  const filterModal = useModal();
  const viewModeModal = useModal();

  // Location dropdown state control
  const [forceLocationDropdown, setForceLocationDropdown] =
    React.useState(false);

  // Create ref to pass to LocationSelector
  const locationSelectorRef = React.useRef<{
    openDropdown: () => void;
  } | null>(null);

  // Handler to open location dropdown
  const handleOpenLocationDropdown = () => {
    if (locationSelectorRef.current) {
      locationSelectorRef.current.openDropdown();
    } else {
      // Fallback method
      setForceLocationDropdown(true);
    }
  };

  // Reset force open state after it's been used
  React.useEffect(() => {
    if (forceLocationDropdown) {
      const timer = setTimeout(() => {
        setForceLocationDropdown(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [forceLocationDropdown]);

  // Handle card click
  const handleCardClick = (outing: Outing) => {
    setSelectedOuting(outing);
    detailModal.onOpen();
  };

  // Handle detail modal close
  const handleDetailModalClose = () => {
    detailModal.onClose();
    setSelectedOuting(null);
  };

  return (
    <div className="flex h-dvh flex-col">
      {/* Header with view toggles and filter button */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        cardLayout={cardLayout}
        setCardLayout={setCardLayout}
        onOpenFilterModal={filterModal.onOpen}
        onOpenViewModeModal={viewModeModal.onOpen}
        onOpenNavbar={() => {
          console.log('Navbar button clicked');
          setisActive(true);
        }}
        activeFiltersCount={activeFiltersCount}
        resetTrigger={resetTrigger ? 1 : 0}
        handleReset={handleReset}
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        onClearAll={handleClearAll}
        locationSelectorRef={locationSelectorRef}
        forceOpen={forceLocationDropdown}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4 sm:pb-6 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="mx-auto max-w-[1600px] p-3 sm:p-6">
          {viewMode === "list" ? (
            <>
              {/* Only show RevealCards when no location is selected */}
              {!selectedLocation && (
                <div className="flex min-h-0 items-center justify-center py-4">
                  <RevealCards
                    onOpenLocationSelect={handleOpenLocationDropdown}
                  />
                </div>
              )}

              {/* Only show these elements when a location is selected */}
              {selectedLocation && (
                <>
                  {/* Loading state - show when either query is loading */}
                  {(tableloading || detailsLoading) && (
                    <div className="flex items-center justify-center p-6">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      <span className="ml-3 text-lg">Loading…</span>
                    </div>
                  )}

                  {/* Error state */}
                  {placesError && (
                    <div className="p-6 text-center text-danger">
                      <p>Error loading places. Please try again.</p>
                      <pre className="mt-2 text-xs">{String(placesError)}</pre>
                    </div>
                  )}

                  {/* Display all outings when no filters are applied apart from location */}
                  {!tableloading &&
                    !detailsLoading &&
                    activeFiltersCount === 0 &&
                    outingsData.length > 0 && (
                      <div className={cardLayout === "grid" 
                        ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" 
                        : "flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-3"
                      }>
                        {outingsData.map((outing, index) => (
                          cardLayout === "grid" ? (
                            <OutingCard
                              key={index}
                              outing={outing}
                              onClick={() => handleCardClick(outing)}
                            />
                          ) : (
                            <OutingCardList
                              key={index}
                              outing={outing}
                              onClick={() => handleCardClick(outing)}
                            />
                          )
                        ))}
                      </div>
                    )}

                  {/* Display filtered outings when filters are applied */}
                  {!tableloading &&
                    !detailsLoading &&
                    activeFiltersCount > 0 &&
                    filteredOutings.length > 0 && (
                      <div className={cardLayout === "grid" 
                        ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" 
                        : "flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-3"
                      }>
                        {filteredOutings.map((outing, index) => (
                          cardLayout === "grid" ? (
                            <OutingCard
                              key={index}
                              outing={outing}
                              onClick={() => handleCardClick(outing)}
                            />
                          ) : (
                            <OutingCardList
                              key={index}
                              outing={outing}
                              onClick={() => handleCardClick(outing)}
                            />
                          )
                        ))}
                      </div>
                    )}

                  {/* No results state - only show when not loading and location is selected */}
                  {!tableloading &&
                    !detailsLoading &&
                    outingsData.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-10 text-center">
                        <div className="mb-4 text-5xl">🔍</div>
                        <h3 className="mb-2 text-xl font-semibold">
                          No results found
                        </h3>
                        <p className="mb-4 text-default-500">
                          Try selecting a different location
                        </p>
                      </div>
                    )}
                </>
              )}
            </>
          ) : (
            <EmptyMapView />
          )}
        </div>
      </div>

      {/* Detail modal */}
      <OutingDetailModal
        isOpen={detailModal.isOpen}
        onOpenChange={detailModal.onOpenChange}
        onClose={handleDetailModalClose}
        selectedOuting={selectedOuting}
      />

      {/* Filter modal (now without location filter) */}
      <FilterModal
        isOpen={filterModal.isOpen}
        onOpenChange={filterModal.onOpenChange}
        onClose={filterModal.onClose}
        filters={filters}
        setFilters={setFilters}
        handleCategoryChange={handleCategoryChange}
        handleReset={handleReset}
        filteredAreas={filteredAreas}
      />

      {/* View & Mode modal */}
      <ViewModeModal
        isOpen={viewModeModal.isOpen}
        onOpenChange={viewModeModal.onOpenChange}
        viewMode={viewMode}
        setViewMode={setViewMode}
        cardLayout={cardLayout}
        setCardLayout={setCardLayout}
      />

      {/* Navbar Sheet */}
      <Navbar />
    </div>
  );
}
