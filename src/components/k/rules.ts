// Rules for the 5argny screens. Opening state, 12-hour time, durations and counts come from @5argny/core/rules (Vitest there);
// this file only adapts them to Egypt's clock and to the prototype's component props.
// TODO: INTENTS (with icons), moment() and hypePath() are still ported from proto/app.js here; move them to src/5argny/rules.
import { openState as coreOpenState, openAt as coreOpenAt, t12 as coreT12, dur as coreDur, dayLabel, short } from '@5argny/core/rules';
import type { KPlace } from './data';

export type Lang = 'en' | 'ar';

/** "Now" in Egypt (every place is there), or the ?time=HH:MM the prototype uses to show closed states. `date` carries Cairo's wall clock. */
export type Now = { day: number; mins: number; h: number; m: number; date: Date };
export function nowIn(time?: string | null): Now {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  let h = get('hour'), m = get('minute');
  if (time && /^\d{1,2}(:\d{2})?$/.test(time)) { const [hh, mm] = time.split(':').map(Number); h = hh; m = mm || 0; }
  const date = new Date(get('year'), get('month') - 1, get('day'), h, m);
  return { day: date.getDay(), mins: h * 60 + m, h, m, date };
}

export const k = short;
export const t12 = (v: string | Now, lang: Lang = 'en') => coreT12(typeof v === 'string' ? v : v.date, lang);
export const dur = (n: number, lang: Lang = 'en') => coreDur(n, lang);

/** The prototype's state shape: open/closed with the times already written, null when no hours are listed. */
export type OpenState = { open: boolean; allDay?: boolean; from?: string; until?: string; done?: number; left?: number };
export function openState(p: Pick<KPlace, 'hours'>, now: Now, lang: Lang = 'en'): OpenState | null {
  const st = coreOpenState(p.hours, now.date);
  if (st.kind === 'unknown') return null;
  if (st.kind === 'allDay') return { open: true, allDay: true };
  if (st.kind === 'open') return { open: true, from: t12(st.from, lang), until: t12(st.until, lang), done: st.done, left: st.left };
  if (!st.until) return { open: false };
  const day = dayLabel(st, lang);
  return { open: false, from: st.from ? t12(st.from, lang) : '', until: `${day ? day + ' ' : ''}${t12(st.until, lang)}`, done: st.done, left: st.left };
}
export const openAt = (p: Pick<KPlace, 'hours'>, day: number, mins: number) => coreOpenAt(p.hours, day, mins);

export const hash = (s: string) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export const INTENTS = [
  { key: 'eat', icon: 'utensils', cats: ['Restaurants'] },
  { key: 'coffee', icon: 'coffee', cats: ['Cafes'] },
  { key: 'fun', icon: 'ferris-wheel', cats: ['Entertainment', 'Cinemas', 'Clubs'] },
  { key: 'history', icon: 'castle', cats: ['Historic Landmarks', 'Museums'] },
  { key: 'stay', icon: 'bed-double', cats: ['Hotels & Resorts'] },
  { key: 'shop', icon: 'shopping-bag', cats: ['Shopping Malls'] },
  { key: 'outdoors', icon: 'trees', cats: ['Parks'] },
] as const;
export type Intent = (typeof INTENTS)[number];

/** The answer before the question: what fits this hour. */
export function moment(now: Now) {
  const h = now.h;
  const pick = h >= 6 && h < 11 ? (['coffee', 'morningCoffee'] as const) : h >= 11 && h < 16 ? (['eat', 'lunch'] as const) : h >= 16 && h < 19 ? (['outdoors', 'goldenHour'] as const) : h >= 19 && h < 23 ? (['eat', 'dinner'] as const) : (['fun', 'lateNight'] as const);
  return { x: INTENTS.find((i) => i.key === pick[0])!, title: pick[1] };
}

/** A smooth curve through daily values (monotone cubic), as the prototype's HypeLine draws it. */
export function hypePath(days: number[], W = 300, H = 70, pad = 6) {
  const max = Math.max(...days), min = Math.min(...days), n = days.length;
  const pt = days.map((v, i) => [pad + (i * (W - 2 * pad)) / (n - 1), H - pad - ((v - min) / Math.max(1, max - min)) * (H - 2 * pad - 10)]);
  const dx = pt[1][0] - pt[0][0], sec = pt.slice(1).map((q, i) => (q[1] - pt[i][1]) / dx);
  const m = pt.map((_, i) => (i === 0 ? sec[0] : i === n - 1 ? sec[n - 2] : sec[i - 1] * sec[i] <= 0 ? 0 : (sec[i - 1] + sec[i]) / 2));
  for (let i = 0; i < n - 1; i++) { if (!sec[i]) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / sec[i], b = m[i + 1] / sec[i], h = a * a + b * b; if (h > 9) { const s3 = 3 / Math.sqrt(h); m[i] = s3 * a * sec[i]; m[i + 1] = s3 * b * sec[i]; } }
  let d = `M${pt[0][0].toFixed(1)},${pt[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) d += ` C${(pt[i][0] + dx / 3).toFixed(1)},${(pt[i][1] + (m[i] * dx) / 3).toFixed(1)} ${(pt[i + 1][0] - dx / 3).toFixed(1)},${(pt[i + 1][1] - (m[i + 1] * dx) / 3).toFixed(1)} ${pt[i + 1][0].toFixed(1)},${pt[i + 1][1].toFixed(1)}`;
  return { d, pt, max, min };
}
