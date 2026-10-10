'use client';

import { useEffect, useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { createPhotoTap } from '@/lib/like-interaction';
import { dropPhotoLike } from '@/lib/like-effects';
import { likeStore } from '@/lib/likes';

export function usePhotoLike(placeId?: string) {
  const identifier = useRef(placeId);
  const single = useRef<() => void>(() => {});
  const host = useRef<HTMLElement | null>(null);
  const down = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragged = useRef(false);
  const pointerClick = useRef(false);
  const replaying = useRef(false);
  const taps = useRef<ReturnType<typeof createPhotoTap> | null>(null);
  const flight = useRef<(() => void) | undefined>(undefined);
  useEffect(() => { identifier.current = placeId; taps.current?.cancel(); flight.current?.(); }, [placeId]);
  useEffect(() => {
    taps.current = createPhotoTap(() => {
      replaying.current = true;
      try { single.current(); } finally { replaying.current = false; }
    }, point => {
      if (!identifier.current || !likeStore.enabled()) { single.current(); return; }
      if (host.current) flight.current = dropPhotoLike(host.current, point, identifier.current);
    });
    return () => { taps.current?.cancel(); flight.current?.(); };
  }, []);
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      pointerClick.current = true;
      if (down.current && event.pointerId !== down.current.id) { dragged.current = true; taps.current?.cancel(); return; }
      down.current = { x: event.clientX, y: event.clientY, id: event.pointerId }; dragged.current = false;
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (down.current && Math.hypot(event.clientX - down.current.x, event.clientY - down.current.y) > 8) { dragged.current = true; taps.current?.cancel(); }
    },
    onPointerCancel() { dragged.current = true; pointerClick.current = false; down.current = null; taps.current?.cancel(); },
    onPointerUp() { down.current = null; },
    click(event: MouseEvent<HTMLElement>, open: () => void, surface: HTMLElement = event.currentTarget) {
      const pointer = pointerClick.current || (event.nativeEvent && 'pointerType' in event.nativeEvent && event.nativeEvent.pointerType === 'touch');
      pointerClick.current = false;
      if (replaying.current) return false;
      if ((pointer || event.detail !== 0) && dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; return true; }
      if ((!pointer && event.detail === 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !placeId || !likeStore.enabled()) return false;
      event.preventDefault(); event.stopPropagation();
      single.current = open; host.current = surface;
      taps.current?.tap({ x: event.clientX, y: event.clientY }); return true;
    },
    cancel() { dragged.current = true; taps.current?.cancel(); },
  };
}
