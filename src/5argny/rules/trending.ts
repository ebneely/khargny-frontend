// Trending rail: views in the window, lifted by growth against the window before (app.js TrendCard)
export const momentum = (t: { n: number; g: number }) => t.n * (1 + Math.max(0, t.g));

export type TrendPlace = { city: string; area?: string | null; n: number; g: number };
// the area's places; fewer than 3 widens to the city, then to all of Egypt (spec edge case "trending card widens")
export function trendingTop<T extends TrendPlace>(all: T[], city: string | null, area: string | null, k = 5): T[] {
  const inCity = all.filter((p) => !city || p.city === city);
  const inArea = inCity.filter((p) => !area || p.area === area);
  const pool = inArea.length >= 3 ? inArea : inCity.length >= 3 ? inCity : all;
  return [...pool].sort((a, b) => momentum(b) - momentum(a)).slice(0, k);
}

// The On 5argny chart: daily views as one smooth line that never overshoots the data (monotone cubic, Fritsch-Carlson),
// in a W x H box. Returns the SVG path, the points, the busiest day (a tie goes to the most recent day) and this week vs last week.
export function hypeLine(days: number[], W = 300, H = 70, pad = 6) {
  const n = days.length;
  if (n < 2) throw new Error('hypeLine needs at least 2 days');
  const max = Math.max(...days), min = Math.min(...days);
  const pt = days.map((v, i): [number, number] => [pad + (i * (W - 2 * pad)) / (n - 1), H - pad - ((v - min) / Math.max(1, max - min)) * (H - 2 * pad - 10)]);
  const dx = pt[1]![0] - pt[0]![0];
  const sec = pt.slice(1).map((q, i) => (q[1] - pt[i]![1]) / dx);
  const m = pt.map((_, i) => (i === 0 ? sec[0]! : i === n - 1 ? sec[n - 2]! : sec[i - 1]! * sec[i]! <= 0 ? 0 : (sec[i - 1]! + sec[i]!) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (!sec[i]) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i]! / sec[i]!, b = m[i + 1]! / sec[i]!, h = a * a + b * b;
    if (h > 9) { const s3 = 3 / Math.sqrt(h); m[i] = s3 * a * sec[i]!; m[i + 1] = s3 * b * sec[i]!; }
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pt[0]![0])},${f(pt[0]![1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pt[i]!, [x1, y1] = pt[i + 1]!;
    d += ` C${f(x0 + dx / 3)},${f(y0 + (m[i]! * dx) / 3)} ${f(x1 - dx / 3)},${f(y1 - (m[i + 1]! * dx) / 3)} ${f(x1)},${f(y1)}`;
  }
  const last = pt[n - 1]!;
  const area = `${d} L${last[0]},${H} L${pt[0]![0]},${H} Z`;
  const peak = days.lastIndexOf(max);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const week = sum(days.slice(-7)), before = sum(days.slice(-14, -7));
  const growth = before ? (week - before) / before : 0;
  return { d, area, points: pt, peak, max, growth, ticks: [n - 22, n - 15, n - 8, n - 1].filter((i) => i >= 0) };
}

// the sentence over the chart: steady within 3%, else busier or quieter by a whole percent
export const hypeSay = (growth: number) =>
  Math.abs(growth) < 0.03 ? { kind: 'steady' as const, pct: 0 } : { kind: growth > 0 ? ('busier' as const) : ('quieter' as const), pct: Math.round(Math.abs(growth) * 100) };
