export const ENV = process.env.NEXT_PUBLIC_ENV;
export const isProduction = ENV === 'production';
export const isDevelopment = ENV === 'development';

/**
 * Backend Base URL Configuration
 * 
 * Following best practices:
 * - Single source of truth for backend URL
 * - All endpoints constructed from base URL
 * - Prevents duplication and path construction errors
 */
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;

if (!BACKEND_BASE_URL) {
  throw new Error('NEXT_PUBLIC_BACKEND_BASE_URL is not configured');
}

// Remove trailing slash for consistent path construction
const normalizeUrl = (url: string) => url.replace(/\/$/, '');

export const BACKEND_URL = normalizeUrl(BACKEND_BASE_URL);

// Construct all endpoints from base URL
export const GRAPHQL_API_URL = `${BACKEND_URL}/api/graphql`;
export const BETTER_AUTH_URL = `${BACKEND_URL}/api/auth`;
export const HEALTH_CHECK_URL = `${BACKEND_URL}/health`;
export const PAYMOB_INTENT_URL = `${BACKEND_URL}/api/paymob/intent`;

// This file: Frontend environment configuration for API URLs and environment settings.
