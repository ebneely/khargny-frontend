// Loading, failing and retrying, the same on every screen (owner 2026-11-14: every state handled).
// The skeleton waits SKELETON_DELAY_MS before it shows (web.css --sk-delay), so a fast answer never flashes one;
// content that replaces a skeleton the person saw fades in over REVEAL_MS (web.css --sk-fade).
export const SKELETON_DELAY_MS = 150;
export const REVEAL_MS = 200;

/** How content arrives: 'fade' only when a skeleton was on screen (the load took 150 ms or more), else it just appears. */
export function revealOf(startedAt: number | null, endedAt: number): 'none' | 'fade' {
  return startedAt != null && endedAt - startedAt >= SKELETON_DELAY_MS ? 'fade' : 'none';
}

export type FailKind = 'offline' | 'gone' | 'slow' | 'server' | 'network';
const statusOf = (e: unknown) => (e && typeof e === 'object' && typeof (e as { status?: unknown }).status === 'number' ? (e as { status: number }).status : null);

/** What failed, in the person's terms: offline, not there any more, too slow, our side, or the connection. */
export function failKind(error: unknown, online = true): FailKind {
  if (!online) return 'offline';
  const s = statusOf(error);
  if (s === 404 || s === 410) return 'gone';
  if (s === 408 || s === 504 || (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))) return 'slow';
  if (s != null && s >= 400) return 'server';
  return 'network';
}

/** One quiet retry for the network and the server (and 408/429); a 4xx answer will not change, so it is not asked again. */
export function retryQuery(failures: number, error: unknown): boolean {
  const s = statusOf(error);
  if (s != null && s >= 400 && s < 500 && s !== 408 && s !== 429) return false;
  return failures < 1;
}
