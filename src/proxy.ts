import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;

  // Check if we are accessing the dashboard
  const isDashboard = pathname.startsWith("/dashboard");

  // Only protect /dashboard routes
  if (!isDashboard) {
    return NextResponse.next();
  }
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  if (!backendBaseUrl) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionUrl = `${backendBaseUrl.replace(/\/$/, "")}/api/auth/session`;

  return fetch(sessionUrl, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
    cache: "no-store",
  })
    .then(async (res) => {
      // If backend fails or 401, redirect to login
      if (!res.ok) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      const session = (await res.json()) as any;
      if (!session?.user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      // User is authenticated, allow access to dashboard

      return NextResponse.next();
    })
    .catch((err) => {
      console.error("Middleware Auth Check Failed:", err);
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
