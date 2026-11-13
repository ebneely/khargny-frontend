import { copy, fill, type Lang } from '../copy/index.ts';

// one row per weekday from the backend: d 0 = Sunday, o/c 'HH:MM[:SS]', x = closed that day
export type HoursRow = { d: number; o: string | null; c: string | null; x?: boolean };

export type OpenState =
  | { kind: 'unknown' } // no hours listed: "Hours not listed", "Know the hours? Tell us"
  | { kind: 'allDay' } // a span of 24 h or more
  | { kind: 'open'; from: string; until: string; done: number; left: number }
  | { kind: 'closed'; from: string | null; until: string | null; inDays: number; weekday: number; done: number; left: number };
// open: opened `from`, closes `until`, `done` 0..1 of the span, `left` minutes to closing.
// closed: closed at `from`, opens `until` in `inDays` days (0 today, 1 tomorrow) on `weekday`; `left` minutes to opening.
// A closed state with until null never opens in the next 7 days.

const toM = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
const mod7 = (d: number) => ((d % 7) + 7) % 7;

// Port of app.js openState: today's span and yesterday's (which may run past midnight) decide open; otherwise the next opening.
export function openState(hours: HoursRow[] | null | undefined, now: Date): OpenState {
  // a day with an opening but no closing time says nothing usable (not 24 hours): only closed days and full spans count
  if (!hours || !hours.some((h) => h.x || (h.o && h.c))) return { kind: 'unknown' };
  const day = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  const on = (d: number) => hours.find((x) => x.d === mod7(d) && !x.x && x.o && x.c);
  const span = (h: HoursRow, k: number): [number, number] => {
    const o = toM(h.o!) + 1440 * k;
    let c = toM(h.c ?? h.o!) + 1440 * k;
    if (c <= o) c += 1440;
    return [o, c];
  };
  for (const k of [0, -1]) {
    const h = on(day + k);
    if (!h) continue;
    const [o, c] = span(h, k);
    if (c - o >= 1440) return { kind: 'allDay' };
    if (mins >= o && mins < c) return { kind: 'open', from: h.o!, until: h.c!, done: (mins - o) / (c - o), left: c - mins };
  }
  let next: { at: number; h: HoursRow; k: number } | null = null;
  let prev: { at: number; h: HoursRow } | null = null;
  for (let k = 0; k <= 7 && !next; k++) { const h = on(day + k); if (h && span(h, k)[0] > mins) next = { at: span(h, k)[0], h, k }; }
  for (let k = 0; k >= -7 && !prev; k--) { const h = on(day + k); if (h && span(h, k)[1] <= mins) prev = { at: span(h, k)[1], h }; }
  if (!next) return { kind: 'closed', from: prev ? prev.h.c : null, until: null, inDays: 0, weekday: day, done: 0, left: 0 };
  const start = prev ? prev.at : mins;
  return {
    kind: 'closed', from: prev ? prev.h.c : null, until: next.h.o, inDays: next.k, weekday: mod7(day + next.k),
    done: next.at > start ? (mins - start) / (next.at - start) : 0, left: next.at - mins,
  };
}

// '' today, 'Tomorrow', or the short weekday ('Mon') before the opening time
export const dayLabel = (st: { inDays: number; weekday: number }, lang: Lang = 'en') =>
  st.inDays === 0 ? '' : st.inDays === 1 ? copy[lang].days.tomorrow : copy[lang].days.short[st.weekday]!;

// 12-hour time, western digits: '17:36' or a Date -> '5:36 pm'; '09:00' -> '9 am'
export function t12(v: string | Date, lang: Lang = 'en') {
  const [H, M] = v instanceof Date ? [v.getHours(), v.getMinutes()] : v.slice(0, 5).split(':').map(Number) as [number, number];
  const u = copy[lang].units;
  return `${((H + 11) % 12) + 1}${M ? ':' + String(M).padStart(2, '0') : ''} ${H < 12 ? u.am : u.pm}`;
}

// minutes -> '3 h 46 min', '2 h', '45 min'
export function dur(n: number, lang: Lang = 'en') {
  const u = copy[lang].units;
  return n >= 60 ? `${Math.floor(n / 60)} ${u.hour}${n % 60 ? ` ${n % 60} ${u.minute}` : ''}` : `${n} ${u.minute}`;
}

// the line above the timeline: '3 h 46 min left' or 'Opens in 9 h'
export const timeLeftText = (st: { kind: 'open' | 'closed'; left: number }, lang: Lang = 'en') =>
  fill(st.kind === 'open' ? copy[lang].open.left : copy[lang].open.opensIn, { dur: dur(st.left, lang) });

// open at a weekday and minute of the day, counting a span that runs past midnight (Filters "When" and the counts per time)
export function openAt(hours: HoursRow[] | null | undefined, day: number, mins: number) {
  const h = hours?.find((x) => x.d === day);
  if (!h || h.x || !h.o || !h.c) return false;
  const o = toM(h.o);
  let c = toM(h.c);
  if (c <= o) c += 1440;
  return (mins >= o && mins < c) || (mins + 1440 >= o && mins + 1440 < c);
}

export type When = '' | 'now' | 'tonight' | 'weekend';
// now = open this minute; tonight = open at 9 pm today; weekend = open Friday or Saturday at 8 pm
export function matchesWhen(hours: HoursRow[] | null | undefined, when: When, now: Date) {
  if (when === 'now') return openAt(hours, now.getDay(), now.getHours() * 60 + now.getMinutes());
  if (when === 'tonight') return openAt(hours, now.getDay(), 21 * 60);
  if (when === 'weekend') return openAt(hours, 5, 20 * 60) || openAt(hours, 6, 20 * 60);
  return true;
}
