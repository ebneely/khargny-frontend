/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import type { FilterOptions, Outing } from "@/types";

export const useFilters = (outings: Outing[] = []) => {
  // Default filter state
  const defaultFilters: FilterOptions = {
    location: "",
    area: "",
    category: [],
    priceRange: [0, 5],
    rating: 0,
    openNow: false,
  };

  const [filters, setFilters] = React.useState<FilterOptions>(defaultFilters);
  const [resetTrigger, setResetTrigger] = React.useState(0);

  // Extract unique locations from outings
  const availableLocations = React.useMemo(() => {
    if (!outings?.length) return [];

    // Extract all locations from outings
    const locations = outings.map((outing) => outing.location).filter(Boolean);

    // Return unique locations
    return [...new Set(locations)].sort();
  }, [outings]);

  // Extract unique areas from outings based on selected location
  const filteredAreas = React.useMemo(() => {
    if (!outings?.length || !filters.location) return [];

    // Get unique areas for the selected location
    const areas = outings
      .filter((outing) => outing.location === filters.location)
      .map((outing) => outing.area)
      .filter(Boolean);

    return [...new Set(areas)].sort();
  }, [outings, filters.location]);

  // Count active filters - exclude location from count as it's now a separate concept
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;

    // Exclude location from filter count - it's not part of the filter modal anymore
    // if (filters.location) count++;
    if (filters.area) count++;
    if (filters.category.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 5) count++;
    if (filters.rating > 0) count++;
    if (filters.openNow) count++;

    return count;
  }, [filters]);

  // Reset filters to default but preserve location
  const handleReset = React.useCallback(() => {
    // Keep the current location when resetting filters
    const currentLocation = filters.location;
    setFilters({
      ...defaultFilters,
      location: currentLocation, // Preserve location when resetting other filters
    });
    setResetTrigger((prev) => prev + 1);
  }, [filters.location]);

  // Category selection handler
  const handleCategoryChange = React.useCallback((category: string) => {
    setFilters((prev) => {
      // Toggle category in the array
      const updatedCategories = prev.category.includes(category)
        ? prev.category.filter((c) => c !== category)
        : [...prev.category, category];

      return {
        ...prev,
        category: updatedCategories,
      };
    });
  }, []);

  // Apply filters to outings
  const filteredOutings = React.useMemo(() => {
    if (!outings?.length) return [];

    return outings.filter((outing) => {
      // Skip location filter - we handle this separately now
      // if (filters.location && outing.location !== filters.location) {
      //   return false;
      // }

      // Area filter (usually a district or neighborhood)
      if (filters.area && outing.area !== filters.area) {
        return false;
      }

      // Category filter - check if any selected category matches any of the outing's types
      if (filters.category.length > 0) {
        // If outing has types array, check if any match
        if (outing.types && outing.types.length > 0) {
          const outingCategories = outing.types.map((type) =>
            type.name.toLowerCase(),
          );

          // Also check the main category
          if (outing.category) {
            outingCategories.push(outing.category.toLowerCase());
          }

          // Check if any of the selected categories match
          const hasMatchingCategory = filters.category.some((category) =>
            outingCategories.some((outingCategory) =>
              outingCategory.includes(category.toLowerCase()),
            ),
          );

          if (!hasMatchingCategory) return false;
        }
        // If no types array, fall back to just the main category
        else if (
          outing.category &&
          !filters.category.some((cat) =>
            outing.category.toLowerCase().includes(cat.toLowerCase()),
          )
        ) {
          return false;
        }
      }

      // Price range filter
      const priceLevel =
        outing.price_level !== undefined
          ? outing.price_level
          : typeof outing.price === "string" && !isNaN(Number(outing.price))
            ? Math.floor(Number(outing.price) / 100)
            : 2; // Convert price to level if needed

      if (
        (filters.priceRange[0] > 0 && priceLevel < filters.priceRange[0]) ||
        priceLevel > filters.priceRange[1]
      ) {
        return false;
      }

      // Rating filter
      if (filters.rating > 0 && outing.rating < filters.rating) {
        return false;
      }

      // Open now filter
      if (filters.openNow && !outing.open_now) {
        return false;
      }

      return true;
    });
  }, [outings, filters]);


  // Return all the values and functions needed
  return {
    filters,
    setFilters,
    filteredAreas,
    availableLocations,
    filteredOutings,
    activeFiltersCount,
    resetTrigger,
    handleReset,
    handleCategoryChange,
    defaultFilters,
  };
};

export default useFilters;
