import { NextRequest, NextResponse } from 'next/server';

/**
 * Sign-Out Route Handler (Server-Side Proxy)
 * 
 * ARCHITECTURE:
 * - Server-side Route Handler (Next.js API route)
 * - Proxies sign-out request to Better Auth backend
 * - Forwards Set-Cookie headers from backend to browser (clears cookies)
 * - Returns response with cookies properly cleared
 * 
 * IMPORTANT:
 * - This is a read-only proxy (server-side only)
 * - Reads cookies from request headers (server-side only)
 * - Forwards cookies to backend for validation
 * - Backend clears HttpOnly cookies automatically
 * - Frontend never reads or manages cookies
 */

import { BETTER_AUTH_URL } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // Get cookies from request
    const cookieHeader = request.headers.get('cookie') || '';

    const signOutUrl = `${BETTER_AUTH_URL}/sign-out`;
    
    const response = await fetch(signOutUrl, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
      },
    });

    const result = await response.json();

    // Create Next.js response
    const nextResponse = NextResponse.json(result, {
      status: response.status,
    });

    // Forward all Set-Cookie headers from Better Auth backend to browser
    // This ensures cookies are cleared properly
    const setCookieHeaders = response.headers.getSetCookie();
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during sign out' },
      { status: 500 }
    );
  }
}

// This file: Route handler for sign-out that forwards cookies from Better Auth backend to browser.

