/**
 * Error Handlers for REST and GraphQL
 * 
 * ARCHITECTURE:
 * - REST errors: HTTP status codes and JSON error responses
 * - GraphQL errors: GraphQL error format with extensions
 * 
 * This module provides separate error handling utilities for each path.
 */

/**
 * REST Error Response Format
 * 
 * Better Auth and other REST endpoints use HTTP status codes:
 * - 200: Success
 * - 400: Bad Request
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Not Found
 * - 500: Internal Server Error
 */
export interface RESTError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

/**
 * GraphQL Error Format
 * 
 * GraphQL errors follow the GraphQL error specification:
 * - message: Human-readable error message
 * - extensions: Additional error metadata (code, status, etc.)
 */
export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    http?: {
      status: number;
    };
    [key: string]: any;
  };
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
}

/**
 * Handle REST API errors
 * 
 * @param response - Fetch Response object
 * @returns Promise that resolves to error object or throws
 */
export async function handleRESTError(response: Response): Promise<RESTError> {
  let errorData: any = {};
  
  try {
    errorData = await response.json();
  } catch {
    // If response is not JSON, use status text
    errorData = { message: response.statusText };
  }

  const error: RESTError = {
    status: response.status,
    message: errorData.message || errorData.error || 'An error occurred',
    code: errorData.code,
    details: errorData,
  };

  return error;
}

/**
 * Handle GraphQL errors
 * 
 * @param errors - Array of GraphQL errors from Apollo Client
 * @returns Formatted error object
 */
export function handleGraphQLError(errors: GraphQLError[]): {
  message: string;
  code?: string;
  status?: number;
  errors: GraphQLError[];
} {
  // Get the first error (most common case)
  const firstError = errors[0];
  
  return {
    message: firstError.message || 'A GraphQL error occurred',
    code: firstError.extensions?.code,
    status: firstError.extensions?.http?.status,
    errors,
  };
}

/**
 * Handle network errors (common to both REST and GraphQL)
 * 
 * @param error - Network error
 * @returns Formatted error message
 */
export function handleNetworkError(error: Error | any): string {
  if (error.message) {
    return error.message;
  }
  
  if (error.networkError) {
    return 'Network error: Unable to connect to the server';
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is a REST error
 * 
 * @param error - Error object
 * @returns true if error has REST error structure
 */
export function isRESTError(error: any): error is RESTError {
  return error && typeof error.status === 'number' && typeof error.message === 'string';
}

/**
 * Check if error is a GraphQL error
 * 
 * @param error - Error object
 * @returns true if error has GraphQL error structure
 */
export function isGraphQLError(error: any): error is GraphQLError {
  return error && typeof error.message === 'string' && !error.status;
}

/**
 * Format error for user display
 * 
 * @param error - Error object (REST or GraphQL)
 * @returns User-friendly error message
 */
export function formatErrorForUser(error: any): string {
  if (isRESTError(error)) {
    // REST errors: Use the message directly
    return error.message;
  }
  
  if (isGraphQLError(error)) {
    // GraphQL errors: Use the message
    return error.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Get HTTP status code from error
 * 
 * @param error - Error object (REST or GraphQL)
 * @returns HTTP status code or undefined
 */
export function getErrorStatus(error: any): number | undefined {
  if (isRESTError(error)) {
    return error.status;
  }
  
  if (isGraphQLError(error)) {
    return error.extensions?.http?.status;
  }
  
  return undefined;
}

/**
 * Example usage:
 * 
 * // REST error handling
 * try {
 *   const response = await fetch('/api/auth/sign-in/email', { ... });
 *   if (!response.ok) {
 *     const error = await handleRESTError(response);
 *     console.error('REST Error:', error.message, error.status);
 *   }
 * } catch (error) {
 *   const message = handleNetworkError(error);
 *   console.error('Network Error:', message);
 * }
 * 
 * // GraphQL error handling
 * try {
 *   const { data, errors } = await client.query({ ... });
 *   if (errors) {
 *     const error = handleGraphQLError(errors);
 *     console.error('GraphQL Error:', error.message, error.code);
 *   }
 * } catch (error: any) {
 *   if (error.graphQLErrors) {
 *     const formatted = handleGraphQLError(error.graphQLErrors);
 *     console.error('GraphQL Error:', formatted.message);
 *   } else {
 *     const message = handleNetworkError(error);
 *     console.error('Network Error:', message);
 *   }
 * }
 */

