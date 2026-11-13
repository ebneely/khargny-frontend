// Every timing in the prototype, named after what it moves. Seconds unless the key says Ms.
// `keyframes`: the CSS @keyframes in web.css (the rule that wins in the cascade), `ease` as cubic-bezier points.
// `springs`: motion's spring({bounce, duration}) calls in app.js (Reanimated: withSpring({duration: d*1000, dampingRatio: 1 - bounce})).
type Ease = readonly [number, number, number, number] | 'linear' | 'ease' | 'ease-out';
export type Timing = { keyframes: string; duration: number; delay: number; ease: Ease; repeat?: true; stagger?: number };

const k = (keyframes: string, duration: number, delay: number, ease: Ease, more: Partial<Timing> = {}): Timing => ({ keyframes, duration, delay, ease, ...more });

export const keyframes = {
  livePillGrow: k('pillGrow', 0.42, 0, [0.2, 0.9, 0.25, 1]), // Open pill and photo counts grow from the dot
  openPillRings: k('liveWave', 4, 0, [0.2, 0.6, 0.35, 1], { repeat: true, stagger: 2 }), // two rings out, half a cycle apart, inset -1 -> -72, border 2 -> .5
  closedPillRings: k('liveWaveIn', 4, 0, [0.65, 0, 0.8, 0.4], { repeat: true, stagger: 2 }), // the same rings travelling in
  takeMeNudgeArrow: k('tmNudge', 2.6, 0, [0.3, 0.7, 0.4, 1], { repeat: true }),
  takeMeRouteLine: k('routeUber', 2.8, 0.3, [0.65, 0, 0.35, 1], { repeat: true }), // draws in, then its tail follows
  takeMeRouteEndDot: k('routeEnd', 0.35, 1, [0.3, 1.5, 0.5, 1]),
  takeMeDiceRoll: k('diceRoll', 2.8, 0.3, [0.3, 0.7, 0.3, 1], { repeat: true }), // rolls when the route arrives
  timelinePastPart: k('doneIn', 0.7, 0.1, [0.2, 0.9, 0.25, 1]),
  timelineRun: k('leftRun', 2.8, 0.8, [0.65, 0, 0.35, 1], { repeat: true }),
  timelineNowDot: k('nowIn', 0.45, 0.55, [0.3, 1.4, 0.5, 1]),
  timelineTimeLeft: k('leftIn', 0.5, 0.3, [0.2, 0.9, 0.25, 1]),
  holdRingIn: k('holdIn', 0.2, 0, [0.2, 0.9, 0.3, 1]),
  holdRingFill: k('holdFill', 1.75, 0, 'linear'), // starts 0.25 s into the hold, full at 2 s
  hypeLineDraw: k('hypeClip', 1.1, 0.15, [0.3, 0.7, 0.2, 1]), // clip reveal left to right
  hypeAreaFade: k('hypeFade', 0.6, 0.7, 'ease'),
  hypeBusiestTag: k('hypeFade', 0.4, 1.2, 'ease'),
  hypeDots: k('nowIn', 0.4, 1.1, [0.3, 1.4, 0.5, 1]),
  hypeBusiestRings: k('peakWave', 3.2, 1.4, [0.2, 0.6, 0.35, 1], { repeat: true, stagger: 1.6 }), // second ring at 3 s
  loveRings: k('loveRing', 1, 0, [0.2, 0.6, 0.35, 1], { stagger: 0.16 }), // two rings, scale .3 -> 2.4
} as const;

export const transitions = {
  press: { duration: 0.12, ease: 'ease-out', scale: 0.97, cardScale: 0.985 },
  chipColor: { duration: 0.2 },
  switchTrack: { duration: 0.25 },
  carouselDot: { duration: 0.35, ease: [0.2, 0.9, 0.3, 1] },
  optionCheck: { duration: 0.2 },
  takeMePhotoCrossfade: { duration: 1.2, ease: 'ease', everyMs: 4500 },
  locationBarFold: { duration: 0.34, ease: [0.2, 0.9, 0.3, 1] },
  wordmarkFold: { duration: 0.3, ease: [0.2, 0.9, 0.3, 1] },
  backButtonPin: { duration: 0.3, ease: [0.2, 0.9, 0.3, 1] },
  topbarFade: { duration: 0.2 },
  scrim: { duration: 0.3, blurPx: 3 },
  searchScrim: { duration: 0.2 },
  themeFade: { duration: 0.35, ease: 'ease' },
  tabCrossfade: { duration: 0.2, reduced: 0.12, ease: 'ease-out' },
} as const;

const s = (bounce: number, duration: number) => ({ bounce, duration });
export const springDefault = s(0, 0.38);
export const springReduced = { duration: 0.15 }; // every spring under prefers-reduced-motion

export const springs = {
  sheetSnap: s(0.1, 0.42), // sheet position, carries the finger's velocity
  sheetParentBehind: s(0, 0.4), // the sheet below: translateY(-8px) scale(.965)
  pageRecede: s(0, 0.42), // the page behind the first sheet: translateY(6px) scale(.955)
  pageRestore: s(0, 0.4),
  sheetContentPush: s(0, 0.4), // content swapped inside a sheet slides 36 px
  pagePushPop: s(0, 0.45), // new page from the trailing edge, the old one slides 25% under at .6 opacity
  tabSlider: s(0, 0.4), // the pill behind the current tab or segment
  likePop: s(0.5, 0.45), // heart scale .6 -> 1
  loveLandPop: s(0.35, 0.4), // already loved: 1 -> 1.35 -> 1
  savePop: s(0, 0.35), // scale .75 -> 1
  collectionSavePop: s(0.3, 0.35), // scale .7 -> 1
  countRoll: s(0, 0.3), // the number rolls 8 px up (or down)
  go5ArrowHome: s(0.25, 0.4),
  takeMeFlip: s(0.12, 0.6), // rotateY 0 -> 180
  takeMeUnflip: s(0.1, 0.55),
  takeMeDiceSpin: s(0.2, 0.6),
  takeMeReshuffle: s(0.3, 0.45),
  switchKnob: s(0.2, 0.35), // 18 px
  searchPanelIn: s(0, 0.32), // from translateY(-8px) scale(.985)
  searchRowsIn: s(0, 0.35), // stagger 0.02 s
  searchPanelOut: s(0, 0.25),
  searchHintIn: s(0, 0.4),
  recentRowOut: s(0, 0.25),
  toast: s(0, 0.3),
  placeWordLetters: s(0.25, 0.5), // delay 0.08 + 0.028 per letter
  reveal: s(0, 0.5), // posts and tiles 14 px up
  tabbarHide: s(0, 0.35), // translateY(140%)
  tabbarShow: s(0.1, 0.4),
  resetSpin: s(0, 0.5),
  filtersApplyBump: s(0.3, 0.3),
  allKindsTiles: s(0, 0.45), // delay 0.04 + 0.03 per tile
  trendMenu: s(0, 0.3),
  trendMenuClose: s(0, 0.2),
  trendRows: s(0, 0.35), // stagger 0.03 s
  correctionDetail: s(0, 0.4),
  correctionCheck: s(0.45, 0.5),
  correctionTitle: s(0, 0.4), // delay 0.12
} as const;

export const gestures = {
  doubleTapMs: 300, // second tap within, and within 30 px, loves; a post waits this long before it opens
  doubleTapSlopPx: 30,
  clickAfterLoveMs: 450, // clicks this soon after a love are swallowed
  holdShareMs: 2000,
  holdRingAfterMs: 250,
  holdCancelPx: 10, // finger moves or the page scrolls this far
  holdLiftPx: 76, // the ring sits above the thumb (0 for a mouse)
  heartPop: { duration: 0.38, ease: [0.3, 1.4, 0.5, 1] }, // scale 0 -> 1.25 -> 1 where the finger was
  heartWaitMs: 40, // 380 when the button first scrolls into view
  heartArcMs: 560, // ease in-out cubic, quadratic arc lifted min(120, |dy|/2 + 40) px
  go5Press: { duration: 0.5 }, // scale 1 .94 1.04 1
  go5Word: { duration: 0.45 }, // translateY 0 -3 0
  go5Flight: { duration: 0.75, ease: [0.4, 0, 0.2, 1], offsets: [0, 0.16, 0.72, 1] },
  go5MapsAfterMs: 250, // the maps sheet opens 0.25 s after the arrow lands
  countUpMs: 900, // ease-out cubic, the first time a count comes on screen
  sheetDismissVelocity: 1100, // px/s
  sheetDismissFraction: 0.5,
  sheetDecay: 0.998, // momentum projection
  sheetRubberBand: 0.55,
  sheetRemoveMs: 420,
  pageRecedeScale: 0.045,
  pageRecedeY: 6,
  tabbarHideAfterPx: 24, // scrolled one way this far, past 60 px from the top
  tabbarTopPx: 60,
  searchHintEveryMs: 3200,
  searchHintOut: 0.22,
  toastMs: 1700,
  correctionShake: 0.32,
  correctionBackMs: 1600,
} as const;
