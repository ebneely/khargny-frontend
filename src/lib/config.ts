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

/**
 * The API origin, with the production backend as the fallback — the same treatment SITE_URL
 * already gets.
 *
 * This used to fall back to an empty string. Nothing crashed: every server-side fetch simply
 * returned null, so a build missing the variable published place pages titled "Place",
 * marked noindex, with no description and no structured data, and city pages named after
 * their slug. A silent, total loss of the page's search presence, indistinguishable at a
 * glance from a working build. A wrong origin is loud; an empty one is not.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend.5argny.com';
export const API_BASE_URL = normalizeUrl(API_URL);

// Public site origin — used for SEO canonical URLs, Open Graph, and the sitemap. The whole point
// of shareable place links: /explorer/{city}/{place} on this origin is the URL a user shares.
export const SITE_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.5argny.com',
);

// This file: Frontend environment configuration for API URLs and environment settings.
