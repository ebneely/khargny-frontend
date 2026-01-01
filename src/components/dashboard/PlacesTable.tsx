'use client';

import { useMemo, useState, useEffect } from 'react';
import { Place } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Edit,
  Trash2,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface PlacesTableProps {
  places: Place[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (place: Place) => void;
  onDelete: (ids: string[]) => void;
}

type SortKey = keyof Place;
type SortOrder = 'asc' | 'desc' | null;

export function PlacesTable({
  places,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
}: PlacesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Handle sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc');
      if (sortOrder === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Filter and sort places
  const filteredAndSortedPlaces = useMemo(() => {
    let result = [...places];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (place) =>
          place.name?.toLowerCase().includes(term) ||
          place.city?.toLowerCase().includes(term) ||
          place.address?.toLowerCase().includes(term) ||
          place.phone?.toLowerCase().includes(term) ||
          place.area?.toLowerCase().includes(term) ||
          place.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortKey && sortOrder) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return result;
  }, [places, searchTerm, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPlaces.length / pageSize);
  const paginatedPlaces = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedPlaces.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedPlaces, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, sortKey, sortOrder]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(paginatedPlaces.map((p) => p.id));
    } else {
      onSelectionChange([]);
    }
  };

  // Handle individual selection
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    }
  };

  const allSelected =
    paginatedPlaces.length > 0 &&
    paginatedPlaces.every((p) => selectedIds.includes(p.id));

  const someSelected = selectedIds.length > 0 && !allSelected;

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-2 h-3 w-3" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-2 h-3 w-3" />
    );
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search places..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(selectedIds)}
              className="h-8"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={someSelected ? 'opacity-50' : ''}
                  />
                </TableHead>
                <TableHead className="w-[200px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('name')}
                    className="h-8 px-2"
                  >
                    Name
                    <SortIcon column="name" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('city')}
                    className="h-8 px-2"
                  >
                    City
                    <SortIcon column="city" />
                  </Button>
                </TableHead>
                <TableHead className="w-[250px]">Address</TableHead>
                <TableHead className="w-[120px]">Phone</TableHead>
                <TableHead className="w-[180px]">Place ID</TableHead>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('area')}
                    className="h-8 px-2"
                  >
                    Area
                    <SortIcon column="area" />
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('price')}
                    className="h-8 px-2"
                  >
                    Price
                    <SortIcon column="price" />
                  </Button>
                </TableHead>
                <TableHead className="w-[80px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('rating')}
                    className="h-8 px-2"
                  >
                    Rating
                    <SortIcon column="rating" />
                  </Button>
                </TableHead>
                <TableHead className="w-[80px]">Map</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPlaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    No places found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPlaces.map((place) => (
                  <TableRow key={place.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(place.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(place.id, checked as boolean)
                        }
                        aria-label={`Select ${place.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{place.name}</TableCell>
                    <TableCell>{place.city}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[250px]">
                      {place.address || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {place.phone || '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {place.placeId || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{place.area || '-'}</TableCell>
                    <TableCell className="text-sm">{place.price || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {place.rating ? place.rating.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell>
                      {place.map ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(place.map!, '_blank')}
                          className="h-8 w-8 p-0"
                          title="View on Google Maps"
                        >
                          <MapPin className="h-4 w-4 text-blue-600" />
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(place)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredAndSortedPlaces.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({filteredAndSortedPlaces.length} total)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                ««
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                ‹
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                ›
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                »»
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
