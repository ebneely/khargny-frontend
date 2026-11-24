'use client';
// Explore's first paint, drawn on the server: the heading the page carries before any filter or city is chosen, and the
// card skeletons. Explore reads the query string (useSearchParams), which a page that is rendered once and cached cannot
// do during the render, so the page ships this instead of an empty column and swaps it for ExploreView on the client.
// Without it the cached HTML had no <h1> at all (a crawler saw an empty page).
import { Shell } from './Shell';
import { TileSkel } from './place';
import { useK } from './KProvider';

export function ExploreFallback() {
  const { c } = useK();
  return (
    <Shell cur="explore" wide withFilters>
      <h1 className="t-display page-pad" style={{ margin: '2px 0 10px' }}>
        {c.explore.everything}{' '}
        <span style={{ color: 'var(--ink3)', fontWeight: 800 }}>{c.explore.in} {c.location.egypt}</span>
      </h1>
      <div className="grid" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <TileSkel key={'s' + i} />)}</div>
    </Shell>
  );
}
