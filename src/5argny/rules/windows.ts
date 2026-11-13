// Rolling windows: every number is a window that ends now, never a calendar period (DIRECTION "Rolling windows").
const MIN = 60_000;
export const WINDOW_MS = { live: 5 * MIN, '24h': 1440 * MIN, '7d': 7 * 1440 * MIN, '30d': 30 * 1440 * MIN } as const;
export type Window = keyof typeof WINDOW_MS;

// one counter bucket: `at` = bucket start (ms since epoch); 5-minute buckets feed live and 24 h, hourly buckets feed 7 and 30 days
export type Bucket = { at: number; n: number };

// shortcut: a bucket counts whole when it starts inside the window, so the far edge is off by up to one bucket; finer buckets fix it
export const windowSum = (buckets: Bucket[], window: Window, now: number, endsAgo = 0) => {
  const to = now - endsAgo, from = to - WINDOW_MS[window];
  return buckets.reduce((a, b) => (b.at >= from && b.at < to ? a + b.n : a), 0);
};

// views in the window and growth against the window just before it (0 when the one before was empty)
export const windowTrend = (buckets: Bucket[], window: Window, now: number) => {
  const n = windowSum(buckets, window, now), prev = windowSum(buckets, window, now, WINDOW_MS[window]);
  return { n, g: prev ? (n - prev) / prev : 0 };
};

export type PlaceEvent = 'view' | 'like' | 'save' | 'share' | 'go';
// What customers see: loves and 5argny! taps are lasting totals; everything else is the last 30 days (DIRECTION "Card stats line").
export const SHOWN_AS_TOTAL: ReadonlySet<PlaceEvent> = new Set(['like', 'go']);
export const shownCount = (event: PlaceEvent, counts: { d30: Record<PlaceEvent, number>; all: Record<PlaceEvent, number> }) =>
  SHOWN_AS_TOTAL.has(event) ? counts.all[event] : counts.d30[event];

// 1234 -> '1.2k', 1000 -> '1k', 999 -> '999'
export const short = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
