import { isProduction, isDevelopment } from '@/lib/config';

/**
 * Hook for environment detection
 * Uses NEXT_PUBLIC_ENV for dev/prod, pathname for dashboard detection
 */
export function useEnvironment() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  return {
    /** True if on /dashboard path */
    isDashboard: pathname.startsWith('/dashboard'),
    /** True if NEXT_PUBLIC_ENV=production */
    isProduction,
    /** True if NEXT_PUBLIC_ENV=development */
    isDevelopment,
    /** Current hostname */
    hostname,
    /** Current pathname */
    pathname,
  };
}

export default useEnvironment;
