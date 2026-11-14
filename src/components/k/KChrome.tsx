'use client';
// The page frame of proto/index.html: #app (the page, which recedes under a sheet), #chrome (tab bar, action bar),
// the phone tab bar (GlassTabBar), #fx (effects), plus the sheet stack and the love/share gestures.
import type { ReactNode } from 'react';
import { KProvider, type Tab } from './KProvider';
import { SheetHost } from './Sheet';
import { FrameHost, TabNav } from './Shell';
import type { Frame } from './frame';
import { Gestures } from './Gestures';
import { PageMotion } from './PageMotion';
import { OfflineBar } from './states';
import { GetAppSheet } from './getapp';
import type { Lang } from './rules';

export function KChrome({ lang, time, tab, frame, children }: { lang: Lang; time: string | null; tab: Tab; frame: Frame; children: ReactNode }) {
  return (
    <KProvider lang={lang} time={time} initialTab={tab}>
      <div id="app" className="shell"><FrameHost initial={frame}>{children}</FrameHost></div>
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
