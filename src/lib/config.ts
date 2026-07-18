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
const normalizeUrl = (url: string) => url.replace(/\/$/, '');

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || '';
export const BACKEND_URL = BACKEND_BASE_URL ? normalizeUrl(BACKEND_BASE_URL) : '';

export const HEALTH_CHECK_URL = BACKEND_URL ? `${BACKEND_URL}/health` : '';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
export const API_BASE_URL = API_URL ? normalizeUrl(API_URL) : '';

// Public site origin — used for SEO canonical URLs, Open Graph, and the sitemap. The whole point
// of shareable place links: /explorer/{city}/{place} on this origin is the URL a user shares.
export const SITE_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.5argny.com',
);

// This file: Frontend environment configuration for API URLs and environment settings.
