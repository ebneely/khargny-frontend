/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

import { FilterOptions } from "@/types";
import type { DynamicCategory } from "@/hooks/useDynamicCategories";

interface FilterModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  handleCategoryChange: (category: string) => void;
  handleReset: () => void;
  filteredAreas: string[];
  categories: DynamicCategory[];
  categoriesLoading?: boolean;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onOpenChange,
  onClose,
  filters,
  setFilters,
  handleCategoryChange,
  handleReset,
  filteredAreas,
  categories,
  categoriesLoading = false,
}) => {
  const modalContentRef = React.useRef<HTMLDivElement>(null);

  // Create a single function to close the modal to ensure consistency
  const closeFilterModal = () => {
    onOpenChange(false);
    onClose?.();
  };

  const handleApplyFilters = () => {
    closeFilterModal();
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] sm:h-auto sm:max-h-[95vh] w-full p-0">
        <div className="flex flex-col max-h-[85vh] sm:h-auto sm:max-h-[95vh]">
          <SheetHeader className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3">
            <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Icon icon="lucide:filter" className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Filters</span>
            </SheetTitle>
          </SheetHeader>

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-6 pb-3 sm:pb-4 scrollbar-hide"
            ref={modalContentRef}
          >
            <div className="flex flex-col gap-2 sm:gap-4 w-full sm:max-w-4xl mx-auto">
            {/* Category Filter */}
            <Card>
              <CardContent className="p-2 sm:p-4">
                <h3 className="mb-1.5 sm:mb-3 text-xs sm:text-base font-semibold">Categories</h3>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-xs sm:text-sm text-muted-foreground">Loading categories...</div>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="text-xs sm:text-sm text-muted-foreground">No categories available. Please select a location first.</div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1 sm:gap-3">
                    {[...categories]
                      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                      .map((category) => (
                        <Button
                          key={category.key}
                          variant={
                            filters.category.includes(category.key)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="rounded-full text-xs h-7 sm:text-sm sm:h-auto"
                          onClick={() => handleCategoryChange(category.key)}
                        >
                          <Icon icon={category.icon} className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          {category.name}
                          {category.count > 0 && (
                            <span className="ml-1 text-xs opacity-70">({category.count})</span>
                          )}
                        </Button>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price Range Filter */}
            <Card>
              <CardContent className="p-2 sm:p-4">
                <h3 className="mb-1.5 sm:mb-3 text-xs sm:text-base font-semibold">Price Range</h3>
                <div className="flex flex-col gap-1.5 sm:gap-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Label className="w-12 sm:w-20 text-xs sm:text-sm flex-shrink-0"><span className="sm:hidden">Min:</span><span className="hidden sm:inline">Minimum:</span></Label>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {[0, 1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={`min-${num}`}
                        size="sm"
                        variant={
                          filters.priceRange[0] === num ? "default" : "outline"
                        }
                        className="text-xs h-7 sm:text-sm sm:h-auto sm:px-auto"
                        onClick={() => {
                          const newMin = Math.min(num, filters.priceRange[1]);
                          setFilters({
                            ...filters,
                            priceRange: [newMin, filters.priceRange[1]],
                          });
                        }}
                      >
                        {num === 0 ? "Any" : "$".repeat(num)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <Label className="w-12 sm:w-20 text-xs sm:text-sm flex-shrink-0"><span className="sm:hidden">Max:</span><span className="hidden sm:inline">Maximum:</span></Label>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={`max-${num}`}
                        size="sm"
                        variant={
                          filters.priceRange[1] === num ? "default" : "outline"
                        }
                        className="text-xs h-7 sm:text-sm sm:h-auto sm:px-auto"
                        onClick={() => {
                          const newMax = Math.max(num, filters.priceRange[0]);
                          setFilters({
                            ...filters,
                            priceRange: [filters.priceRange[0], newMax],
                          });
                        }}
                      >
                        {"$".repeat(num)}
                      </Button>
                    ))}
                  </div>
                </div>

                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                    <span className="sm:hidden">Range: {filters.priceRange[0] === 0 ? "Any" : "$".repeat(filters.priceRange[0])} to {"$".repeat(filters.priceRange[1])}</span>
                    <span className="hidden sm:inline">Selected range: {filters.priceRange[0] === 0 ? "Any" : "$".repeat(filters.priceRange[0])} to {"$".repeat(filters.priceRange[1])}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Minimum Rating Filter */}
            <Card>
              <CardContent className="p-2 sm:p-4">
                <h3 className="mb-1.5 sm:mb-3 text-xs sm:text-base font-semibold">Minimum Rating</h3>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                {[0, 1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={`rating-${num}`}
                    size="sm"
                    variant={filters.rating === num ? "default" : "outline"}
                    className="text-xs h-7 sm:text-sm sm:h-auto"
                    onClick={() => {
                      setFilters({
                        ...filters,
                        rating: num,
                      });
                    }}
                  >
                    {num === 0 ? "Any" : `${num}★`}
                  </Button>
                ))}
              </div>
                <div className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="sm:hidden">{filters.rating === 0 ? "All ratings" : `${filters.rating}★+ only`}</span>
                  <span className="hidden sm:inline">{filters.rating === 0 ? "Showing all ratings" : `Showing ${filters.rating}★ and above`}</span>
                </div>
              </CardContent>
            </Card>

            {/* Open Now Filter */}
            <Card>
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="open-now" className="font-semibold text-xs sm:text-sm">
                    Open Now Only
                  </Label>
                  <Switch
                    id="open-now"
                    checked={filters.openNow}
                    onCheckedChange={(checked) =>
                      setFilters({
                        ...filters,
                        openNow: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 sticky bottom-0 bg-background pb-1.5 sm:pb-2">
              <Button variant="outline" onClick={handleReset} className="flex-1 min-h-[44px] text-xs sm:text-sm">
                <span className="sm:hidden">Reset</span>
                <span className="hidden sm:inline">Reset All</span>
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1 min-h-[44px] text-xs sm:text-sm">
                <span className="sm:hidden">Apply</span>
                <span className="hidden sm:inline">Apply Filters</span>
              </Button>
            </div>
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
