const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./offline-loader.cjs');

test('post photos expose large responsive sources on phones, without changing compact cards', () => {
  const { PhotoImage } = load('src/components/ds/PhotoImage.tsx');
  const photo = { urls: { small: '/small.webp', medium: '/medium.webp', large: '/large.webp' }, width: 2000, height: 1500 };
  const post = renderToStaticMarkup(React.createElement(PhotoImage, { photo, alt: 'Nile', frame: 'post', priority: true }));
  assert.match(post, /large.webp 1600w/);
  assert.doesNotMatch(post, /<source media/);
  assert.ok(post.includes('100vw - 32px'));
  assert.ok(post.includes('loading="eager"')); assert.ok(post.includes('fetchPriority="high"'));
  const lazy = renderToStaticMarkup(React.createElement(PhotoImage, { photo, alt: 'Nile', frame: 'post' }));
  assert.ok(lazy.includes('loading="lazy"')); assert.doesNotMatch(lazy, /fetchPriority="high"|rel="preload"/);
  const compact = renderToStaticMarkup(React.createElement(PhotoImage, { photo, alt: 'Nile', frame: 'card' }));
  assert.ok(compact.includes('<source media="(max-width: 639px)" srcSet="/small.webp 480w"'));
});

test('posts are square below desktop; only a priority first slide is eager', () => {
  const css = fs.readFileSync('src/components/ds/PostCard.module.css', 'utf8');
  assert.match(css, /\.photo\s*\{[^}]*aspect-ratio:\s*1(?:\s|;)/);
  assert.match(css, /min-width:\s*1024px[^}]*\.photo\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/);
  const source = fs.readFileSync('src/components/ds/PostPhoto.tsx', 'utf8');
  assert.ok(source.includes("frame={compact ? 'card' : 'post'}"));
  assert.ok(source.includes('priority={priority && index === 0}'));
});

test('Round H post layout uses one inset, natural 15px totals, optical targets and one clipped photo curve', () => {
  const css = fs.readFileSync('src/components/ds/PostCard.module.css', 'utf8');
  assert.match(css, /\.card\s*\{[^}]*overflow:\s*hidden[^}]*--card-inset:\s*var\(--space-3\)/);
  assert.match(css, /\.photo\s*\{[^}]*border-radius:\s*0/);
  assert.match(css, /\.actions\s*\{[^}]*flex-wrap:\s*nowrap[^}]*gap:\s*20px[^}]*font-size:\s*15px[^}]*font-weight:\s*600/);
  assert.match(css, /\.stat,\s*\.save\s*\{[^}]*gap:\s*6px/);
  assert.doesNotMatch(css, /4ch|padding-inline:\s*var\(--space-2\)/);
  assert.match(css, /\[data-like-button\]\s*\{[^}]*padding-inline:\s*10px[^}]*margin-inline:\s*-10px/);
  assert.match(css, /\.save\s*\{[^}]*margin-inline-start:\s*auto[^}]*margin-inline-end:\s*-10px/);
  assert.match(css, /\.words\s*\{[^}]*padding-block:\s*var\(--space-1\)\s*0[^}]*padding-inline:\s*var\(--card-inset/);
  assert.match(css, /\.badges\s*\{[^}]*margin-block:\s*var\(--space-2\)\s*var\(--space-3\)[^}]*padding-inline:\s*var\(--card-inset/);
  const source = fs.readFileSync('src/components/ds/PlaceCard.tsx', 'utf8');
  assert.match(source, /searchReason &&/); assert.doesNotMatch(source, /searchReason \|\| '\\u00a0'/);
  const script = fs.readFileSync('.brief/verify/round-g.mjs', 'utf8');
  assert.match(script, /async function roundHGeometry/);
  assert.ok(script.includes("element.style.inlineSize = '320px'"));
  assert.ok(script.includes("for (const direction of ['ltr', 'rtl'])"));
  assert.ok(script.includes('heart?.getBBox()')); assert.ok(script.includes('heart?.getScreenCTM()'));
  assert.ok(script.includes("['0px', '0px']")); assert.ok(script.includes('four 1.2K groups overflow'));
  assert.ok(script.includes('Share ink/Save number end alignment'));
  assert.ok(script.includes('chevron horizontal centering'));
});

test('scenario reporting preserves duplicate planned checks and reports every abort remainder', () => {
  const { createCheckLedger, roundGChecks } = require('./round-g-checks.cjs');
  const ledger = createCheckLedger(['ready', 'signal', 'signal', 'safety']);
  ledger.record('ready', 'pass'); ledger.record('signal', 'fail'); ledger.record('safety', 'pass');
  const remaining = ledger.finish('navigation timed out');
  assert.deepEqual(remaining.map(result => [result.name, result.status, result.ok]), [['signal', 'not-run', null]]);
  assert.deepEqual(ledger.totals(), { passed: 2, failed: 1, notRun: 1 });
  assert.equal(ledger.finish('again').length, 0);
  const source = fs.readFileSync('.brief/verify/round-g.mjs', 'utf8');
  const planned = new Set([...roundGChecks('off', true), ...roundGChecks('on', true), ...roundGChecks('on', false)]);
  for (const match of source.matchAll(/tagFor\(tag, '([^']+)'\)/g)) assert.ok(planned.has(match[1]), `Unplanned check: ${match[1]}`);
  assert.match(source, /status === 'not-run'/); assert.match(source, /finishScenario\(/);
});

test('real detail/gallery readiness has explicit 20-second waits; bytes are measured only by the owner run', () => {
  const source = fs.readFileSync('.brief/verify/round-g.mjs', 'utf8');
  assert.ok(source.includes('const READY_TIMEOUT = 20000'));
  assert.ok(source.includes('async function waitPlaceReady'));
  assert.match(source, /data-gallery-ready="true".*timeout: READY_TIMEOUT/);
  assert.ok(!source.includes("locator('.pd-title').waitFor()"));
  assert.ok(!source.includes("locator('.pswp--open').waitFor()"));
  assert.ok(source.includes('BYTES  ${tag}: ${detail}'));
  assert.match(source, /before \$\{before\} bytes.*after \$\{after\} bytes/);
  assert.ok(source.includes('deviceScaleFactor: 3'));
});
