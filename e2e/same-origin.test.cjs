const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { NextRequest } = require('next/server');
const { load } = require('./offline-loader.cjs');

const secret = 'test-forwarder-secret-32-characters-long';
const config = (mode, browser) => load('src/lib/config.ts', {
  process: { env: { NEXT_PUBLIC_API_MODE: mode, NEXT_PUBLIC_API_URL: 'https://upstream.invalid/' } },
  window: browser ? {} : undefined,
});
const envelope = (data, ok = true) => new Response(JSON.stringify({ success: ok, data }), {
  status: ok ? 200 : 503, headers: { 'Content-Type': 'application/json' },
});
const storage = (initial = null) => {
  let marker = initial;
  return { getItem: () => marker, setItem: (key, value) => { assert.equal(key, 'khg_guest_adopted'); marker = value; } };
};
function guestGate(options) {
  return load('src/lib/api/guest-handover.ts', { AbortController }).createGuestHandoverGate(options);
}
const middleware = (env = {}) => ({ middleware: load('src/proxy.ts', {
  process: { env: { NEXT_PUBLIC_API_MODE: 'same-origin', VERCEL: '1', WEB_FORWARDER_SECRET: secret, ...env } },
}).proxy });

test('forwarder errors and transactions cannot attach cookies, bodies or private headers to Sentry', () => {
  const { redactForwarderEvent } = load('src/lib/server/forwarder-telemetry.ts');
  const event = { request: { url: 'https://website.invalid/api/v1/guest/adopt',
    headers: { Cookie: 'private-cookie', 'Set-Cookie': 'private-cookie', Authorization: 'private-auth',
      'x-khargny-forwarder': secret, 'x-khargny-client-ip': '203.0.113.42',
      'x-middleware-request-cookie': 'private-cookie', 'X-Request-Id': 'trace' },
    data: { token: 'private-token' }, cookies: { guest: 'private-cookie' },
  } };
  const redacted = JSON.stringify(redactForwarderEvent(event));
  assert.doesNotMatch(redacted, /private-cookie|private-token|private-auth|203\.0\.113\.42/);
  assert.ok(!redacted.includes(secret));
  assert.ok(redacted.includes('trace'));
  for (const file of ['sentry.server.config.ts', 'sentry.edge.config.ts']) {
    let options;
    load(file, { '@sentry/nextjs': { init: value => { options = value; } }, process: { env: { NEXT_PUBLIC_API_MODE: 'same-origin' } } });
    assert.equal(options.sendDefaultPii, false);
    assert.equal(typeof options.beforeSend, 'function');
    assert.equal(typeof options.beforeSendTransaction, 'function');
  }
});

test('adoption response timeout releases requests without marking completion', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const browserStorage = storage();
  let finishAdoption;
  let adopted = 0;
  const gate = guestGate({ storage: () => browserStorage, onAdopted: () => adopted++, fetch: async url => {
    if (url.endsWith('/guest/handover')) return envelope({ token: 'token' });
    return new Promise(resolve => { finishAdoption = resolve; });
  } });
  const waiting = gate();
  while (!finishAdoption) await Promise.resolve();
  context.mock.timers.tick(2500);
  await waiting;
  finishAdoption(envelope({ adopted: true, merged: 1 }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(browserStorage.getItem(), null);
  assert.equal(adopted, 0);
});

test('largest audience analytics batch remains comfortably below keepalive/platform limits', () => {
  const batch = { platform: 'web', events: Array.from({ length: 50 }, () => ({
    type: 'page_view', path: '\u0800'.repeat(200), occurredAt: new Date().toISOString(),
  })) };
  assert.ok(Buffer.byteLength(JSON.stringify(batch)) < 64 * 1024);
});

test('successful adoption really refetches an active cached saved-plan query', async () => {
  const { QueryClient, QueryObserver } = require('@tanstack/react-query');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  queryClient.setQueryData(['saved-places'], ['before-adoption']);
  let reads = 0;
  const observer = new QueryObserver(queryClient, {
    queryKey: ['saved-places'], staleTime: 60000,
    queryFn: async () => { reads++; return ['adopted-plan']; },
  });
  const unsubscribe = observer.subscribe(() => {});
  let cleanup;
  const dependencies = {
    process: { env: { NEXT_PUBLIC_API_MODE: 'same-origin' } },
    window: { localStorage: storage() },
    fetch: async url => envelope(url.endsWith('/guest/handover') ? { token: 'token' } : url.endsWith('/guest/adopt') ? { adopted: true } : []),
    react: { useState: initial => [initial()], useLayoutEffect() {}, useEffect: effect => { cleanup = effect(); } },
    '@tanstack/react-query': { QueryClient: class { constructor() { return queryClient; } }, QueryClientProvider: () => null },
    '@/components/ds/LikeButton': { LikeFeedback: () => null },
  };
  try {
    load('src/components/QueryProvider.tsx', dependencies).QueryProvider({ children: null });
    await load('src/lib/api/transport.ts', dependencies).fetchApi('/v1/cities');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(reads, 1);
    assert.deepEqual(observer.getCurrentResult().data, ['adopted-plan']);
  } finally {
    cleanup?.(); unsubscribe(); queryClient.clear();
  }
});

test('real client, analytics/ads and directions beacon share the gate and same-origin URLs', async () => {
  const requests = [];
  const beacons = [];
  const invalidations = [];
  let finishHandover;
  let cleanup;
  const dependencies = {
    process: { env: { NEXT_PUBLIC_API_MODE: 'same-origin' } },
    window: { localStorage: storage() },
    navigator: { sendBeacon: url => { beacons.push(url); return true; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/guest/handover')) return new Promise(resolve => { finishHandover = resolve; });
      if (url.endsWith('/guest/adopt')) return envelope({ adopted: true, merged: 1 });
      return envelope([]);
    },
    react: { useState: initial => [initial()], useLayoutEffect() {}, useEffect: effect => { cleanup = effect(); } },
    '@tanstack/react-query': {
      QueryClient: class { setQueryDefaults() {} invalidateQueries(options) { invalidations.push(options); return Promise.resolve(); } },
      QueryClientProvider: () => null,
    },
    '@/components/ds/LikeButton': { LikeFeedback: () => null },
  };
  load('src/components/QueryProvider.tsx', dependencies).QueryProvider({ children: null });
  const controller = new AbortController();
  const client = load('src/lib/api/client.ts', dependencies);
  const request = client.apiRequest('GET', '/v1/saved-places', { params: { q: 'roof garden', area: ['one', 'two'] }, signal: controller.signal });
  const analytics = load('src/lib/analytics/track.ts', dependencies).sendTrackingBatch('/v1/ads/events', { events: [] }, true);
  load('src/lib/api/transport.ts', dependencies).sendApiBeacon('/v1/places/example/directions');
  assert.equal(requests.length, 1);
  assert.equal(beacons.length, 0);
  finishHandover(envelope({ token: 'transfer-token' }));
  await Promise.all([request, analytics]);
  assert.equal(requests[1].url, '/api/v1/guest/adopt');
  assert.equal(requests[2].url, '/api/v1/saved-places?q=roof+garden&area=one&area=two');
  assert.equal(requests[2].options.signal, controller.signal);
  assert.equal(requests[2].options.credentials, 'include');
  assert.equal(requests[2].options.cache, 'no-store');
  assert.equal(requests[3].url, '/api/v1/ads/events');
  assert.equal(requests[3].options.keepalive, true);
  assert.deepEqual(beacons, [], 'A beacon queued before the first response uses a credentialed keepalive fetch');
  assert.equal(requests.find(item => item.url === '/api/v1/places/example/directions').options.keepalive, true);
  assert.equal(invalidations.length, 1);
  assert.deepEqual(Array.from(invalidations[0].queryKey), ['saved-places']);
  cleanup();
});

test('direct browser and same-origin server transport skip migration and preserve upstream/errors', async () => {
  for (const browser of [true, false]) {
    let received;
    const dependencies = {
      window: browser ? {} : undefined,
      process: { env: { NEXT_PUBLIC_API_MODE: browser ? 'direct' : 'same-origin', NEXT_PUBLIC_API_URL: 'https://upstream.invalid' } },
      fetch: async (url, options) => { received = { url, options }; return new Response(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'missing' }, requestId: 'trace' }), { status: 404 }); },
    };
    const { apiRequest, ApiError } = load('src/lib/api/client.ts', dependencies);
    await assert.rejects(apiRequest('GET', '/v1/places/missing'), error => error instanceof ApiError && error.status === 404 && error.code === 'NOT_FOUND' && error.requestId === 'trace');
    assert.equal(received.url, 'https://upstream.invalid/v1/places/missing');
    assert.equal(received.options.cache, undefined);
  }
});

test('Vercel cache opt-out is scoped to same-origin API; configured Sentry DSN origin is allowed', async () => {
  for (const mode of ['direct', 'same-origin']) {
    const exports = load('next.config.ts', {
      '@sentry/nextjs': { withSentryConfig: value => value },
      process: { env: { NEXT_PUBLIC_API_MODE: mode, NEXT_PUBLIC_SENTRY_DSN: 'https://public-key@sentry.example.invalid/project' } },
    });
    const headers = await exports.default.headers();
    const api = headers.find(rule => rule.source === '/api/v1/:path*');
    assert.equal(Boolean(api), mode === 'same-origin');
    if (api) {
      assert.equal(api.headers.find(header => header.key === 'x-vercel-enable-rewrite-caching').value, '0');
      assert.match(exports.buildContentSecurityPolicy(), /https:\/\/sentry\.example\.invalid/);
      assert.doesNotMatch(exports.buildContentSecurityPolicy(), /public-key/);
    }
  }
});

test('trusted ingress accepts single IPv4, IPv6 and mapped IPv4 but not bracketed/out-of-range values', () => {
  for (const address of ['203.0.113.42', '2001:db8::42', '::ffff:203.0.113.42']) {
    const result = middleware().middleware(new NextRequest('https://website.invalid/api/v1/places/', { headers: { 'x-vercel-forwarded-for': address } }));
    assert.equal(result.headers.get('x-middleware-request-x-khargny-client-ip'), address);
  }
  for (const address of ['999.1.1.1', '[2001:db8::42]', '2001:db8::zz', '01.2.3.4']) {
    assert.equal(middleware().middleware(new NextRequest('https://website.invalid/api/v1/places/', { headers: { 'x-vercel-forwarded-for': address } })).status, 503);
  }
});

test('2500ms deadline releases every waiter, aborts, and prevents late adoption/marker', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const browserStorage = storage();
  let resolveResponse;
  let signal;
  let calls = 0;
  const gate = guestGate({ storage: () => browserStorage, fetch: async (url, options) => {
    calls++; signal = options.signal;
    return new Promise(resolve => { resolveResponse = resolve; });
  } });
  let released = false;
  const waiting = Promise.all([gate(), gate()]).then(() => { released = true; });
  await Promise.resolve();
  context.mock.timers.tick(2499);
  await Promise.resolve();
  assert.equal(released, false);
  context.mock.timers.tick(1);
  await waiting;
  assert.equal(signal.aborted, true);
  resolveResponse(envelope({ token: 'late-token' }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(browserStorage.getItem(), null);
  assert.equal(calls, 1);
});

test('CSP keeps direct policy; same-origin limits connections to self, backend and Sentry', () => {
  const { buildContentSecurityPolicy } = load('next.config.ts', { '@sentry/nextjs': { withSentryConfig: value => value } });
  for (const production of [true, false]) {
    const direct = buildContentSecurityPolicy({ mode: 'direct', production });
    const sameOrigin = buildContentSecurityPolicy({ mode: 'same-origin', production });
    const connect = sameOrigin.split('; ').find(value => value.startsWith('connect-src'));
    assert.match(direct, /connect-src 'self' https:/);
    assert.equal(connect, "connect-src 'self' https://backend.5argny.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io");
    assert.equal(direct.replace(/connect-src[^;]+/, ''), sameOrigin.replace(/connect-src[^;]+/, ''));
  }
});

test('src uses the config module as the only backend-host/env source', () => {
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) scan(filename);
      else if (filename !== path.join('src', 'lib', 'config.ts')) {
        assert.doesNotMatch(fs.readFileSync(filename, 'utf8'), /backend\.5argny\.com|NEXT_PUBLIC_API_URL/, filename);
      }
    }
  }
  scan('src');
});

test('external rewrite streams a fake upstream body/response and relays separate Set-Cookie values', async (context) => {
  let received;
  const cookies = ['khargny_guest_id=adopted; Path=/; HttpOnly; SameSite=Lax', 'another=value; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/'];
  const upstream = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    received = { method: request.method, path: request.url, headers: request.headers, body: Buffer.concat(chunks).toString() };
    response.writeHead(201, { 'Set-Cookie': cookies, 'Content-Type': 'text/plain' });
    response.write('first');
    response.end('-second');
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  context.after(() => upstream.close());
  const origin = `http://127.0.0.1:${upstream.address().port}`;
  const handler = middleware({ NEXT_PUBLIC_API_URL: origin }).middleware;
  const { proxyRequest } = require('next/dist/server/lib/router-utils/proxy-request');
  const relay = http.createServer(async (request, response) => {
    const rewritten = handler(new NextRequest(`https://website.invalid${request.url}`, { headers: request.headers }));
    const names = rewritten.headers.get('x-middleware-override-headers').split(',');
    request.headers = Object.fromEntries(names.map(name => [name, rewritten.headers.get(`x-middleware-request-${name}`)]));
    response.setHeader('Cache-Control', rewritten.headers.get('cache-control'));
    await proxyRequest(request, response, require('node:url').parse(rewritten.headers.get('x-middleware-rewrite'), true));
  });
  relay.listen(0, '127.0.0.1');
  await once(relay, 'listening');
  context.after(() => relay.close());
  const response = await fetch(`http://127.0.0.1:${relay.address().port}/api/v1/analytics/events/?x=1`, {
    method: 'PATCH', headers: { Cookie: 'khargny_guest_id=old', 'x-vercel-forwarded-for': '203.0.113.42' }, body: 'streamed-body',
  });
  assert.equal(response.status, 201);
  assert.equal(await response.text(), 'first-second');
  assert.deepEqual(response.headers.getSetCookie(), cookies);
  assert.equal(received.method, 'PATCH');
  assert.equal(received.path, '/v1/analytics/events/?x=1');
  assert.equal(received.body, 'streamed-body');
  assert.equal(received.headers.cookie, 'khargny_guest_id=old');
  assert.equal(received.headers['x-khargny-forwarder'], secret);
});

test('handover token is adopted once; concurrent requests wait; successful adopt marks and refetches', async () => {
  const browserStorage = storage();
  const calls = [];
  let adopted = 0;
  const gate = guestGate({ storage: () => browserStorage, onAdopted: () => adopted++, fetch: async (url, options) => {
    calls.push({ url, options });
    return envelope(calls.length === 1 ? { token: 'opaque-token' } : { adopted: true, merged: 2 });
  } });
  await Promise.all([gate(), gate(), gate()]);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.endsWith('/v1/guest/handover'));
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[1].url, '/api/v1/guest/adopt');
  assert.deepEqual(JSON.parse(calls[1].options.body), { token: 'opaque-token' });
  assert.equal(browserStorage.getItem(), '1');
  assert.equal(adopted, 1);
  await gate();
  assert.equal(calls.length, 2);
});

test('null token marks a new visitor without adoption; second visit skips handover', async () => {
  const browserStorage = storage();
  let calls = 0;
  await guestGate({ storage: () => browserStorage, fetch: async () => { calls++; return envelope({ token: null }); } })();
  assert.equal(browserStorage.getItem(), '1');
  await guestGate({ storage: () => browserStorage, fetch: async () => { calls++; throw Error('should skip'); } })();
  assert.equal(calls, 1);
});

test('handover storage unavailable tries once per page load without throwing', async () => {
  let calls = 0;
  const options = { storage: () => { throw Error('private mode'); }, fetch: async () => { calls++; return envelope({ token: null }); } };
  const gate = guestGate(options);
  await gate(); await gate();
  assert.equal(calls, 1);
  await guestGate(options)();
  assert.equal(calls, 2);
});

test('failed handover or adopt does not mark completion and can retry on the next load', async () => {
  for (const failure of ['handover', 'adopt', 'malformed']) {
    const browserStorage = storage();
    let calls = 0;
    await guestGate({ storage: () => browserStorage, fetch: async () => {
      calls++;
      if (failure === 'malformed') return envelope({});
      if (failure === 'handover' || calls === 2) return envelope({}, false);
      return envelope({ token: 'token' });
    } })();
    assert.equal(browserStorage.getItem(), null);
    await guestGate({ storage: () => browserStorage, fetch: async () => envelope({ token: null }) })();
    assert.equal(browserStorage.getItem(), '1');
  }
});

test('base URL: direct is default; same-origin applies only in the browser', () => {
  for (const mode of [undefined, 'direct', 'invalid', 'same-origin']) {
    for (const browser of [false, true]) {
      assert.equal(config(mode, browser).getApiBaseUrl(), mode === 'same-origin' && browser ? '/api' : 'https://upstream.invalid');
    }
  }
});

test('forwarder strips forged private headers and preserves required request headers', () => {
  const request = new NextRequest('https://website.invalid/api/v1/saved-places/?limit=3', { headers: {
    'x-khargny-forwarder': 'forged', 'x-khargny-client-ip': '198.51.100.99',
    'x-vercel-forwarded-for': '203.0.113.42', 'x-forwarded-for': '198.51.100.99',
    Cookie: 'khargny_guest_id=old; other=value', 'Accept-Language': 'ar',
    'Content-Type': 'application/json', 'X-Device-Id': 'device', 'X-Request-Id': 'request',
  } });
  const result = middleware().middleware(request);
  assert.equal(result.headers.get('x-middleware-rewrite'), 'https://backend.5argny.com/v1/saved-places/?limit=3');
  for (const [name, value] of Object.entries({
    'x-khargny-forwarder': secret, 'x-khargny-client-ip': '203.0.113.42', cookie: 'khargny_guest_id=old; other=value',
    'accept-language': 'ar', 'content-type': 'application/json', 'x-device-id': 'device', 'x-request-id': 'request',
  })) assert.equal(result.headers.get(`x-middleware-request-${name}`), value);
  assert.equal(result.headers.get('x-khargny-forwarder'), null);
  assert.equal(result.headers.get('x-khargny-client-ip'), null);
  assert.match(result.headers.get('cache-control'), /no-store/);
});

test('forwarder fails closed for absent/short secrets and untrusted/malformed platform addresses', async () => {
  for (const value of ['', 'short', ` ${secret}`, `${secret}\n`, '\u2603'.repeat(40)]) {
    const env = { WEB_FORWARDER_SECRET: value };
    const result = middleware(env).middleware(new NextRequest('https://website.invalid/api/v1/places/'));
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, 'WEB_FORWARDER_UNAVAILABLE');
    assert.equal(result.headers.get('x-middleware-rewrite'), null);
  }
  for (const env of [{ VERCEL: '' }, {}]) {
    for (const ip of ['', '203.0.113.42, 198.51.100.1', 'not-an-ip']) {
      const result = middleware(env).middleware(new NextRequest('https://website.invalid/api/v1/places/', {
        headers: { 'x-vercel-forwarded-for': ip, 'x-forwarded-for': '203.0.113.42' },
      }));
      assert.equal(result.status, 503);
      assert.equal((await result.json()).error.code, 'WEB_FORWARDER_IP_UNAVAILABLE');
    }
  }
});

test('forwarder leaves other paths and direct mode alone; locale redirects and rewrites survive', () => {
  const handler = middleware({ WEB_FORWARDER_SECRET: '' }).middleware;
  for (const pathname of ['/api/v10/places/', '/api/v1evil/', '/api/auth/', '/monitoring/', '/sitemap.xml']) {
    assert.equal(handler(new NextRequest(`https://website.invalid${pathname}`)).headers.get('x-middleware-next'), '1');
  }
  assert.equal(middleware({ NEXT_PUBLIC_API_MODE: 'direct' }).middleware(new NextRequest('https://website.invalid/api/v1/places/')).headers.get('x-middleware-next'), '1');
  assert.equal(handler(new NextRequest('https://website.invalid/explorer/?q=roof')).headers.get('location'), 'https://website.invalid/ar/explorer/?q=roof');
  assert.equal(handler(new NextRequest('https://website.invalid/en/explorer/')).headers.get('x-middleware-request-x-khargny-locale'), 'en');
});
