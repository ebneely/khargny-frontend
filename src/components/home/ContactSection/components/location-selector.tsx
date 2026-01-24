"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { FilterOptions } from "@/types";
import { clientApi } from "@/lib/api-client";

interface LocationSelectorProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  forceOpen?: boolean;
  onClearAll?: () => void; // New prop to handle complete reset
}

export const LocationSelector = React.forwardRef<
  { openDropdown: () => void },
  LocationSelectorProps
>(
  (
    { selectedLocation, onLocationChange, forceOpen = false, onClearAll },
    ref,
  ) => {
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] =
      React.useState(false);
    const locationDropdownRef = React.useRef<HTMLDivElement>(null);

    // Expose method to open dropdown
    React.useImperativeHandle(ref, () => ({
      openDropdown: () => setIsLocationDropdownOpen(true),
    }));

    // Handle force open prop
    React.useEffect(() => {
      if (forceOpen) {
        setIsLocationDropdownOpen(true);
      }
    }, [forceOpen]);

    // Handle click outside the dropdown
    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        if (
          isLocationDropdownOpen &&
          locationDropdownRef.current &&
          e.target instanceof Node &&
          !locationDropdownRef.current.contains(e.target)
        ) {
          setIsLocationDropdownOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, {
        passive: true,
      });

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }, [isLocationDropdownOpen]);

    // Fetch locations
    const { 
      data: locations = [], 
      isLoading: locationsLoading, 
      error: locationsError 
    } = useQuery<string[]>({
      queryKey: ["CITY_NAMES"],
      queryFn: async (): Promise<string[]> => {
        return await clientApi.places.getCityNamesSimple();
      },
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    });

    const handleLocationSelect = (loc: string) => {
      onLocationChange(loc);
      setIsLocationDropdownOpen(false);
    };

    return (
      <div className="mx-auto w-full max-w-md">
        <div className="relative" ref={locationDropdownRef}>
          <div
            className="flex cursor-pointer items-center justify-between rounded-lg border border-input bg-background px-2 sm:px-3 py-2 transition-colors hover:bg-accent h-[44px]"
            onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Icon icon="lucide:map-pin" className="h-4 w-4 text-primary flex-shrink-0" />
              <span
                className={`text-sm truncate ${!selectedLocation ? "text-muted-foreground" : ""}`}
              >
                {selectedLocation || "Select location"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedLocation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Call onClearAll to reset filters and clear location
                    if (onClearAll) {
                      onClearAll();
                    } else {
                      onLocationChange("");
                    }
                  }}
                  className="rounded-full p-1 hover:bg-accent min-w-[32px] min-h-[32px] flex items-center justify-center"
                  aria-label="Clear location"
                >
                  <Icon icon="lucide:x" className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              <Icon
                icon="lucide:chevron-down"
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                  isLocationDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>

          <AnimatePresence>
            {isLocationDropdownOpen && (
              <motion.div
                className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {locationsLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                    </div>
                  ) : locationsError ? (
                    <div className="flex flex-col items-center justify-center py-4 px-2">
                      <p className="text-sm text-destructive mb-2">
                        {locationsError instanceof Error ? locationsError.message : 'Failed to load locations'}
                      </p>
                    </div>
                  ) : locations.length === 0 ? (
                    <div className="flex justify-center py-4">
                      <p className="text-sm text-muted-foreground">No locations available</p>
                    </div>
                  ) : (
                    locations.map((loc) => (
                      <div
                        key={loc}
                        className={`flex cursor-pointer items-center justify-between px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground ${
                          selectedLocation === loc
                            ? "bg-accent text-accent-foreground"
                            : ""
                        }`}
                        onClick={() => handleLocationSelect(loc)}
                      >
                        <span>{loc}</span>
                        {selectedLocation === loc && (
                          <Icon
                            icon="lucide:check"
                            className="h-4 w-4"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  },
);

// Add display name for React DevTools
LocationSelector.displayName = "LocationSelector";