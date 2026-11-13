import { describe, expect, it } from 'vitest';
import { dayLabel, dur, matchesWhen, openAt, openState, t12, timeLeftText, type HoursRow } from './openState.ts';

// 2026-11-15 is a Sunday, so at(3, ...) is a Wednesday
const at = (day: number, h: number, m = 0) => new Date(2026, 10, 15 + day, h, m);
const every = (o: string, c: string): HoursRow[] => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ d, o, c, x: false }));
const only = (d: number, o: string, c: string): HoursRow[] => [{ d, o, c, x: false }];

describe('openState', () => {
  it('no hours is unknown', () => {
    expect(openState([], at(3, 12))).toEqual({ kind: 'unknown' });
    expect(openState(null, at(3, 12))).toEqual({ kind: 'unknown' });
  });
  it('a 24-hour span is allDay', () => expect(openState(every('00:00:00', '00:00:00'), at(2, 4))).toEqual({ kind: 'allDay' }));
  it('open now: opened, closes, done and minutes left', () =>
    expect(openState(every('10:00:00', '22:00:00'), at(3, 19))).toEqual({ kind: 'open', from: '10:00:00', until: '22:00:00', done: 0.75, left: 180 }));
  it("yesterday's span past midnight counts as open", () => {
    const st = openState(only(4, '20:00:00', '02:00:00'), at(5, 1));
    expect(st).toMatchObject({ kind: 'open', from: '20:00:00', until: '02:00:00', left: 60 });
  });
  it('closed before opening today: opens today, time to opening, done since last close', () => {
    const st = openState(every('10:00:00', '22:00:00'), at(3, 8));
    expect(st).toMatchObject({ kind: 'closed', from: '22:00:00', until: '10:00:00', inDays: 0, left: 120 });
    expect(st.kind === 'closed' && st.done).toBeCloseTo(600 / 720);
  });
  it('closed tonight, opens tomorrow', () => {
    const st = openState(only(1, '10:00:00', '22:00:00'), at(0, 23));
    expect(st).toMatchObject({ kind: 'closed', inDays: 1, weekday: 1, left: 660 });
    expect(st.kind === 'closed' && dayLabel(st)).toBe('Tomorrow');
  });
  it('closed today, the next opening is another weekday', () => {
    const st = openState(only(3, '10:00:00', '22:00:00'), at(0, 12));
    expect(st).toMatchObject({ kind: 'closed', inDays: 3, weekday: 3 });
    expect(st.kind === 'closed' && dayLabel(st)).toBe('Wed');
    expect(st.kind === 'closed' && dayLabel(st, 'ar')).toBe('الأربع');
  });
  it('a day marked closed is skipped', () => {
    const hours = [{ d: 3, o: '10:00:00', c: '22:00:00', x: true }, { d: 4, o: '10:00:00', c: '22:00:00', x: false }];
    expect(openState(hours, at(3, 12))).toMatchObject({ kind: 'closed', inDays: 1 });
  });
  it('never opening in the next week has no opening time', () =>
    expect(openState([{ d: 3, o: '10:00:00', c: '22:00:00', x: true }], at(3, 12))).toMatchObject({ kind: 'closed', until: null }));
});

describe('t12, dur and the time-left line', () => {
  it('12-hour time, minutes only when not zero', () => {
    expect(t12('17:36:00')).toBe('5:36 pm');
    expect(t12('09:00')).toBe('9 am');
    expect(t12('00:00')).toBe('12 am');
    expect(t12('12:05')).toBe('12:05 pm');
    expect(t12(new Date(2026, 10, 15, 19, 0))).toBe('7 pm');
    expect(t12('17:00', 'ar')).toBe('5 م');
  });
  it('durations in hours and minutes', () => {
    expect(dur(226)).toBe('3 h 46 min');
    expect(dur(120)).toBe('2 h');
    expect(dur(45)).toBe('45 min');
  });
  it('time left reads left when open and opens in when closed', () => {
    expect(timeLeftText({ kind: 'open', left: 226 })).toBe('3 h 46 min left');
    expect(timeLeftText({ kind: 'closed', left: 60 })).toBe('Opens in 1 h');
  });
});

describe('openAt and When', () => {
  const late = every('20:00:00', '02:00:00');
  it('a span past midnight is open after midnight', () => {
    expect(openAt(late, 3, 60)).toBe(true);
    expect(openAt(late, 3, 3 * 60)).toBe(false);
    expect(openAt(late, 3, 21 * 60)).toBe(true);
  });
  it('now, tonight at 9 pm and the weekend (Friday or Saturday at 8 pm)', () => {
    const day = every('09:00:00', '17:00:00');
    expect(matchesWhen(day, 'now', at(3, 12))).toBe(true);
    expect(matchesWhen(day, 'tonight', at(3, 12))).toBe(false);
    expect(matchesWhen(late, 'tonight', at(3, 12))).toBe(true);
    expect(matchesWhen(only(6, '19:00:00', '23:00:00'), 'weekend', at(3, 12))).toBe(true);
    expect(matchesWhen(only(0, '19:00:00', '23:00:00'), 'weekend', at(3, 12))).toBe(false);
    expect(matchesWhen(null, '', at(3, 12))).toBe(true);
  });
});
