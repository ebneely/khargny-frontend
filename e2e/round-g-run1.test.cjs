const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const React = require('react');
const { load } = require('./offline-loader.cjs');
const { mount } = require('./render-harness.cjs');
const drain = async () => { for (let index = 0; index < 32; index++) await Promise.resolve(); };
const id = '11111111-1111-4111-8111-111111111111';

test('each absolutely positioned PhotoImage is contained by its own slide link', () => {
  const css = fs.readFileSync('src/components/ds/PostCard.module.css', 'utf8');
  assert.match(css, /\.photoLink\s*\{[^}]*position:\s*relative/);
  assert.doesNotMatch(css, /\[data-like-button\]\s*\{\s*margin-inline-end:\s*auto/);
  assert.match(css, /\.save\s*\{[^}]*margin-inline-start:\s*auto/);
  assert.match(css, /\.slide\s*\{[^}]*overflow:\s*hidden/);
});

test('pointer-backed detail-zero clicks prevent Next Link navigation; keyboard and replay do not', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let gestures; let opened = 0; let liked = false; let writes = 0;
  const harness = await mount(() => {
    const { usePhotoLike } = load('src/components/ds/usePhotoLike.ts', {
      '@/lib/likes': { likeStore: { enabled: () => true } },
      '@/lib/like-effects': { dropPhotoLike: () => { if (!liked) writes++; liked = true; return () => {}; } },
    });
    function Photo() { gestures = usePhotoLike(id); return React.createElement('a', { href: '/place' }); }
    return React.createElement(Photo);
  });
  const click = () => {
    const event = { detail: 0, clientX: 40, clientY: 40, currentTarget: {}, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    gestures.click(event, click);
    if (!event.defaultPrevented) opened++;
  };
  const tap = () => { gestures.onPointerDown({ clientX: 40, clientY: 40, pointerId: 1 }); gestures.onPointerUp(); click(); };
  try {
    tap(); context.mock.timers.tick(80); tap(); context.mock.timers.tick(400);
    assert.equal(opened, 0); assert.equal(writes, 1); assert.equal(liked, true);
    tap(); context.mock.timers.tick(80); tap(); context.mock.timers.tick(400);
    assert.equal(writes, 1); assert.equal(opened, 0);
    tap(); context.mock.timers.tick(280); assert.equal(opened, 1);
    click(); assert.equal(opened, 2);
    gestures.onPointerDown({ clientX: 40, clientY: 40, pointerId: 1 });
    gestures.onPointerMove({ clientX: 120, clientY: 44 }); gestures.onPointerCancel();
    const cancelled = { detail: 0, nativeEvent: { pointerType: 'touch' }, clientX: 120, clientY: 44, currentTarget: {}, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    gestures.click(cancelled, click); context.mock.timers.tick(400);
    assert.equal(cancelled.defaultPrevented, true); assert.equal(opened, 2); assert.equal(writes, 1);
  } finally { await harness.close(); }
});

test('gallery contract permits null dimensions and an empty gallery without fetching detail', () => {
  const { postGallery } = load('src/lib/post-gallery.ts');
  const gallery = postGallery('cover', { total: 14, images: Array.from({ length: 6 }, (_, index) => ({ url: `photo-${index}`, width: null, height: null })) });
  assert.equal(gallery.images.length, 6); assert.equal(gallery.more, true);
  assert.equal(postGallery('cover', { total: 0, images: [] }).images.length, 1);
  assert.equal(postGallery('cover', { total: 0, images: [] }).more, false);
});

test('browser cookie counter ignores static resources and retains a concurrent-cookie race detector', () => {
  const source = fs.readFileSync('.brief/verify/round-g.mjs', 'utf8');
  const declaration = source.match(/const identity = cookie \?\? ([^;]+);/)[1];
  const allocate = new Function('cookie', 'path', 'method', 'state', `return cookie ?? ${declaration}`);
  const state = { minted: 0 };
  for (const path of ['/', '/_next/static/main.js', '/image.webp', '/en/explorer/city/']) assert.equal(allocate(undefined, path, 'GET', state), undefined);
  assert.equal(allocate(undefined, '/v1/likes/state', 'OPTIONS', state), undefined);
  assert.equal(allocate(undefined, '/v1/saved-places', 'GET', state), 'round-g-visitor-1');
  assert.equal(allocate(undefined, '/v1/amenities', 'GET', state), 'round-g-visitor-2');
  assert.equal(state.minted, 2, 'Concurrent cookie-less API requests must still mint different ids');
  assert.equal(allocate('round-g-visitor-1', '/v1/likes/state', 'GET', state), 'round-g-visitor-1');
  assert.equal(state.minted, 2);
});

test('browser run scopes scenarios, persists progress, waits for final gallery props and audits local cancellations only', () => {
  const source = fs.readFileSync('.brief/verify/round-g.mjs', 'utf8');
  assert.match(source, /ROUND_G_ONLY/); assert.match(source, /JSON.parse\(requested\)/);
  assert.match(source, /writeFileSync\(resultFile/); assert.match(source, /PROGRESS/);
  assert.match(source, /data-gallery-total/); assert.match(source, /image.complete && image.naturalWidth/);
  assert.match(source, /data-gallery-ready/);
  assert.match(fs.readFileSync('src/components/explorer/place-lightbox.ts', 'utf8'), /on\('openingAnimationEnd'.*data-gallery-ready/);
  assert.match(source, /info.networkUrl.origin === base && info.failure === 'net::ERR_ABORTED'/);
  assert.ok(source.indexOf("await health(page, state, tag, 'explorer', out);", source.indexOf('async function onScenario')) < source.indexOf('await galleryChecks(context', source.indexOf('async function onScenario')));
});

test('two 503 State reads leave fallback hearts visible and retry Retry-After with bounded backoff', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let reads = 0;
  const store = load('src/lib/likes.ts', { '@/lib/api/client': {} }).createLikeStore(async (method, path) => {
    if (path.endsWith('/mine')) return { data: [id], meta: { has_more: false } };
    if (++reads <= 2) throw { status: 503, code: 'likes_unavailable', retryAfter: 2 };
    return { [id]: { liked: true, likeCount: 38 } };
  });
  const harness = await mount(browser => {
    browser.document = global.document; browser.matchMedia = () => ({ matches: true });
    const { LikeButton } = load('src/components/ds/LikeButton.tsx', { window: browser, '@/lib/likes': { likeStore: store }, '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: key => key }) } });
    return React.createElement(LikeButton, { placeId: id, name: 'Nile', likeCount: 7 });
  });
  try {
    await drain();
    const button = () => harness.nodes(node => node.getAttribute?.('data-like-button') === 'true')[0];
    assert.equal(reads, 1, 'Hydrating the fallback heart must not bypass Retry-After');
    assert.ok(button()); assert.equal(button().textContent, '7'); assert.equal(button().getAttribute('aria-disabled'), 'true');
    await React.act(async () => { context.mock.timers.tick(2000); await drain(); });
    assert.equal(reads, 2); assert.ok(button()); assert.equal(button().textContent, '7');
    await React.act(async () => { context.mock.timers.tick(4000); await drain(); });
    assert.equal(reads, 3); assert.equal(button().textContent, '38'); assert.equal(button().getAttribute('aria-pressed'), 'true');
    assert.equal(button().getAttribute('aria-disabled'), 'false');
  } finally { await harness.close(); }
});
