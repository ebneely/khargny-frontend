'use client';
// The phone tab bar (owner 2026-11-14): Liquid Glass with an iOS native feel at a steady 60 fps.
//
// Built for the compositor:
// - the glass is a static layer. On Chromium it bends the backdrop through an SVG displacement filter whose map is drawn
//   once per bar size (never per frame); Safari and Firefox get a plain frosted backdrop, because they accept the url()
//   but render nothing.
// - the selection is a separate pill moved only with transform. Taps run a precomputed critically damped spring as plain
//   keyframes on the Web Animations API, so it runs off the main thread and can be interrupted from where it is.
// - tab positions are measured once and on resize, never inside a frame. Dragging moves the pill 1:1 with the finger and
//   flings it to the tab its momentum projects (velocity hand-off), then opens that tab.
// - the bar re-renders only when the selected tab or the language changes.
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Ic } from './icons';

type Item = { key: string; href: string; label: string; icon: Parameters<typeof Ic>[0]['n'] };

// critically damped spring, response 0.38 s (Apple's default feel), sampled once. Played as plain keyframes, not as a
// linear() easing: WebKit runs linear() in software (30 fps in Low Power Mode), keyframes run on the GPU everywhere
const RESPONSE = 0.38;
const SPRING = (() => {
  const w = (2 * Math.PI) / RESPONSE, end = 9.2 / w; // settles to within 0.1 %
  const pts: number[] = [];
  for (let i = 0; i <= 40; i++) { const t = (end * i) / 40; pts.push(1 - (1 + w * t) * Math.exp(-w * t)); }
  pts[pts.length - 1] = 1;
  return { pts, ms: Math.round(end * 1000) };
})();

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const haptic = () => { try { navigator.vibrate?.(8); } catch { /* not supported */ } };
// Chromium (not iOS, where every browser is WebKit) renders backdrop-filter: url(); the others pass @supports but draw nothing
const bendsBackdrop = () => { const ua = navigator.userAgent; return /Chrome|Chromium|Edg\//.test(ua) && !/CriOS|FxiOS|EdgiOS|Firefox/.test(ua); };

/** The edge-refraction map: grey in the middle (no bend), pushing inward near the capsule's edge. Drawn once per size. */
function lensMap(w: number, h: number) {
  const scale = 0.5, cw = Math.max(2, Math.round(w * scale)), ch = Math.max(2, Math.round(h * scale));
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d'); if (!ctx) return '';
  const img = ctx.createImageData(cw, ch), r = ch / 2, band = ch * 0.42;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    // nearest point on the capsule's centre line, so the inward normal is (sx - x, sy - y)
    const sx = Math.min(Math.max(x + 0.5, r), cw - r), sy = ch / 2;
    const vx = sx - (x + 0.5), vy = sy - (y + 0.5), len = Math.hypot(vx, vy) || 1;
    const d = r - len; // distance to the edge, inside
    const k = d < 0 ? 0 : Math.max(0, 1 - d / band) ** 2;
    const i = (y * cw + x) * 4;
    img.data[i] = 128 + Math.round((vx / len) * k * 127);
    img.data[i + 1] = 128 + Math.round((vy / len) * k * 127);
    img.data[i + 2] = 128; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL('image/png');
}

// drawn from the server render on, so it is on screen at the first paint; desktop hides it with CSS (display:none costs nothing)
export const GlassTabBar = memo(function GlassTabBar({ items, current, label, dir }: { items: Item[]; current: string; label: string; dir: 'ltr' | 'rtl' }) {
  return <Bar items={items} current={current} label={label} dir={dir} />;
});

function Bar({ items, current, label, dir }: { items: Item[]; current: string; label: string; dir: 'ltr' | 'rtl' }) {
  const bar = useRef<HTMLElement>(null), pill = useRef<HTMLSpanElement>(null);
  const slots = useRef<{ x: number; w: number }[]>([]);
  const anim = useRef<Animation | null>(null), at = useRef(0);
  const [lens, setLens] = useState<{ href: string; w: number; h: number } | null>(null);
  const index = Math.max(0, items.findIndex((i) => i.key === current));

  const place = useCallback((x: number) => { at.current = x; const p = pill.current; if (p) p.style.transform = `translate3d(${x}px,0,0)`; }, []);
  // move the pill to a tab; from where it is now, so a second tap mid-flight re-targets without a jump
  const glide = useCallback((to: number) => {
    const p = pill.current, slot = slots.current[to]; if (!p || !slot) return;
    // where the pill really is: mid-flight that is the running animation's value, read once at the moment of interruption
    const from = anim.current?.playState === 'running' ? new DOMMatrix(getComputedStyle(p).transform).m41 : at.current;
    anim.current?.cancel(); anim.current = null; place(slot.x);
    if (reduceMotion() || Math.abs(from - slot.x) < 1) return;
    anim.current = p.animate(SPRING.pts.map((k) => ({ transform: `translate3d(${(from + (slot.x - from) * k).toFixed(2)}px,0,0)` })), { duration: SPRING.ms });
  }, [place]);

  // measure the tabs once, and again only when the bar's size changes
  useLayoutEffect(() => {
    const el = bar.current; if (!el) return;
    const measure = () => {
      const tabs = [...el.querySelectorAll<HTMLElement>('.gbar-item')];
      const next: { x: number; w: number }[] = []; tabs.forEach((t) => { next[Number(t.dataset.i)] = { x: t.offsetLeft, w: t.offsetWidth }; }); slots.current = next; // by item, whatever the visual order
      const s = slots.current[index]; if (s && pill.current) { pill.current.style.width = `${s.w}px`; place(s.x); }
      if (bendsBackdrop() && el.offsetWidth) { const w = el.offsetWidth, h = el.offsetHeight; setLens((was) => (was && was.w === w && was.h === h ? was : { href: lensMap(w, h), w, h })); }
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el); return () => ro.disconnect();
  // index is read for the first placement only; later moves go through glide
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, place]);

  // the selected tab changed (a tap, a drag, or a navigation elsewhere): glide to it
  const shown = useRef(index);
  useEffect(() => { if (shown.current !== index) { shown.current = index; glide(index); } }, [index, glide]);

  // press and drag: the pill answers on pointerdown, follows the finger, and flings to the projected tab
  const drag = useRef<{ id: number; x0: number; grab: number; moved: boolean; last: number; t: number; v: number } | null>(null);
  const swallowClick = useRef(false);
  const nearest = (x: number) => { let best = 0, d = Infinity; slots.current.forEach((s, i) => { const c = Math.abs(s.x - x); if (c < d) { d = c; best = i; } }); return best; };
  const onDown = (e: React.PointerEvent) => {
    const tab = (e.target as Element).closest<HTMLElement>('.gbar-item'); if (!tab || !bar.current) return;
    const i = Number(tab.dataset.i); haptic();
    drag.current = { id: e.pointerId, x0: e.clientX, grab: e.clientX - at.current, moved: false, last: e.clientX, t: e.timeStamp, v: 0 };
    if (i !== shown.current) { shown.current = i; glide(i); } // the press answers at once, before the page arrives
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current; if (!g || g.id !== e.pointerId) return;
    if (!g.moved && Math.abs(e.clientX - g.x0) < 8) return;
    if (!g.moved) { g.moved = true; bar.current?.setPointerCapture(e.pointerId); anim.current?.cancel(); anim.current = null; }
    const dt = Math.max(1, e.timeStamp - g.t); g.v = 0.8 * ((e.clientX - g.last) / dt) + 0.2 * g.v; g.last = e.clientX; g.t = e.timeStamp;
    const xs = slots.current.map((s) => s.x), min = Math.min(...xs), max = Math.max(...xs);
    let x = e.clientX - g.grab;
    if (x < min) x = min - Math.sqrt(min - x) * 2; else if (x > max) x = max + Math.sqrt(x - max) * 2; // rubber band at the ends
    place(x);
  };
  const onUp = (e: React.PointerEvent) => {
    const g = drag.current; drag.current = null; if (!g || g.id !== e.pointerId || !g.moved) return;
    swallowClick.current = true;
    // Apple's projection: where the fling would come to rest (deceleration 0.998 per ms), then the tab nearest to it
    const projected = at.current + (g.v * 0.998) / (1 - 0.998);
    const i = nearest(projected); haptic(); const changed = i !== shown.current; shown.current = i; glide(i);
    if (changed) bar.current?.querySelector<HTMLAnchorElement>(`.gbar-item[data-i="${i}"]`)?.click();
  };

  return <nav ref={bar} className={`gbar${lens ? ' lens' : ''}`} dir="ltr" aria-label={label}
    onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; glide(shown.current); }}
    onClickCapture={(e) => { if (swallowClick.current && e.isTrusted) { swallowClick.current = false; e.preventDefault(); e.stopPropagation(); } }}>
    <span className="gbar-glass" aria-hidden="true" />
    <span className="gbar-pill" ref={pill} aria-hidden="true" />
    {(dir === 'rtl' ? [...items].reverse() : items).map((it) => {
      const i = items.indexOf(it);
      return <Link key={it.key} href={it.href} prefetch className="gbar-item" data-i={i} aria-current={i === index ? 'page' : undefined} draggable={false}>
        <Ic n={it.icon} /><span dir={dir}>{it.label}</span>
      </Link>;
    })}
    {lens ? <svg className="gbar-defs" width="0" height="0" aria-hidden="true"><filter id="gbar-lens" x="0" y="0" width={lens.w} height={lens.h} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feImage href={lens.href} x="0" y="0" width={lens.w} height={lens.h} preserveAspectRatio="none" result="map" />
      <feDisplacementMap in="SourceGraphic" in2="map" scale="22" xChannelSelector="R" yChannelSelector="G" />
    </filter></svg> : null}
  </nav>;
}
