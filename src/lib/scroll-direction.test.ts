import { describe, expect, it } from 'vitest';
import { initialScrollDirection, scrollDirection, type ScrollDirection } from './scroll-direction';

/** Feed a list of scroll positions through the rule, the way one scroll gesture arrives. */
const run = (positions: number[], options: { locked?: boolean; scrollable?: boolean } = {}) =>
  positions.reduce<ScrollDirection>((state, top) => scrollDirection(state, top, options), initialScrollDirection(0));
/** The state a page already at `top`, with the chrome shown, starts from. */
const from = (top: number) => initialScrollDirection(top);

describe('the top chrome hides on scroll down and returns on scroll up', () => {
  it('is shown at the top of the page and through sub-threshold movement', () => {
    const state = run([0, 40, 95, 92, 96]);
    expect(state.hidden).toBe(false);
  });

  it('hides once the page has moved down more than the 8 px threshold', () => {
    expect(run([0, 300]).hidden).toBe(true);
    // 8 px exactly is noise, 9 px is intent
    expect(scrollDirection(from(100), 108).hidden).toBe(false);
    expect(scrollDirection(from(100), 109).hidden).toBe(true);
  });

  it('does not flicker on a jittery thumb while hidden', () => {
    const hidden = run([0, 400]);
    expect(scrollDirection(hidden, 400 + 7).hidden).toBe(true);
    expect(scrollDirection(hidden, 400 - 7).hidden).toBe(true);
  });

  it('comes back after 8 px upward, not before', () => {
    const hidden = run([0, 400]);
    expect(scrollDirection(hidden, 392).hidden).toBe(true);
    expect(scrollDirection(hidden, 391).hidden).toBe(false);
  });

  it('is always shown at the top of the page, even after a long scroll down', () => {
    const hidden = run([0, 2000]);
    expect(hidden.hidden).toBe(true);
    expect(scrollDirection(hidden, 96).hidden).toBe(false);
    expect(scrollDirection(hidden, 0).hidden).toBe(false);
  });

  it('stays shown while a search or a sheet holds the chrome', () => {
    const hidden = run([0, 400]);
    expect(scrollDirection(hidden, 900, { locked: true }).hidden).toBe(false);
    expect(run([0, 400], { locked: true }).hidden).toBe(false);
  });

  it('stays shown on a page with nothing to scroll', () => {
    expect(run([0, 400], { scrollable: false }).hidden).toBe(false);
  });
});
