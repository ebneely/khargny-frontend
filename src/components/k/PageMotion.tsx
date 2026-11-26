'use client';
// Page push/pop (proto renderBase): a deeper page slides in from the trailing edge over the old one, which slides a quarter
// under and dims; back is the exact reverse (desktop only: on a phone a place is a sheet, not a page).
// Pages at the same depth (the tabs, Explore to Saved...) cross over like an app (owner 2026-11-14): the old content fades
// out the moment you tap, the new one fades in and rises 12 px on a critically damped spring. Only the page column moves;
// the frame (top bar, sidebar, tab bar) is mounted once and never animates. Opacity and transform only.
// Cost (PERF-AUDIT 7): the picture of the old page is the viewport's own content and nothing in it animates; the reveal
// edge is the ghost's own slide (its clip hides what is left behind), and its 32 px shadow is a thin layer that only
// translates. Nothing on the page is clipped or shadowed per frame. It also warms the next Explore list on pointer-down.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { animate } from 'motion';
import { isSheetPath } from './data';
import { readF, usePrefetchList } from './filters';
import { prefetchSheetChunks } from './sheets';
import { desk, reduce, spring } from './KProvider';

// proto renderBase depths: a place, collection, listing or host and Report a problem are 1; a correction is 2
const depthOf = (path: string) => (/\/correct\/?$/.test(path) ? 2 : isSheetPath(path) || /\/settings\/report\/?$/.test(path) ? 1 : 0);
type Ghost = { clip: HTMLDivElement; ghost: HTMLElement; left: number; width: number; from: number };
let fading: Animation | null = null; // the old page's fade-out, waiting for the new page
const crossable = (to: string) => to !== location.pathname && depthOf(to) === depthOf(location.pathname) && !(isSheetPath(to) && !desk());

/** The clip shows one viewport: drop every subtree that is entirely off it, so the clone is the picture, not the page. */
function prune(src: Element, dst: Element) {
  const s = src.children, d = dst.children;
  for (let i = 0, j = 0; i < s.length; i++) {
    const b = s[i].getBoundingClientRect();
    if (b.bottom < -80 || b.top > innerHeight + 80) { d[j]?.remove(); continue; }
    const kept = d[j]; if (kept) prune(s[i], kept);
    j++;
  }
}

/** The moving edge's 32 px shadow as its own composited strip: it slides with the page and never makes the page repaint. */
function edgeShadow(g: Ghost, dir: number, z: number) {
  const shade = document.createElement('div');
  Object.assign(shade.style, {
    position: 'fixed', left: (dir === 1 ? g.left : g.left + g.width) + 'px', top: '0', width: '0', height: innerHeight + 'px',
    pointerEvents: 'none', zIndex: String(z), willChange: 'transform', boxShadow: `${-12 * dir}px 0 32px rgba(36,28,22,.14)`,
  });
  document.body.append(shade);
  return shade;
}

export function PageMotion() {
  const pathname = usePathname();
  const pending = useRef<Ghost | null>(null);
  const last = useRef(depthOf(pathname));
  const first = useRef(true); // the first paint of the site does not animate
  const prefetch = usePrefetchList();
  // the sheet bodies' chunks come down once the page is idle: a tap on a card never waits for the code
  useEffect(() => {
    if ('requestIdleCallback' in window) { const id = window.requestIdleCallback(() => prefetchSheetChunks(), { timeout: 4000 }); return () => window.cancelIdleCallback(id); }
    const t = setTimeout(prefetchSheetChunks, 1500); return () => clearTimeout(t);
  }, []);
  // a tap on Explore (the tab, a shortcut, an intent) warms that screen's list before the route work starts
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null; if (!a || a.target) return;
      const url = new URL(a.href, location.href); if (url.origin !== location.origin) return;
      const parts = url.pathname.replace(/^\/ar(?=\/|$)/, '').split('/').filter(Boolean);
      if (parts[0] !== 'explorer' || parts.length > 2 || url.searchParams.get('q')) return; // a search and a place page ask their own
      prefetch(readF(url.searchParams));
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, [prefetch]);
  useEffect(() => {
    // keep a picture of the page that is about to go
    const capture = () => {
      if (!desk() || reduce() || pending.current) return;
      const view = document.getElementById('view'); if (!view) return;
      const r = view.getBoundingClientRect(), ghost = view.cloneNode(true) as HTMLElement; ghost.removeAttribute('id');
      prune(view, ghost); // off-screen tiles are never painted: they stay out of the clone
      const clip = document.createElement('div');
      Object.assign(clip.style, { position: 'fixed', left: r.left + 'px', top: '0', width: r.width + 'px', height: innerHeight + 'px', overflow: 'hidden', pointerEvents: 'none' });
      Object.assign(ghost.style, { position: 'absolute', left: '0', top: r.top + 'px', width: r.width + 'px', margin: '0', pointerEvents: 'none', background: 'var(--bg)' });
      clip.append(ghost); pending.current = { clip, ghost, left: r.left, width: r.width, from: depthOf(location.pathname) };
      setTimeout(() => { pending.current = null; }, 4000); // a navigation that never happened leaves nothing behind
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null; if (!a || a.target) return;
      const url = new URL(a.href, location.href); if (url.origin !== location.origin) return;
      if (depthOf(url.pathname) !== depthOf(location.pathname)) capture();
      else if (crossable(url.pathname) && !reduce() && !document.documentElement.classList.contains('sheet-open')) {
        const view = document.getElementById('view'); if (!view) return;
        fading?.cancel(); fading = view.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: 'ease-out', fill: 'forwards' });
        const mine = fading; setTimeout(() => { if (fading === mine && document.contains(view)) { mine.cancel(); fading = null; } }, 1500); // the page never came: show the old one again
      }
    };
    document.addEventListener('click', onClick); addEventListener('popstate', capture);
    return () => { document.removeEventListener('click', onClick); removeEventListener('popstate', capture); };
  }, []);
  useLayoutEffect(() => {
    const d = depthOf(pathname), g = pending.current; pending.current = null;
    const was = last.current; last.current = d;
    if (first.current) { first.current = false; return; }
    if (!g && d === was && !(isSheetPath(pathname) && !desk())) { // same depth: the new page fades in and rises
      fading = null; if (reduce()) return;
      const rise = (view: HTMLElement) => animate(view, { opacity: [0, 1], transform: ['translateY(12px)', 'translateY(0px)'] }, spring(0, 0.35)).finished.then(() => { view.style.transform = ''; });
      const view = document.getElementById('view'); if (!view) return;
      // a page still loading shows an empty column (aria-busy): keep it hidden and rise the real page when it replaces it,
      // so the content moves once, not twice (the Explore stutter)
      if (view.getAttribute('aria-busy') !== 'true') { rise(view); return; }
      view.style.opacity = '0';
      const box = view.parentElement; if (!box) return;
      const mo = new MutationObserver(() => { const v = document.getElementById('view'); if (v && v.getAttribute('aria-busy') !== 'true') { mo.disconnect(); clearTimeout(t); rise(v); } });
      const t = setTimeout(() => mo.disconnect(), 4000);
      mo.observe(box, { childList: true });
      return;
    }
    if (!g || d === was || g.from === d) return;
    const view = document.getElementById('view'); if (!view) return;
    const dir = document.documentElement.dir === 'rtl' ? -1 : 1, W = g.width, sp = spring(0, 0.45);
    const cleanup = () => { g.clip.remove(); view.style.transform = ''; view.style.position = ''; view.style.zIndex = ''; view.style.background = ''; };
    if (d > was) {
      g.clip.style.zIndex = '0'; document.body.append(g.clip);
      g.ghost.getAnimations({ subtree: true }).forEach((a) => a.cancel()); // the picture is a still: no loops, no live pills
      const shade = edgeShadow(g, dir, 1);
      Object.assign(view.style, { position: 'relative', zIndex: '2', background: 'var(--bg)' });
      animate(g.ghost, { transform: ['translateX(0px)', `translateX(${-W * 0.25 * dir}px)`], opacity: [1, 0.6] }, sp);
      animate(shade, { transform: [`translateX(${W * dir}px)`, 'translateX(0px)'] }, sp);
      animate(view, { transform: [`translateX(${W * dir}px)`, 'translateX(0px)'] }, sp).finished.then(() => { shade.remove(); cleanup(); });
    } else {
      g.clip.style.zIndex = '25'; document.body.append(g.clip);
      g.ghost.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      const shade = edgeShadow(g, dir, 24);
      animate(shade, { transform: ['translateX(0px)', `translateX(${W * dir}px)`] }, sp);
      animate(view, { opacity: [0.6, 1] }, sp);
      animate(g.ghost, { transform: ['translateX(0px)', `translateX(${W * dir}px)`] }, sp).finished.then(() => { shade.remove(); cleanup(); });
    }
  }, [pathname]);
  return null;
}
