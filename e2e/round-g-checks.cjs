function createCheckLedger(names) {
  const pending = [...names];
  const results = [];
  const record = (name, status, detail = '', elapsedMs = 0) => {
    const index = pending.indexOf(name);
    if (index >= 0) pending.splice(index, 1);
    const result = { name, status, ok: status === 'pass' ? true : status === 'fail' ? false : null, detail, elapsedMs };
    results.push(result);
    return result;
  };
  return {
    record,
    finish: (reason, elapsedMs = 0) => [...pending].map(name => record(name, 'not-run', reason, elapsedMs)),
    totals: () => ({ passed: results.filter(result => result.status === 'pass').length, failed: results.filter(result => result.status === 'fail').length, notRun: results.filter(result => result.status === 'not-run').length }),
  };
}

function roundGChecks(mode, phone) {
  const names = mode === 'off' ? [
    'off home: no hearts, no reserved overlays, compact clean cards',
    'off explorer: no hearts and clean post actions',
    'off place: no heart or count',
    'off saved plan: no heart, localized Save',
    'off survives navigation and reload: exactly one State, no Mine or writes',
    'off card geometry stays identical across reload',
  ] : [
    'hydration: card size and Save position unchanged; all numbers visible including zero and 1.2k',
    'fresh context: one minted visitor; every later credentialed request uses it',
    'first visitor tap sends immediately; rapid taps serialize to the last intent',
    'opening an ordinary rail place sends no search_click',
    'explorer post actions: Like, directions, views, Save; no wrap or cover controls',
    'Round H: aligned ink, shared inset, natural counts, square photo corners; 320px LTR and RTL',
    'card Share: localized name, native payload, clipboard toast, isolated click and motion',
    'post photo responsive sources, square phone ratio and first-card bytes',
    'post gallery: six pictures, final see-all 14 tile, five dots; only current and next loaded',
    'chevrons are invisible at rest, before hover or focus',
    'compact arrows: centered 18px icon in 32px circle, mirrored edges and no endpoint arrows',
    'horizontal swipe / keyboard arrow moves photo and dots, never a tap',
    phone ? 'diagonal vertical drag starting on a photo scrolls the list, never taps' : 'mouse chevrons appear on demand and have visible keyboard focus',
    'post double tap: immediate PUT, drop-flight and water landing; no navigation',
    'already-liked double tap never unlikes or writes',
    'explorer contract search_click payload',
    'place photo is clean except Back; Share is in the phone header / desktop rail',
    phone ? 'phone bottom bar: Like first, 52px, 5argny and Save; stays at bottom' : 'desktop sticky rail: 5argny, Like, Save',
    'similar places use the same clean post cards and action row',
    'same place has one synchronized count/state on every mounted heart',
    'place photo double tap likes, never opens gallery; flight respects reduced motion',
    'fullscreen double tap likes instead of zoom; real count answer applied',
    'fullscreen already-liked double tap has no request or unlike',
    'Tab reaches Like with focus ring and 44px target; Enter likes, Space unlikes',
    '429: rollback, localized agreement, Retry-After; retry at most once',
    '503: rollback, localized agreement, Retry-After; retry at most once',
    'cookie changed after preparation: one silent prepare and retry, first tap works',
    'live public total refreshes near 10s without visitor celebration or state flicker',
    'saved plan keeps compact photo with the post action row, no cover icons',
    'Liked list uses server cards, newest first and raw has_more paging',
    'unlike from Liked removes the card after the DELETE, not on a reload',
    'Liked list persists for the same mock cookie after reload',
    'hero contract search_click payload',
    'cached/backend card without gallery is a single photo, no dots or swipe',
    'no visitor-facing English or Arabic Love wording',
    'disabled write removes every heart and stops all later likes requests',
  ];
  for (const label of mode === 'off' ? ['home', 'explorer', 'place', 'plan'] : ['home', 'explorer', 'place', 'plan', 'liked']) {
    names.push(`${label}: no unexpected console/script errors`, `${label}: no sideways scroll`);
  }
  if (mode !== 'off') for (let search = 0; search < 3; search++) names.push('search has no per-keystroke or early settled requests', 'one settled signal near 1.5s; platform web; no blur duplicate');
  return names.concat('scenario completes', 'leave-time analytics flushed and routed before safety audit', 'production safety: all non-GET API requests intercepted; no unknown writes', 'no unexpected console/script errors during the whole scenario');
}

module.exports = { createCheckLedger, roundGChecks };
