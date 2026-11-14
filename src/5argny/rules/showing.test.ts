import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShowing } from './showing.ts';

describe('place showing: 50% visible for 1 s, once per card per screen visit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires after 1 s at half visible', () => {
    const fire = vi.fn(), s = createShowing();
    s.visible('social:a', 0.5, fire);
    vi.advanceTimersByTime(999); expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(fire).toHaveBeenCalledTimes(1);
  });
  it('does not fire under half, or when it leaves before 1 s', () => {
    const fire = vi.fn(), s = createShowing();
    s.visible('social:a', 0.49, fire); vi.advanceTimersByTime(5000);
    s.visible('social:b', 0.9, fire); vi.advanceTimersByTime(600); s.visible('social:b', 0.1, fire); vi.advanceTimersByTime(5000);
    expect(fire).not.toHaveBeenCalled();
  });
  it('the 1 s starts again after it leaves and comes back', () => {
    const fire = vi.fn(), s = createShowing();
    s.visible('k', 1, fire); vi.advanceTimersByTime(600); s.visible('k', 0, fire);
    s.visible('k', 1, fire); vi.advanceTimersByTime(600); expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400); expect(fire).toHaveBeenCalledTimes(1);
  });
  it('fires once per card, however often it scrolls back; another card fires on its own', () => {
    const a = vi.fn(), b = vi.fn(), s = createShowing();
    for (let i = 0; i < 3; i++) { s.visible('k', 1, a); vi.advanceTimersByTime(1500); s.visible('k', 0, a); }
    s.visible('j', 1, b); vi.advanceTimersByTime(1000);
    expect(a).toHaveBeenCalledTimes(1); expect(b).toHaveBeenCalledTimes(1);
  });
  it('a new visit (a new tracker) fires again; stop() cancels a waiting card', () => {
    const fire = vi.fn(), s = createShowing();
    s.visible('k', 1, fire); s.stop(); vi.advanceTimersByTime(2000); expect(fire).not.toHaveBeenCalled();
    createShowing().visible('k', 1, fire); vi.advanceTimersByTime(1000); expect(fire).toHaveBeenCalledTimes(1);
  });
});
