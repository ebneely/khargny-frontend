'use client';
// "5argny is better in the app" (owner 2026-11-14): on a web visitor's first visit, after about 2 s or the first scroll,
// one sheet with the official store badges. Shown once; it stays away for 30 days. Never over a form, the correction or
// report pages, another sheet, or a field being typed in. The phone's own store comes first; desktop shows both.
import { useEffect } from 'react';
import { useK } from './KProvider';
import { Btn } from './bits';

const KEY = 'kh.getApp';
const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
const APP_STORE = 'https://apps.apple.com/app/id6752574374'; // eas.json submit.production.ios.ascAppId
const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.khargny.app'; // app.json android.package

const toastUp = () => [...document.querySelectorAll('.toast')].some((t) => Number(getComputedStyle(t).opacity) > 0.05);
const busy = () => !!document.querySelector('form, .sheet') || toastUp() // first visit also teaches the love gesture: wait for it
  || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '');
const offLimits = () => /\/(correct|report)\/?$/.test(location.pathname);

export function GetAppSheet() {
  const { c, lang, openSheet, closeTop } = useK();
  useEffect(() => {
    try { if (Date.now() - Number(localStorage.getItem(KEY) ?? 0) < DAYS_30) return; } catch { return; }
    let done = false, t: ReturnType<typeof setTimeout>;
    // a first visit also shows the love-gesture hint toast at 2.5 s (Gestures.tsx kh.loveHint): come up after it, not under it
    const earliest = Date.now() + (localStorage.getItem('kh.loveHint') ? 0 : 4600);
    const show = () => {
      if (done || offLimits()) return;
      const wait = Math.max(earliest - Date.now(), busy() ? 1000 : 0); // never over the love-gesture hint or anything else
      if (wait) { clearTimeout(t); t = setTimeout(show, wait); return; }
      done = true; cleanup();
      try { localStorage.setItem(KEY, String(Date.now())); } catch {}
      const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), android = /Android/.test(ua);
      const apple = <a key="ios" href={APP_STORE} target="_blank" rel="noopener" aria-label={c.getApp.appStore}><img src="/badges/app-store-en.svg" alt="" height={44} /></a>;
      const play = <a key="android" href={GOOGLE_PLAY} target="_blank" rel="noopener" aria-label={c.getApp.googlePlay}><img decoding="async" src={`/badges/google-play-${lang}.png`} alt="" height={64} style={{ margin: '-10px' }} /></a>;
      openSheet(c.getApp.title, <div className="get-app"><p className="t-body">{c.getApp.body}</p>
        <div className="get-app-badges">{android && !ios ? [play, apple] : [apple, play]}</div></div>,
        <Btn label={c.getApp.notNow} kind="secondary" wide act="get-app-close" onClick={() => closeTop()} />);
    };
    t = setTimeout(show, 2000);
    const cleanup = () => { clearTimeout(t); removeEventListener('scroll', show); };
    addEventListener('scroll', show, { passive: true, once: true });
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- once per page load
  return null;
}
