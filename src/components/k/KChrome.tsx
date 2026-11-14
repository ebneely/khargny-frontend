'use client';
// The page frame of proto/index.html: #app (the page, which recedes under a sheet), #chrome (tab bar, action bar),
// #glass-tabs, #fx (effects), plus the sheet stack and the love/share gestures.
import type { ReactNode } from 'react';
import { KProvider, type Tab } from './KProvider';
import { SheetHost } from './Sheet';
import { TabNav } from './Shell';
import { Gestures } from './Gestures';
import { PageMotion } from './PageMotion';
import { OfflineBar } from './states';
import type { Lang } from './rules';

export function KChrome({ lang, time, tab, children }: { lang: Lang; time: string | null; tab: Tab; children: ReactNode }) {
  return (
    <KProvider lang={lang} time={time} initialTab={tab}>
      <div id="app" className="shell">{children}</div>
      <TabNav />
      <div id="fx" />
      <SheetHost />
      <Gestures />
      <PageMotion />
      <OfflineBar />
    </KProvider>
  );
}
