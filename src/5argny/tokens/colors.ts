// The two colour sets from web.css (the prototype's styles.css): `:root` and `:root[data-theme=dark]`.
// Keys are the CSS variable names in camelCase (--accent-ink -> accentInk). tokens.test.ts checks they still match web.css.
export const light = {
  bg: '#FBF6EE',
  card: '#FFFDF9',
  ink: '#241C16',
  ink2: '#6E6259',
  ink3: '#A39689',
  line: '#EFE6DA',
  fill: '#F2E9DD',
  fill2: '#EAE0D2',
  accent: '#D9622A',
  accentInk: '#fff',
  accentSoft: 'rgba(217,98,42,.12)',
  hero: '#241C16',
  heroInk: '#FBF6EE',
  good: '#0A7A45',
  goodSoft: 'rgba(10,122,69,.12)',
  warn: '#A24A05',
  warnSoft: '#FFF1CF',
  bar: 'rgba(253,249,243,.78)',
  sh1: '0 1px 2px rgba(36,28,22,.06),0 2px 6px rgba(36,28,22,.05)',
  sh2: '0 1px 2px rgba(36,28,22,.08),0 18px 48px rgba(36,28,22,.16)',
};

export type Palette = Record<keyof typeof light, string>;

// dark keeps accentInk from :root, as the cascade does
export const dark: Palette = {
  ...light,
  bg: '#14100D',
  card: '#1E1814',
  ink: '#F3ECE3',
  ink2: '#B9AB9D',
  ink3: '#857768',
  line: '#2E2620',
  fill: '#2A221C',
  fill2: '#342A22',
  accent: '#EC7A40',
  accentSoft: 'rgba(236,122,64,.18)',
  hero: '#2A2019',
  heroInk: '#F3ECE3',
  good: '#43CF8A',
  goodSoft: 'rgba(67,207,138,.16)',
  warn: '#F0A04B',
  warnSoft: 'rgba(240,160,75,.16)',
  bar: 'rgba(30,24,20,.80)',
  sh1: '0 1px 2px rgba(0,0,0,.4),0 2px 6px rgba(0,0,0,.32)',
  sh2: '0 1px 2px rgba(0,0,0,.5),0 18px 48px rgba(0,0,0,.5)',
};

// Colours the component rules in web.css and app.js write directly (not variables there); the app needs them too.
export const stateColors = {
  liveDot: '#3DDC84',
  liveRing: 'rgba(61,220,132,.7)',
  closedDot: '#E5484D', // also the open timeline's end dot, the closed timeline's run and the love rings
  closedRing: 'rgba(229,72,77,.75)',
  openPill: 'rgba(20,14,10,.72)',
  closedPill: 'rgba(251,246,238,.94)',
  closedPillInk: '#241C16',
  sheetScrim: 'rgba(20,14,10,.30)',
  searchScrim: 'rgba(20,14,10,.18)',
};

// Per-theme colours from component rules (chrome material, closed timeline text, browser bar) and app.js glassStyle()
export const themed = {
  light: {
    chrome: 'rgba(251,246,238,.86)',
    closedTimelineText: '#D93A40',
    themeColor: '#FBF6EE',
    glass: 'rgba(251,246,238,.84)',
    glassActive: 'rgba(246,238,228,.92)',
    glassSelection: 'rgba(217,98,42,.16)',
    glassLens: 'rgba(255,255,255,.10)',
  },
  dark: {
    chrome: 'rgba(20,16,13,.84)',
    closedTimelineText: '#FF7A7E',
    themeColor: '#14100D',
    glass: 'rgba(34,27,22,.84)',
    glassActive: 'rgba(46,37,30,.92)',
    glassSelection: 'rgba(232,116,58,.22)',
    glassLens: 'rgba(255,255,255,.06)',
  },
};
