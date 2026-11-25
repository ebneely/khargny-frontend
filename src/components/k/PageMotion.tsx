'use client';
// Page push/pop (proto renderBase): a deeper page slides in from the trailing edge over the old one, which slides a quarter
// under and dims; back is the exact reverse (desktop only: on a phone a place is a sheet, not a page).
// Pages at the same depth (the tabs, Explore to Saved...) cross over like an app (owner 2026-11-14): the old content fades
// out the moment you tap, the new one fades in and rises 12 px on a critically damped spring. Only the page column moves;
// the frame (top bar, sidebar, tab bar) is mounted once and never animates. Opacity and transform only.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { animate } from 'motion';
import { isSheetPath } from './data';
import { desk, reduce, spring } from './KProvider';

// proto renderBase depths: a place, collection, listing or host and Report a problem are 1; a correction is 2
const depthOf = (path: string) => (/\/correct\/?$/.test(path) ? 2 : isSheetPath(path) || /\/settings\/report\/?$/.test(path) ? 1 : 0);
type Ghost = { clip: HTMLDivElement; ghost: HTMLElement; width: number; from: number };
let fading: Animation | null = null; // the old page's fade-out, waiting for the new page
const crossable = (to: string) => to !== location.pathname && depthOf(to) === depthOf(location.pathname) && !(isSheetPath(to) && !desk());

export function PageMotion() {
  const pathname = usePathname();
  const pending = useRef<Ghost | null>(null);
  const last = useRef(depthOf(pathname));
  const first = useRef(true); // the first paint of the site does not animate
  useEffect(() => {
    // keep a picture of the page that is about to go
    const capture = () => {
      if (!desk() || reduce() || pending.current) return;
      const view = document.getElementById('view'); if (!view) return;
      const r = view.getBoundingClientRect(), ghost = view.cloneNode(true) as HTMLElement; ghost.removeAttribute('id');
      // the ghost is one still frame: its loops stand still and the cards far below the screen are dropped, so cloning a
      // long page does not copy work nobody sees (issue #39). CSS in web.css freezes every animation inside .pm-ghost.
      ghost.classList.add('pm-ghost'); ghost.setAttribute('aria-hidden', 'true');
      ghost.querySelectorAll('.tile, .post, .rail-row > *, .tm-pick').forEach((el, index) => { if (index >= 12) el.remove(); });
      const clip = document.createElement('div');
      Object.assign(clip.style, { position: 'fixed', left: r.left + 'px', top: '0', width: r.width + 'px', height: innerHeight + 'px', overflow: 'hidden', pointerEvents: 'none' });
      Object.assign(ghost.style, { position: 'absolute', left: '0', top: r.top + 'px', width: r.width + 'px', margin: '0', pointerEvents: 'none', background: 'var(--bg)' });
      clip.append(ghost); pending.current = { clip, ghost, width: r.width, from: depthOf(location.pathname) };
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
    const cleanup = () => { g.clip.remove(); view.style.clipPath = ''; view.style.boxShadow = ''; view.style.transform = ''; view.style.position = ''; view.style.zIndex = ''; view.style.background = ''; };
    if (d > was) {
      g.clip.style.zIndex = '0'; document.body.append(g.clip);
      Object.assign(view.style, { position: 'relative', zIndex: '1', clipPath: 'inset(0 -40px 0 0)', background: 'var(--bg)', boxShadow: `${-12 * dir}px 0 32px rgba(36,28,22,.14)` });
      animate(g.ghost, { transform: ['translateX(0px)', `translateX(${-W * 0.25 * dir}px)`], opacity: [1, 0.6] }, sp);
      animate(view, { transform: [`translateX(${W * dir}px)`, 'translateX(0px)'] }, sp).finished.then(cleanup);
    } else {
      g.clip.style.zIndex = '25'; g.ghost.style.boxShadow = '-12px 0 32px rgba(36,28,22,.14)'; document.body.append(g.clip);
      // the incoming page slides in from under the old one: transform and opacity only (a clip-path animation repainted
      // the whole page column every frame, issue #39)
      animate(view, { transform: [`translateX(${-W * 0.25 * dir}px)`, 'translateX(0px)'], opacity: [0.6, 1] }, sp);
      animate(g.ghost, { transform: ['translateX(0px)', `translateX(${W * dir}px)`] }, sp).finished.then(cleanup);
    }
  }, [pathname]);
  return null;
}
