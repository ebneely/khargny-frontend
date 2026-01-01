import { NextRequest, NextResponse } from 'next/server';

/**
 * Sign-In Route Handler (Server-Side Proxy)
 * 
 * ARCHITECTURE:
 * - Server-side Route Handler (Next.js API route)
 * - Proxies sign-in request to Better Auth backend
 * - Forwards Set-Cookie headers from backend to browser
 * - Returns response with cookies properly set
 * 
 * IMPORTANT:
 * - This is a read-only proxy (server-side only)
 * - Does NOT read cookie values (only forwards Set-Cookie headers)
 * - Backend sets HttpOnly cookies automatically
 * - Frontend never reads or manages cookies
 */

import { BETTER_AUTH_URL } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const signInUrl = `${BETTER_AUTH_URL}/sign-in/email`;
    
    const response = await fetch(signInUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    // Create Next.js response with the result
    const nextResponse = NextResponse.json(result, {
      status: response.status,
    });

    // Forward all Set-Cookie headers from Better Auth backend to browser
    const setCookieHeaders = response.headers.getSetCookie();
    setCookieHeaders.forEach((cookie) => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An error occurred during sign in' },
      { status: 500 }
    );
  }
}

// This file: Route handler for sign-in that forwards cookies from Better Auth backend to browser.

