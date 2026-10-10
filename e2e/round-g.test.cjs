const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./offline-loader.cjs');
const fs = require('node:fs');
const React = require('react');
const { mount } = require('./render-harness.cjs');
const drain = async () => { for (let index = 0; index < 24; index++) await Promise.resolve(); };
const id = '11111111-1111-4111-8111-111111111111';
const mine = { data: [], meta: { skip: 0, limit: 100, has_more: false } };
const storeWith = request => load('src/lib/likes.ts', { '@/lib/api/client': {} }).createLikeStore(request);

test('post gallery falls back without extra detail reads and limits initial photos and dots', () => {
  const { postGallery, galleryWindow, loadPostPhoto } = load('src/lib/post-gallery.ts');
  const images = Array.from({ length: 6 }, (_, index) => ({ url: `photo-${index}`, width: 480, height: 600 }));
  assert.equal(postGallery('cover').images.length, 1); assert.equal(postGallery('cover').more, false);
  const gallery = postGallery('cover', { total: 14, images });
  assert.equal(gallery.images.length, 6); assert.equal(gallery.more, true); assert.equal(gallery.total, 14);
  assert.equal(postGallery('cover', { total: 14, images }, true).images.length, 1);
  assert.deepEqual(images.map((_, index) => loadPostPhoto(index, 0)), [true, true, false, false, false, false]);
  assert.deepEqual([...galleryWindow(6, 7)], [2, 3, 4, 5, 6]);
});

test('visitor animations only; reduced motion and social proof thresholds', () => {
  const { likeMotion, socialProofKey } = load('src/lib/like-interaction.ts');
  assert.equal(likeMotion(false, false, true, true), 'celebrate');
  assert.equal(likeMotion(false, true, false, true), 'empty');
  assert.equal(likeMotion(false, false, true, false), '');
  assert.equal(likeMotion(true, false, true, true), '');
  assert.equal(socialProofKey(0), 'place.firstLike');
  assert.equal(socialProofKey(1), null); assert.equal(socialProofKey(2), null);
  assert.equal(socialProofKey(3), 'place.likeProof');
  const { burstLike } = load('src/lib/like-effects.ts', { window: { matchMedia: () => ({ matches: true }) }, '@/lib/likes': {}, '@/components/ds/LikeIcon': {} });
  burstLike({ getBoundingClientRect() { throw new Error('Reduced motion must not create a burst'); } }, { x: 1, y: 1 });
});

test('liked card pages preserve server order, continue an empty raw page and support removal', async () => {
  const calls = [];
  const list = load('src/lib/liked-list.ts', { '@/lib/likes': {}, '@/lib/api/client': {} }).createLikedList(async (method, path, options) => {
    calls.push(options.params);
    return { data: options.params.skip === 20 ? [] : [{ id: `place-${options.params.skip}` }], meta: { has_more: options.params.skip < 40 } };
  });
  await list.load(); await list.load(); await list.load();
  assert.deepEqual(calls.map(call => call.skip), [0, 20, 40]);
  assert.deepEqual([...list.state().places].map(place => place.id), ['place-0', 'place-40']);
  list.remove('place-0'); assert.equal(list.state().places.length, 1);
  await list.load(); assert.equal(calls.length, 3);
});

test('wording is bilingual, uses correct like-number agreement and never says love', () => {
  const { dictionaries } = load('src/i18n/dictionaries.ts');
  assert.doesNotMatch(JSON.stringify(dictionaries), /love|loving|محبة|محبوب|\bحب\b/i);
  for (const locale of ['en', 'ar']) {
    const { place, plan } = dictionaries[locale];
    for (const key of ['likeLabel', 'unlikeLabel', 'likeProof', 'firstLike', 'seeAllPhotos']) assert.equal(typeof place[key], 'string');
    for (const key of ['plan', 'liked', 'likedEmpty', 'moreLiked']) assert.equal(typeof plan[key], 'string');
    for (const form of ['zero', 'one', 'two', 'few', 'many', 'other']) assert.equal(typeof place.likeCount[form], 'string');
  }
  assert.equal(dictionaries.en.place.likeCount.one, '{count} like');
  assert.equal(dictionaries.ar.place.likeCount.two, 'إعجابين');
});

test('live requests batch 100, pause hidden/offline, back off and never stack', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const browser = { document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} }, navigator: { onLine: true } };
  let reads = 0; let refuse = false; let pending;
  const store = load('src/lib/likes.ts', { window: browser, '@/lib/api/client': {} }).createLikeStore(async (method, path, options) => {
    if (path.endsWith('/mine')) return mine;
    reads++; assert.ok(options.params.placeIds.split(',').length <= 100);
    if (refuse) throw { status: 429, retryAfter: 60 };
    if (pending) return new Promise(resolve => { pending = resolve; });
    return { [id]: { liked: false, likeCount: reads } };
  });
  await store.start(id);
  const release = store.watch(id, true, () => true);
  context.mock.timers.tick(9999); await drain(); assert.equal(reads, 1);
  context.mock.timers.tick(1); await drain(); assert.equal(reads, 2);
  browser.document.visibilityState = 'hidden'; context.mock.timers.tick(10000); await drain(); assert.equal(reads, 2);
  browser.document.visibilityState = 'visible'; browser.navigator.onLine = false;
  await store.refresh([id]); assert.equal(reads, 2);
  browser.navigator.onLine = true; pending = true;
  const reading = store.refresh(Array.from({ length: 110 }, (_, index) => `${index}`));
  await drain(); const other = store.refresh([id]); assert.equal(reads, 3);
  pending({ [id]: { liked: false, likeCount: 9 } }); await Promise.all([reading, other]); pending = null;
  refuse = true; await store.refresh([id]); assert.equal(reads, 4);
  await store.refresh([id]); assert.equal(reads, 4);
  release();
});

test('unknown preparation: prepare the current cookie and retry the final state once', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const calls = [];
  let attempts = 0;
  const store = storeWith(async (method, path) => {
    calls.push(`${method} ${path}`);
    if (path.endsWith('/state')) return { [id]: { liked: false, likeCount: 7 } };
    if (path.endsWith('/mine')) return mine;
    if (++attempts === 1) throw { status: 503, code: 'likes_unavailable', retryAfter: 2 };
    return { liked: true, likeCount: 42 };
  });
  await store.start(id); store.set(id, true);
  context.mock.timers.tick(150); await drain();
  assert.equal(store.liked(id), true); assert.equal(store.count(id), 42);
  assert.equal(store.feedback(), null);
  assert.deepEqual(calls.slice(2), [`PUT /v1/places/${id}/like`, 'GET /v1/likes/mine', `PUT /v1/places/${id}/like`]);
});

test('live totals update unliked places but never overwrite pending visitor intent or stale write counts', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let count = 7;
  let resolveRead;
  const store = storeWith(async (method, path) => {
    if (path.endsWith('/state')) return resolveRead ? new Promise(resolve => { resolveRead = resolve; }) : { [id]: { liked: false, likeCount: count } };
    if (path.endsWith('/mine')) return mine;
    return { liked: true, likeCount: 50 };
  });
  await store.start(id); count = 12; await store.refresh([id]);
  assert.equal(store.count(id), 12);
  store.set(id, true); await store.refresh([id]);
  assert.equal(store.liked(id), true); assert.equal(store.count(id), 13);
  resolveRead = true;
  const reading = store.refresh([id]); await drain();
  context.mock.timers.tick(150); await drain();
  resolveRead({ [id]: { liked: false, likeCount: 1 } }); await reading;
  assert.equal(store.count(id), 50); assert.equal(store.liked(id), true);
});

test('tap discrimination: single waits 280ms, double only likes, and drag cancels', context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const { createPhotoTap } = load('src/lib/like-interaction.ts');
  const actions = [];
  const taps = createPhotoTap(() => actions.push('open'), () => actions.push('like'));
  taps.tap({ x: 10, y: 10 }); context.mock.timers.tick(279); assert.deepEqual(actions, []);
  context.mock.timers.tick(1); assert.deepEqual(actions, ['open']);
  taps.tap({ x: 10, y: 10 }); context.mock.timers.tick(100); taps.tap({ x: 12, y: 10 });
  context.mock.timers.tick(500); assert.deepEqual(actions, ['open', 'like']);
  taps.tap({ x: 10, y: 10 }); taps.cancel(); context.mock.timers.tick(500);
  assert.deepEqual(actions, ['open', 'like']);
});

for (const base of ['https://backend.example', '/api']) test(`credential single-flight (${base}) mints one cookie`, async () => {
  let cookie;
  let release;
  let minted = 0;
  const identities = [];
  const transport = load('src/lib/api/transport.ts', {
    window: {}, '@/lib/config': { getApiBaseUrl: () => base },
    './guest-handover': { waitForGuestHandover: async () => {} },
    fetch: async () => {
      const identity = cookie;
      identities.push(identity);
      if (!identity) { minted++; await new Promise(resolve => { release = resolve; }); cookie = `visitor-${minted}`; }
      return new Response('{}');
    },
  });
  const requests = ['/saved-places', '/amenities', '/likes/state'].map(path => transport.fetchApi(path, { credentials: 'include' }));
  await drain(); assert.equal(identities.length, 1);
  release(); await Promise.all(requests);
  assert.equal(minted, 1); assert.deepEqual(identities, [undefined, 'visitor-1', 'visitor-1']);
});

test('compact public numbers occupy at most four figures, including zero and unit boundaries', () => {
  const { compactCount } = load('src/lib/compact-count.ts');
  for (const [count, expected] of [[0, '0'], [999, '999'], [1200, '1.2k'], [9999, '10k'], [12300, '12k'], [999500, '1m'], [1200000000, '1.2b']]) assert.equal(compactCount(count), expected);
  for (const count of [0, 7, 999, 1200, 12000, 999499, 999999, 987654321, Number.MAX_SAFE_INTEGER]) assert.ok(compactCount(count).length <= 4);
});

for (const locale of ['ar', 'en']) test(`post action row (${locale}) order, visible zeroes and palette contrast; natural widths/no-wrap at 320px`, async () => {
  const dictionary = load('src/i18n/dictionaries.ts').dictionaries[locale];
  const store = storeWith(async (method, path) => path.endsWith('/mine') ? mine : { [id]: { liked: false, likeCount: 0 } });
  await store.start(id);
  const harness = await mount(browser => {
    browser.document = global.document; browser.matchMedia = () => ({ matches: false });
    const { PlaceActions } = load('src/components/ds/PlaceActions.tsx', {
      window: browser, '@/lib/likes': { likeStore: store }, '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false }) },
      '@/i18n/LocaleProvider': { useI18n: () => ({ locale, t: (key, variables = {}) => Object.entries(variables).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), key.split('.').reduce((value, part) => value[part], dictionary)) }) },
    });
    return React.createElement(PlaceActions, { placeId: id, name: 'Nile', metrics: { views: 0, saves: 0, directions: 0 } });
  });
  try {
    const row = harness.nodes(node => node.getAttribute?.('data-place-actions') !== null && node.getAttribute?.('data-place-actions') !== undefined)[0];
    const controls = row.childNodes.filter(node => node.nodeType === 1);
    assert.equal(controls.length, 4); assert.equal(controls[0].getAttribute('data-like-button'), 'true'); assert.equal(controls[3].getAttribute('data-save-button'), 'true');
    assert.equal(controls[1].getAttribute('aria-label'), dictionary.place.directionsCount.replace('{count}', '0'));
    assert.equal(controls[2].getAttribute('aria-label'), dictionary.place.viewsCount.replace('{count}', '0'));
    assert.deepEqual(controls.map(control => control.textContent), ['0', '0', '0', '0']);
    const css = fs.readFileSync('src/components/ds/PostCard.module.css', 'utf8'); assert.match(css, /flex-wrap: nowrap/); assert.match(css, /gap: 20px/); assert.doesNotMatch(css, /inline-size: 4ch/);
    const tokens = fs.readFileSync('src/app/globals.css', 'utf8');
    const resolveColor = name => { const value = tokens.match(new RegExp(`--${name}:\\s*([^;]+);`))[1]; const alias = value.match(/var\(--([^)]*)\)/); return alias ? resolveColor(alias[1]) : value; };
    const luminance = color => color.slice(1).match(/../g).map(channel => { const value = parseInt(channel, 16) / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    for (const foreground of ['text-primary', 'text-secondary']) for (const background of ['surface-card', 'surface-app']) assert.ok((luminance(resolveColor(background)) + .05) / (luminance(resolveColor(foreground)) + .05) >= 4.5);
  } finally { await harness.close(); }
});

for (const reduced of [false, true]) test(`mounted heart: own animation only, remote count rolls without celebration (reduced=${reduced})`, async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let count = 0;
  const store = storeWith(async (method, path) => path.endsWith('/mine') ? mine : { [id]: { liked: false, likeCount: count } });
  await store.start(id);
  const harness = await mount(browser => {
    browser.document = global.document; browser.matchMedia = () => ({ matches: reduced });
    const { LikeButton } = load('src/components/ds/LikeButton.tsx', { window: browser, '@/lib/likes': { likeStore: store }, '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: key => key }) } });
    return React.createElement(LikeButton, { placeId: id, name: 'Nile' });
  });
  try {
    const button = harness.nodes(node => node.tagName === 'BUTTON')[0];
    count = 38; await React.act(async () => store.refresh([id]));
    assert.equal(button.textContent, '38'); assert.equal(button.getAttribute('data-like-motion'), null);
    await React.act(async () => store.set(id, true));
    assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.equal(button.textContent, '39');
    assert.equal(button.getAttribute('data-like-motion'), reduced ? null : 'celebrate');
    assert.equal(harness.nodes(node => node.getAttribute?.('class') === 'particle').length, reduced ? 0 : 6);
    await React.act(async () => store.set(id, false)); assert.equal(button.getAttribute('data-like-motion'), reduced ? null : 'empty');
  } finally { await harness.close(); }
});

test('mounted photo gesture rejects horizontal movement; double taps only like and keep the link closed', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let gestures; let liked = false; let writes = 0; let opened = 0; let bursts = 0;
  const harness = await mount(() => {
    const { usePhotoLike } = load('src/components/ds/usePhotoLike.ts', {
      '@/lib/likes': { likeStore: { enabled: () => true } },
      '@/lib/like-effects': { setVisitorLike: (place, state) => { assert.equal(state, true); if (!liked) { liked = true; writes++; } }, burstLike: () => { bursts++; } },
    });
    function Photo() { gestures = usePhotoLike(id); return React.createElement('a', { href: '/place' }); }
    return React.createElement(Photo);
  });
  try {
    const event = { detail: 1, clientX: 10, clientY: 10, currentTarget: {}, preventDefault() {}, stopPropagation() {} };
    gestures.onPointerDown({ clientX: 10, clientY: 10, pointerId: 1 }); gestures.onPointerMove({ clientX: 100, clientY: 12 }); gestures.onPointerUp();
    assert.equal(gestures.click(event, () => opened++), true); context.mock.timers.tick(500); assert.equal(writes + opened, 0);
    for (let tap = 0; tap < 4; tap++) { gestures.onPointerDown({ clientX: 10, clientY: 10, pointerId: 1 }); gestures.onPointerUp(); gestures.click(event, () => opened++); context.mock.timers.tick(80); }
    context.mock.timers.tick(500); assert.equal(writes, 1); assert.equal(opened, 0); assert.equal(bursts, 2); assert.equal(liked, true);
  } finally { await harness.close(); }
});

test('visible startup retries a failed State with backoff rather than remaining unavailable forever', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let reads = 0;
  const store = storeWith(async (method, path) => { if (path.endsWith('/mine')) return mine; if (++reads === 1) throw { status: 429, retryAfter: 20 }; return { [id]: { liked: false, likeCount: 3 } }; });
  const release = store.watch(id, true, () => true);
  await store.start(id); assert.equal(store.enabled(), false);
  context.mock.timers.tick(19999); await drain(); assert.equal(reads, 1);
  context.mock.timers.tick(1); await drain(); assert.equal(reads, 2); assert.equal(store.enabled(), true); release();
});

for (const galleryPresent of [false, true]) test(`mounted gallery (present=${galleryPresent}): snapshots, lazy current/next, see-all tile and dot state`, async () => {
  const dictionary = load('src/i18n/dictionaries.ts').dictionaries.en;
  const images = Array.from({ length: 6 }, (_, index) => ({ url: `https://storage.5argny.com/places/${index}.webp`, width: 480, height: 600 }));
  const harness = await mount(browser => {
    browser.matchMedia = () => ({ matches: false });
    const noop = () => {};
    const { PostPhoto } = load('src/components/ds/PostPhoto.tsx', {
      window: browser, '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: (key, variables = {}) => Object.entries(variables).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), key.split('.').reduce((value, part) => value[part], dictionary)) }) },
      './PhotoImage': { PhotoImage: ({ priority }) => React.createElement('img', { loading: priority ? 'eager' : 'lazy' }) },
      './usePhotoLike': { usePhotoLike: () => ({ cancel: noop }) }, 'next/link': { default: ({ prefetch, ...props }) => React.createElement('a', props) },
    });
    return React.createElement(PostPhoto, { image: images[0].url, gallery: galleryPresent ? { total: 14, images } : undefined, href: '/en/explorer/city/place/', title: 'Nile', priority: true });
  });
  try {
    const slides = harness.nodes(node => node.getAttribute?.('data-post-slide') === 'true');
    const pictures = () => harness.nodes(node => node.tagName === 'IMG');
    assert.equal(slides.length, galleryPresent ? 7 : 1); assert.equal(pictures().length, galleryPresent ? 2 : 1); assert.equal(pictures()[0].getAttribute('loading'), 'eager');
    const dots = harness.nodes(node => node.getAttribute?.('data-post-dots') === 'true'); assert.equal(dots.length, galleryPresent ? 1 : 0);
    if (galleryPresent) {
      assert.equal(dots[0].childNodes.length, 5); assert.match(slides.at(-1).textContent, /See all 14 photos/);
      const gallery = harness.nodes(node => node.getAttribute?.('data-post-gallery') === 'true')[0]; gallery.scrollLeft = 320; gallery.clientWidth = 320;
      let scroll;
      gallery.scrollTo = options => { scroll = options; };
      await React.act(async () => harness.props(gallery).onKeyDown({ key: 'ArrowRight', preventDefault() {} }));
      assert.equal(scroll.left, 320, 'Arrow navigation scrolls only the gallery, not the document');
      await React.act(async () => harness.props(gallery).onScroll({ currentTarget: gallery }));
      assert.equal(pictures().length, 3); assert.equal(slides[1].getAttribute('aria-hidden'), 'false'); assert.equal(dots[0].childNodes[1].getAttribute('aria-current'), 'true');
    }
  } finally { await harness.close(); }
});

for (const base of ['https://backend.example', '/api']) test(`first tap shares the single visitor established by parallel reads (${base})`, async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let cookie; let release; let minted = 0; const identities = []; const prepared = new Set();
  const transport = load('src/lib/api/transport.ts', { window: {}, '@/lib/config': { getApiBaseUrl: () => base }, './guest-handover': { waitForGuestHandover: async () => {} }, fetch: async (url, options) => {
    const identity = cookie ?? `visitor-${++minted}`; identities.push(identity);
    if (!cookie) { await new Promise(resolve => { release = resolve; }); cookie = identity; }
    let data = {};
    if (url.includes('/likes/state')) data = { [id]: { liked: false, likeCount: 0 } };
    if (url.includes('/likes/mine')) { prepared.add(identity); data = mine; }
    if (options.method === 'PUT') { assert.ok(prepared.has(identity), 'A write used a visitor different from Mine preparation'); data = { liked: true, likeCount: 1 }; }
    return new Response(JSON.stringify(data));
  } });
  const request = async (method, path) => (await transport.fetchApi(path, { method, credentials: 'include' })).json();
  const store = storeWith(request);
  const saved = request('GET', '/saved-places'); const amenities = request('GET', '/amenities'); const ready = store.start(id);
  await drain(); assert.equal(minted, 1); assert.equal(identities.length, 1);
  release(); await Promise.all([saved, amenities, ready]);
  store.set(id, true); context.mock.timers.tick(150); await drain();
  assert.equal(store.count(id), 1); assert.equal(store.liked(id), true); assert.equal(store.feedback(), null); assert.equal(minted, 1); assert.ok(identities.every(identity => identity === cookie));
});

test('browser script mocks all cookie-minting API reads, blocks writes and uses real component wording', () => {
  const source = fs.readFileSync('.brief/verify/round-g.mjs', 'utf8');
  assert.match(source, /allApiReads: true/); assert.match(source, /serviceWorkers: 'block'/); assert.match(source, /Network.setBlockedURLs/);
  assert.match(source, /assert.equal\(method, 'GET', 'Only public reads may be forwarded'\)/); assert.match(source, /'cookie', 'host', 'authorization'/);
  assert.match(source, /Set-Cookie/); assert.match(source, /prepared.has\(identity\)/); assert.match(source, /remaining: 2/);
  assert.match(source, /width: 320/); assert.match(source, /width: 390/); assert.match(source, /width: 1280/);
  assert.match(source, /'LIKES_RATE_LIMIT'/); assert.match(source, /data-search-result/); assert.match(source, /getAttribute\('aria-pressed'\)/);
  const { dictionaries } = load('src/i18n/dictionaries.ts');
  for (const locale of ['ar', 'en']) for (const key of ['searchPlaces']) assert.ok(source.includes(dictionaries[locale].common[key]));
});

test('social proof waits for a real State count rather than treating an unseen place as zero', async () => {
  const store = storeWith(async (method, path, options) => path.endsWith('/mine') ? mine : Object.fromEntries(options.params.placeIds.split(',').map(identifier => [identifier, { liked: false, likeCount: 12 }])));
  await store.start('22222222-2222-4222-8222-222222222222');
  const harness = await mount(browser => {
    const { LikeSocialProof } = load('src/components/ds/LikeButton.tsx', { window: browser, '@/lib/likes': { likeStore: store }, '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: (key, values = {}) => `${key}:${values.count}` }) } });
    return React.createElement(LikeSocialProof, { placeId: id });
  });
  try {
    const proof = harness.nodes(node => node.tagName === 'P')[0];
    assert.equal(proof.textContent.trim(), '');
    store.seed(id, 99);
    await React.act(async () => store.refresh([id]));
    assert.equal(proof.childNodes[0].textContent, 'place.likeProof:12');
    assert.equal(proof.childNodes[1].textContent, 'place.likeProofQuiet:undefined');
  } finally { await harness.close(); }
});
