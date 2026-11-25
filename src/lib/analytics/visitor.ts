/**
 * The site's visitor id (issue #38/#39 follow-up: the backend's per-device public-read limit).
 *
 * One random UUID per browser, kept in localStorage and reused across visits. It is the device id the analytics/ads
 * tracker reports, and every browser API call through the same-origin `/api` forwarder sends it as `x-device-id`, so the
 * backend counts a device instead of a shared carrier or office address. It is not a login, holds no personal data, and
 * is never shown anywhere. When storage is blocked the callers send nothing and behave exactly as before.
 */
const KEY = 'kh.visitor';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let cached: string | null | undefined;

function make(): string | null {
  try {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  } catch { /* fall through to getRandomValues */ }
  const bytes = new Uint8Array(16);
  try {
    window.crypto.getRandomValues(bytes);
  } catch {
    return null;
  }
  bytes[6] = (bytes[6] & 15) | 64; // version 4
  bytes[8] = (bytes[8] & 63) | 128; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The visitor id, created and kept on first use. Null in a server render or when storage and crypto are unavailable. */
export function visitorId(): string | null {
  if (typeof window === 'undefined') return null;
  if (cached !== undefined) return cached;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && UUID.test(saved)) return (cached = saved);
  } catch { /* storage blocked: still try to make one for this page */ }
  const id = make();
  if (!id) return (cached = null);
  try { window.localStorage.setItem(KEY, id); } catch { /* keep it for this page only */ }
  return (cached = id);
}
