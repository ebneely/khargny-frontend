'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Place, PendingOperation } from '@/types';
import { CitySelector } from '@/components/dashboard/CitySelector';
import { DeleteCityButton } from '@/components/dashboard/DeleteCityButton';
import { AddCityButton } from '@/components/dashboard/AddCityButton';
import { PlacesTable } from '@/components/dashboard/PlacesTable';
import { AddPlaceModal } from '@/components/dashboard/AddPlaceModal';
import { EditPlaceModal } from '@/components/dashboard/EditPlaceModal';
import { PendingChangesPanel } from '@/components/dashboard/PendingChangesPanel';
import { PlaceIdLookup } from '@/components/dashboard/PlaceIdLookup';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Darkmode from '@/components/ui/Darkmode';
import { GET_CITIES, GET_PLACES, GET_PLACE } from '@/graphql/queries';
import { CREATE_PLACE, UPDATE_PLACE, DELETE_PLACE } from '@/graphql/mutations';
import { generateId } from '@/lib/dashboard-utils';
import { Plus, LogOut, RefreshCw, Edit } from 'lucide-react';
import { client } from '@/lib/apollo-client';

export function DashboardContent() {
  const { toast } = useToast();

  // State
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [isBulkEdit, setIsBulkEdit] = useState(false);

  // GraphQL queries
  const { data: citiesData, refetch: refetchCities } = useQuery<{ getCityNames: string[] }>(GET_CITIES);
  const {
    data: placesData,
    loading: placesLoading,
    refetch: refetchPlaces,
  } = useQuery<{ khargnyPlaces: Place[] }>(GET_PLACES, {
    variables: {
      filter: { city: selectedCity },
    },
    skip: !selectedCity,
  });

  // GraphQL mutations
  const [createPlace] = useMutation(CREATE_PLACE);
  const [updatePlace] = useMutation(UPDATE_PLACE);
  const [deletePlace] = useMutation(DELETE_PLACE);

  const places: Place[] = placesData?.khargnyPlaces || [];
  const cities: string[] = citiesData?.getCityNames || [];
  
  // Handlers
  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setSelectedIds([]);
  };

  const handleCityDeleted = () => {
    setSelectedCity(null);
    setSelectedIds([]);
    refetchCities();
  };

  const handleAddToQueue = (place: Partial<Place>) => {
    const operation: PendingOperation = {
      id: generateId(),
      type: 'add',
      data: place,
    };
    setPendingOperations((prev) => [...prev, operation]);
    toast({
      title: 'Added to queue',
      description: `${place.name} will be created when you execute changes.`,
    });
  };

  const handleEditToQueue = (id: string, updates: Partial<Place>) => {
    const place = places.find((p) => p.id === id);
    if (!place) return;

    if (isBulkEdit && selectedIds.length > 0) {
      selectedIds.forEach((selectedId) => {
        const selectedPlace = places.find((p) => p.id === selectedId);
        if (selectedPlace) {
          const operation: PendingOperation = {
            id: generateId(),
            type: 'edit',
            data: { ...selectedPlace, ...updates },
            originalData: selectedPlace,
          };
          setPendingOperations((prev) => [...prev, operation]);
        }
      });
      toast({
        title: 'Added to queue',
        description: `${selectedIds.length} places will be updated when you execute changes.`,
      });
    } else {
      const operation: PendingOperation = {
        id: generateId(),
        type: 'edit',
        data: { ...place, ...updates },
        originalData: place,
      };
      setPendingOperations((prev) => [...prev, operation]);
      toast({
        title: 'Added to queue',
        description: `${place.name} will be updated when you execute changes.`,
      });
    }
    setSelectedIds([]);
  };

  const handleDeleteToQueue = (ids: string[]) => {
    ids.forEach((id) => {
      const place = places.find((p) => p.id === id);
      if (place) {
        const operation: PendingOperation = {
          id: generateId(),
          type: 'delete',
          data: place,
        };
        setPendingOperations((prev) => [...prev, operation]);
      }
    });
    toast({
      title: 'Added to queue',
      description: `${ids.length} place(s) will be deleted when you execute changes.`,
    });
    setSelectedIds([]);
  };

  const handleRemoveFromQueue = (operationId: string) => {
    setPendingOperations((prev) => prev.filter((op) => op.id !== operationId));
  };

  const handleClearQueue = () => {
    setPendingOperations([]);
    toast({
      title: 'Queue cleared',
      description: 'All pending operations have been removed.',
    });
  };

  const handleExecuteAll = async () => {
    if (pendingOperations.length === 0) return;

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const operation of pendingOperations) {
        try {
          if (operation.type === 'add') {
            await createPlace({
              variables: {
                input: {
                  name: operation.data.name,
                  city: operation.data.city,
                  placeId: operation.data.placeId,
                  phone: operation.data.phone,
                  address: operation.data.address,
                  description: operation.data.description,
                  age: operation.data.age,
                  price: operation.data.price,
                  rating: operation.data.rating,
                  area: operation.data.area,
                  map: operation.data.map,
                },
              },
              // Refetch queries to update cache
              refetchQueries: [
                { query: GET_PLACES, variables: { filter: { city: selectedCity } } },
                { query: GET_CITIES },
              ],
            });
          } else if (operation.type === 'edit') {
            // Build update input - include all fields from operation.data
            // Convert empty strings to null for proper MongoDB updates
            const updateInput: any = {};
            
            // Helper to normalize values (empty string -> null, but keep 0 and false)
            const normalize = (val: any) => {
              if (val === '' || val === undefined) return null;
              if (typeof val === 'string' && val.trim() === '') return null;
              return val;
            };

            // Include all updatable fields from operation.data
            const fields: (keyof Place)[] = [
              'name', 'city', 'placeId', 'phone', 'address', 'description',
              'age', 'price', 'rating', 'area', 'map'
            ];

            fields.forEach((field) => {
              // Include field if it exists in operation.data (meaning it was in the form)
              if (field in operation.data) {
                updateInput[field] = normalize(operation.data[field]);
              }
            });

            // Ensure we have at least some fields to update
            if (Object.keys(updateInput).length === 0) {
              console.warn('No fields to update for place:', operation.data.id);
              // Still proceed but log a warning
            }

            await updatePlace({
              variables: {
                id: operation.data.id,
                input: updateInput,
              },
              // Refetch queries to update cache
              refetchQueries: [
                { query: GET_PLACES, variables: { filter: { city: selectedCity || operation.data.city } } },
                { query: GET_CITIES },
                { query: GET_PLACE, variables: { id: operation.data.id } },
              ],
            });
          } else if (operation.type === 'delete') {
            await deletePlace({
              variables: {
                id: operation.data.id,
              },
              // Refetch queries to update cache
              refetchQueries: [
                { query: GET_PLACES, variables: { filter: { city: selectedCity } } },
                { query: GET_CITIES },
              ],
              // Update cache to remove deleted place
              update: (cache) => {
                cache.evict({ id: `Place:${operation.data.id}` });
                cache.gc();
              },
            });
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to execute ${operation.type}:`, error);
          errorCount++;
        }
      }

      setPendingOperations([]);
      refetchPlaces();

      toast({
        title: 'Changes executed',
        description: `${successCount} operations completed successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
      });
    } catch (error) {
      console.error('Error executing operations:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute some operations. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (place: Place) => {
    setEditingPlace(place);
    setIsBulkEdit(false);
    setShowEditModal(true);
  };

  const handleBulkEdit = () => {
    if (selectedIds.length === 0) return;
    const firstPlace = places.find((p) => p.id === selectedIds[0]);
    setEditingPlace(firstPlace || null);
    setIsBulkEdit(true);
    setShowEditModal(true);
  };

  const handleLogout = async () => {
    try {
      await client.clearStore();
      // Use Better Auth client for sign-out (REST for auth only)
      const { signOut } = await import('@/lib/auth-client');
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      await client.clearStore().catch(() => {});
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                Manage places and locations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="scale-75">
                <Darkmode />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="h-8"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        {/* Main table section */}
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <CitySelector
              onCitySelect={handleCitySelect}
              selectedCity={selectedCity}
            />
            <AddCityButton />
            <DeleteCityButton
              selectedCity={selectedCity}
              placesCount={places.length}
              onCityDeleted={handleCityDeleted}
            />
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              disabled={!selectedCity}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Place
            </Button>
            {selectedIds.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleBulkEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Bulk Edit ({selectedIds.length})
              </Button>
            )}
            {selectedCity && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetchPlaces()}
                disabled={placesLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${placesLoading ? 'animate-spin' : ''}`}
                />
              </Button>
            )}
          </div>

          {/* Middle section - Google Place ID and Pending Changes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlaceIdLookup />
            <PendingChangesPanel
              operations={pendingOperations}
              onExecute={handleExecuteAll}
              onClear={handleClearQueue}
              onRemove={handleRemoveFromQueue}
            />
          </div>

          {/* Table */}
          {!selectedCity ? (
            <div className="border rounded-lg p-12 text-center">
              <p className="text-muted-foreground">
                Select a city to view and manage places
              </p>
            </div>
          ) : placesLoading ? (
            <div className="border rounded-lg p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading places...</p>
            </div>
          ) : (
            <PlacesTable
              places={places}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onEdit={handleEdit}
              onDelete={handleDeleteToQueue}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <AddPlaceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddToQueue}
        cities={cities}
      />
      <EditPlaceModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingPlace(null);
          setIsBulkEdit(false);
        }}
        onSave={handleEditToQueue}
        place={editingPlace}
        isBulk={isBulkEdit}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}

