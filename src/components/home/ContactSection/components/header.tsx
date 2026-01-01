import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@iconify/react";
import { LayoutGrid, Map, Filter, X, List, Grid, Eye, Menu } from "lucide-react";
import { LocationSelector } from "./location-selector";

interface HeaderProps {
  viewMode: "list" | "map";
  setViewMode: (mode: "list" | "map") => void;
  cardLayout: "grid" | "list";
  setCardLayout: (layout: "grid" | "list") => void;
  onOpenFilterModal: () => void;
  onOpenViewModeModal: () => void;
  onOpenNavbar: () => void;
  activeFiltersCount: number;
  resetTrigger: number;
  handleReset: () => void;
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  onClearAll: () => void;
  locationSelectorRef: React.RefObject<{ openDropdown: () => void } | null>;
  forceOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  cardLayout,
  setCardLayout,
  onOpenFilterModal,
  onOpenViewModeModal,
  onOpenNavbar,
  activeFiltersCount,
  handleReset,
  selectedLocation,
  onLocationChange,
  onClearAll,
  locationSelectorRef,
  forceOpen,
}) => {
  return (
    <nav className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2">
        {/* Left section - desktop only: title */}
        <div className="hidden sm:flex items-center gap-2">
          <Icon
            icon="lucide:map-pin"
            className="text-base text-primary sm:text-lg flex-shrink-0"
          />
          <span className="truncate text-sm font-semibold sm:text-base md:text-lg">
            Places Explorer
          </span>
        </div>

        {/* Mobile view button - left side on mobile */}
        <Button
          variant="outline"
          size="sm"
          className="flex sm:hidden h-[44px] px-3 flex-shrink-0"
          onClick={onOpenViewModeModal}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>

        {/* Center/Main section - Dropdown */}
        <div className="flex-1 sm:flex-initial sm:w-80 min-w-0">
          <LocationSelector
            selectedLocation={selectedLocation}
            onLocationChange={onLocationChange}
            onClearAll={onClearAll}
            ref={locationSelectorRef}
            forceOpen={forceOpen}
          />
        </div>

        {/* Right section - Desktop toggles, Filter and Navbar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Card layout toggle - desktop only */}
          <div className="hidden sm:flex items-center rounded-lg border p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={cardLayout === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCardLayout("grid")}
                    aria-label="Grid Layout"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid Layout</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={cardLayout === "list" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCardLayout("list")}
                    aria-label="List Layout"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List Layout</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* View toggle - desktop only */}
          <div className="hidden sm:flex items-center rounded-lg border p-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setViewMode("list")}
                    aria-label="List View"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "map" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setViewMode("map")}
                    aria-label="Map View"
                  >
                    <Map className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Map View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Filter button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-[44px] w-[44px] p-0 relative"
                  onClick={onOpenFilterModal}
                >
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="hidden sm:block">Filter Options</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Navbar button - mobile only */}
          <Button
            variant="outline"
            size="sm"
            className="flex sm:hidden h-[44px] w-[44px] p-0"
            onClick={onOpenNavbar}
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
};
