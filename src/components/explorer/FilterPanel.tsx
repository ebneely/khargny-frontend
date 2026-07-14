'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export interface ActiveFilters {
  priceRange?: string[];
  featured?: boolean;
  amenityIds?: string[];
  tagIds?: string[];
}

interface FilterPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  onClear: () => void;
  children?: React.ReactNode;
}

export function FilterPanel({
  isOpen,
  onOpenChange,
  activeFilters,
  onFilterChange,
  onClear,
  children,
}: FilterPanelProps) {
  const hasFilters = Object.values(activeFilters).some(
    (v) => v !== undefined && v !== false && (Array.isArray(v) ? v.length > 0 : true),
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full relative">
          Filters
          {hasFilters && (
            <span className="ml-1 w-2 h-2 rounded-full bg-orange-500" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {children}
          {hasFilters && (
            <Button variant="ghost" onClick={onClear} className="text-sm text-muted-foreground">
              Clear all filters
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
