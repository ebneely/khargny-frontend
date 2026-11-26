import { TileSkel } from './place';

/**
 * What a page area shows while its page loads: the frame (bars, sidebar) is already on screen, so only this column is empty.
 * It is the results grid from the first frame (the same TileSkel the page uses), under one stand-in line for the title, so the
 * tiles land where they stay instead of the column being blank and then jumping.
 */
export function PageFallback() {
  return <main className="page" id="view" aria-busy="true">
    <div className="pf-head sk" aria-hidden="true" />
    <div className="grid" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <TileSkel key={i} />)}</div>
  </main>;
}
