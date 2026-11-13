'use client';
// The page frame of proto/index.html: #app (the page, which recedes under a sheet), #chrome (tab bar, action bar),
// #glass-tabs, #fx (effects), plus the sheet stack and the love/share gestures.
import type { ReactNode } from 'react';
import { KProvider, type Tab } from './KProvider';
import { SheetHost } from './Sheet';
import { TabNav } from './Shell';
import { Gestures } from './Gestures';
import { PageMotion } from './PageMotion';
import { PlaceSheetBody, PlaceSheetFoot } from './placeview';
import type { Lang } from './rules';

const slugOf = (path: string) => path.split('/').filter(Boolean)[3] ?? '';

export function KChrome({ lang, time, tab, children }: { lang: Lang; time: string | null; tab: Tab; children: ReactNode }) {
  return (
    <KProvider lang={lang} time={time} initialTab={tab}>
      <div id="app" className="shell">{children}</div>
      <TabNav />
      <div id="fx" />
      <SheetHost renderContent={(path) => ({ label: slugOf(path), body: <PlaceSheetBody key="body" slug={slugOf(path)} />, foot: <PlaceSheetFoot slug={slugOf(path)} /> })} />
      <Gestures />
      <PageMotion />
    </KProvider>
  );
}
