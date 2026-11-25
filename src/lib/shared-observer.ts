/**
 * One IntersectionObserver per threshold, shared by every element that asks for it (issue #39, per-card cost).
 *
 * A screen of cards used to build one observer per counter and one per card — the first Explore page alone was about 144
 * observers, each with its own engine callback and layout bookkeeping. The engine already batches what one observer sees,
 * so the work becomes one observer with a map of callbacks. A group is dropped when its last element leaves.
 */
type Callback = (ratio: number) => void;
type Group = { io: IntersectionObserver; subs: Map<Element, Callback> };

const groups = new Map<number, Group>();

function group(threshold: number): Group {
  let g = groups.get(threshold);
  if (!g) {
    const subs = new Map<Element, Callback>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const cb = subs.get(entry.target);
        if (cb) cb(entry.isIntersecting ? entry.intersectionRatio : 0);
      }
    }, { threshold });
    g = { io, subs };
    groups.set(threshold, g);
  }
  return g;
}

/** Calls back with the visible ratio every time the element crosses the threshold; returns the unsubscribe. */
export function observeVisibility(el: Element, threshold: number, cb: Callback): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const g = group(threshold);
  g.subs.set(el, cb);
  g.io.observe(el);
  return () => {
    g.subs.delete(el);
    g.io.unobserve(el);
    if (!g.subs.size) { g.io.disconnect(); groups.delete(threshold); }
  };
}

/** Calls back once, when the element is first at least `threshold` visible, then stops observing it. */
export function observeFirst(el: Element, threshold: number, cb: () => void): () => void {
  let off: () => void = () => {};
  off = observeVisibility(el, threshold, (ratio) => {
    if (ratio < threshold) return;
    off();
    cb();
  });
  return off;
}
