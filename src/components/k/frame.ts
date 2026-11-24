import type { Tab } from './KProvider';

/** What the page changes in the shared frame: the grid width, the location bar and its filters. */
export type Frame = { wide: boolean; noLoc: boolean; withFilters: boolean };

/**
 * The frame the server draws for an address, so the first paint already matches; the page's own <Shell> then confirms it
 * before the browser paints (a Shell with other props only ever corrects an unusual page).
 */
export function frameOf(path: string): Frame {
  const p = path.split('/').filter(Boolean);
  if (p[0] === 'ar') p.shift();
  const first = p[0] ?? '';
  const deep = p.length > 1;
  if (first === 'explorer') return { wide: true, noLoc: p[3] === 'correct', withFilters: true };
  if (first === 'c') return { wide: true, noLoc: true, withFilters: false };
  if (first === 'marketplace' || first === 'host') return { wide: deep || first === 'host', noLoc: false, withFilters: false };
  if (first === 'settings') return { wide: deep, noLoc: deep, withFilters: false };
  return { wide: false, noLoc: false, withFilters: false };
}

export const hasLocBar = (tab: Tab, noLoc: boolean) => !noLoc && ['home', 'explore', 'market'].includes(tab);

/** Which tab the tab bar marks as current, from the address (the layout reads it from the router, not from a header). */
export function tabOf(path: string): Tab {
  const first = path.split('/').filter(Boolean)[0] ?? '';
  return first === 'explorer' ? 'explore' : first === 'marketplace' || first === 'trips' ? 'market' : first === 'plan' || first === 'saved' ? 'saved' : first === 'settings' ? 'profile' : 'home';
}
