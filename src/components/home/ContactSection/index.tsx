"use client";
import React from "react";
import { useModal } from "@/hooks/use-modal";
import { useQuery } from "@tanstack/react-query";
import { useGlobalStore } from "@/store/useGlobalStore";

// Custom hooks
import { useFilters } from "./hooks/use-filters";
import { useViewMode } from "./hooks/use-view-mode";
import { useDynamicCategories } from "@/hooks/useDynamicCategories";

// Components
import { Header } from "./components/header";
import { OutingCard } from "./components/outing-card";
import { OutingCardList } from "./components/outing-card-list";
import { EmptyMapView } from "./components/empty-map-view";
import { OutingDetailModal } from "./components/outing-detail-modal";
import { FilterModal } from "./components/filter-modal";
import { ViewModeModal } from "./components/view-mode-modal";
import { LocationSelector } from "./components/location-selector";
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

  // Keep location in component state separate from filters
  const [selectedLocation, setSelectedLocation] = React.useState<string>("");

  // Fetch dynamic categories for the selected location (like Expo app)
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
  } = useDynamicCategories(selectedLocation || null);

  // Fetch all outings from the backend - based on selectedLocation
  const {
    data: outingsData = [],
    isLoading,
    error: placesError,
  } = useQuery<Outing[]>({
    queryKey: [
      "outings",
      selectedLocation || "no-location",
    ],
    queryFn: async (): Promise<Outing[]> => {
      if (!selectedLocation || selectedLocation.trim() === '') {
        return [];
      }
      
      try {
        console.log(`[Explorer] Fetching places for city: "${selectedLocation}"`);
        // Single request fetch (Phase 4 optimization)
        const places = await clientApi.places.getByCity(selectedLocation.trim());

        console.log(`[Explorer] Fetched ${places?.length || 0} places for: "${selectedLocation}"`);

        // Transform Place[] to Outing[]
        return (places || []).map((place: any): Outing => {
            const details = place.details || {};
            
            // Image priority: Google Thumbnail > Backend Photo > Fallback
            const primaryImage = details.thumbnail?.photo_url || 
                               place.photos?.[0]?.url || 
                               "https://img.heroui.chat/image/places?w=800&h=600&u=restaurant-default";

            return {
                title: place.name || '',
                image: primaryImage,
                images: place.photos?.map((p: any) => p.url).filter(Boolean) || [],
                
                // Rating priority: Google > Backend 
                rating: details.rating || place.rating || 0,
                reviewCount: place.user_ratings_total || 0,
                user_ratings_total: place.user_ratings_total || 0,
                
                price: place.price || '$',
                price_level: place.price ? place.price.length : 1,
                area: place.area || place.city || '',
                location: place.address || '',
                category: place.age || 'Restaurant', 
                
                // Open status from details (calculated server-side)
                open_now: details.isOpen ?? false, 
                
                placeId: place.placeId || '',
                description: place.description || '',
                
                // Fields required by Outing interface but not present in summary
                types: [],
                googleTypes: [],
                vicinity: place.address || '',
                address: place.address || '',
                mapLink: '',
                periods: [],
                weekday_text: [],
                reviews: [],
            };
        });
      } catch (error) {
        console.error("Error fetching places:", error);
        return [];
      }
    },
    enabled: Boolean(selectedLocation),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache on client for 5 mins
  });

  // Derived state for filters
  const enrichedOutingsData = outingsData;

  // Filters and filtering logic - now using enrichedOutingsData
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
  } = useFilters(enrichedOutingsData);

  // Handle location selection separately from filters
  const handleLocationChange = (location: string) => {
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
    setFilters({ ...defaultFilters });
  };


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

  // Fetch photos only when a card modal is opened
  const { data: placePhotos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["PLACE_PHOTOS", selectedOuting?.placeId],
    queryFn: async () => {
      if (!selectedOuting?.placeId) {
        return [];
      }
      try {
        const photos = await clientApi.places.getPhotos(selectedOuting.placeId);
        return photos;
      } catch (error) {
        console.error(`Error fetching photos for ${selectedOuting.placeId}:`, error);
        return [];
      }
    },
    enabled: detailModal.isOpen && Boolean(selectedOuting?.placeId),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Merge photos into selectedOuting when available
  const enrichedOutingWithPhotos = React.useMemo(() => {
    if (!selectedOuting) return null;
    
    if (placePhotos && placePhotos.length > 0) {
      // Map photos to images array format
      const photoUrls = placePhotos
        .map((photo: any) => photo.photo_url)
        .filter((url): url is string => Boolean(url));
      
      return {
        ...selectedOuting,
        images: photoUrls,
        image: photoUrls[0] || selectedOuting.image, // Update primary image
      };
    }
    
    return selectedOuting;
  }, [selectedOuting, placePhotos]);

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
                  {/* Loading state - show when query is loading or place details are loading */}
                  {isLoading && (
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
                  {!isLoading &&
                    activeFiltersCount === 0 &&
                    enrichedOutingsData.length > 0 && (
                      <div className={cardLayout === "grid" 
                        ? "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4" 
                        : "flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-3"
                      }>
                        {enrichedOutingsData.map((outing, index) => (
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
                  {!isLoading &&
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
                  {!isLoading &&
                    enrichedOutingsData.length === 0 && (
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
        selectedOuting={enrichedOutingWithPhotos}
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
        categories={categoriesData?.categories || []}
        categoriesLoading={categoriesLoading}
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
