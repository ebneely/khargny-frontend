import { describe, expect, it } from 'vitest';
import { ar, en, fill } from './index.ts';

const strings = (o: unknown, path = ''): [string, string][] =>
  typeof o === 'string' ? [[path, o]] : Object.entries(o as object).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
const shape = (o: unknown): unknown => (typeof o === 'string' ? 's' : Array.isArray(o) ? o.map(shape) : Object.fromEntries(Object.entries(o as object).map(([k, v]) => [k, shape(v)])));

describe('copy', () => {
  it('no "·" separator in any string', () => {
    expect(strings(en).filter(([, s]) => s.includes('·'))).toEqual([]);
    expect(strings(ar).filter(([, s]) => s.includes('·'))).toEqual([]);
  });
  it('Arabic uses western digits', () => expect(strings(ar).filter(([, s]) => /[٠-٩۰-۹]/.test(s))).toEqual([]));
  it('Arabic has every key and list item English has', () => expect(shape(ar)).toEqual(shape(en)));
  it('Arabic keeps the same placeholders', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    const arByPath = Object.fromEntries(strings(ar));
    expect(strings(en).filter(([p, s]) => vars(s) !== vars(arByPath[p] ?? ''))).toEqual([]);
  });
  it('fill puts values in and leaves unknown keys visible', () => {
    expect(fill(en.filters.show, { n: 12 })).toBe('Show 12 places');
    expect(fill('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});
