"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics/track";

/**
 * Records one page view per route change. Mounted once in the root layout; renders nothing.
 * The visible URL carries the locale (/ar/..., /en/...), which the router strips, so the
 * path is read from `location` to keep languages apart in the report.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(typeof window !== "undefined" ? window.location.pathname : pathname);
  }, [pathname]);

  return null;
}
