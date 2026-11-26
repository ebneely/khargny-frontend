'use client';
// Real driving km from our own OSRM engine (POST /v1/places/road-distance). One batched call per list render for the
// cards on screen, at most 50 ids a call; the person's position rides in the body, never in a query string. Until an
// answer arrives, and if the engine is off, slow or broken, every card keeps its straight-line "~N km".
import { useEffect, useSyncExternalStore } from 'react';
import {
  movedEnough,
  readRoadAnswer,
  roadBatches,
  type RoadKm,
} from '@5argny/core/rules';
import { apiRequest } from '@/lib/api/client';

export type { RoadKm };

/** Cards mounted in one render are collected for this long, then asked for together. */
const COALESCE_MS = 120;
/** The endpoint answers in ~400 ms or not at all; the browser gives it a little room, then keeps the fallback. */
const TIMEOUT_MS = 1_500;
/** A failed engine stays quiet instead of being asked again under every card. */
const COOLDOWN_MS = 60_000;

type Here = { lat: number; lng: number };

let values: Record<string, RoadKm> = {};
/** The spot the values belong to; null until the person shares a position. */
let here: Here | null = null;
/** Ids on screen right now (every card registers itself). */
const wanted = new Set<string>();
/** Ids already asked for at this spot: a place with no road answer is not asked again and again. */
let asked = new Set<string>();
/** Ids the engine gave no answer for at this spot (missing, error or timeout): they show the straight-line "~N km". */
let failed = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let cooldownUntil = 0;

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, COALESCE_MS);
}

async function flush() {
  if (running || !here || Date.now() < cooldownUntil) return;
  const [batch] = roadBatches(
    [...wanted].filter((id) => !values[id] && !asked.has(id)),
  );
  if (!batch?.length) return;
  batch.forEach((id) => asked.add(id));
  running = true;
  try {
    const answer = readRoadAnswer(
      await apiRequest<unknown>('POST', '/v1/places/road-distance', {
        body: { lat: here.lat, lng: here.lng, ids: batch },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
    if (Object.keys(answer).length) values = { ...values, ...answer };
    // An empty answer means the feature is off for this deploy: keep "~N km" and stop asking.
    else cooldownUntil = Date.now() + COOLDOWN_MS;
    const missed = batch.filter((id) => !answer[id]);
    if (missed.length) failed = new Set([...failed, ...missed]);
    notify();
  } catch {
    cooldownUntil = Date.now() + COOLDOWN_MS;
    failed = new Set([...failed, ...batch]);
    notify();
  } finally {
    running = false;
    if ([...wanted].some((id) => !values[id] && !asked.has(id))) schedule();
  }
}

/**
 * The road km to one place, or null while there is none. `pos` is the person's position (already coarse to ~100 m);
 * a move of more than 100 m drops the old answers, because they belong to the old spot.
 */
export function useRoadKm(
  id: string | null,
  pos: { lat: number; lng: number } | null,
): RoadKm | null {
  const lat = pos?.lat;
  const lng = pos?.lng;
  useEffect(() => {
    if (!id || lat == null || lng == null) return;
    if (movedEnough(here, { lat, lng })) {
      here = { lat, lng };
      values = {};
      asked = new Set();
      failed = new Set();
      notify();
    }
    wanted.add(id);
    schedule();
    return () => {
      wanted.delete(id);
    };
  }, [id, lat, lng]);
  return useSyncExternalStore(
    subscribe,
    () => (id ? (values[id] ?? null) : null),
    () => null,
  );
}

/**
 * The road km and whether it is still on its way. While `waiting`, a card shows no figure (a blank of the same width), so
 * the straight line is never shown first and then replaced by a bigger road number (owner 2026-11-26). After a failure,
 * a timeout (1.5 s) or with the engine off, `waiting` is false and the card shows its straight-line "~N km".
 */
export function useRoadState(
  id: string | null,
  pos: { lat: number; lng: number } | null,
): { road: RoadKm | null; waiting: boolean } {
  const road = useRoadKm(id, pos);
  const waiting = useSyncExternalStore(
    subscribe,
    () => !!id && !!pos && !values[id] && !failed.has(id) && Date.now() >= cooldownUntil,
    () => false,
  );
  return { road, waiting: !road && waiting };
}
