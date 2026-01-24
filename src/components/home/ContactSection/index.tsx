"use client";
import React from "react";
import { useModal } from "@/hooks/use-modal";
import { useQuery } from "@tanstack/react-query";
import { useGlobalStore } from "@/store/useGlobalStore";

// Custom hooks
import { useViewMode } from "./hooks/use-view-mode";

// Components
import { Header } from "./components/header";
import { OutingCard } from "./components/outing-card";
import { OutingCardList } from "./components/outing-card-list";
import { EmptyMapView } from "./components/empty-map-view";
import { OutingDetailModal } from "./components/outing-detail-modal";
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



  // Fetch all outings from the backend - based on selectedLocation
  const {
    data: outingsData = [],
    isLoading,
    error: placesError,
  } = useQuery<Outing[]>({
    queryKey: ["outings", selectedLocation || "no-location"],
    queryFn: async (): Promise<Outing[]> => {
      if (!selectedLocation || selectedLocation.trim() === '') {
        return [];
      }
      
      try {
        const places = await clientApi.places.getPlaceDetailsSimple(selectedLocation.trim());

        // Transform simplified Google results to Outing[]
        return (places || []).map((place: any): Outing => {
            const photos = place.photos || [];
            const primaryImage = photos[0]?.photo_url || 
                               "https://img.heroui.chat/image/places?w=800&h=600&u=restaurant-default";

            return {
                title: place.name || '',
                image: primaryImage,
                images: photos.map((p: any) => p.photo_url).filter(Boolean),
                rating: place.rating || 0,
                user_ratings_total: place.user_ratings_total || 0,
                reviewCount: place.user_ratings_total || 0,
                price: place.price_level ? "$".repeat(place.price_level) : "$",
                price_level: place.price_level || 1,
                area: selectedLocation,
                location: place.formatted_address || '',
                category: place.types?.[0] || 'Place',
                description: place.editorial_summary?.overview || '',
                open_now: place.opening_hours?.open_now ?? false,
                placeId: place.place_id || '',
                vicinity: place.vicinity || '',
                address: place.formatted_address || '',
                website: place.website || '',
                url: place.url || '',
                formatted_phone_number: place.formatted_phone_number || '',
                international_phone_number: place.international_phone_number || '',
                weekday_text: place.opening_hours?.weekday_text || [],
                reviews: (place.reviews || []).map((r: any) => ({
                    author: r.author_name,
                    rating: r.rating,
                    text: r.text,
                    time: r.relative_time_description,
                    profilePhoto: r.profile_photo_url
                })),
                geometry: place.geometry, // Keep for map if needed
            } as any;
        });
      } catch (error) {
        console.error("Error fetching simplified places:", error);
        return [];
      }
    },
    enabled: Boolean(selectedLocation),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Handle location selection
  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
  };

  // Clear location
  const handleClearAll = () => {
    setSelectedLocation("");
  };


  // Modal states
  const [selectedOuting, setSelectedOuting] = React.useState<Outing | null>(
    null,
  );
  const detailModal = useModal();
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
        onOpenViewModeModal={viewModeModal.onOpen}
        onOpenNavbar={() => {
          console.log('Navbar button clicked');
          setisActive(true);
        }}
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


                  {/* Display all outings directly from backend */}
                  {!isLoading &&
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

                  {/* No results state - only show when not loading and location is selected */}
                  {!isLoading &&
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
