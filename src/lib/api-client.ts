/**
 * Public Client API - Business Logic Only
 */

import { client } from './apollo-client';
import { 
  GET_PLACE_DETAILS,
  GET_CITY_NAMES,
} from '@/graphql/queries';
import { SUBMIT_CONTACT as SUBMIT_CONTACT_MUTATION } from '@/graphql/mutations';

/**
 * GraphQL Response Types
 */
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
     * [REFACTORED] Get all city names from khargny_places
     */
    getCityNamesSimple: async (): Promise<string[]> => {
      try {
        const result = await client.query({
          query: GET_CITY_NAMES,
          fetchPolicy: 'network-only',
        });
        return (result.data as any)?.getCityNames || [];
      } catch (error) {
        console.error("Error fetching city names:", error);
        return [];
      }
    },

    /**
     * [REFACTORED] Get full place details for all places in a city
     */
    getPlaceDetailsSimple: async (city: string): Promise<any[]> => {
      try {
        const result = await client.query({
          query: GET_PLACE_DETAILS,
          variables: { city },
          fetchPolicy: 'network-only',
        });
        return (result.data as any)?.getPlaceDetails || [];
      } catch (error) {
        console.error("Error fetching place details for city:", error);
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

export default clientApi;
