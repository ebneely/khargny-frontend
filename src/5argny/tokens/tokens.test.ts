import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dark, light } from './colors.ts';
import { radii } from './radii.ts';
import { controls, fonts } from './type.ts';
import { keyframes } from './motion.ts';

// The token dump: the variables web.css declares, read from the file itself, must equal the tokens.
const css = readFileSync(new URL('../web.css', import.meta.url), 'utf8');
const block = (selector: string) => {
  const start = css.indexOf(`${selector}{`);
  const body = css.slice(start + selector.length + 1, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):([^;]+);?/g)].map((m) => [m[1]!.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()), m[2]!.trim()]));
};

describe('tokens match web.css', () => {
  const root = block(':root'), night = block(':root[data-theme=dark]');
  it(':root colours are the light tokens', () => {
    const { text, display, ctl, ico, chip, rCard, rCtl, ...colours } = root;
    expect(colours).toEqual(light);
    expect({ text, display, ctl, ico, chip, rCard, rCtl }).toEqual({
      text: fonts.text, display: fonts.display, ctl: `${controls.control}px`, ico: `${controls.icon}px`, chip: `${controls.chip}px`,
      rCard: `${radii.card}px`, rCtl: `${radii.control}px`,
    });
  });
  it('[data-theme=dark] colours are the dark tokens (accentInk inherited)', () => {
    expect({ ...night, accentInk: light.accentInk }).toEqual(dark);
  });
  it('phone control sizes', () => {
    expect(css).toContain(`:root{--ctl:${controls.controlPhone}px;--chip:${controls.chipPhone}px;--ico:${controls.iconPhone}px}`);
  });
  it('every keyframe timing is an animation web.css runs', () => {
    const num = (n: number) => String(n).replace(/^0\./, '.');
    const ease = (e: (typeof keyframes)[keyof typeof keyframes]['ease']) => (typeof e === 'string' ? e : `cubic-bezier(${e.map(num).join(',')})`);
    const missing = Object.entries(keyframes).filter(([, t]) => {
      const head = `animation:${t.keyframes} ${num(t.duration)}s ${ease(t.ease)}`;
      return !css.includes(t.delay ? `${head} ${num(t.delay)}s` : head) || !css.includes(`@keyframes ${t.keyframes}{`);
    });
    expect(missing.map(([name]) => name)).toEqual([]);
  });
});
