export function compactCount(value: number = 0): string {
  const count = Math.max(0, Number.isFinite(value) ? value : 0);
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count % 1_000_000 === 0 ? 0 : 1)}m`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(count % 1_000 === 0 ? 0 : 1)}k`;
  return String(count);
}
