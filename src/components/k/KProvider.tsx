'use client';
// One client context for the 5argny shell: language and copy, "now", the location bar, the sheet stack, the toast,
// and the document-level behaviours the prototype binds once (press feedback, bars that hide on scroll, theme).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { langPrefix } from '@5argny/core/rules/locale';
import { usePathname, useRouter } from 'next/navigation';
import { animate } from 'motion';
import { copy } from '@5argny/core/copy';
import { nowIn, type Lang, type Now } from './rules';
import { isSheetPath } from './data';

export type Tab = 'home' | 'explore' | 'market' | 'saved' | 'profile';
export type SheetEntry = { id: number; kind: 'action' | 'content'; label: string; head?: ReactNode; body: ReactNode; foot?: ReactNode; closing?: number };
type Content = { keys: string[]; dir: 1 | -1; landed?: boolean } | null;

type Ctx = {
  lang: Lang; c: (typeof copy)['en']; now: Now; time: string | null;
  tab: Tab; setTab: (t: Tab) => void;
  loc: { city: string | null; area: string | null }; setLoc: (l: { city: string | null; area: string | null }) => void;
  toast: (msg: string) => void;
  sheets: SheetEntry[]; openSheet: (label: string, body: ReactNode, foot?: ReactNode) => void; closeTop: (velocity?: number) => void;
  removeSheet: (id: number) => void;
  /** close every sheet, the content sheet's history steps included (proto closeContent), then run `then` on the page underneath */
  dismissAll: (then?: () => void) => void;
  /** close the action sheets only, leaving a content sheet open (proto report-send) */
  dismissActions: () => void;
  content: Content;
  /** open a site link: a place on a phone becomes a sheet over this page, anything else navigates */
  go: (href: string) => void;
  /** phone, landed on a place: the place comes up as a sheet over Home, as the prototype does */
  openLanded: (path: string) => void;
};
const K = createContext<Ctx | null>(null);
export const useK = () => { const v = useContext(K); if (!v) throw new Error('useK outside KProvider'); return v; };

export const reduce = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const spring = (bounce = 0, duration = 0.38) => (reduce() ? { duration: 0.15 } : { type: 'spring' as const, bounce, duration });
export const desk = () => typeof window !== 'undefined' && matchMedia('(min-width:1024px)').matches;
export const haptic = () => { try { navigator.vibrate?.(8); } catch {} };

let nextId = 1;

export function KProvider({ lang, time, initialTab, children }: { lang: Lang; time: string | null; initialTab: Tab; children: ReactNode }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loc, setLoc] = useState<{ city: string | null; area: string | null }>({ city: null, area: null });
  const [sheets, setSheets] = useState<SheetEntry[]>([]);
  const [content, setContent] = useState<Content>(null);
  const sheetsRef = useRef(sheets);
  const contentRef = useRef(content);
  useEffect(() => { sheetsRef.current = sheets; contentRef.current = content; }, [sheets, content]);
  const now = useMemo(() => nowIn(time), [time]);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((msg: string) => {
    let el = document.querySelector<HTMLElement>('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    // each sentence stays whole: a toast too long for a phone breaks between its sentences, never inside one
    el.replaceChildren(...msg.split(/(?<=\.)\s+/).map((part, i) => { const sp = document.createElement('span'); sp.textContent = (i ? ' ' : '') + part; sp.style.display = 'inline-block'; return sp; }));
    animate(el, { opacity: [0, 1], transform: ['translate(-50%,12px)', 'translate(-50%,0)'] }, spring(0, 0.3));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => el && animate(el, { opacity: 0, transform: 'translate(-50%,12px)' }, spring(0, 0.3)), 1700);
  }, []);

  const openSheet = useCallback((label: string, body: ReactNode, foot?: ReactNode) => {
    setSheets((s) => [...s, { id: nextId++, kind: 'action', label, body, foot }]);
  }, []);
  // closing is two steps: mark it (the sheet springs away), then the sheet removes itself when it is gone
  const dismiss = useCallback((id: number, velocity = 0) => setSheets((s) => s.map((x) => (x.id === id ? { ...x, closing: velocity || 0.0001 } : x))), []);
  const removeSheet = useCallback((id: number) => setSheets((s) => s.filter((x) => x.id !== id)), []);
  // landed on the sheet's page: the page under it (Home) takes the address in place, so closing adds no Back step (proto location.replace)
  const homeOnPop = useRef(false);
  const closeLanded = useCallback((velocity = 0) => {
    // the screen under the sheet takes the address: the Marketplace for a listing or a host, Home otherwise (proto route())
    const first = contentRef.current?.keys[0] ?? '';
    history.replaceState(history.state, '', /^(\/ar)?\/(marketplace|host)\//.test(first) ? `${langPrefix(lang)}/marketplace/` : `${langPrefix(lang)}/`); setContent(null); contentRef.current = null;
    setSheets((s) => s.map((x) => (x.closing ? x : { ...x, closing: velocity || 0.0001 })));
  }, [lang]);
  const closeTop = useCallback((velocity = 0) => {
    const open = sheetsRef.current.filter((x) => !x.closing); const top = open[open.length - 1]; if (!top) return;
    if (top.kind !== 'content') { dismiss(top.id, velocity); return; }
    const cur = contentRef.current, n = cur?.keys.length ?? 1;
    if (cur?.landed) { if (n > 1) { homeOnPop.current = true; history.go(-(n - 1)); } else closeLanded(velocity); return; }
    history.go(-n); // closing removes every step the sheet pushed (proto history.go(-n))
  }, [dismiss, closeLanded]);
  const closeAll = useCallback(() => setSheets((s) => s.map((x) => (x.closing ? x : { ...x, closing: 0.0001 }))), []);
  const afterPop = useRef<(() => void) | null>(null);
  const dismissAll = useCallback((then?: () => void) => {
    const cur = contentRef.current;
    if (!cur) { closeAll(); then?.(); return; }
    // the content sheet pushed steps: take them back first, so the next place opens as a sheet again and Back stays honest
    if (cur.landed) { if (cur.keys.length > 1) { homeOnPop.current = true; afterPop.current = then ?? null; history.go(-(cur.keys.length - 1)); } else { closeLanded(); then?.(); } return; }
    afterPop.current = then ?? null; history.go(-cur.keys.length);
  }, [closeAll, closeLanded]);
  const dismissActions = useCallback(() => setSheets((s) => s.map((x) => (x.closing || x.kind === 'content' ? x : { ...x, closing: 0.0001 }))), []);

  const router = useRouter();
  const openLanded = useCallback((path: string) => {
    if (contentRef.current) return;
    setContent({ keys: [path], dir: 1, landed: true }); contentRef.current = { keys: [path], dir: 1, landed: true };
    setSheets((s) => [...s, { id: nextId++, kind: 'content', label: '', body: null }]);
  }, []);
  const openContent = useCallback((path: string) => {
    const cur = contentRef.current;
    if (!cur) {
      setContent({ keys: [path], dir: 1 });
      setSheets((s) => [...s, { id: nextId++, kind: 'content', label: '', body: null }]);
    } else {
      const at = cur.keys.indexOf(path);
      setContent(at >= 0 ? { ...cur, keys: cur.keys.slice(0, at + 1), dir: -1 } : { ...cur, keys: [...cur.keys, path], dir: 1 });
    }
  }, []);
  const go = useCallback((href: string) => {
    const url = new URL(href, location.href);
    if (!desk() && isSheetPath(url.pathname)) {
      const at = contentRef.current?.keys.indexOf(url.pathname) ?? -1, depth = contentRef.current?.keys.length ?? 0;
      if (at >= 0 && at < depth - 1) { history.go(-(depth - 1 - at)); return; } // already in the stack: step back to it, no new step
      if (url.pathname !== location.pathname) { history.pushState({ ...history.state, kSheet: true }, '', url.pathname + url.search); openContent(url.pathname); }
      return;
    }
    router.push(url.pathname + url.search);
  }, [openContent, router]);

  // phone: a place opened from inside the site is a sheet over the page it came from (the URL still changes)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || desk()) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null; if (!a || a.target) return;
      const url = new URL(a.href, location.href); if (url.origin !== location.origin || !isSheetPath(url.pathname)) return;
      e.preventDefault(); go(url.href);
    };
    const onPop = () => {
      const cur = contentRef.current; if (!cur) return;
      // what was asked after the sheet closes runs once the router has settled on the page underneath (it handles this popstate too)
      const next = afterPop.current; afterPop.current = null; const then = next ? () => setTimeout(next, 60) : null;
      if (homeOnPop.current) { homeOnPop.current = false; closeLanded(); then?.(); return; }
      const path = location.pathname;
      if (isSheetPath(path) && cur.keys.includes(path)) { const at = cur.keys.indexOf(path); setContent({ ...cur, keys: cur.keys.slice(0, at + 1), dir: -1 }); return; }
      setContent(null); contentRef.current = null; closeAll(); then?.();
    };
    document.addEventListener('click', onClick, true);
    addEventListener('popstate', onPop);
    return () => { document.removeEventListener('click', onClick, true); removeEventListener('popstate', onPop); };
  }, [go, closeLanded]);

  // a phone landing on a sheet address hid the server page (layout script); the sheet is up over Home by now
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.remove('landing'))); }, []);

  // press feedback lives on pointer-down
  useEffect(() => {
    let down: Element | null = null;
    const on = (e: PointerEvent) => { down = (e.target as Element).closest?.('.press') ?? null; down?.classList.add('down'); };
    const off = () => { down?.classList.remove('down'); down = null; };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTop(); };
    document.addEventListener('pointerdown', on, true);
    ['pointerup', 'pointercancel', 'scroll', 'dragstart'].forEach((n) => document.addEventListener(n, off, true));
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', on, true); ['pointerup', 'pointercancel', 'scroll', 'dragstart'].forEach((n) => document.removeEventListener(n, off, true)); document.removeEventListener('keydown', key); };
  }, [closeTop]);

  // the location bar folds under the top bar following the scroll 1:1, then springs to the side it was heading (proto applyFold);
  // frozen while a sheet or the search is open. The tab bar never moves.
  const fold = useRef(0);
  const pathname = usePathname();
  useEffect(() => {
    let lastY = scrollY, lastDir = 0, settleT: ReturnType<typeof setTimeout> | undefined, a: { stop: () => void } | null = null, H = 0, compact = false, raf = 0;
    const chrome = () => document.querySelector('.chrome-top'), locbar = () => chrome()?.querySelector<HTMLElement>('.locbar-wrap');
    const height = () => H || (H = locbar()?.offsetHeight || 56); // read once, not on every scroll event (a forced layout each time)
    const backTop = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const c = chrome(), top = c && (c.classList.contains('compact') ? c.querySelector('.topbar') : c); if (top) document.documentElement.style.setProperty('--back-top', top.getBoundingClientRect().bottom + 'px'); }); };
    const applyFold = (f: number, settle: boolean) => {
      const c = chrome(), lb = locbar();
      if (lb) {
        a?.stop(); a = null;
        if (settle && !reduce()) a = animate(lb, { transform: `translateY(${-f * height()}px)`, opacity: 1 - f }, spring(0, 0.32));
        else { lb.style.transform = `translateY(${-f * height()}px)`; lb.style.opacity = String(1 - f * 0.95); }
        lb.style.pointerEvents = f > 0.5 ? 'none' : '';
      }
      c?.classList.toggle('compact', f > 0.5);
      if (settle || (f > 0.5) !== compact) backTop(); // the back button's offset only changes when the bar flips or settles
      compact = f > 0.5;
    };
    const onScroll = () => {
      if (document.documentElement.classList.contains('sheet-open')) return; // pinned under a sheet: keep lastY from before
      const y = scrollY, d = y - lastY; lastY = y; const c = chrome(); c?.classList.toggle('scrolled', y > 4);
      if (!d || c?.classList.contains('searching')) return;
      lastDir = Math.sign(d); fold.current = y < 8 ? 0 : Math.max(0, Math.min(1, fold.current + d / height())); applyFold(fold.current, false);
      clearTimeout(settleT); settleT = setTimeout(() => { // the scroll rested: finish the way it was heading
        const f = fold.current; fold.current = scrollY < 60 ? 0 : f > 0 && f < 1 ? (lastDir > 0 ? 1 : 0) : f; applyFold(fold.current, true); }, 120);
    };
    const resized = () => { H = 0; };
    addEventListener('resize', resized);
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', resized); cancelAnimationFrame(raf); clearTimeout(settleT); a?.stop(); };
  }, []);
  useEffect(() => {
    const cur = contentRef.current;
    if (cur && !cur.keys.includes(pathname) && !cur.keys.includes(pathname + '/') && !isSheetPath(pathname)) { setContent(null); contentRef.current = null; closeAll(); }
    if (!desk() && isSheetPath(pathname)) return; // a sheet came up over the page: the page and its bars stay as they were
    fold.current = 0; const c = document.querySelector('.chrome-top'); c?.classList.remove('compact');
    const lb = c?.querySelector<HTMLElement>('.locbar-wrap'); if (lb) Object.assign(lb.style, { transform: '', opacity: '', pointerEvents: '' });
  }, [pathname, closeAll]);

  // Auto follows the system while the page is open (Light/Dark are set in Settings; the first paint is set by the head script)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { if ((localStorage.getItem('kh.theme') || 'auto') !== 'auto') return; const dark = mq.matches; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14100D' : '#FBF6EE'); };
    mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply);
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, c: copy[lang] as (typeof copy)['en'], now, time, tab, setTab, loc, setLoc, toast, sheets, openSheet, closeTop, removeSheet, dismissAll, dismissActions, content, go, openLanded }),
    [lang, now, time, tab, loc, toast, sheets, openSheet, closeTop, removeSheet, dismissAll, dismissActions, content, go, openLanded]);
  return <K.Provider value={value}>{children}</K.Provider>;
}
