const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');
const id = '11111111-1111-4111-8111-111111111111';
const plain = value => JSON.parse(JSON.stringify(value));
const page = (data, skip, has_more, degraded = false) => ({ data, meta: { skip, limit: 100, has_more }, degraded });
const drain = async () => { for (let index = 0; index < 12; index++) await Promise.resolve(); };
const harness = (request, storage) => load('src/lib/loves.ts', { '@/lib/api/client': {} }).createLoveStore(request, storage);

test('startup probes once and loads every ids page, including empty filtered pages', async () => {
  const calls = [];
  const store = harness(async (method, path, options) => {
    calls.push({ method, path, options });
    if (path === '/v1/likes/state') return { [id]: { liked: true, likeCount: 1200 } };
    const skip = options.params.skip;
    return skip === 0 ? page([id], 0, true) : skip === 100 ? page([], 100, true) : page(['second'], 200, false);
  });
  await Promise.all([store.start(id), store.start(id)]);
  assert.equal(calls.length, 4);
  assert.deepEqual(calls.slice(1).map(call => plain(call.options.params)), [0, 100, 200].map(skip => ({ fields: 'ids', limit: 100, skip })));
  assert.equal(store.liked(id), true); assert.equal(store.liked('second'), true); assert.equal(store.count(id), 1200);
});

test('optimistic final state, authoritative answer and rapid taps collapse', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const writes = [];
  let resolveWrite;
  const store = harness(async (method, path) => {
    if (path === '/v1/likes/state') return { [id]: { liked: false, likeCount: 4 } };
    if (path === '/v1/likes/mine') return page([], 0, false);
    writes.push(method);
    return new Promise(resolve => { resolveWrite = resolve; });
  });
  await store.start(id);
  store.set(id, true); store.set(id, false); store.set(id, true);
  assert.equal(store.liked(id), true); assert.equal(store.count(id), 5);
  context.mock.timers.tick(150); await drain(); assert.deepEqual(writes, ['PUT']);
  store.set(id, false); store.set(id, true); store.set(id, false);
  resolveWrite({ liked: true, likeCount: 42 }); await drain(); assert.equal(store.count(id), 41);
  context.mock.timers.tick(150); await drain(); assert.deepEqual(writes, ['PUT', 'DELETE']);
  resolveWrite({ liked: false, likeCount: 40 }); await drain();
  assert.equal(store.liked(id), false); assert.equal(store.count(id), 40);
});

test('refusal rolls back and Retry-After prevents another immediate request', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  let writes = 0;
  const store = harness(async (method, path) => {
    if (path === '/v1/likes/state') return { [id]: { liked: false, likeCount: 4 } };
    if (path === '/v1/likes/mine') return page([], 0, false);
    writes++; throw { status: 503, code: 'likes_unavailable', retryAfter: 2 };
  });
  await store.start(id); store.set(id, true); context.mock.timers.tick(150); await drain();
  assert.equal(store.liked(id), false); assert.equal(store.count(id), 4);
  assert.equal(store.feedback().kind, 'busy'); assert.equal(store.feedback().seconds, 2);
  store.set(id, true); context.mock.timers.tick(150); await drain();
  assert.equal(writes, 1); assert.equal(store.liked(id), false);
});

test('off is invisible, cached for the tab, and makes no further likes requests', async () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  let calls = 0;
  const store = harness(async () => { calls++; return {}; }, storage);
  await store.start(id); await store.start('second'); store.set(id, true);
  assert.equal(store.enabled(), false); assert.equal(calls, 1);
  await harness(async () => { calls++; return {}; }, storage).start(id); assert.equal(calls, 1);
});

test('degraded mine does not erase the local loved set', async () => {
  const store = harness(async (method, path) => path === '/v1/likes/state'
    ? { [id]: { liked: true, likeCount: 5 } } : page([], 0, false, true));
  await store.start(id); assert.equal(store.liked(id), true);
});

test('compact count keeps the existing Latin digits policy', () => {
  const { compactCount } = load('src/lib/compact-count.ts');
  for (const [value, expected] of [[0, '0'], [12, '12'], [1000, '1k'], [1200, '1.2k'], [1000000, '1m'], [1500000, '1.5m']]) assert.equal(compactCount(value), expected);
});

test('all rapid intents roll back on a refusal, without an automatic retry', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let rejectWrite;
  let writes = 0;
  const store = harness(async (method, path) => {
    if (path === '/v1/likes/state') return { [id]: { liked: false, likeCount: 4 } };
    if (path === '/v1/likes/mine') return page([], 0, false);
    writes++; return new Promise((resolve, reject) => { rejectWrite = reject; });
  });
  await store.start(id); store.set(id, true); context.mock.timers.tick(150); await drain();
  store.set(id, false); store.set(id, true);
  rejectWrite({ status: 429, code: 'LIKES_RATE_LIMIT', retryAfter: 2 }); await drain();
  assert.equal(store.liked(id), false); assert.equal(store.count(id), 4);
  context.mock.timers.tick(5000); await drain(); assert.equal(writes, 1);
});

test('a disabled write hides every heart and cancels queued writes', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const store = harness(async (method, path) => {
    calls.push(path);
    if (path === '/v1/likes/state') return { [id]: { liked: false, likeCount: 0 } };
    if (path === '/v1/likes/mine') return page([], 0, false);
    throw { status: 503, code: 'likes_disabled', retryAfter: 2 };
  });
  await store.start(id); store.set(id, true); context.mock.timers.tick(150); await drain();
  assert.equal(store.enabled(), false);
  store.set(id, true); await store.start(id); context.mock.timers.tick(3000); await drain();
  assert.equal(calls.length, 3);
});

test('round F wording keys exist in both languages', () => {
  const { dictionaries } = load('src/i18n/dictionaries.ts');
  for (const locale of ['ar', 'en']) for (const key of ['saveLabel', 'unsaveLabel', 'loveLabel', 'unloveLabel', 'loveRateLimit', 'loveBusy', 'loveUnavailable', 'savedCount', 'breadcrumb', 'engagementCounts']) assert.equal(typeof dictionaries[locale].place[key], 'string', `${locale}: ${key}`);
  for (const locale of ['ar', 'en']) for (const agreement of ['zero', 'one', 'two', 'few', 'many', 'other']) assert.equal(typeof dictionaries[locale].place.loveRetryDelay[agreement], 'string', `${locale}: ${agreement}`);
});

test('love refusal categories include both rate codes, busy and unavailable', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { createLoveStore } = load('src/lib/loves.ts', { '@/lib/api/client': {} });
  for (const [status, code, kind] of [[429, 'LIKES_RATE_LIMIT', 'rate'], [429, 'likes_address_limit', 'rate'], [503, 'likes_unavailable', 'busy'], [404, 'PLACE_NOT_PUBLIC', 'unavailable'], [403, 'FORBIDDEN', 'unavailable']]) {
    const store = createLoveStore(async (method, path) => {
      if (path === '/v1/likes/state') return { [id]: { liked: false, likeCount: 4 } };
      if (path === '/v1/likes/mine') return page([], 0, false);
      throw { status, code, retryAfter: 2 };
    });
    await store.start(id); store.set(id, true); context.mock.timers.tick(150); await drain();
    assert.equal(store.liked(id), false); assert.equal(store.count(id), 4); assert.equal(store.feedback().kind, kind);
  }
});

test('API client keeps PUT/DELETE credentials in transport and exposes Retry-After', async () => {
  const calls = [];
  const { apiRequest, ApiError } = load('src/lib/api/client.ts', {
    './transport': { fetchApi: async (path, options) => {
      calls.push({ path, options });
      return new Response(JSON.stringify({ success: false, error: { code: 'likes_unavailable', message: 'Busy' } }), { status: 503, headers: { 'Retry-After': '2', 'Content-Type': 'application/json' } });
    } },
  });
  for (const method of ['PUT', 'DELETE']) {
    await assert.rejects(apiRequest(method, `/v1/places/${id}/like`), error => error instanceof ApiError && error.status === 503 && error.code === 'likes_unavailable' && error.retryAfter === 2);
  }
  assert.deepEqual(calls.map(call => call.options.method), ['PUT', 'DELETE']);
  assert.ok(calls.every(call => call.options.credentials === 'include' && call.options.body === undefined));
});

test('browser sequence: optimistic DELETE count can equal its answer before any request; refusals and keyboard intents remain correct', async context => {
  context.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const writes = [];
  let pending;
  const store = harness(async (method, path) => {
    if (path === '/v1/likes/state') return { [id]: { liked: false, likeCount: 0 } };
    if (path === '/v1/likes/mine') return page([], 0, false);
    writes.push(method);
    return new Promise((resolve, reject) => { pending = { resolve, reject }; });
  });
  await store.start(id);
  for (let index = 0; index < 5; index++) store.set(id, !store.liked(id));
  context.mock.timers.tick(150); await drain();
  assert.deepEqual(writes, ['PUT']); pending.resolve({ liked: true, likeCount: 42 }); await drain();
  for (let index = 0; index < 4; index++) store.set(id, !store.liked(id));
  context.mock.timers.tick(500); await drain(); assert.deepEqual(writes, ['PUT']);
  store.set(id, false);
  assert.equal(store.count(id), 41); assert.equal(store.liked(id), false);
  assert.deepEqual(writes, ['PUT'], '41 is optimistic, not evidence that DELETE has completed');
  context.mock.timers.tick(149); await drain(); assert.deepEqual(writes, ['PUT']);
  context.mock.timers.tick(1); await drain(); assert.deepEqual(writes, ['PUT', 'DELETE']);
  pending.resolve({ liked: false, likeCount: 41 }); await drain();
  context.mock.timers.tick(500); await drain(); assert.deepEqual(writes, ['PUT', 'DELETE']);
  for (const failure of [{ status: 429, code: 'LIKES_RATE_LIMIT', retryAfter: 1 }, { status: 503, code: 'likes_unavailable', retryAfter: 2 }]) {
    const before = writes.length;
    store.set(id, true); context.mock.timers.tick(150); await drain();
    assert.equal(writes.length, before + 1); assert.equal(writes.at(-1), 'PUT');
    pending.reject(failure); await drain();
    assert.equal(store.liked(id), false); assert.equal(store.count(id), 41);
    assert.equal(store.feedback().kind, failure.status === 429 ? 'rate' : 'busy');
    store.set(id, true); context.mock.timers.tick(250); await drain(); assert.equal(writes.length, before + 1);
    context.mock.timers.tick(failure.retryAfter * 1000); await drain(); assert.equal(writes.length, before + 1);
  }
  store.set(id, true); context.mock.timers.tick(150); await drain();
  assert.equal(writes.at(-1), 'PUT'); pending.resolve({ liked: true, likeCount: 42 }); await drain();
  store.set(id, false); context.mock.timers.tick(150); await drain();
  assert.equal(writes.at(-1), 'DELETE'); pending.resolve({ liked: false, likeCount: 41 }); await drain();
  assert.equal(store.liked(id), false); assert.equal(store.count(id), 41);
  assert.deepEqual(writes, ['PUT', 'DELETE', 'PUT', 'PUT', 'PUT', 'DELETE']);
});

test('love retry wording agrees with English and Arabic zero, one, two, few, many and other seconds', async () => {
  const React = require('react');
  const { mount } = require('./render-harness.cjs');
  const { dictionaries } = load('src/i18n/dictionaries.ts');
  const cases = {
    en: [[0, 'now'], [1, 'in 1 second'], [2, 'in 2 seconds'], [3, 'in 3 seconds'], [11, 'in 11 seconds'], [102, 'in 102 seconds']],
    ar: [[0, 'دلوقتي'], [1, 'بعد ثانية واحدة'], [2, 'بعد ثانيتين'], [3, 'بعد 3 ثواني'], [11, 'بعد 11 ثانية'], [102, 'بعد 102 ثانية']],
  };
  for (const locale of ['en', 'ar']) for (const kind of ['rate', 'busy']) for (const [seconds, delay] of cases[locale]) {
    const dict = dictionaries[locale];
    const { LoveFeedback } = load('src/components/ds/LoveButton.tsx', {
      '@/lib/loves': { loveStore: { subscribe: () => () => {}, snapshot: () => 1, feedback: () => ({ kind, seconds }), dismiss() {} } },
      '@/i18n/LocaleProvider': { useI18n: () => ({ locale, t: (key, vars = {}) => Object.entries(vars).reduce((text, [name, value]) => text.replaceAll('{' + name + '}', String(value)), key.split('.').reduce((value, part) => value?.[part], dict) ?? key) }) },
      './Toast': { Toast: ({ message }) => React.createElement('div', { role: 'status' }, message) },
    });
    const harness = await mount(() => React.createElement(LoveFeedback));
    try {
      const prefix = locale === 'en' ? kind === 'rate' ? 'Too many changes. Try again ' : 'Loves are busy. Try again ' : kind === 'rate' ? 'تغييرات كتير. جرّب تاني ' : 'الإعجابات مشغولة. جرّب تاني ';
      assert.equal(harness.nodes(node => node.attributes.role === 'status')[0].textContent, prefix + delay + '.', `${locale}/${kind}/${seconds}`);
    } finally { await harness.close(); }
  }
});
