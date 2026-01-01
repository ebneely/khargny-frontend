import { headers } from "next/headers";
import { cache } from "react";
import { BACKEND_URL, BETTER_AUTH_URL } from "./config";

/**
 * Server-Side Authentication Utility
 *
 * ARCHITECTURE:
 * - Gets session from Better Auth backend API
 * - Uses HttpOnly cookies (managed by Better Auth)
 * - Cached per request to avoid duplicate calls
 * - Returns session data or null
 *
 * IMPORTANT: This uses `headers()` to forward the exact Cookie header from the incoming request.
 */

interface Session {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string | null;
    role?: string;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

/**
 * Get session from Better Auth backend
 * Uses cache() to deduplicate requests within the same render
 */

export const getServerSession = cache(async (): Promise<Session | null> => {
  try {
    // Get headers to extract the raw cookie string
    const headersList = await headers();
    const cookieHeader = headersList.get("cookie") || "";

    // Debug: Log cookie info (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Server Session Check:", {
        cookieHeaderLength: cookieHeader.length,
        hasCookies: cookieHeader.length > 0,
        backendUrl: BETTER_AUTH_URL,
      });
    }

    // Call Better Auth backend session endpoint
    const sessionUrl = `${BACKEND_URL}/api/auth/session`;

    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Calling backend session endpoint:", sessionUrl);
    }

    let response: Response;
    try {
      response = await fetch(sessionUrl, {
        method: "GET",
        headers: {
          cookie: cookieHeader,
        },
        cache: "no-store", // Always get fresh session
      });
    } catch (fetchError: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("[DEBUG] Fetch error (backend might be down):", {
          error: fetchError.message,
          url: sessionUrl,
        });
      }
      return null;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Backend Session Response:", {
        status: response.status,
        ok: response.ok,
        url: sessionUrl,
        hasCookieHeader: cookieHeader.length > 0,
      });
    }

    if (response.status === 404) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[DEBUG] Backend session endpoint not found (404). Possible issues:",
          {
            backendUrl: BETTER_AUTH_URL,
            sessionUrl,
            issue: "Backend might not be running or endpoint path is wrong",
            check: "Verify backend is running on http://localhost:3001",
            endpoint: "Should be: http://localhost:3001/api/auth/session",
          },
        );
      }
      return null;
    }

    if (response.status !== 200) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[DEBUG] Backend session check failed:", {
          status: response.status,
          statusText: response.statusText,
        });
      }
      return null;
    }

    const session = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("[DEBUG] Session Data:", {
        hasUser: !!session?.user,
        userId: session?.user?.id,
        userRole: session?.user?.role,
      });
    }

    // Return session if user exists
    if (session?.user) {
      return session as Session;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[DEBUG] Session Check Error:", error);
    }
    return null;
  }
});

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return !!session?.user;
}

/**
 * Get authenticated user (throws if not authenticated)
 */
export async function requireAuth() {
  const session = await getServerSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  return session.user;
}

// This file: Server-side utility to get session from Better Auth backend API. Used in server components for authentication checks.
