"use client";

import { API_BASE_URL } from "@/lib/config";

/**
 * Audience analytics for the web: page, place and city views plus intent actions.
 *
 * Privacy: the browser is identified only by the backend's own HttpOnly guest cookie (sent
 * with `credentials: "include"`), which the backend hashes on arrival. This code sends no
 * id, no search terms and no personal data. Events are batched (every 5 s, at 10 events,
 * and when the tab is hidden) and failures are dropped silently: analytics never affects
 * the page.
 */

type AnalyticsEvent =
  | { type: "page_view"; path: string }
  | { type: "place_view"; placeId: string }
  | { type: "city_view"; cityId: string }
  | { type: "search" }
  | { type: "directions" | "save" | "share"; placeId: string };

type Queued = AnalyticsEvent & { occurredAt: string };

const FLUSH_MS = 5_000;
const FLUSH_AT = 10;
const MAX_BATCH = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

export function isTrackingAllowed(): boolean {
  return typeof window !== "undefined" && navigator.doNotTrack !== "1" &&
    !(navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl;
}

export function sendTrackingBatch(path: string, body: unknown, keepalive: boolean): Promise<boolean> {
  try {
    return fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive,
      body: JSON.stringify(body),
    }).then((response) => response.ok).catch(() => false);
  } catch {
    // Never let analytics throw into the page.
    return Promise.resolve(false);
  }
}

function send(events: Queued[], keepalive: boolean): void {
  sendTrackingBatch("/v1/analytics/events", { platform: "web", events }, keepalive);
}

export function flushAnalytics(keepalive = false): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  while (queue.length) send(queue.splice(0, MAX_BATCH), keepalive);
}

function listen(): void {
  if (listening || typeof document === "undefined") return;
  listening = true;
  // keepalive lets the last batch survive the tab closing or going to the background.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAnalytics(true);
  });
  window.addEventListener("pagehide", () => flushAnalytics(true));
}

function enqueue(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;
  // Respect an explicit browser opt-out.
  if (navigator.doNotTrack === "1" || (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl) {
    return;
  }
  listen();
  queue.push({ ...event, occurredAt: new Date().toISOString() });
  if (queue.length >= FLUSH_AT) flushAnalytics();
  else if (!timer) timer = setTimeout(() => flushAnalytics(), FLUSH_MS);
}

export function trackPageView(pathname: string): void {
  if (pathname) enqueue({ type: "page_view", path: pathname.slice(0, 200) });
}

export function trackPlaceView(placeId: string | undefined | null): void {
  if (placeId && UUID.test(placeId)) enqueue({ type: "place_view", placeId });
}

export function trackCityView(cityId: string | undefined | null): void {
  if (cityId && UUID.test(cityId)) enqueue({ type: "city_view", cityId });
}

/** A search ran; the query itself is never sent. */
export function trackSearch(): void {
  enqueue({ type: "search" });
}

export function trackPlaceAction(
  type: "directions" | "save" | "share",
  placeId: string | undefined | null,
): void {
  if (placeId && UUID.test(placeId)) enqueue({ type, placeId });
}
