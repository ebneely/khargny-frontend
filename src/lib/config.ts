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

// This file: Frontend environment configuration for API URLs and environment settings.
