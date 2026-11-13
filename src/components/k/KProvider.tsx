'use client';
// One client context for the 5argny shell: language and copy, "now", the location bar, the sheet stack, the toast,
// and the document-level behaviours the prototype binds once (press feedback, bars that hide on scroll, theme).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { animate } from 'motion';
import { copy } from '@5argny/core/copy';
import { nowIn, type Lang, type Now } from './rules';
import { isPlacePath } from './data';

export type Tab = 'home' | 'explore' | 'market' | 'saved' | 'profile';
export type SheetEntry = { id: number; kind: 'action' | 'content'; label: string; head?: ReactNode; body: ReactNode; foot?: ReactNode; closing?: number };
type Content = { keys: string[]; dir: 1 | -1; landed?: boolean } | null;

type Ctx = {
  lang: Lang; c: (typeof copy)['en']; now: Now; time: string | null;
  tab: Tab; setTab: (t: Tab) => void;
  loc: { city: string | null; area: string | null }; setLoc: (l: { city: string | null; area: string | null }) => void;
  toast: (msg: string) => void;
  sheets: SheetEntry[]; openSheet: (label: string, body: ReactNode, foot?: ReactNode) => void; closeTop: (velocity?: number) => void;
  removeSheet: (id: number) => void; dismissAll: () => void;
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
    el.textContent = msg;
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
  const closeTop = useCallback((velocity = 0) => {
    const open = sheetsRef.current.filter((x) => !x.closing); const top = open[open.length - 1]; if (!top) return;
    if (top.kind !== 'content') { dismiss(top.id, velocity); return; }
    // landed on the place: there is no earlier entry to go back to, the page under the sheet (Home) becomes the address
    if (contentRef.current?.landed && (contentRef.current.keys.length < 2)) { history.pushState(null, '', `/${lang}/`); setContent(null); setSheets((s) => s.map((x) => (x.closing ? x : { ...x, closing: velocity || 0.0001 }))); return; }
    history.back();
  }, [dismiss, lang]);
  const dismissAll = useCallback(() => setSheets((s) => s.map((x) => (x.closing ? x : { ...x, closing: 0.0001 }))), []);

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
    if (!desk() && isPlacePath(url.pathname)) { if (url.pathname !== location.pathname) { history.pushState({ kSheet: true }, '', url.pathname + url.search); openContent(url.pathname); } return; }
    router.push(url.pathname + url.search);
  }, [openContent, router]);

  // phone: a place opened from inside the site is a sheet over the page it came from (the URL still changes)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || desk()) return;
      const a = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null; if (!a || a.target) return;
      const url = new URL(a.href, location.href); if (url.origin !== location.origin || !isPlacePath(url.pathname)) return;
      e.preventDefault(); go(url.href);
    };
    const onPop = () => {
      const cur = contentRef.current; if (!cur) return;
      const path = location.pathname;
      if (isPlacePath(path) && cur.keys.includes(path)) { const at = cur.keys.indexOf(path); setContent({ ...cur, keys: cur.keys.slice(0, at + 1), dir: -1 }); return; }
      setContent(null);
      setSheets((s) => s.map((x) => (x.closing ? x : { ...x, closing: 0.0001 })));
    };
    document.addEventListener('click', onClick, true);
    addEventListener('popstate', onPop);
    return () => { document.removeEventListener('click', onClick, true); removeEventListener('popstate', onPop); };
  }, [go]);

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

  // the top chrome folds and the tab bar slides away while reading down; both come back on the way up
  useEffect(() => {
    let lastY = scrollY, acc = 0, away = false;
    const setBars = (a: boolean) => {
      away = a; const c = document.querySelector('.chrome-top'); c?.classList.toggle('compact', a);
      const bar = document.body.classList.contains('has-glass') ? document.getElementById('glass-tabs') : document.querySelector<HTMLElement>('#chrome .tabbar');
      if (bar) animate(bar, { transform: a ? 'translateY(140%)' : 'translateY(0%)' }, a ? spring(0, 0.35) : spring(0.1, 0.4));
      requestAnimationFrame(() => { const top = c && (a ? c.querySelector('.topbar') : c); if (top) document.documentElement.style.setProperty('--back-top', top.getBoundingClientRect().bottom + 'px'); });
    };
    const onScroll = () => {
      const y = scrollY, d = y - lastY; lastY = y; document.querySelector('.chrome-top')?.classList.toggle('scrolled', y > 4);
      if (!d) return; if (Math.sign(d) !== Math.sign(acc)) acc = 0; acc += d;
      const next = y < 60 ? false : acc > 24 ? true : acc < -24 ? false : away; if (next !== away) setBars(next);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  // Auto follows the system while the page is open (Light/Dark are set in Settings; the first paint is set by the head script)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { if ((localStorage.getItem('kh.theme') || 'auto') !== 'auto') return; const dark = mq.matches; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14100D' : '#FBF6EE'); };
    mq.addEventListener('change', apply); return () => mq.removeEventListener('change', apply);
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, c: copy[lang] as (typeof copy)['en'], now, time, tab, setTab, loc, setLoc, toast, sheets, openSheet, closeTop, removeSheet, dismissAll, content, go, openLanded }),
    [lang, now, time, tab, loc, toast, sheets, openSheet, closeTop, removeSheet, dismissAll, content, go, openLanded]);
  return <K.Provider value={value}>{children}</K.Provider>;
}
