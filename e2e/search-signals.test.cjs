const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');
const id = '11111111-1111-4111-8111-111111111111';

test('settled intent waits 1500ms, collapses typing, never duplicates on blur or submit', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const signals = [];
  const { createSettledSearch } = load('src/lib/search-signals.ts', { '@/lib/api/client': {}, '@/lib/analytics/track': {} });
  const intent = createSettledSearch(value => signals.push(JSON.parse(JSON.stringify(value))));
  intent.update('se', undefined, 'en'); context.mock.timers.tick(1000);
  intent.update('sea view', id, 'en'); context.mock.timers.tick(1499);
  assert.equal(signals.length, 0); context.mock.timers.tick(1);
  intent.settle(); intent.settle(); intent.update('sea view', id, 'en');
  assert.deepEqual(signals, [{ term: 'sea view', cityId: id, locale: 'en' }]);
  intent.update('sea views', id, 'en'); intent.settle(); context.mock.timers.tick(2000); assert.equal(signals.length, 2);
  intent.update('', id, 'en'); intent.settle(); context.mock.timers.tick(2000); assert.equal(signals.length, 2);
  intent.dispose();
});

test('settled request uses exact contract params, no legacy search event', async () => {
  const calls = [];
  const { sendSettledSearch } = load('src/lib/search-signals.ts', {
    '@/lib/api/client': { apiRequest: async (...args) => calls.push(args) },
    '@/lib/analytics/track': { isTrackingAllowed: () => true },
  });
  await sendSettledSearch({ term: 'sea view', cityId: id, locale: 'en' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['GET', '/v1/search/places', {
    params: { q: 'sea view', cityId: id, settled: 1, platform: 'web', locale: 'en', limit: 1 },
    headers: { 'Accept-Language': 'en' }, keepalive: true,
  }]]);
});

test('navigation/remount does not settle the same search again, but editing starts a new intent', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const signals = [];
  const { createSettledSearch } = load('src/lib/search-signals.ts', { '@/lib/api/client': {}, '@/lib/analytics/track': {} });
  const first = createSettledSearch(value => signals.push(value), storage);
  first.update('sea view', id, 'en'); first.settle(); first.dispose();
  const nextPage = createSettledSearch(value => signals.push(value), storage);
  nextPage.update('sea view', id, 'en'); context.mock.timers.tick(1500); nextPage.settle();
  assert.equal(signals.length, 1);
  nextPage.update('', id, 'en'); nextPage.update('sea view', id, 'en'); nextPage.settle();
  assert.equal(signals.length, 2);
});

test('strict-mode effect replay reschedules an unsent search after cleanup', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const signals = [];
  const { createSettledSearch } = load('src/lib/search-signals.ts', { '@/lib/api/client': {}, '@/lib/analytics/track': {} });
  const intent = createSettledSearch(value => signals.push(value));
  intent.update('sea view', id, 'en'); intent.dispose(); intent.update('sea view', id, 'en');
  context.mock.timers.tick(1500); assert.equal(signals.length, 1);
});

test('typing a previous term into an initially empty field is a new search', context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const signals = [];
  const { createSettledSearch } = load('src/lib/search-signals.ts', { '@/lib/api/client': {}, '@/lib/analytics/track': {} });
  const previous = createSettledSearch(value => signals.push(value), storage);
  previous.update('sea view', undefined, 'ar'); previous.settle(); previous.dispose();
  const fresh = createSettledSearch(value => signals.push(value), storage);
  fresh.update('', undefined, 'ar'); fresh.update('sea view', undefined, 'ar');
  context.mock.timers.tick(1500);
  assert.equal(signals.length, 2);
});

test('search_click matches contract through existing keepalive batch sender', () => {
  const batches = [];
  const { trackSearchClick, flushAnalytics } = load('src/lib/analytics/track.ts', {
    window: { addEventListener() {} }, navigator: {},
    '@/lib/api/transport': { fetchApi: async (path, options) => { batches.push({ path, options }); return { ok: true }; } },
  });
  trackSearchClick('sea view', id, 1, 'en', id); flushAnalytics(true);
  const body = JSON.parse(batches[0].options.body); delete body.events[0].occurredAt;
  assert.deepEqual(body, { platform: 'web', events: [{ type: 'search_click', term: 'sea view', placeId: id, position: 1, cityId: id, locale: 'en' }] });
  assert.equal(batches[0].path, '/v1/analytics/events'); assert.equal(batches[0].options.credentials, 'include'); assert.equal(batches[0].options.keepalive, true);
  trackSearchClick('', id, 1, 'ar'); flushAnalytics(true); assert.equal(batches.length, 1);
});
