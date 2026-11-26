'use client';
// "5argny is better in the app" (owner 2026-11-14): on a web visitor's first visit, after about 2 s or the first scroll,
// one sheet with the official store badges. Shown once; it stays away for 30 days. Never over a form, the correction or
// report pages, another sheet, or a field being typed in. The phone's own store comes first; desktop shows both.
// The prompt itself is its own chunk (getapp-prompt): nothing on the site waits for it, the sheet opens when it lands.
import dynamic from 'next/dynamic';
import { useK } from './KProvider';
import { Btn } from './bits';

export const KEY = 'kh.getApp';
export const DAYS_30 = 30 * 24 * 60 * 60 * 1000;
const APP_STORE = 'https://apps.apple.com/app/id6752574374'; // eas.json submit.production.ios.ascAppId
const GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=com.khargny.app'; // app.json android.package

// the footer's row opens it too, so this part stays with the frame; the first-visit prompt is the lazy one
export const GetAppSheet = dynamic(() => import('./getapp-prompt').then((m) => m.GetAppSheet), { ssr: false });

// One sheet with both store buttons, the phone's own store first. Used by the first-visit prompt and the footer row.
export function useOpenGetApp() {
  const { c, lang, openSheet, closeTop } = useK();
  return () => {
    const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua), android = /Android/.test(ua);
    const apple = <a key="ios" href={APP_STORE} target="_blank" rel="noopener" aria-label={c.getApp.appStore}><img src="/badges/app-store-en.svg" alt="" height={44} /></a>;
    const play = <a key="android" href={GOOGLE_PLAY} target="_blank" rel="noopener" aria-label={c.getApp.googlePlay}><img decoding="async" src={`/badges/google-play-${lang}.png`} alt="" height={64} style={{ margin: '-10px' }} /></a>;
    openSheet(c.getApp.title, <div className="get-app"><p className="t-body">{c.getApp.body}</p>
      <div className="get-app-badges">{android && !ios ? [play, apple] : [apple, play]}</div></div>,
      <Btn label={c.getApp.notNow} kind="secondary" wide act="get-app-close" onClick={() => closeTop()} />);
  };
}
