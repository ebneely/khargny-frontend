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

  // Keep location in component state separate from filters
  const [selectedLocation, setSelectedLocation] = React.useState<string>("");

  // Fetch dynamic categories for the selected location (like Expo app)
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
  } = useDynamicCategories(selectedLocation || null);

  // Fetch all outings from the backend - based on selectedLocation instead of filters.location
  const {
    data: tablefilter = [],
    isLoading: tableloading,
    error: placesError,
  } = useQuery<Outing[]>({
    queryKey: [
      "tablefilter",
      selectedLocation || "no-location", // Use selectedLocation, or "no-location" to prevent empty string issues
    ],
    queryFn: async (): Promise<Outing[]> => {
      if (!selectedLocation) {
        return [];
      }
      
      try {
        // Ensure we're only fetching places for the selected city
        if (!selectedLocation || selectedLocation.trim() === '') {
          console.warn('[Explorer] No location selected, returning empty array');
          return [];
        }

        console.log(`[Explorer] Fetching places for location: "${selectedLocation}"`);
        const places = await clientApi.places.search({
          locationFilter: selectedLocation.trim(),
          onlyWithPlaceId: true, // Only fetch places with placeIds
        });

        console.log(`[Explorer] Fetched ${places?.length || 0} places for location: "${selectedLocation}"`, places);

        // Transform Place[] to Outing[]
        // Store backend photos - they will be used as fallback thumbnails after Google Place Details enrichment
        return (places || []).map((place): Outing => ({
          title: place.name || '',
          image: place.photos?.[0]?.url || '', // Backend photo for thumbnail (will be used after enrichment)
          images: place.photos?.map(p => p.url).filter((url): url is string => Boolean(url)) || [], // Backend photos array
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

  // Extract placeIds from backend data - only places with placeId
  const placeIds = React.useMemo(() => {
    if (!tablefilter || tablefilter.length === 0) {
      return [];
    }
    return tablefilter
      .map((place) => place.placeId)
      .filter((id): id is string => Boolean(id && id.trim() !== ''));
  }, [tablefilter]);

  // Bulk fetch Google Place Details for all placeIds when location is selected
  const { data: placeDetailsMap, isLoading: isLoadingPlaceDetails } = useQuery({
    queryKey: ["PLACE_DETAILS_BULK", placeIds],
    queryFn: async () => {
      if (!placeIds || placeIds.length === 0) {
        return {};
      }
      
      // Fetch all place details in parallel (without photos for performance)
      const detailsPromises = placeIds.map(async (placeId) => {
        try {
          const details = await clientApi.places.getDetailsWithoutPhotos(placeId);
          return { placeId, details };
        } catch (error) {
          console.error(`Error fetching details for ${placeId}:`, error);
          return { placeId, details: null };
        }
      });
      
      const results = await Promise.all(detailsPromises);
      
      // Create a map: placeId -> placeDetails
      const map: Record<string, any> = {};
      results.forEach(({ placeId, details }) => {
        if (details) {
          map[placeId] = details;
        }
      });
      
      return map;
    },
    enabled: placeIds.length > 0 && !tableloading,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch thumbnails (single photo) for each placeId when location is selected
  const { data: thumbnailsMap, isLoading: isLoadingThumbnails } = useQuery({
    queryKey: ["PLACE_THUMBNAILS_BULK", placeIds],
    queryFn: async () => {
      if (!placeIds || placeIds.length === 0) {
        return {};
      }
      
      // Fetch thumbnails in parallel for all placeIds
      const thumbnailPromises = placeIds.map(async (placeId) => {
        try {
          const thumbnail = await clientApi.places.getThumbnail(placeId);
          return { placeId, thumbnail };
        } catch (error) {
          console.error(`Error fetching thumbnail for ${placeId}:`, error);
          return { placeId, thumbnail: null };
        }
      });
      
      const results = await Promise.all(thumbnailPromises);
      
      // Create a map: placeId -> thumbnail URL
      const map: Record<string, string> = {};
      results.forEach(({ placeId, thumbnail }) => {
        if (thumbnail) {
          map[placeId] = thumbnail;
        }
      });
      
      return map;
    },
    enabled: placeIds.length > 0 && !tableloading && !isLoadingPlaceDetails,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Enriched outingsData - merge backend data with Google Place Details and thumbnails
  const enrichedOutingsData = React.useMemo(() => {
    if (!selectedLocation || tableloading) {
      return [];
    }
    
    // Only process places with placeId
    const placesWithPlaceId = (tablefilter || []).filter(
      (place) => place.placeId && place.placeId.trim() !== ''
    );
    
    if (!placeDetailsMap || Object.keys(placeDetailsMap).length === 0) {
      // If place details not yet loaded, return empty array (show loading)
      return [];
    }
    
    // Type guard: placeDetailsMap is guaranteed to be defined here
    const detailsMap = placeDetailsMap as Record<string, any>;
    const thumbnails = (thumbnailsMap || {}) as Record<string, string>;
    
    // Merge backend data with enriched place details
    return placesWithPlaceId.map((backendPlace) => {
      const placeId = backendPlace.placeId;
      if (!placeId) {
        return backendPlace;
      }
      
      const placeDetails = detailsMap[placeId];
      
      if (placeDetails) {
        // Map Google Place Details to Outing format
        const enriched = mapPlaceDetailsToOuting(placeDetails);
        
        // Store backend photos before merging (since enriched won't have photos - we're not fetching them in bulk)
        const backendImage = backendPlace.image || '';
        const backendImages = backendPlace.images || [];
        
        // Get thumbnail from Google API (fetched separately)
        const googleThumbnail = thumbnails[placeId] || null;
        
        // Merge backend data with enriched data, prioritizing enriched data
        const mergedOuting = {
          ...backendPlace,
          ...enriched,
          placeId: placeDetails.place_id || placeDetails.placeId || placeId,
        };
        
        // Prioritize thumbnail sources: Google thumbnail > backend photo > enriched fallback
        if (googleThumbnail) {
          mergedOuting.image = googleThumbnail;
        } else if (backendImage && backendImage.trim() !== '') {
          mergedOuting.image = backendImage;
        } else {
          // Use enriched image as last resort (might be fallback)
          const fallbackImageUrl = "https://img.heroui.chat/image/places?w=800&h=600&u=restaurant-default";
          if (enriched.image && enriched.image !== fallbackImageUrl) {
            mergedOuting.image = enriched.image;
          }
        }
        
        // Keep backend images array if available
        if (backendImages.length > 0) {
          mergedOuting.images = backendImages;
        }
        
        return mergedOuting;
      }
      
      // If place details failed to load, still return backend data with images
      // Try to use Google thumbnail if available
      const googleThumbnail = thumbnails[placeId] || null;
      if (googleThumbnail) {
        return {
          ...backendPlace,
          image: googleThumbnail,
        };
      }
      
      return backendPlace;
    });
  }, [tablefilter, tableloading, selectedLocation, placeDetailsMap, thumbnailsMap]);

  // Combined loading state
  const isLoading = tableloading || isLoadingPlaceDetails || isLoadingThumbnails;

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
