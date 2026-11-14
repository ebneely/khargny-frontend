// A place card is "showing" when at least half of it is on screen for 1 s: counted once per card per screen visit
// (a visit = one tracker). Pure and timer-based, so the web and the tests share it; the caller says how visible a card is.
export const SHOWING_RATIO = 0.5;
export const SHOWING_MS = 1000;

export function createShowing() {
  const done = new Set<string>();
  const waiting = new Map<string, ReturnType<typeof setTimeout>>();
  const cancel = (key: string) => { clearTimeout(waiting.get(key)); waiting.delete(key); };
  return {
    /** The card's visible share changed (0 when it leaves or unmounts). `fire` runs once, 1 s after it reached half. */
    visible(key: string, ratio: number, fire: () => void) {
      if (done.has(key)) return;
      if (ratio < SHOWING_RATIO) return cancel(key);
      if (!waiting.has(key)) waiting.set(key, setTimeout(() => { waiting.delete(key); done.add(key); fire(); }, SHOWING_MS));
    },
    stop() { [...waiting.keys()].forEach(cancel); },
  };
}
