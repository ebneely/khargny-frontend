/**
 * DEPRECATED: Do NOT use this hook for authentication decisions.
 * 
 * Authentication is backend-owned via HttpOnly cookies.
 * Use getServerSession() in Server Components instead.
 * 
 * This hook was using GraphQL queries for auth, which violates
 * the backend-first authentication principle.
 * 
 * All authentication decisions must happen server-side via
 * getServerSession() in Server Components (layouts/pages).
 */
export function useAdminAuth() {
  throw new Error(
    'useAdminAuth is deprecated. Use getServerSession() in Server Components instead. ' +
    'Authentication decisions are backend-owned via HttpOnly cookies.'
  );
}

// This file: DEPRECATED - Use getServerSession() in Server Components instead.


