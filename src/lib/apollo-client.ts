import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { getMainDefinition } from "@apollo/client/utilities";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { GRAPHQL_API_URL } from "./config";

const createApolloClient = () => {
  if (!GRAPHQL_API_URL) {
    throw new Error('GRAPHQL_API_URL is not configured');
  }

  /**
   * HTTP Link Configuration
   * 
   * CRITICAL: This is the ONLY allowed authentication pattern for Apollo Client.
   * 
   * ✅ ALLOWED:
   * - credentials: 'include' (cookies sent automatically by browser)
   * 
   * ❌ FORBIDDEN:
   * - Authorization headers
   * - Bearer tokens
   * - setContext auth links
   * - Token injection
   * - Reading document.cookie
   * 
   * Backend reads HttpOnly cookies from request headers.
   * Frontend never reads or manages cookies.
   */
  const httpLink = new HttpLink({
    uri: GRAPHQL_API_URL as string,
    credentials: 'include', // ONLY allowed auth pattern - cookies sent automatically
    headers: {
      'apollo-require-preflight': 'true',
    },
  });

  const getWsUrl = () => {
    if (typeof window === 'undefined') return '';
    if (!GRAPHQL_API_URL) return '';
    const url = new URL(GRAPHQL_API_URL as string);
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${url.host}${url.pathname}`;
  };

  /**
   * WebSocket Connection Configuration
   * 
   * IMPORTANT: HttpOnly cookies cannot be read by JavaScript.
   * The browser automatically sends HttpOnly cookies with WebSocket connections
   * when the connection is made to the same origin or with proper CORS setup.
   * 
   * We do NOT read cookies manually - backend reads them from connection headers.
   */
  const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(
    createClient({
      url: getWsUrl(),
      connectionParams: () => {
        // Do NOT read cookies - HttpOnly cookies are invisible to JS
        // Browser automatically sends HttpOnly cookies with WebSocket connection
        // Backend reads cookies from WebSocket connection headers
        return {};
      },
      webSocketImpl: typeof window !== 'undefined' ? WebSocket : undefined,
      on: {
        error: (error) => {
          console.error('[WS] Connection error:', error);
        },
      },
      shouldRetry: (errorOrCloseEvent) => {
        if (errorOrCloseEvent && typeof errorOrCloseEvent === 'object' && 'code' in errorOrCloseEvent && errorOrCloseEvent.code === 4500) {
          return false;
        }
        return true;
      },
      retryAttempts: 3,
      retryWait: async (retries) => {
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      },
    })
  ) : httpLink;

  const splitLink = typeof window !== 'undefined' ? split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink
  ) : httpLink;

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({
      typePolicies: {
        // Place type policy for cache normalization
        Place: {
          keyFields: ['id'], // Use 'id' as unique identifier
          fields: {
            // Photos array - replace on update
            photos: {
              merge(existing = [], incoming) {
                return incoming;
              },
            },
            // Videos array - replace on update
            videos: {
              merge(existing = [], incoming) {
                return incoming;
              },
            },
          },
        },
        // Query type policy for list fields
        Query: {
          fields: {
            // Places array - replace on refetch
            places: {
              merge(existing = [], incoming) {
                return incoming;
              },
            },
            // Cities array - replace on refetch
            cities: {
              merge(existing = [], incoming) {
                return incoming;
              },
            },
          },
        },
      },
    }),
  });
};

export const client = createApolloClient();

/**
 * Apollo GraphQL Client
 * 
 * ARCHITECTURE:
 * - Uses HttpOnly cookies for authentication (backend-managed)
 * - Browser automatically sends cookies with HTTP requests (credentials: 'include')
 * - WebSocket: Browser automatically sends HttpOnly cookies with connection
 * - Frontend does NOT read cookies - backend reads them from request headers
 * 
 * IMPORTANT: We do NOT read document.cookie.
 * HttpOnly cookies are invisible to JavaScript.
 * Browser handles cookie transmission automatically.
 */
