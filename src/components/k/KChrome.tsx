'use client';
// The page frame of proto/index.html: #app (the page, which recedes under a sheet), #chrome (tab bar, action bar),
// the phone tab bar (GlassTabBar), #fx (effects), plus the sheet stack and the love/share gestures.
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { bare } from '@5argny/core/rules/locale';
import { KProvider } from './KProvider';
import { SheetHost } from './Sheet';
import { FrameHost, TabNav } from './Shell';
import { frameOf, tabOf } from './frame';
import { Gestures } from './Gestures';
import { PageMotion } from './PageMotion';
import { OfflineBar } from './states';
import { GetAppSheet } from './getapp';
import type { Lang } from './rules';

/**
 * The layout draws the shell for the address being rendered, and it must stay renderable once and cached (ISR): the
 * path is read from the router here, not from a request header the server would have to resolve per request.
 * `usePathname` is known during the server render too, so the first paint already has the right frame and tab.
 */
export function KChrome({ lang, children }: { lang: Lang; children: ReactNode }) {
  const path = bare(usePathname() || '/');
  // ?time=HH:MM (the prototype's clock override) is a URL parameter: read after mount, so the cached render stays path-only.
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setTime(new URLSearchParams(window.location.search).get('time'));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [path]);
  return (
    <KProvider lang={lang} time={time} initialTab={tabOf(path)}>
      <div id="app" className="shell"><FrameHost initial={frameOf(path)}>{children}</FrameHost></div>
      <TabNav />
      <div id="fx" />
      <SheetHost />
      <Gestures />
      <PageMotion />
      <OfflineBar />
      <GetAppSheet />
    </KProvider>
  );
}
