'use client';
// The first-visit prompt of getapp.tsx, in its own chunk: it waits for the page to be idle, then for its moment
// (about 2 s or the first scroll, never over a form, a sheet or the love-gesture hint).
import { useEffect } from 'react';
import { DAYS_30, KEY, useOpenGetApp } from './getapp';

const toastUp = () => [...document.querySelectorAll('.toast')].some((t) => Number(getComputedStyle(t).opacity) > 0.05);
const busy = () => !!document.querySelector('form, .sheet') || toastUp() // first visit also teaches the love gesture: wait for it
  || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
const offLimits = () => /\/(correct|report)\/?$/.test(location.pathname);

export function GetAppSheet() {
  const openGetApp = useOpenGetApp();
  useEffect(() => {
    try { if (Date.now() - Number(localStorage.getItem(KEY) ?? 0) < DAYS_30) return; } catch { return; }
    let done = false, t: ReturnType<typeof setTimeout>;
    // a first visit also shows the love-gesture hint toast at 2.5 s (Gestures.tsx kh.loveHint): come up after it, not under it
    const earliest = Date.now() + (localStorage.getItem('kh.loveHint') ? 0 : 4600);
    const show = () => {
      if (done || offLimits()) return;
      const wait = Math.max(earliest - Date.now(), busy() ? 1000 : 0); // never over the love-gesture hint or anything else
      if (wait) { clearTimeout(t); t = setTimeout(show, wait); return; }
      done = true; cleanup();
      try { localStorage.setItem(KEY, String(Date.now())); } catch {}
      openGetApp();
    };
    t = setTimeout(show, 2000);
    const cleanup = () => { clearTimeout(t); removeEventListener('scroll', show); };
    addEventListener('scroll', show, { passive: true, once: true });
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per page load
  return null;
}
