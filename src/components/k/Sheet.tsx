'use client';
// ONE sheet for every action (proto app.js "sheets"): bottom only, grabber, drag with velocity projection and a rubber band,
// pull down from the top of the content to close; the page recedes behind the first sheet and a stacked sheet pushes its parent back.
import { useEffect, useLayoutEffect, useReducer, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { animate } from 'motion';
import { useK, useKS, spring, springCurve, reduce, type SheetEntry } from './KProvider';
import { IconBtn } from './bits';
import { renderSheet } from './sheets';

type Anim = { stop: () => void } | null;
type El = HTMLDivElement & { _pos?: number; _anim?: Anim; _wa?: Animation | null };

// Present and dismiss are the sheet's spring (bounce 0.1, 0.42 s) played as plain keyframes through the Web Animations API:
// on the GPU in every engine, so the sheet moves at 60 fps even while the page under it is busy.
const SHEET = () => springCurve(0.1, 0.42);

// The page behind the sheet. Every move starts from where the page is on screen right now, read from its computed matrix
// and written out in the target's own form. (Handing the library only the target made it read the start as a matrix the
// FIRST time and mix it with a translate+scale list: the page collapsed to a thumbnail for a few frames on the first open
// of every visit, and ran right from the second on, when the library remembered its own last value.)
let appAnim: Animation | null = null;
function recede(app: HTMLElement, y: number, s: number, duration: number, done?: () => void) {
  const m = new DOMMatrix(getComputedStyle(app).transform), y0 = m.m42, s0 = m.m11;
  appAnim?.cancel(); app.style.transform = `translateY(${y}px) scale(${s})`;
  const c = springCurve(0, duration);
  const a = (appAnim = app.animate(c.pts.map((p) => ({ transform: `translateY(${(y0 + (y - y0) * p).toFixed(3)}px) scale(${(s0 + (s - s0) * p).toFixed(5)})` })), { duration: c.ms }));
  if (done) a.finished.then(() => { if (appAnim === a) done(); }, () => {});
}
const settle = (app: HTMLElement) => { appAnim?.cancel(); appAnim = null; app.style.transform = ''; delete app.dataset.origin; };

// progress 0..1 of the bottom-most sheet drives the page recede + scrim
function depth(prog: number, animated: boolean) {
  const app = document.getElementById('app'), sc = document.querySelector<HTMLElement>('.scrim');
  // desktop (no touch): the page stays exactly where it was, only dimmed; the recede is a phone gesture
  if (app && !reduce() && touchLock()) {
    if (prog > 0 && !app.dataset.origin) { app.style.transformOrigin = `50% ${(lockedAt ?? scrollY) + innerHeight / 2}px`; app.dataset.origin = '1'; }
    const y = prog * 6, sc1 = 1 - prog * 0.045;
    if (animated) recede(app, y, sc1, 0.42);
    else if (prog === 0) settle(app);
    else { appAnim?.cancel(); appAnim = null; app.style.transform = `translateY(${y.toFixed(2)}px) scale(${sc1.toFixed(4)})`; }
  }
  // the scrim's blur is constant (3px, web.css); only its opacity follows the sheet, so the screen is never re-blurred at a new radius each frame
  if (sc) sc.style.opacity = String(prog);
}

// the page behind a sheet stays where it was (proto lockPage): overflow:hidden on <html> (html.sheet-open), nothing moved or
// re-laid out, so the sticky top bar, sidebar and side rail stay exactly where they were. Touch phones also place the sheets
// in page coordinates (html.sheet-abs, see web.css), because iOS 26 Safari draws no fixed content under its bottom bar.
let lockedAt: number | null = null, restTop = 0; // restTop: where a fixed bottom:0 sheet would rest, in page coordinates
// the page's looping decorations (live rings, route line, dice, hints) hold still under an open sheet: they sit behind the
// scrim and would repaint every frame while it moves. Paused one by one (a class on <html> would re-style the whole page).
let held: Animation[] = [];
const touchLock = () => typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
// Where a fixed bottom:0 sheet would rest (above Safari's bottom bar). Measured once while the page is idle, not inside the
// first open: the probe forced a synchronous layout on the very frame the sheet started moving (issue #38, first open).
let restInset: number | null = null;
function measureRest() {
  const probe = document.createElement('i'); probe.style.cssText = 'position:fixed;bottom:0;left:0;height:0';
  document.body.append(probe); restInset = probe.getBoundingClientRect().top; probe.remove();
}
/** Measured ahead of the first sheet (idle after mount) and again after the visual viewport changes. */
export function warmSheetMetrics() { if (touchLock() && restInset === null) measureRest(); }
export function resetSheetMetrics() { restInset = null; }
function lockPage(on: boolean) {
  const h = document.documentElement;
  if (on && lockedAt === null) {
    lockedAt = scrollY; h.classList.add('sheet-open');
    const app = document.getElementById('app');
    held = app ? document.getAnimations().filter((a) => { const t = (a.effect as KeyframeEffect | null)?.target; return a.playState === 'running' && 'animationName' in a && !!t && app.contains(t); }) : [];
    held.forEach((a) => a.pause());
    if (touchLock()) {
      // no body pinning (position:fixed re-laid out and repainted the whole page on every open: the first-open stutter);
      // iOS 16+ and Android honour overflow:hidden on <html> (html.sheet-open), so the page simply stays where it is.
      // The resting point was measured while idle (warmSheetMetrics), never here, so the first open reads no layout.
      if (restInset === null) measureRest();
      h.classList.add('sheet-abs'); restTop = lockedAt + (restInset ?? innerHeight);
    }
  } else if (!on && lockedAt !== null) {
    lockedAt = null; h.classList.remove('sheet-open'); held.forEach((a) => a.play()); held = [];
  }
}

function setPos(sh: El, y: number) { sh._pos = y; sh.style.transform = `translateY(${y}px)`; }
/** Stop whatever moves the sheet and leave it where it is on screen (a running compositor animation is read once, here). */
function halt(sh: El) {
  sh._anim?.stop(); sh._anim = null;
  if (sh._wa) { if (sh._wa.playState === 'running') setPos(sh, new DOMMatrix(getComputedStyle(sh).transform).m42); sh._wa.cancel(); sh._wa = null; }
}
function springTo(sh: El, y: number, velocity = 0) {
  if (reduce()) { halt(sh); setPos(sh, y); return; }
  halt(sh);
  if (Math.abs(velocity) < 50) { // no fling to carry: the compositor runs it
    const from = sh._pos || 0; setPos(sh, y); if (Math.abs(from - y) < 0.5) return;
    const c = SHEET();
    sh._wa = sh.animate(c.pts.map((p) => ({ transform: `translateY(${(from + (y - from) * p).toFixed(2)}px)` })), { duration: c.ms });
    return;
  }
  // a release with momentum: hand the finger's velocity to the spring (main thread, gesture-driven)
  sh._anim = animate(sh._pos || 0, y, { type: 'spring', bounce: 0.1, duration: 0.42, velocity, onUpdate: (v: number) => setPos(sh, v) });
}

function SheetView({ entry, index, top, head, body, foot }: { entry: SheetEntry; index: number; top: boolean; head: ReactNode; body: ReactNode; foot?: ReactNode }) {
  const { closeTop, removeSheet } = useK();
  const ref = useRef<El>(null);
  const first = index === 0;

  // present
  useLayoutEffect(() => {
    // lock first: a child's layout effect runs before SheetHost's, and the sheet needs the lock's measurements to place itself
    lockPage(true);
    const sh = ref.current!; const abs = document.documentElement.classList.contains('sheet-abs'); if (abs) sh.style.top = restTop + 'px';
    if (entry.kind === 'map') {
      // the full-page map sheet grows out of the Map pill that opened it (owner 2026-11-26, round 2): the pill's centre
      // is the transform-origin, the present is the sheet's own spring (no bounce) with a little scale, or a fade still
      const h = sh.offsetHeight;
      if (entry.origin) { const r = sh.getBoundingClientRect(); sh.style.transformOrigin = `${entry.origin.x - r.left}px ${entry.origin.y - r.top}px`; }
      if (reduce()) { setPos(sh, 0); sh.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'ease-out' }); }
      else {
        const cu = springCurve(0, 0.42);
        const a = (sh._wa = sh.animate(cu.pts.map((p) => ({ transform: `translateY(${(h * (1 - p)).toFixed(2)}px) scale(${(0.94 + 0.06 * p).toFixed(4)})` })), { duration: cu.ms }));
        a.finished.then(() => { if (sh._wa === a) { sh._wa = null; setPos(sh, 0); } }, () => { /* a drag interrupted it: halt owns the state */ });
      }
    } else { setPos(sh, sh.offsetHeight); springTo(sh, 0, 0); }
    if (first) {
      let scrim = document.querySelector<HTMLElement>('.scrim');
      if (!scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; document.body.append(scrim); scrim.addEventListener('click', () => scrim && scrim.dispatchEvent(new CustomEvent('k-close-top', { bubbles: true }))); }
      if (abs) { scrim.style.top = (lockedAt ?? scrollY) + 'px'; scrim.style.height = restTop - (lockedAt ?? scrollY) + 200 + 'px'; }
      scrim.style.transition = 'opacity .3s';
      requestAnimationFrame(() => depth(1, true));
    }
    // after it arrives: inert re-styles the whole page and focus forces a layout pass; the scrim already takes every tap
    const f = setTimeout(() => { const app = document.getElementById('app'); if (app && sh.isConnected) app.inert = true; sh.focus({ preventScroll: true }); }, SHEET().ms);
    return () => clearTimeout(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // scrim stays just under the top sheet
  useEffect(() => { const sc = document.querySelector<HTMLElement>('.scrim'); if (top && sc) sc.style.zIndex = String(60 + index * 2); }, [top, index]);
  // a sheet on top pushes this one back
  const wasTop = useRef(true);
  useEffect(() => {
    const sh = ref.current!; if (wasTop.current === top || entry.closing) { wasTop.current = top; return; } wasTop.current = top;
    const back = 'translateY(-8px) scale(.965)', front = 'translateY(0px) scale(1)'; // both ends named: the library must not guess the start
    animate(sh, { transform: top ? [back, front] : [front, back] }, spring(0, 0.4));
  }, [top, entry.closing]);
  // dismiss
  useEffect(() => {
    if (!entry.closing) return; const sh = ref.current!;
    // the full-page map sheet fades away under reduced motion (no travel, owner 2026-11-26 round 2); every other sheet
    // keeps its slide
    if (entry.kind === 'map' && reduce()) sh.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-out' });
    else springTo(sh, sh.offsetHeight + 24, entry.closing > 1 ? entry.closing : 0);
    const t = setTimeout(() => removeSheet(entry.id), 420);
    if (first) {
      const app = document.getElementById('app');
      const sc = document.querySelector<HTMLElement>('.scrim');
      // the page takes input again when the scrim is gone (it blocks taps until then), not in the middle of the exit motion
      if (sc) { sc.style.transition = 'opacity .3s'; sc.style.opacity = '0'; }
      setTimeout(() => { sc?.remove(); if (app && !document.documentElement.classList.contains('sheet-open')) app.inert = false; }, 320);
      if (app && app.dataset.origin && !reduce()) recede(app, 0, 1, 0.4, () => settle(app));
      else if (app) settle(app);
    }
    return () => clearTimeout(t);
  }, [entry.closing, entry.id, first, removeSheet]);

  // drag: grabber and head anywhere; the body pulls the sheet down only from its top
  useEffect(() => {
    const sh = ref.current!; const handles = [sh.querySelector('.grabber'), sh.querySelector('.sheet-head')].filter(Boolean) as HTMLElement[];
    let y0 = 0, start = 0, hist: [number, number][] = [], on = false;
    const rubber = (o: number, d: number, c = 0.55) => (o * d * c) / (d + c * Math.abs(o));
    const down = (e: PointerEvent) => { if ((e.target as Element).closest('button')) return; on = true; halt(sh); y0 = e.clientY; start = sh._pos || 0; hist = [[e.clientY, e.timeStamp]]; (e.currentTarget as Element).setPointerCapture(e.pointerId); };
    const move = (e: { clientY: number; timeStamp: number }) => {
      if (!on) return; hist.push([e.clientY, e.timeStamp]); if (hist.length > 5) hist.shift();
      let y = start + (e.clientY - y0); if (y < 0) y = -rubber(-y, sh.offsetHeight); // resist above the top
      setPos(sh, y);
      if (first) { const sc = document.querySelector<HTMLElement>('.scrim'); if (sc) sc.style.transition = 'none'; depth(Math.max(0, Math.min(1, 1 - Math.max(0, y) / sh.offsetHeight)), false); }
    };
    const up = () => {
      if (!on) return; on = false;
      const a = hist[0], b = hist[hist.length - 1]; const v = b[1] > a[1] ? ((b[0] - a[0]) / (b[1] - a[1])) * 1000 : 0; // px/s
      const y = sh._pos || 0, proj = y + ((v / 1000) * 0.998) / (1 - 0.998); // Apple's momentum projection
      if (proj > sh.offsetHeight * 0.25 || (v > 700 && y >= 24)) { closeTop(v); return; }
      springTo(sh, 0, v);
      if (first) { const sc = document.querySelector<HTMLElement>('.scrim'); if (sc) sc.style.transition = 'opacity .3s'; depth(1, true); }
    };
    const pm = (e: PointerEvent) => move(e);
    handles.forEach((h) => { h.addEventListener('pointerdown', down); h.addEventListener('pointermove', pm); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up); });
    // a (non-map) body pulls the sheet down only from its top. The map sheet's body is the map and the search: a drag
    // there must pan the map and move the caret, never move the sheet — its head and grabber still dismiss it.
    const bodyEl = entry.kind === 'map' ? null : sh.querySelector<HTMLElement>('.sheet-body'); let ty0 = 0, pulling = false;
    const ts = (e: TouchEvent) => { ty0 = e.touches[0].clientY; pulling = false; };
    const tm = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (!pulling) { if (!bodyEl || bodyEl.scrollTop > 0 || y - ty0 < 6) return; pulling = true; on = true; halt(sh); y0 = y; start = sh._pos || 0; hist = [[y, performance.now()]]; }
      e.preventDefault(); move({ clientY: y, timeStamp: performance.now() });
    };
    const te = () => { if (pulling) { pulling = false; up(); } };
    bodyEl?.addEventListener('touchstart', ts, { passive: true }); bodyEl?.addEventListener('touchmove', tm, { passive: false });
    bodyEl?.addEventListener('touchend', te); bodyEl?.addEventListener('touchcancel', te);
    return () => {
      handles.forEach((h) => { h.removeEventListener('pointerdown', down); h.removeEventListener('pointermove', pm); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); });
      bodyEl?.removeEventListener('touchstart', ts); bodyEl?.removeEventListener('touchmove', tm); bodyEl?.removeEventListener('touchend', te); bodyEl?.removeEventListener('touchcancel', te);
    };
  }, [closeTop, first]);

  return (
    <div ref={ref} className={`sheet ${entry.kind}${top ? '' : ' behind'}`} role="dialog" aria-modal="true" aria-label={entry.label} tabIndex={-1} style={{ zIndex: 61 + index * 2 }}>
      <div className="grabber"><i /></div>
      <div className="sheet-head">{head}</div>
      <div className="sheet-body">{body}</div>
      {foot ? <div className="sheet-foot">{foot}</div> : null}
    </div>
  );
}

/** Renders the stack; the content sheet (a place, collection, listing or host on a phone) draws itself from renderSheet. */
export function SheetHost() {
  const { closeTop, c, lang } = useK();
  const sheets = useKS((s) => s.sheets), content = useKS((s) => s.content);
  const qc = useQueryClient();
  // the content sheet's label is the name its query brings, so redraw when a query lands
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const hasContent = sheets.some((x) => x.kind === 'content');
  useEffect(() => (hasContent ? qc.getQueryCache().subscribe((e) => { if (e.type === 'updated' && e.action.type === 'success') redraw(); }) : undefined), [qc, hasContent]);
  useEffect(() => { const f = () => closeTop(); document.addEventListener('k-close-top', f); return () => document.removeEventListener('k-close-top', f); }, [closeTop]);
  const open = sheets.filter((x) => !x.closing);
  const anyOpen = open.length > 0;
  useLayoutEffect(() => { lockPage(anyOpen); }, [anyOpen]);
  // measure where a fixed bottom:0 sheet rests while the page is idle, and again when the viewport changes, so the first
  // open starts its motion without reading layout (issue #38). Touch devices only: desktop sheets stay fixed.
  useEffect(() => {
    if (!matchMedia('(pointer: coarse)').matches) return;
    // and fetch the sheet bodies' code while idle too: sheets.tsx loads them on demand (smaller first page), so without this
    // the very first open would wait for a download, the first-open stall #38 is about
    const warm = () => { warmSheetMetrics(); void import('./placeview'); void import('./collections'); void import('./market'); void import('./map-view'); };
    const idle = window.requestIdleCallback ? window.requestIdleCallback(warm, { timeout: 2000 }) : window.setTimeout(warm, 800);
    const forget = () => resetSheetMetrics();
    addEventListener('resize', forget); addEventListener('orientationchange', forget);
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle); else clearTimeout(idle);
      removeEventListener('resize', forget); removeEventListener('orientationchange', forget);
    };
  }, []);
  // the sheets stay in page coordinates until the last one has slid out (after the page is unpinned), so a closing sheet leaves through the bottom of the screen
  useLayoutEffect(() => { if (!sheets.length) document.documentElement.classList.remove('sheet-abs'); }, [sheets.length]);
  if (typeof document === 'undefined' || !sheets.length) return null;
  return createPortal(sheets.map((entry, index) => {
    const top = open[open.length - 1]?.id === entry.id;
    if (entry.kind === 'content') {
      const path = content?.keys[content.keys.length - 1];
      const view = path ? renderSheet(path, qc, lang) : { label: '', body: null };
      const head = <>{(content?.keys.length ?? 0) > 1 ? <IconBtn icon="back" label={c.common.back} cls="filled" onClick={() => history.back()} /> : <span />}<IconBtn icon="x" label={c.common.close} cls="filled" onClick={() => closeTop()} /></>;
      return <SheetView key={entry.id} entry={{ ...entry, label: view.label }} index={index} top={top} head={head} body={view.body} foot={view.foot} />;
    }
    const head = <><h2 className="t-title" dir="auto">{entry.label}</h2><IconBtn icon="x" label={c.common.close} cls="filled" onClick={() => closeTop()} /></>;
    return <SheetView key={entry.id} entry={entry} index={index} top={top} head={head} body={entry.body} foot={entry.foot} />;
  }), document.body);
}
