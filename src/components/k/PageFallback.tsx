import { TileSkel } from './place';

/**
 * What a page area shows while its page loads: the frame (bars, sidebar) is already on screen, and the column holds the
 * same skeleton tiles the page will fill, so content lands in place instead of the screen jumping from empty to a grid
 * (issue #39). The true size of each card is the Tile's own, so nothing moves when the real cards arrive.
 */
export function PageFallback() {
  return <main className="page" id="view" aria-busy="true"><div className="grid" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <TileSkel key={i} />)}</div></main>;
}
