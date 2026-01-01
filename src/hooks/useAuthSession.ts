'use client';

import { useState, useEffect } from 'react';

/**
 * ⚠️ DEPRECATED: Do NOT use this hook for authentication decisions.
 * 
 * 🚫 FORBIDDEN USES:
 * - Auth guards (use SSR instead)
 * - Redirects based on auth state (use SSR instead)
 * - Conditional rendering based on auth (use SSR instead)
 * - Any authentication logic (backend owns auth)
 * 
 * ✅ ALLOWED USE:
 * - Display-only: Showing user info in UI
 * - Must NOT affect page rendering or navigation
 * 
 * ARCHITECTURE:
 * - Authentication is backend-owned via HttpOnly cookies
 * - All auth decisions MUST happen server-side via getServerSession()
 * - This hook fetches session for display only (no caching, no state persistence)
 * - SSR enforces authentication before pages render
 * 
 * CORRECT PATTERN:
 * ```typescript
 * // ✅ CORRECT: Server Component
 * import { getServerSession } from '@/lib/auth-server';
 * export default async function Page() {
 *   const session = await getServerSession();
 *   if (!session?.user) redirect('/login');
 *   return <div>Protected content</div>;
 * }
 * 
 * // ❌ WRONG: Client Component
 * const { isAuthenticated } = useAuthSession();
 * if (!isAuthenticated) redirect('/login'); // NEVER DO THIS
 * ```
 */
export function useAuthSession() {
  // Fetch session directly from backend (no caching, no state persistence)
  const [session, setSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { BETTER_AUTH_URL } = await import('@/lib/config');

      try {
        // Always fetch fresh from backend - no cache, no storage
        const response = await fetch(`${BETTER_AUTH_URL}/session`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store', // Always fetch fresh from backend
        });

        if (response.ok) {
          const data = await response.json();
          setSession(data);
        } else {
          setSession(null);
        }
      } catch (error) {
        setSession(null);
      } finally {
        setSessionLoading(false);
      }
    };

    fetchSession();
  }, []);

  return {
    session,
    sessionLoading,
    /**
     * ⚠️ WARNING: isAuthenticated is for display only.
     * Do NOT use this for auth guards or redirects.
     * Use getServerSession() in Server Components instead.
     */
    isAuthenticated: !!session?.user,
  };
}

/**
 * ⚠️ DEPRECATED HOOK - Display Only
 * 
 * This hook is kept ONLY for displaying user info in UI.
 * It must NEVER be used for:
 * - Authentication decisions
 * - Auth guards
 * - Redirects
 * - Conditional rendering based on auth
 * 
 * All authentication MUST happen server-side via getServerSession().
 * See: frontend/web/src/lib/auth-server.ts
 */
