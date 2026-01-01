import { createAuthClient } from "better-auth/react";
import { BETTER_AUTH_URL } from "./config";

/**
 * Better Auth Client Configuration
 * 
 * IMPORTANT: This client is ONLY for sign-in/sign-out operations.
 * Session validation MUST happen server-side via getServerSession().
 * 
 * The useSession hook is disabled - do NOT use it for auth decisions.
 * All authentication decisions are backend-owned via HttpOnly cookies.
 */
export const authClient = createAuthClient({
    baseURL: BETTER_AUTH_URL,
    fetchOptions: {
        credentials: 'include',
    },
    // Disable session caching - backend is source of truth
    session: {
        refetchInterval: 0, // Never auto-refetch
        refetchOnWindowFocus: false, // Don't refetch on focus
    },
});

// Only export sign-in/sign-out - session checks happen server-side
export const { signIn, signUp, signOut } = authClient;

// DO NOT USE useSession - it caches session in memory
// Use getServerSession() in Server Components instead

// This file: Better Auth REST client for sign-in/sign-out only. Session validation happens server-side.
