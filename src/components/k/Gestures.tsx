'use client';
// Double-tap anywhere on a post or a place loves it (a heart flies along an arc to the button, with fading rings);
// tap, then hold 2 s shares it (the ring sits above the thumb). Ported from proto/app.js loveZone/loveAt/hold.
import { useEffect, useRef } from 'react';
import { animate } from 'motion';
import { useK, haptic, reduce, spring } from './KProvider';
import { useShare, markLove, lastLoveAt, markPress, bumpShare } from './place';
import { strokePaths } from '@5argny/core/icons';

const svg = (n: keyof typeof strokePaths) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${strokePaths[n]}"/></svg>`;

function loveZone(target: Element) {
  if (target.closest('button, a, input, textarea, select, label, [data-act], .seg, .hype')) return null;
  const post = target.closest('.post'); if (post) return { root: post, btn: post.querySelector<HTMLButtonElement>('[data-act="like"]') };
  const root = target.closest('.sheet, #view'), btn = root?.querySelector<HTMLButtonElement>('.place-tools [data-act="like"]');
  return btn ? { root, btn } : null;
}

export function Gestures() {
  const { c, toast } = useK();
  const share = useShare();
  const live = useRef({ share, toast, hint: c.home.loveHint });
  useEffect(() => { live.current = { share, toast, hint: c.home.loveHint }; });
  useEffect(() => {
    const fx = () => document.getElementById('fx') || document.body;
    let lastTap: { t: number; x: number; y: number } | null = null;
    let hold: { x: number; y: number; sy: number; lift: number; t1?: ReturnType<typeof setTimeout>; t2?: ReturnType<typeof setTimeout>; ring?: HTMLElement | null } | null = null;
    const near = (x: number, y: number) => lastTap && Date.now() - lastTap.t < 300 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30;

    function loveAt(x: number, y: number, btn: HTMLButtonElement) {
      haptic(); markLove();
      const h = document.createElement('div'); h.className = 'love-fly'; h.innerHTML = svg('heart'); Object.assign(h.style, { left: x + 'px', top: y + 'px' });
      if (!reduce()) [0, 160].forEach((d) => { const r = document.createElement('i'); r.className = 'love-ring'; Object.assign(r.style, { left: x + 'px', top: y + 'px', animationDelay: d + 'ms' }); fx().append(r); setTimeout(() => r.remove(), 1100 + d); });
      fx().append(h);
      const liked = btn.classList.contains('on');
      const land = () => { h.remove(); const icon = btn.querySelector('svg'); if (liked) { if (icon) animate(icon, { transform: ['scale(1)', 'scale(1.35)', 'scale(1)'] }, spring(0.35, 0.4)); } else btn.click(); };
      if (reduce()) { setTimeout(land, 150); return; }
      const r0 = btn.getBoundingClientRect(), topEdge = document.querySelector('.chrome-top')?.getBoundingClientRect().bottom ?? 0;
      const off = r0.top < topEdge || r0.bottom > innerHeight - 90; if (off) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const icon = btn.querySelector('svg')!;
      animate(h, { transform: ['translate(-50%,-50%) scale(0)', 'translate(-50%,-50%) scale(1.25)', 'translate(-50%,-50%) scale(1)'] }, { duration: 0.38, ease: [0.3, 1.4, 0.5, 1] }).finished.then(() => setTimeout(() => {
        const t0 = performance.now(), D = 560, ease = (f: number) => (f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);
        const step = (now: number) => {
          const f = Math.min(1, (now - t0) / D), e = ease(f), r = icon.getBoundingClientRect(), tx = r.left + r.width / 2, ty = r.top + r.height / 2;
          const lift = Math.min(120, Math.abs(ty - y) * 0.5 + 40), cx = (x + tx) / 2, cy = Math.min(y, ty) - lift; // control point above both ends: an arc
          const px = (1 - e) * (1 - e) * x + 2 * (1 - e) * e * cx + e * e * tx, py = (1 - e) * (1 - e) * y + 2 * (1 - e) * e * cy + e * e * ty, sc = 1 + (r.width / 84 - 1) * e;
          h.style.left = px + 'px'; h.style.top = py + 'px'; h.style.transform = `translate(-50%,-50%) scale(${sc})`; h.style.opacity = f > 0.9 ? String(1 - (f - 0.9) * 10) : '1';
          if (f < 1) requestAnimationFrame(step); else land();
        };
        requestAnimationFrame(step);
      }, off ? 380 : 40));
    }
    const stopHold = () => { document.documentElement.classList.remove('holding'); if (!hold) return; clearTimeout(hold.t1); clearTimeout(hold.t2); hold.ring?.remove(); hold = null; };

    const onUp = (e: PointerEvent) => {
      const z = loveZone(e.target as Element); if (!z?.btn) { lastTap = null; return; }
      if (near(e.clientX, e.clientY)) { lastTap = null; loveAt(e.clientX, e.clientY, z.btn); return; }
      lastTap = { t: Date.now(), x: e.clientX, y: e.clientY };
    };
    const onDown = (e: PointerEvent) => {
      const z = loveZone(e.target as Element); if (!z?.btn || e.button > 0) return; stopHold();
      const second = !!near(e.clientX, e.clientY); markPress(second);
      if (!second) return; // only the second press of a double tap can become a hold
      const x0 = e.clientX, y0 = e.clientY, btn = z.btn;
      hold = { x: x0, y: y0, sy: scrollY, lift: e.pointerType === 'mouse' ? 0 : 76 }; // the ring sits above the thumb
      document.documentElement.classList.add('holding'); getSelection()?.removeAllRanges();
      hold.t1 = setTimeout(() => { if (!hold) return;
        const ring = document.createElement('div'); ring.className = 'hold-ring'; ring.innerHTML = `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/><circle class="fill" cx="32" cy="32" r="28"/></svg>${svg('share')}`;
        Object.assign(ring.style, { left: hold.x + 'px', top: Math.max(40, hold.y - hold.lift) + 'px' }); fx().append(ring); hold.ring = ring; }, 250);
      hold.t2 = setTimeout(() => { if (!hold) return; const ring = hold.ring; hold.ring = null; stopHold(); markLove(); haptic();
        if (ring) animate(ring, { transform: ['translate(-50%,-50%) scale(1)', 'translate(-50%,-50%) scale(1.3)'], opacity: [1, 0] }, { duration: 0.25 }).finished.then(() => ring.remove());
        const id = btn.dataset.id; live.current.share({ id, href: btn.dataset.href || location.pathname }, () => { if (id) bumpShare(id); }); }, 2000);
    };
    const onMove = (e: PointerEvent) => { if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) stopHold(); };
    const onScroll = () => { if (hold && Math.abs(scrollY - hold.sy) > 10) stopHold(); };
    const noSelect = (e: Event) => { if (document.documentElement.classList.contains('holding')) e.preventDefault(); };
    const noDblSelect = (e: MouseEvent) => { if (e.detail > 1 && loveZone(e.target as Element)) e.preventDefault(); };
    const noZoom = (e: TouchEvent) => { const p0 = e.touches[0]; if (e.touches.length === 1 && near(p0.clientX, p0.clientY) && loveZone(e.target as Element)) e.preventDefault(); };
    // a click right after a love must not open what is under the finger
    const swallow = (e: MouseEvent) => { if (e.isTrusted && Date.now() - lastLoveAt() < 450 && !(e.target as Element).closest('.sheet')) { e.preventDefault(); e.stopPropagation(); } };
    document.addEventListener('pointerup', onUp); document.addEventListener('pointerdown', onDown); document.addEventListener('pointermove', onMove, { passive: true });
    ['pointerup', 'pointercancel'].forEach((n) => document.addEventListener(n, stopHold));
    addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('contextmenu', noSelect); document.addEventListener('selectstart', noSelect); document.addEventListener('mousedown', noDblSelect);
    document.addEventListener('touchstart', noZoom, { passive: false }); document.addEventListener('click', swallow, true);
    // teach it once
    const teach = setTimeout(() => { if (localStorage.getItem('kh.loveHint')) return; localStorage.setItem('kh.loveHint', '1'); live.current.toast(live.current.hint); }, 2500);
    return () => {
      document.removeEventListener('pointerup', onUp); document.removeEventListener('pointerdown', onDown); document.removeEventListener('pointermove', onMove);
      ['pointerup', 'pointercancel'].forEach((n) => document.removeEventListener(n, stopHold));
      removeEventListener('scroll', onScroll); document.removeEventListener('contextmenu', noSelect); document.removeEventListener('selectstart', noSelect); document.removeEventListener('mousedown', noDblSelect);
      document.removeEventListener('touchstart', noZoom); document.removeEventListener('click', swallow, true); clearTimeout(teach);
    };
  }, []);
  return null;
}
