"use client";

import { fetchApi } from "@/lib/api/transport";
import { geoCell } from "@5argny/core/rules";

/**
 * Audience analytics for the web: page, place and city views plus intent actions.
 *
 * Privacy: the browser is identified only by the backend's own HttpOnly guest cookie (sent
 * with `credentials: "include"`), which the backend hashes on arrival. This code sends no
 * id or personal data. Search result clicks include the searched term. Events are batched (every 5 s, at 10 events,
 * and when the tab is hidden) and failures are dropped silently: analytics never affects
 * the page.
 */

type AnalyticsEvent =
  | { type: "page_view"; path: string }
  | { type: "place_view"; placeId: string }
  | { type: "city_view"; cityId: string }
  | { type: "search" }
  | { type: "search_click"; term: string; placeId: string; position: number; cityId?: string; locale: 'ar' | 'en' }
  | { type: "directions" | "save" | "share"; placeId: string };

type Queued = AnalyticsEvent & { occurredAt: string; locale?: "ar" | "en" };

const FLUSH_MS = 5_000;
const FLUSH_AT = 10;
const MAX_BATCH = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const queue: Queued[] = [];
// The device's position when the page already knows it (never asked for analytics): rides on the next batch, once per
// visit (30 min) and again when it moves to another ~1 km cell.
type Geo = { lat: number; lng: number; accuracyM?: number };
let geo: Geo | null = null;
let geoSent: { cell: string; at: number } | null = null;
const VISIT_MS = 30 * 60_000;

/** The position is known (Near you, Nearest, Surprise me, Take me out); kept rounded to 2 decimals. */
export function setAnalyticsGeo(p: { lat: number; lng: number }, accuracyM?: number): void {
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
  geo = { ...geoCell(p), ...(Number.isFinite(accuracyM) ? { accuracyM: Math.round(accuracyM!) } : {}) };
}
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

export function isTrackingAllowed(): boolean {
  return typeof window !== "undefined" && typeof navigator !== 'undefined' && navigator.doNotTrack !== "1" &&
    !(navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl;
}

export function sendTrackingBatch(path: string, body: unknown, keepalive: boolean): Promise<boolean> {
  try {
    return fetchApi(path, {
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
  const cell = geo ? `${geo.lat},${geo.lng}` : null;
  const attach = cell && (geoSent?.cell !== cell || Date.now() - geoSent.at > VISIT_MS) ? geo : null;
  if (attach) geoSent = { cell: cell!, at: Date.now() };
  sendTrackingBatch("/v1/analytics/events", { platform: "web", events, ...(attach ? { geo: attach } : {}) }, keepalive).then((ok) => {
    if (attach && !ok) geoSent = null; // try again with the next batch
  });
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
  // every event says which language the visit is in (the dashboard Language card); an explicit one wins
  queue.push({ locale: document.documentElement.lang?.startsWith("ar") ? "ar" : "en", ...event, occurredAt: new Date().toISOString() });
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

export function trackSearchClick(term: string, placeId: string, position: number, locale: 'ar' | 'en', cityId?: string): void {
  if (!term.trim() || !UUID.test(placeId) || !Number.isInteger(position) || position < 1 || position > 1000) return;
  enqueue({ type: 'search_click', term: term.trim().slice(0, 256), placeId, position, ...(cityId ? { cityId } : {}), locale });
  flushAnalytics(true);
}

export function trackPlaceAction(
  type: "directions" | "save" | "share",
  placeId: string | undefined | null,
): void {
  if (placeId && UUID.test(placeId)) enqueue({ type, placeId });
}
