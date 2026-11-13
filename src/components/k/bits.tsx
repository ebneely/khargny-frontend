'use client';
// The prototype's small patterns, each exactly once: Btn, IconBtn, Tag, Bit, Group, Brand, Cnt (roll + count-up), Seg.
import { useEffect, useLayoutEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { animate } from 'motion';
import { L, Ic, type StrokeName } from './icons';
import { k } from './rules';
import { useK, reduce, spring } from './KProvider';

export function Brand() {
  const { lang } = useK();
  return <span className="brand" lang={lang}>{lang === 'ar' ? 'خرجني' : '5argny'}</span>;
}

type Click = (e: MouseEvent<HTMLButtonElement>) => void;
export function Btn({ label, kind = 'secondary', icon, wide, onClick, act }: { label: ReactNode; kind?: 'primary' | 'secondary' | 'plain'; icon?: StrokeName; wide?: boolean; onClick?: Click; act?: string }) {
  return <button className={`btn ${kind} ${wide ? 'wide' : ''} press`} data-act={act ?? ''} onClick={onClick}>{icon ? <Ic n={icon} /> : null}{label}</button>;
}
export function IconBtn({ icon, label, cls = '', onClick, act, pressed, id }: { icon: StrokeName; label: string; cls?: string; onClick?: Click; act?: string; pressed?: boolean; id?: string }) {
  return <button className={`icon-btn ${cls} press`} aria-label={label} data-act={act ?? ''} data-id={id} aria-pressed={pressed} onClick={onClick}><Ic n={icon} /></button>;
}
export const Tag = ({ label, tone = '', icon }: { label: ReactNode; tone?: string; icon?: string }) => <span className={`tag ${tone}`}>{icon ? <L n={icon} /> : null}{label}</span>;
export const Bit = ({ icon, children }: { icon: string; children: ReactNode }) => <span className="bit"><L n={icon} />{children}</span>;
export const Group = ({ title, children, label }: { title: ReactNode; children: ReactNode; label?: string }) => <section className="group" aria-label={label}><h2 className="group-title">{title}</h2>{children}</section>;

export function Seg<V extends string>({ opts, val, onPick }: { opts: [V, string][]; val: V; onPick: (v: V) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (ref.current) slidePill(ref.current, false); });
  // the pill is measured, so measure again whenever the row changes size (web fonts landing, language, theme, a sheet opening)
  useEffect(() => { const el = ref.current; if (!el || !('ResizeObserver' in window)) return; const ro = new ResizeObserver(() => slidePill(el, false)); ro.observe(el); el.querySelectorAll('button').forEach((b) => ro.observe(b)); return () => ro.disconnect(); }, []);
  return <div className="seg" role="group" ref={ref}><span className="pill" />{opts.map(([v, l]) => <button key={v} className="press" aria-pressed={v === val} data-v={v} onClick={(e) => { onPick(v); requestAnimationFrame(() => slidePill(e.currentTarget.parentElement!, true)); }}>{l}</button>)}</div>;
}

/** The sliding selection pill under a row of choices (proto sliders()). */
export function slidePill(c: HTMLElement, animateIt: boolean, from?: Element | null) {
  const pill = c.querySelector<HTMLElement>(':scope > .pill'); if (!pill) return;
  const on = c.querySelector('[aria-current="page"],[aria-pressed="true"]');
  if (!on) { pill.style.opacity = '0'; return; }
  const cr = c.getBoundingClientRect();
  const box = (el: Element) => { const r = el.getBoundingClientRect(); return { left: r.left - cr.left + c.scrollLeft + 'px', top: r.top - cr.top + 'px', width: r.width + 'px', height: r.height + 'px' }; };
  if (from) Object.assign(pill.style, box(from), { opacity: '1' });
  const to = { ...box(on), opacity: '1' };
  if (animateIt && !reduce()) animate(pill, to, spring(0, 0.4)); else Object.assign(pill.style, to);
}

/**
 * A count under an action. `base` null = the number is not known yet (no stats endpoint): nothing is drawn, never a fake 0.
 * It counts up once when it scrolls into view, and rolls when your own action changes it.
 */
export function Cnt({ base, mine = false }: { base: number | null | undefined; mine?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const to = base == null ? null : base + (mine ? 1 : 0);
  const shown = useRef<number | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el || to == null) return;
    if (shown.current != null && shown.current !== to) {
      const up = to > shown.current; el.textContent = k(to);
      animate(el, { opacity: [0, 1], transform: [`translateY(${up ? 8 : -8}px)`, 'translateY(0)'] }, spring(0, 0.3));
    }
    shown.current = to;
  }, [to]);
  useEffect(() => {
    const el = ref.current; if (!el || to == null || reduce() || to < 2 || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return; io.disconnect(); const t0 = performance.now(), D = 900, n = shown.current ?? to;
      const step = (t: number) => { const f = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - f, 3); el.textContent = k(Math.round(n * e)); if (f < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to == null]);
  if (to == null) return null;
  return <span className="n" ref={ref}>{k(to)}</span>;
}

export function Views({ n, label }: { n: number; label: string }) {
  return <span className="views" title={label} aria-label={`${k(n)} ${label}`}><Ic n="eye" />{k(n)}</span>;
}
