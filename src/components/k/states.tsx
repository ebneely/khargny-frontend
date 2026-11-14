'use client';
// Loading, empty, failed and offline, each drawn once (owner 2026-11-14). The rules (150 ms, fade, retry, what failed) are
// src/5argny/rules/loading.ts; the look is web.css ".sk", ".empty", ".offline-bar".
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { failKind, revealOf } from '@5argny/core/rules';
import { L } from './icons';
import { useK } from './KProvider';

/** One skeleton box (a photo, a button). For a line of text, put className="sk" on the real text element with stand-in words. */
export function Sk({ w, h, r, cls = '', style }: { w?: number | string; h?: number | string; r?: number | string; cls?: string; style?: CSSProperties }) {
  return <i aria-hidden="true" className={`sk${cls ? ' ' + cls : ''}`} style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

/** The class for content that takes a skeleton's place: it fades in only when the skeleton was on screen (rules/loading revealOf). */
export function useReveal(loading: boolean) {
  const started = useRef<number | null>(null), cls = useRef('');
  if (loading) { if (started.current == null) started.current = performance.now(); cls.current = ''; }
  else if (started.current != null) { cls.current = revealOf(started.current, performance.now()) === 'fade' ? 'sk-reveal' : ''; started.current = null; }
  return cls.current;
}

const onlineSnap = () => onlineManager.isOnline();
export const useOnline = () => useSyncExternalStore((f) => onlineManager.subscribe(f), onlineSnap, () => true);

/** Empty or failed: the prototype's .group.empty, an icon, one line, an optional second line and one action. */
export function StateBlock({ icon, title, body, action, compact, alert }: { icon: string; title: ReactNode; body?: ReactNode; action?: ReactNode; compact?: boolean; alert?: boolean }) {
  return <div className={`group empty${compact ? ' compact' : ''}`} role={alert ? 'alert' : undefined}><L n={icon} /><p className="t-head">{title}</p>{body ? <p className="t-small">{body}</p> : null}{action}</div>;
}

const FAIL_ICON = { offline: 'wifi-off', gone: 'search-x', slow: 'clock', server: 'cloud-off', network: 'cloud-off' } as const;
/** A section that failed: what failed, in plain words, and Try again, which asks for this section only. */
export function Failed({ error, retry, busy, compact }: { error: unknown; retry: () => unknown; busy?: boolean; compact?: boolean }) {
  const { c } = useK();
  const kind = failKind(error, useOnline());
  return <StateBlock alert compact={compact} icon={FAIL_ICON[kind]} title={c.states.failed[kind]}
    action={kind === 'gone' ? null : <button className="btn secondary press" data-act="retry" disabled={busy} onClick={() => { void retry(); }}><L n="rotate-ccw" />{c.states.retry}</button>} />;
}

/**
 * Offline: one quiet pill under the top bar while the connection is gone; the queries pause and refetch on their own when it is back.
 * It also starts every skeleton's sweep on one clock, so the whole page shimmers as one sweep, not a pulse per block.
 */
export function OfflineBar() {
  const { c } = useK();
  const online = useOnline();
  useEffect(() => {
    const sync = (e: AnimationEvent) => { if (e.animationName !== 'skSweep') return; (e.target as Element).getAnimations?.().forEach((a) => { if ((a as CSSAnimation).animationName === 'skSweep') a.startTime = 0; }); };
    document.addEventListener('animationstart', sync, true); return () => document.removeEventListener('animationstart', sync, true);
  }, []);
  return online ? null : <div className="offline-bar" role="status"><L n="wifi-off" />{c.states.offline}</div>;
}
