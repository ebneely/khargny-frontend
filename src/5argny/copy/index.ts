import { en } from './en.ts';
import { ar } from './ar.ts';

export { en, ar };
export type { Copy } from './en.ts';
export type Lang = 'en' | 'ar';
export const copy = { en, ar };

// fill('{n} places', { n: 3 }) -> '3 places'; an unknown {key} stays as written so a missing value shows in review
export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? String(vars[key]) : m));
