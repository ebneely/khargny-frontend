/**
 * Dashboard API Client - Business Logic Only
 * 
 * ARCHITECTURE RULE:
 * This client uses GraphQL for ALL business logic operations in the dashboard.
 * 
 * - Business Logic: Use this client (GraphQL path: /api/graphql)
 * - Authentication: Use Better Auth REST client from './auth-client' (REST path: /api/auth/*)
 * 
 * This client handles:
 * - Places CRUD operations (create, read, update, delete)
 * - Contact management
 * - Media operations
 * - All other dashboard business logic
 * 
 * DO NOT use this client for authentication operations.
 * Use authClient from './auth-client' for authentication.
 */

import { client } from './apollo-client';
import { 
  GET_PLACES, 
  GET_PLACE,
  GOOGLE_PLACE_DETAILS, 
  GOOGLE_FIND_PLACE,
  GET_CITIES,
} from '@/graphql/queries';
import { 
  CREATE_PLACE, 
  UPDATE_PLACE, 
  DELETE_PLACE, 
  ADD_PHOTO 
} from '@/graphql/mutations';
import { Place } from '@/types';

/**
 * GraphQL Response Types
 */
interface GetPlacesResponse {
  places: Place[];
}

interface GetPlaceResponse {
  place: Place;
}

interface GooglePlaceDetailsResponse {
  googlePlaceDetails: any;
}

interface GoogleFindPlaceResponse {
  googleFindPlace: Array<{
    id: string;
    name: string;
    placeId: string;
    address: string;
    rating: number;
  }>;
}

interface GetCitiesResponse {
  cities: string[];
}

interface CreatePlaceResponse {
  createPlace: Place;
}

interface UpdatePlaceResponse {
  updatePlace: Place;
}

interface DeletePlaceResponse {
  deletePlace: boolean;
}

interface AddPhotoResponse {
  addPhotoToPlace: Place;
}

/**
 * GraphQL Error Handler
 */
function handleGraphQLError(error: any, operation: string): never {
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    const graphQLError = error.graphQLErrors[0];
    console.error(`GraphQL Error in ${operation}:`, graphQLError.message);
    throw new Error(graphQLError.message || `GraphQL error in ${operation}`);
  }
  
  if (error.networkError) {
    console.error(`Network Error in ${operation}:`, error.networkError);
    throw new Error(`Network error: ${error.networkError.message || 'Failed to connect to server'}`);
  }
  
  console.error(`Unknown Error in ${operation}:`, error);
  throw new Error(`An unexpected error occurred in ${operation}`);
}

export const dashboardApi = {
  places: {
    /**
     * Search places with filters
     */
    search: async (filters: any): Promise<Place[]> => {
      try {
        const result = await client.query<GetPlacesResponse>({
          query: GET_PLACES,
          variables: { filters },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });

        if (result.error) {
          console.warn('GraphQL warnings in places.search:', result.error);
        }

        return result.data?.places || [];
      } catch (error) {
        handleGraphQLError(error, 'places.search');
      }
    },

    /**
     * Get place details
     */
    getDetails: async (placeId: string): Promise<Place | null> => {
      try {
        const result = await client.query<GetPlaceResponse>({
          query: GET_PLACE,
          variables: { id: placeId },
          errorPolicy: 'all',
        });

        if (result.error) {
          console.warn('GraphQL warnings in places.getDetails:', result.error);
        }

        return result.data?.place || null;
      } catch (error) {
        // Return null instead of throwing for getDetails (graceful degradation)
        console.error('Error fetching place details:', error);
        return null;
      }
    },

    /**
     * Find place by text search
     */
    findPlace: async (searchQuery: string): Promise<GoogleFindPlaceResponse['googleFindPlace']> => {
      try {
        const result = await client.query<GoogleFindPlaceResponse>({
          query: GOOGLE_FIND_PLACE,
          variables: { searchQuery },
          errorPolicy: 'all',
        });

        if (result.error) {
          console.warn('GraphQL warnings in places.findPlace:', result.error);
        }

        return result.data?.googleFindPlace || [];
      } catch (error) {
        handleGraphQLError(error, 'places.findPlace');
      }
    },

    /**
     * Get all locations (distinct city names)
     */
    getLocations: async (): Promise<string[]> => {
      try {
        const result = await client.query<GetCitiesResponse>({
          query: GET_CITIES,
          errorPolicy: 'all',
        });

        if (result.error) {
          console.warn('GraphQL warnings in places.getLocations:', result.error);
        }

        return result.data?.cities || [];
      } catch (error) {
        console.error("Error fetching cities:", error);
        return [];
      }
    },

    /**
     * Get areas (collections) for a location
     */
    getAreas: async (location: string): Promise<string[]> => {
      try {
        const result = await client.query<GetPlacesResponse>({
          query: GET_PLACES,
          variables: { filters: { locationFilter: location } },
          errorPolicy: 'all',
        });

        if (result.error) {
          console.warn('GraphQL warnings in places.getAreas:', result.error);
        }

        const places = result.data?.places || [];
        const areas = Array.from(
          new Set(places.map((p: Place) => p.area).filter(Boolean))
        ) as string[];
        return areas;
      } catch (error) {
        console.error("Error fetching areas:", error);
        return [];
      }
    },

    /**
     * Add places (batch create)
     */
    add: async (places: Partial<Place>[], location: string): Promise<Place[]> => {
      // GraphQL doesn't support batch create in our schema yet, so we do it sequentially
      const results: Place[] = [];
      
      for (const place of places) {
        try {
          const result = await client.mutate<CreatePlaceResponse>({
            mutation: CREATE_PLACE,
            variables: { 
              input: {
                ...place,
                city: location,
              } 
            },
            errorPolicy: 'all',
            // Refetch queries to update cache
            refetchQueries: [
              { query: GET_PLACES },
              { query: GET_CITIES },
            ],
            // Optimistic update for instant UI feedback
            optimisticResponse: {
              createPlace: {
                id: `temp-${Date.now()}`,
                name: place.name || '',
                placeId: place.placeId || '',
                city: location,
                area: place.area || null,
                address: place.address || null,
                phone: place.phone || null,
                rating: place.rating || null,
                price: place.price || null,
                description: place.description || null,
                age: place.age || null,
                map: place.map || null,
                photos: place.photos || [],
                videos: place.videos || [],
              },
            },
          });

          if (result.error) {
            console.warn(`GraphQL warnings creating place ${place.name}:`, result.error);
          }

          if (result.data?.createPlace) {
            results.push(result.data.createPlace);
          }
        } catch (error) {
          console.error(`Error creating place ${place.name}:`, error);
          // Continue with next place instead of failing entire batch
        }
      }
      
      return results;
    },

    /**
     * Update multiple places (batch update)
     */
    updateBatch: async (places: (Place & { id: string })[], location: string): Promise<Place[]> => {
      const results: Place[] = [];
      
      for (const place of places) {
        try {
          const { id, ...input } = place;
          const result = await client.mutate<UpdatePlaceResponse>({
            mutation: UPDATE_PLACE,
            variables: { id, input },
            errorPolicy: 'all',
            // Refetch queries to update cache
            refetchQueries: [
              { query: GET_PLACES },
              { query: GET_PLACE, variables: { id } },
            ],
            // Optimistic update for instant UI feedback
            optimisticResponse: {
              updatePlace: {
                ...place,
              },
            },
          });

          if (result.error) {
            console.warn(`GraphQL warnings updating place ${id}:`, result.error);
          }

          if (result.data?.updatePlace) {
            results.push(result.data.updatePlace);
          }
        } catch (error) {
          console.error(`Error updating place ${place.id}:`, error);
          // Continue with next place
        }
      }
      
      return results;
    },

    /**
     * Delete multiple places (batch delete)
     */
    deleteBatch: async (places: { id: string }[], location: string): Promise<boolean[]> => {
      const results: boolean[] = [];
      
      for (const place of places) {
        try {
          const result = await client.mutate<DeletePlaceResponse>({
            mutation: DELETE_PLACE,
            variables: { id: place.id },
            errorPolicy: 'all',
            // Refetch queries to update cache
            refetchQueries: [
              { query: GET_PLACES },
              { query: GET_CITIES },
            ],
            // Update cache to remove deleted place
            update: (cache) => {
              // Remove from places query cache
              cache.evict({ id: `Place:${place.id}` });
              cache.gc(); // Garbage collect
            },
          });

          if (result.error) {
            console.warn(`GraphQL warnings deleting place ${place.id}:`, result.error);
          }

          results.push(result.data?.deletePlace || false);
        } catch (error) {
          console.error(`Error deleting place ${place.id}:`, error);
          results.push(false);
        }
      }
      
      return results;
    },
  },

  contact: {
    /**
     * Get all contacts (dashboard only)
     */
    getAll: async () => {
      // TODO: Implement getAllContacts query in schema/resolvers
      return [];
    },

    /**
     * Get contact by ID
     */
    getById: async (id: string) => {
      return null;
    },

    /**
     * Delete contact
     */
    delete: async (id: string) => {
      return true;
    },

    /**
     * Send test email
     */
    sendTestEmail: async () => {
      return true;
    },
  },
};

// Export default for convenience
export default dashboardApi;
