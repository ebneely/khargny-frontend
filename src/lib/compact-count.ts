export function compactCount(value: number = 0): string {
  const count = Math.max(0, Number.isFinite(value) ? value : 0);
  for (const [unit, suffix] of [[1e15, 'q'], [1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k']] as const) {
    if (count < unit * .9995) continue;
    const scaled = count / unit;
    return `${scaled.toFixed(scaled < 10 && count % unit !== 0 ? 1 : 0).replace(/\.0$/, '')}${suffix}`;
  }
  return String(count);
}
