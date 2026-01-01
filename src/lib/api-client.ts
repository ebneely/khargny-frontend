/**
 * Public Client API - Business Logic Only
 * 
 * ARCHITECTURE RULE:
 * This client uses GraphQL for ALL business logic operations.
 * 
 * - Business Logic: Use this client (GraphQL path: /api/graphql)
 * - Authentication: Use Better Auth REST client from './auth-client' (REST path: /api/auth/*)
 * 
 * This client handles:
 * - Places queries and mutations
 * - Contact form submissions
 * - All other business logic operations
 * 
 * DO NOT use this client for authentication operations.
 * Use authClient from './auth-client' for authentication.
 */

import { client } from './apollo-client';
import type { ApolloQueryResult, FetchResult } from '@apollo/client';
import { 
  GET_PLACES, 
  GET_PLACE_BY_PLACE_ID, 
  GOOGLE_PLACE_DETAILS, 
  GOOGLE_FIND_PLACE,
  GET_CITIES,
} from '@/graphql/queries';
import { SUBMIT_CONTACT as SUBMIT_CONTACT_MUTATION } from '@/graphql/mutations';
import { Place } from '@/types';

/**
 * GraphQL Response Types
 */
interface GetPlacesResponse {
  places: Place[];
}

interface GetPlaceByPlaceIdResponse {
  placeByPlaceId: Place;
}

interface GooglePlaceDetailsResponse {
  googlePlaceDetails: any; // Google Places API response structure
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

interface SubmitContactResponse {
  submitContact: {
    id: string;
    createdAt: string;
  };
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

export const clientApi = {
  places: {
    /**
     * Search places with filters (read-only)
     */
    search: async (filters: {
      nameSearch?: string;
      addressSearch?: string;
      idSearch?: string;
      placeIdSearch?: string;
      locationFilter?: string;
      areaFilter?: string;
      price?: number;
    }): Promise<Place[]> => {
      try {
        const result = await client.query<GetPlacesResponse>({
          query: GET_PLACES,
          variables: { filters },
          fetchPolicy: 'network-only', // Ensure fresh data for search
          errorPolicy: 'all', // Return partial data even if errors
        });

        const errors = (result as ApolloQueryResult<GetPlacesResponse> & { errors?: Array<{ message: string }> }).errors;
        if (errors && errors.length > 0) {
          console.warn('GraphQL warnings in places search:', errors);
        }

        return result.data?.places || [];
      } catch (error) {
        handleGraphQLError(error, 'places.search');
      }
    },

    /**
     * Get place details from Google Places API
     */
    getDetails: async (placeId: string): Promise<any> => {
      try {
        const result = await client.query<GooglePlaceDetailsResponse>({
          query: GOOGLE_PLACE_DETAILS,
          variables: { placeId },
          errorPolicy: 'all',
        });

        const errors = (result as ApolloQueryResult<GooglePlaceDetailsResponse> & { errors?: Array<{ message: string }> }).errors;
        if (errors && errors.length > 0) {
          console.warn('GraphQL warnings in getDetails:', errors);
        }

        return result.data?.googlePlaceDetails || null;
      } catch (error) {
        handleGraphQLError(error, 'places.getDetails');
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

        const errors = (result as ApolloQueryResult<GoogleFindPlaceResponse> & { errors?: Array<{ message: string }> }).errors;
        if (errors && errors.length > 0) {
          console.warn('GraphQL warnings in findPlace:', errors);
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
      const result = await client.query<GetCitiesResponse>({
        query: GET_CITIES,
        errorPolicy: 'all',
      });

      const errors = (result as ApolloQueryResult<GetCitiesResponse> & { errors?: Array<{ message: string }> }).errors;
      if (errors && errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(', '));
      }

      if (!result.data?.cities) {
        throw new Error('Invalid response: cities data missing');
      }

      return result.data.cities;
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

        const errors = (result as ApolloQueryResult<GetPlacesResponse> & { errors?: Array<{ message: string }> }).errors;
        if (errors && errors.length > 0) {
          console.warn('GraphQL warnings in getAreas:', errors);
        }

        const places = result.data?.places || [];
        const areas = Array.from(
          new Set(places.map((p) => p.area).filter(Boolean))
        ) as string[];
        return areas;
      } catch (error) {
        console.error("Error fetching areas:", error);
        return [];
      }
    },
  },

  contact: {
    /**
     * Submit contact form (public)
     */
    submit: async (data: {
      name: string;
      email: string;
      message: string;
      subject?: string;
    }): Promise<SubmitContactResponse['submitContact']> => {
      try {
        const result = await client.mutate<SubmitContactResponse>({
          mutation: SUBMIT_CONTACT_MUTATION,
          variables: { input: data },
          errorPolicy: 'all',
          // Optimistic update for instant feedback
          optimisticResponse: {
            submitContact: {
              id: `temp-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          },
        });

        const errors = (result as FetchResult<SubmitContactResponse> & { errors?: Array<{ message: string }> }).errors;
        if (errors && errors.length > 0) {
          console.warn('GraphQL warnings in contact.submit:', errors);
        }

        if (!result.data?.submitContact) {
          throw new Error('Failed to submit contact form');
        }

        return result.data.submitContact;
      } catch (error) {
        handleGraphQLError(error, 'contact.submit');
      }
    },
  },
};

// Export default for convenience
export default clientApi;
