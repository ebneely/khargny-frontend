'use client';
// ONE sheet for every action (proto app.js "sheets"): bottom only, grabber, drag with velocity projection and a rubber band,
// pull down from the top of the content to close; the page recedes behind the first sheet and a stacked sheet pushes its parent back.
import { useEffect, useLayoutEffect, useReducer, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { animate } from 'motion';
import { useK, spring, reduce, type SheetEntry } from './KProvider';
import { IconBtn } from './bits';
import { renderSheet } from './sheets';

type Anim = { stop: () => void } | null;
type El = HTMLDivElement & { _pos?: number; _anim?: Anim };

// progress 0..1 of the bottom-most sheet drives the page recede + scrim
function depth(prog: number, animated: boolean) {
  const app = document.getElementById('app'), sc = document.querySelector<HTMLElement>('.scrim');
  // desktop (no touch): the page stays exactly where it was, only dimmed; the recede is a phone gesture
  if (app && !reduce() && touchLock()) {
    if (prog > 0 && !app.dataset.origin) { app.style.transformOrigin = `50% ${(lockedAt ?? scrollY) + innerHeight / 2}px`; app.dataset.origin = '1'; }
    const to = prog > 0 ? `translateY(${(prog * 6).toFixed(2)}px) scale(${(1 - prog * 0.045).toFixed(4)})` : 'translateY(0px) scale(1)';
    // start from the same function list as the target: from `none` the animation library interpolates a matrix and the page dips to ~10% mid-way
    if (animated) { if (!app.style.transform) app.style.transform = 'translateY(0px) scale(1)'; animate(app, { transform: to }, spring(0, 0.42)); } else app.style.transform = to;
    if (prog === 0 && !animated) { app.style.transform = ''; delete app.dataset.origin; }
  }
  if (sc) { sc.style.opacity = String(prog); const b = reduce() ? 'none' : `blur(${(prog * 3).toFixed(2)}px)`; sc.style.backdropFilter = b; sc.style.setProperty('-webkit-backdrop-filter', b); }
}

// the page behind a sheet is pinned where it was (proto lockPage): no scroll-through, same place after.
// Touch phones (iOS Safari ignores overflow:hidden): body position:fixed at -scrollY, and the sticky top chrome is moved
// down by the same amount so it stays on screen. Desktop: overflow:hidden on <html> with a stable scrollbar gutter, nothing
// repositioned, so sticky and fixed columns (top bar, sidebar, side rail) stay exactly where they were.
let lockedAt: number | null = null;
const touchLock = () => typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
function lockPage(on: boolean) {
  const b = document.body, h = document.documentElement;
  if (on && lockedAt === null) {
    lockedAt = scrollY; h.classList.add('sheet-open');
    if (touchLock()) { h.classList.add('lock-fixed'); h.style.setProperty('--lock-y', lockedAt + 'px'); Object.assign(b.style, { position: 'fixed', top: -lockedAt + 'px', left: '0', right: '0', width: '100%' }); }
  } else if (!on && lockedAt !== null) {
    const y = lockedAt, fixed = h.classList.contains('lock-fixed'); lockedAt = null; h.classList.remove('sheet-open', 'lock-fixed'); h.style.removeProperty('--lock-y');
    if (fixed) { Object.assign(b.style, { position: '', top: '', left: '', right: '', width: '' }); scrollTo({ top: y, behavior: 'instant' }); }
  }
}

function setPos(sh: El, y: number) { sh._pos = y; sh.style.transform = `translateY(${y}px)`; }
function springTo(sh: El, y: number, velocity = 0) {
  if (reduce()) { setPos(sh, y); return; }
  sh._anim?.stop();
  sh._anim = animate(sh._pos || 0, y, { type: 'spring', bounce: 0.1, duration: 0.42, velocity, onUpdate: (v: number) => setPos(sh, v) });
}

function SheetView({ entry, index, top, head, body, foot }: { entry: SheetEntry; index: number; top: boolean; head: ReactNode; body: ReactNode; foot?: ReactNode }) {
  const { closeTop, removeSheet } = useK();
  const ref = useRef<El>(null);
  const first = index === 0;

  // present
  useLayoutEffect(() => {
    const sh = ref.current!; setPos(sh, sh.offsetHeight); springTo(sh, 0, 0);
    if (first) {
      let scrim = document.querySelector<HTMLElement>('.scrim');
      if (!scrim) { scrim = document.createElement('div'); scrim.className = 'scrim'; document.body.append(scrim); scrim.addEventListener('click', () => scrim && scrim.dispatchEvent(new CustomEvent('k-close-top', { bubbles: true }))); }
      scrim.style.transition = 'opacity .3s, backdrop-filter .3s';
      requestAnimationFrame(() => depth(1, true));
    }
    const app = document.getElementById('app'); if (app) app.inert = true;
    sh.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // scrim stays just under the top sheet
  useEffect(() => { const sc = document.querySelector<HTMLElement>('.scrim'); if (top && sc) sc.style.zIndex = String(60 + index * 2); }, [top, index]);
  // a sheet on top pushes this one back
  const wasTop = useRef(true);
  useEffect(() => {
    const sh = ref.current!; if (wasTop.current === top || entry.closing) { wasTop.current = top; return; } wasTop.current = top;
    animate(sh, { transform: top ? 'translateY(0px) scale(1)' : 'translateY(-8px) scale(.965)' }, spring(0, 0.4));
  }, [top, entry.closing]);
  // dismiss
  useEffect(() => {
    if (!entry.closing) return; const sh = ref.current!;
    springTo(sh, sh.offsetHeight + 24, entry.closing > 1 ? entry.closing : 0);
    const t = setTimeout(() => removeSheet(entry.id), 420);
    if (first) {
      const app = document.getElementById('app'); if (app) app.inert = false;
      const sc = document.querySelector<HTMLElement>('.scrim');
      if (sc) { sc.style.transition = 'opacity .3s, backdrop-filter .3s'; sc.style.opacity = '0'; sc.style.backdropFilter = 'blur(0px)'; setTimeout(() => sc.remove(), 320); }
      if (app && app.dataset.origin && !reduce()) animate(app, { transform: 'translateY(0px) scale(1)' }, spring(0, 0.4)).finished.then(() => { app.style.transform = ''; delete app.dataset.origin; });
      else if (app) app.style.transform = '';
    }
    return () => clearTimeout(t);
  }, [entry.closing, entry.id, first, removeSheet]);

  // drag: grabber and head anywhere; the body pulls the sheet down only from its top
  useEffect(() => {
    const sh = ref.current!; const handles = [sh.querySelector('.grabber'), sh.querySelector('.sheet-head')].filter(Boolean) as HTMLElement[];
    let y0 = 0, start = 0, hist: [number, number][] = [], on = false;
    const rubber = (o: number, d: number, c = 0.55) => (o * d * c) / (d + c * Math.abs(o));
    const down = (e: PointerEvent) => { if ((e.target as Element).closest('button')) return; on = true; sh._anim?.stop(); y0 = e.clientY; start = sh._pos || 0; hist = [[e.clientY, e.timeStamp]]; (e.currentTarget as Element).setPointerCapture(e.pointerId); };
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
      if (first) { const sc = document.querySelector<HTMLElement>('.scrim'); if (sc) sc.style.transition = 'opacity .3s, backdrop-filter .3s'; depth(1, true); }
    };
    const pm = (e: PointerEvent) => move(e);
    handles.forEach((h) => { h.addEventListener('pointerdown', down); h.addEventListener('pointermove', pm); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up); });
    const bodyEl = sh.querySelector<HTMLElement>('.sheet-body'); let ty0 = 0, pulling = false;
    const ts = (e: TouchEvent) => { ty0 = e.touches[0].clientY; pulling = false; };
    const tm = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (!pulling) { if (!bodyEl || bodyEl.scrollTop > 0 || y - ty0 < 6) return; pulling = true; on = true; sh._anim?.stop(); y0 = y; start = sh._pos || 0; hist = [[y, performance.now()]]; }
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
  const { sheets, content, closeTop, c, lang } = useK();
  const qc = useQueryClient();
  // the content sheet's label is the name its query brings, so redraw when a query lands
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  useEffect(() => qc.getQueryCache().subscribe((e) => { if (e.type === 'updated' && e.action.type === 'success') redraw(); }), [qc]);
  useEffect(() => { const f = () => closeTop(); document.addEventListener('k-close-top', f); return () => document.removeEventListener('k-close-top', f); }, [closeTop]);
  const open = sheets.filter((x) => !x.closing);
  const anyOpen = open.length > 0;
  useLayoutEffect(() => { lockPage(anyOpen); }, [anyOpen]);
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
