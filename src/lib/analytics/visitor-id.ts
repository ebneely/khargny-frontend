/**
 * The website's anonymous visitor id (decision 0007): one random id per browser, kept for a year in a first-party cookie
 * and in localStorage, so either one restores the other. No name, email or account. The cookie is shared with the API
 * host, so searches and analytics count the same visitor.
 *
 * When both stores were cleared the browser gets a new id and sends a "soft signal" (browser, system, language, time
 * zone, screen, memory) once, only while the server's Web identity setting asks for it (off by default); the server keeps
 * only a salted hash of it and may recognise the returning browser.
 */

export const VISITOR_KEY = "k_vid";
const CONFIG_KEY = "k_vid_cfg";
const SIGNAL_DAY_KEY = "k_vid_sig";
const VALID = /^[A-Za-z0-9_-]{8,64}$/;
const DEFAULT_DAYS = 365;

export type VisitorConfig = { days: number; soft: boolean };

/** Cookie first (it is what the API sees), then localStorage, else a new id. Says which store needs writing. */
export function pickVisitorId(cookie: string | null, stored: string | null, make: () => string) {
  const fromCookie = cookie && VALID.test(cookie) ? cookie : null;
  const fromStore = stored && VALID.test(stored) ? stored : null;
  const id = fromCookie ?? fromStore ?? make();
  return { id, fresh: !fromCookie && !fromStore, writeStorage: fromStore !== id };
}

/** The domain both the page and the API sit under (5argny.com for www. and backend.), or null to keep the cookie on this host. */
export function sharedCookieDomain(pageHost: string, apiHost: string): string | null {
  const plain = (host: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host) && !/^\d+(\.\d+){3}$/.test(host);
  if (!plain(pageHost) || !plain(apiHost)) return null;
  const a = pageHost.toLowerCase().split(".").reverse();
  const b = apiHost.toLowerCase().split(".").reverse();
  const shared: string[] = [];
  for (let i = 0; i < Math.min(a.length, b.length) && a[i] === b[i]; i += 1) shared.unshift(a[i]);
  // two labels at least; the same host on both sides needs no Domain
  return shared.length >= 2 && shared.length < Math.max(a.length, b.length) ? shared.join(".") : null;
}

export function visitorCookie(id: string, days: number, domain: string | null, secure: boolean): string {
  return `${VISITOR_KEY}=${id}; Max-Age=${Math.round(days * 86400)}; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}${secure ? "; Secure" : ""}`;
}

export function readCookie(cookies: string, name: string): string | null {
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

/** Browser, system, language, time zone, screen and memory as one line; the server hashes it and never stores it raw. */
export function softSignalText(s: {
  userAgent?: string; platform?: string; language?: string; timeZone?: string;
  width?: number; height?: number; pixelRatio?: number; memory?: number;
}): string {
  return [s.userAgent, s.platform, s.language, s.timeZone, `${s.width ?? 0}x${s.height ?? 0}@${s.pixelRatio ?? 1}`, s.memory ?? ""]
    .map((part) => String(part ?? "").replace(/\|/g, " "))
    .join("|")
    .slice(0, 400);
}

/** The signal rides on a new id's batches, and once a day after that; only while the server has it switched on. */
export function shouldSendSignal(fresh: boolean, lastSentDay: string | null, today: string, soft: boolean): boolean {
  return soft && (fresh || lastSentDay !== today);
}

export function parseConfig(raw: string | null): VisitorConfig {
  try {
    const value = JSON.parse(raw ?? "") as Partial<VisitorConfig>;
    const days = Number(value.days);
    return { days: Number.isFinite(days) && days >= 1 && days <= 730 ? days : DEFAULT_DAYS, soft: value.soft === true };
  } catch {
    return { days: DEFAULT_DAYS, soft: false };
  }
}

// ----- the browser side -----

function newId(): string {
  try {
    return window.crypto.randomUUID().replace(/-/g, "");
  } catch {
    let id = "";
    for (let i = 0; i < 32; i += 1) id += Math.floor(Math.random() * 16).toString(16);
    return id;
  }
}

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // private mode or storage blocked: the cookie alone carries the id
  }
}

let current: { id: string; fresh: boolean } | null = null;

function writeCookie(id: string, days: number, apiHost: string | null): void {
  const domain = apiHost ? sharedCookieDomain(window.location.hostname, apiHost) : null;
  const secure = window.location.protocol === "https:";
  document.cookie = visitorCookie(id, days, domain, secure);
  // a browser refuses a Domain it does not own (two preview hosts under one platform): keep the cookie on this host
  if (domain && readCookie(document.cookie, VISITOR_KEY) !== id) document.cookie = visitorCookie(id, days, null, secure);
}

/** The id for this browser, made on first use. Every page load renews the year. */
export function visitor(apiHost: string | null): { id: string; fresh: boolean } {
  if (current) return current;
  const storage = store();
  let stored: string | null = null;
  try { stored = storage?.getItem(VISITOR_KEY) ?? null; } catch {}
  const picked = pickVisitorId(readCookie(document.cookie, VISITOR_KEY), stored, newId);
  try {
    writeCookie(picked.id, parseConfig(storage?.getItem(CONFIG_KEY) ?? null).days, apiHost);
    if (picked.writeStorage) storage?.setItem(VISITOR_KEY, picked.id);
  } catch {}
  current = { id: picked.id, fresh: picked.fresh };
  return current;
}

/** What rides on an analytics batch: the id, and the soft signal when it is due. */
export function visitorFields(apiHost: string | null, today: string): { visitorId: string; fresh?: true; softSignal?: string } {
  const { id, fresh } = visitor(apiHost);
  const storage = store();
  let lastDay: string | null = null;
  let config = parseConfig(null);
  try {
    lastDay = storage?.getItem(SIGNAL_DAY_KEY) ?? null;
    config = parseConfig(storage?.getItem(CONFIG_KEY) ?? null);
  } catch {}
  if (!shouldSendSignal(fresh, lastDay, today, config.soft)) return { visitorId: id, ...(fresh ? { fresh: true as const } : {}) };
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string } };
  return {
    visitorId: id,
    ...(fresh ? { fresh: true as const } : {}),
    softSignal: softSignalText({
      userAgent: nav.userAgent, platform: nav.userAgentData?.platform ?? nav.platform, language: nav.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      width: window.screen?.width, height: window.screen?.height, pixelRatio: window.devicePixelRatio, memory: nav.deviceMemory,
    }),
  };
}

/** A batch arrived: the id is no longer new, today's signal is sent, and the server's lifetime and switch are kept. */
export function visitorBatchAccepted(apiHost: string | null, today: string, sentSignal: boolean, answer: { visitorIdDays?: unknown; softRelink?: unknown } | null): void {
  if (current) current.fresh = false;
  const storage = store();
  try {
    if (sentSignal) storage?.setItem(SIGNAL_DAY_KEY, today);
    if (!answer || typeof answer.visitorIdDays !== "number") return;
    const before = parseConfig(storage?.getItem(CONFIG_KEY) ?? null);
    const next = parseConfig(JSON.stringify({ days: answer.visitorIdDays, soft: answer.softRelink === true }));
    if (before.days === next.days && before.soft === next.soft) return;
    storage?.setItem(CONFIG_KEY, JSON.stringify(next));
    if (current) writeCookie(current.id, next.days, apiHost);
  } catch {}
}
