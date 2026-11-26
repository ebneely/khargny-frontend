'use client';
// One client context for the 5argny shell: language and copy, "now", the location bar, the sheet stack, the toast,
// and the document-level behaviours the prototype binds once (press feedback, bars that hide on scroll, theme).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { langPrefix } from '@5argny/core/rules/locale';
import { usePathname, useRouter } from 'next/navigation';
import { animate, spring as springGen } from 'motion';
import { createStore, useStore, type StoreApi } from 'zustand';
import { copy } from '@5argny/core/copy';
import { nowIn, type Lang, type Now } from './rules';
import { isSheetPath } from './data';

export type Tab = 'home' | 'explore' | 'market' | 'saved' | 'profile';
export type SheetEntry = { id: number; kind: 'action' | 'content'; label: string; head?: ReactNode; body: ReactNode; foot?: ReactNode; closing?: number };
type Content = { keys: string[]; dir: 1 | -1; landed?: boolean } | null;

type Loc = { city: string | null; area: string | null };
/** What changes while the site is open lives in a zustand store: each component subscribes to the one slice it shows, so a
 *  new tab, a location pick or a sheet opening re-renders only what shows it (the old single context re-rendered the page). */
export type KState = { tab: Tab; loc: Loc; sheets: SheetEntry[]; content: Content; setTab: (t: Tab) => void; setLoc: (l: Loc) => void };
type Ctx = {
  lang: Lang; c: (typeof copy)['en']; now: Now; time: string | null;
  setTab: (t: Tab) => void;
  setLoc: (l: Loc) => void;
  toast: (msg: string) => void;
  openSheet: (label: string, body: ReactNode, foot?: ReactNode) => void; closeTop: (velocity?: number) => void;
  removeSheet: (id: number) => void;
  /** close every sheet, the content sheet's history steps included (proto closeContent), then run `then` on the page underneath */
  dismissAll: (then?: () => void) => void;
  /** close the action sheets only, leaving a content sheet open (proto report-send) */
  dismissActions: () => void;
  /** open a site link: a place on a phone becomes a sheet over this page, anything else navigates */
  go: (href: string) => void;
  /** phone, landed on a place: the place comes up as a sheet over Home, as the prototype does */
  openLanded: (path: string) => void;
};
const K = createContext<Ctx | null>(null);
export const useK = () => { const v = useContext(K); if (!v) throw new Error('useK outside KProvider'); return v; };
const KStore = createContext<StoreApi<KState> | null>(null);
/** One slice of the live state: `useKS((s) => s.loc)`. Re-renders only when that slice changes. */
export function useKS<T>(pick: (s: KState) => T): T { const st = useContext(KStore); if (!st) throw new Error('useKS outside KProvider'); return useStore(st, pick); }

export const reduce = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// WebKit (Safari and every browser on iOS) runs an animation whose easing is linear(...) in software, on the main thread,
// capped at 30 fps in Low Power Mode (WebKit bugs 281429, 312407). The animation library writes its springs as linear(), so
// there a spring without bounce is handed over as its fitted cubic-bezier (same duration, at most 2.6% off the curve),
// which the GPU runs. Springs with a visible bounce keep the exact curve (small one-off pops).
const softLinear = () => typeof navigator !== 'undefined' && /AppleWebKit/.test(navigator.userAgent) && !/Chrome\/|Chromium|Edg\/|Android/.test(navigator.userAgent);
const FIT: [number, number, number, number][] = [[0.271, 0.488, 0.098, 1.062], [0.27, 0.409, 0.09, 1.12], [0.303, 0.541, 0.094, 1.105]]; // bounce 0, 0.1, 0.12
export const spring = (bounce = 0, duration = 0.38) => (reduce() ? { duration: 0.15 }
  : softLinear() && bounce <= 0.12 ? { duration, ease: FIT[bounce < 0.05 ? 0 : bounce < 0.11 ? 1 : 2] }
  : { type: 'spring' as const, bounce, duration });
// The same spring, sampled every 10 ms into progress points (0 to 1, overshoot included). Played as plain keyframes with
// straight segments between them, it runs on the GPU in every engine: the form for the big movers (sheet, page behind it).
const curves = new Map<string, { pts: number[]; ms: number }>();
export function springCurve(bounce = 0, duration = 0.38) {
  const key = bounce + ':' + duration; let c = curves.get(key);
  if (!c) {
    const g = springGen({ keyframes: [0, 1], bounce, duration: duration * 1000 }), pts: number[] = [];
    for (let t = 0; t <= 3000; t += 10) { const st = g.next(t); pts.push(st.value); if (st.done) break; }
    pts[pts.length - 1] = 1; c = { pts, ms: (pts.length - 1) * 10 }; curves.set(key, c);
  }
  return c;
}
export const desk = () => typeof window !== 'undefined' && matchMedia('(min-width:1024px)').matches;
export const haptic = () => { try { navigator.vibrate?.(8); } catch {} };

let nextId = 1;

export function KProvider({ lang, time, initialTab, children }: { lang: Lang; time: string | null; initialTab: Tab; children: ReactNode }) {
  // one store per provider (never module-level: on the server it would be shared between requests)
  const [store] = useState(() => createStore<KState>()((set) => ({ tab: initialTab, loc: { city: null, area: null }, sheets: [], content: null, setTab: (tab) => set({ tab }), setLoc: (loc) => set({ loc }) })));
  const { setTab, setLoc } = store.getState();
  const setSheets = useCallback((f: (s: SheetEntry[]) => SheetEntry[]) => store.setState((st) => ({ sheets: f(st.sheets) })), [store]);
  const setContent = useCallback((content: Content) => store.setState({ content }), [store]);
  // the refs the handlers read are the store itself: always current, no render needed
  const sheetsRef = useMemo(() => ({ get current() { return store.getState().sheets; } }), [store]);
  const contentRef = useMemo(() => ({ get current() { return store.getState().content; }, set current(v: Content) { store.setState({ content: v }); } }), [store]);
  const now = useMemo(() => nowIn(time), [time]);

  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((msg: string) => {
    let el = document.querySelector<HTMLElement>('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    // each sentence stays whole: a toast too long for a phone breaks between its sentences, never inside one
    el.replaceChildren(...msg.split(/(?<=\.)\s+/).map((part, i) => { const sp = document.createElement('span'); sp.textContent = (i ? ' ' : '') + part; sp.style.display = 'inline-block'; return sp; }));
    animate(el, { opacity: [0, 1], transform: ['translate(-50%,12px)', 'translate(-50%,0px)'] }, spring(0, 0.3));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => el && animate(el, { opacity: [1, 0], transform: ['translate(-50%,0px)', 'translate(-50%,12px)'] }, spring(0, 0.3)), 1700);
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

  // a choice made in a picker sheet that is a link (a category, a city, a shortcut) closes the sheet at once with its exit
  // animation while the page behind updates; a place opening as a sheet on a phone stays a sheet
  useEffect(() => {
    const onPick = (e: MouseEvent) => {
      // a link whose own handler already took over (Suggest a correction opens its sheet) is not a picker choice:
      // closing everything here shut the place sheet and the new sheet, and dropped the person on the page under it
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.('.sheet a[href]') as HTMLAnchorElement | null; if (!a || a.target) return;
      const url = new URL(a.href, location.href); if (url.origin !== location.origin) return;
      if (!desk() && isSheetPath(url.pathname)) return;
      closeAll();
    };
    document.addEventListener('click', onPick);
    return () => document.removeEventListener('click', onPick);
  }, [closeAll]);

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

  // the top chrome's scroll behaviour lives in its own component now (Shell.tsx useChromeFold)
  const pathname = usePathname();
  useEffect(() => {
    const cur = contentRef.current;
    if (cur && !cur.keys.includes(pathname) && !cur.keys.includes(pathname + '/') && !isSheetPath(pathname)) { setContent(null); contentRef.current = null; closeAll(); }
    if (!desk() && isSheetPath(pathname)) return; // a sheet came up over the page: the page and its bars stay as they were
  }, [pathname, closeAll]);

  // Auto follows the system while the page is open (Light/Dark are set in Settings; the first paint is set by the head script)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { if ((localStorage.getItem('kh.theme') || 'auto') !== 'auto') return; const dark = mq.matches; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14100D' : '#FBF6EE'); };
    mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply);
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, c: copy[lang] as (typeof copy)['en'], now, time, setTab, setLoc, toast, openSheet, closeTop, removeSheet, dismissAll, dismissActions, go, openLanded }),
    [lang, now, time, setTab, setLoc, toast, openSheet, closeTop, removeSheet, dismissAll, dismissActions, go, openLanded]);
  return <KStore.Provider value={store}><K.Provider value={value}>{children}</K.Provider></KStore.Provider>;
}
