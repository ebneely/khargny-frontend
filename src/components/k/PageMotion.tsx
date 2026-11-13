'use client';
// Page push/pop (proto renderBase): a deeper page slides in from the trailing edge over the old one, which slides a quarter
// under and dims; back is the exact reverse. Tabs do not move. Desktop only: on a phone a place is a sheet, not a page.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { animate } from 'motion';
import { isPlacePath } from './data';
import { desk, reduce, spring } from './KProvider';

const depthOf = (path: string) => (isPlacePath(path) ? 1 : 0);
type Ghost = { clip: HTMLDivElement; ghost: HTMLElement; width: number; from: number };

export function PageMotion() {
  const pathname = usePathname();
  const pending = useRef<Ghost | null>(null);
  const last = useRef(depthOf(pathname));
  useEffect(() => {
    // keep a picture of the page that is about to go
    const capture = () => {
      if (!desk() || reduce() || pending.current) return;
      const view = document.getElementById('view'); if (!view) return;
      const r = view.getBoundingClientRect(), ghost = view.cloneNode(true) as HTMLElement; ghost.removeAttribute('id');
      const clip = document.createElement('div');
      Object.assign(clip.style, { position: 'fixed', left: r.left + 'px', top: '0', width: r.width + 'px', height: innerHeight + 'px', overflow: 'hidden', pointerEvents: 'none' });
      Object.assign(ghost.style, { position: 'absolute', left: '0', top: r.top + 'px', width: r.width + 'px', margin: '0', pointerEvents: 'none', background: 'var(--bg)' });
      clip.append(ghost); pending.current = { clip, ghost, width: r.width, from: depthOf(location.pathname) };
      setTimeout(() => { pending.current = null; }, 4000); // a navigation that never happened leaves nothing behind
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null; if (!a || a.target) return;
      const url = new URL(a.href, location.href); if (url.origin === location.origin && depthOf(url.pathname) !== depthOf(location.pathname)) capture();
    };
    document.addEventListener('click', onClick); addEventListener('popstate', capture);
    return () => { document.removeEventListener('click', onClick); removeEventListener('popstate', capture); };
  }, []);
  useLayoutEffect(() => {
    const d = depthOf(pathname), g = pending.current; pending.current = null;
    const was = last.current; last.current = d;
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
      view.style.clipPath = `inset(0 0 0 ${W * 0.25}px)`;
      animate(view, { clipPath: [`inset(0 0 0 ${W * 0.25}px)`, 'inset(0 0 0 0px)'] }, sp);
      animate(view, { transform: [`translateX(${-W * 0.25 * dir}px)`, 'translateX(0px)'], opacity: [0.6, 1] }, sp);
      animate(g.ghost, { transform: ['translateX(0px)', `translateX(${W * dir}px)`] }, sp).finished.then(cleanup);
    }
  }, [pathname]);
  return null;
}
