"use client";

import { isTrackingAllowed, sendTrackingBatch } from "@/lib/analytics/track";
import { isAdCampaignId, type AdPlacement } from "./placements";

type AdEvent = { eventId: string; campaignId: string; type: "impression" | "tap"; placement: AdPlacement; occurredAt: string };
type Delivery = { groups: AdEvent[][]; attempts: number };
const DEDUPE_MS = 30 * 60_000;
const MAX_WAITING_EVENTS = 500;
const MAX_QUALIFICATIONS = 1000;
let pageDeviceId: string | null = null;

function uuid(): string {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch {}
  const bytes = new Uint8Array(16);
  try {
    window.crypto.getRandomValues(bytes);
  } catch {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function adsAllowed(): boolean {
  return isTrackingAllowed() && typeof document !== "undefined" && !(document as Document & { prerendering?: boolean }).prerendering &&
    !/bot|crawler|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent);
}

export function createAdTracker() {
  const queue: AdEvent[][] = [];
  const qualified = new Map<string, AdEvent | null>();
  const confirmed = new WeakSet<AdEvent>();
  const pending: Delivery[] = [];
  const handoffs = new Set<Delivery>();
  let active: Delivery | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;

  function fresh(event: AdEvent) {
    return Date.now() - Date.parse(event.occurredAt) < DEDUPE_MS;
  }

  function retained(group: AdEvent[]) {
    return group.filter((event) => fresh(event) && (event.type !== "impression" || !confirmed.has(event)));
  }

  function prune() {
    for (const [key, event] of qualified) if (event && !fresh(event)) qualified.set(key, null);
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      queue[index] = retained(queue[index]);
      if (!queue[index].length) queue.splice(index, 1);
    }
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      pending[index].groups = pending[index].groups.map(retained).filter((group) => group.length);
      if (!pending[index].groups.length) pending.splice(index, 1);
    }
    if (active) active.groups = active.groups.map(retained).filter((group) => group.length);
    for (const delivery of handoffs) delivery.groups = delivery.groups.map(retained).filter((group) => group.length);
    let waiting = queue.reduce((size, group) => size + group.length, 0) +
      pending.reduce((size, delivery) => size + delivery.groups.flat().length, 0) +
      Array.from(handoffs).reduce((size, delivery) => size + delivery.groups.flat().length, 0);
    while (waiting > MAX_WAITING_EVENTS) {
      const oldest = pending[0]?.groups ?? queue;
      waiting -= oldest.shift()!.length;
      if (pending[0] && !pending[0].groups.length) pending.shift();
    }
    if (expiryTimer === null && (queue.length || pending.length || Array.from(qualified.values()).some(Boolean))) {
      expiryTimer = setTimeout(() => { expiryTimer = null; prune(); }, 60_000);
    }
  }

  function body(delivery: Delivery) {
    const events = delivery.groups.flatMap(retained);
    return { platform: "web", deviceId: pageDeviceId, events };
  }

  function acknowledge(delivery: Delivery, ok: boolean) {
    if (ok) for (const event of delivery.groups.flat()) if (event.type === "impression") confirmed.add(event);
  }

  function pump() {
    prune();
    if (active || !pending.length) return;
    if (!adsAllowed()) {
      pending.length = 0;
      return;
    }
    const delivery = pending.shift()!;
    active = delivery;
    void sendTrackingBatch("/v1/ads/events", body(delivery), true).then((ok) => {
      acknowledge(delivery, ok);
      if (!ok && delivery.attempts === 0 && adsAllowed()) pending.unshift({ ...delivery, attempts: 1 });
      if (active === delivery) active = null;
      pump();
    });
  }

  function flush(navigationSafe = false) {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    prune();
    if (!adsAllowed() || !pageDeviceId) {
      queue.length = 0;
      pending.length = 0;
      return;
    }
    while (queue.length) {
      const groups: AdEvent[][] = [];
      let size = 0;
      while (queue.length && size + queue[0].length <= 50) {
        const group = queue.shift()!;
        groups.push(group);
        size += group.length;
      }
      pending.push({ groups, attempts: 0 });
    }
    if (navigationSafe) {
      pump();
      while (pending.length && handoffs.size < MAX_WAITING_EVENTS) {
        const delivery = pending.shift()!;
        const batch = body(delivery);
        if (!batch.events.length) continue;
        handoffs.add(delivery);
        void sendTrackingBatch("/v1/ads/events", batch, true).then((ok) => {
          handoffs.delete(delivery);
          acknowledge(delivery, ok);
          if (!ok && delivery.attempts === 0 && adsAllowed()) {
            pending.push({ ...delivery, attempts: 1 });
          }
          flush(true);
        });
      }
    } else pump();
  }

  function track(campaignId: string, placement: AdPlacement, type: AdEvent["type"], bucket: number | null) {
    if (!adsAllowed() || !isAdCampaignId(campaignId)) return;
    if (bucket === null || !Number.isSafeInteger(bucket) || bucket < 0) return;
    prune();
    const key = `${campaignId}:${placement}:${bucket}`;
    if (type === "impression" && (qualified.has(key) || qualified.size >= MAX_QUALIFICATIONS)) return;
    if (type === "tap" && !qualified.has(key)) return;
    if (!pageDeviceId) pageDeviceId = uuid();
    const event: AdEvent = { eventId: uuid(), campaignId, type, placement, occurredAt: new Date().toISOString() };
    if (type === "impression") {
      qualified.set(key, event);
      queue.push([event]);
    } else {
      const impression = qualified.get(key);
      const queued = queue.findIndex((group) => group.length === 1 && group[0] === impression);
      if (queued >= 0) queue.splice(queued, 1);
      queue.push(!impression || confirmed.has(impression) ? [event] : [impression, event]);
    }
    prune();
    if (type === "tap") flush();
    else if (queue.length >= 10) flush();
    else if (timer === null) timer = setTimeout(() => flush(), 5000);
  }

  function listen() {
    const onHidden = () => { if (document.visibilityState === "hidden") flush(true); };
    const onPageHide = () => flush(true);
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      flush(true);
      if (expiryTimer !== null) clearTimeout(expiryTimer);
      expiryTimer = null;
    };
  }

  return { track, flush, listen };
}

export type AdTracker = ReturnType<typeof createAdTracker>;

export function observeSponsoredImpression(
  element: Element,
  campaignId: string | null,
  placement: AdPlacement,
  bucket: number | null,
  tracker: AdTracker,
  onQualified?: () => void,
): () => void {
  if (!campaignId || bucket === null || typeof IntersectionObserver === "undefined") return () => undefined;
  let visible = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let tracked = false;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const update = () => {
    if (!visible || document.visibilityState !== "visible" || !adsAllowed()) {
      cancel();
      return;
    }
    if (timer !== null || tracked) return;
    timer = setTimeout(() => {
      timer = null;
      const records = observer.takeRecords();
      let interrupted = false;
      for (const entry of records) {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        if (!visible) interrupted = true;
      }
      if (interrupted) {
        update();
        return;
      }
      if (!visible || document.visibilityState !== "visible" || !adsAllowed()) return;
      tracked = true;
      onQualified?.();
      tracker.track(campaignId, placement, "impression", bucket);
    }, 1000);
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      if (!visible) cancel();
    }
    update();
  }, { threshold: [0, 0.5, 1] });
  observer.observe(element);
  document.addEventListener("visibilitychange", update);
  return () => {
    cancel();
    observer.disconnect();
    document.removeEventListener("visibilitychange", update);
  };
}
