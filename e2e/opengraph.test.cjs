const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NextRequest } = require('next/server');
const { load } = require('./offline-loader.cjs');
const { dependencies, origin } = require('./seo-fixtures.cjs');

test('default share image renders a real 1200x630 PNG offline, without remote fonts or images', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, ...args) => {
    if (String(url).startsWith('data:')) return originalFetch(url, ...args);
    requests.push(url);
    throw new Error('Share image must not use network');
  };
  try {
    const imageModule = load('src/app/og/default.png/route.tsx', dependencies());
    assert.equal(imageModule.dynamic, 'force-static');
    const response = await imageModule.GET();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^image\/png/);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=86400, s-maxage=31536000');
    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    assert.ok(png.length > 10000);
    assert.equal(requests.length, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('file-extension share route bypasses locale middleware without a slash redirect', () => {
  const middleware = load('src/middleware.ts', dependencies()).middleware;
  for (const pathname of ['/og/default.png']) {
    const response = middleware(new NextRequest(origin + pathname));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('x-middleware-rewrite'), null);
  }
});

test('Next trailing-slash redirects leave the image file URL unchanged', async () => {
  const { defaultConfig } = require('next/dist/server/config-shared');
  const loadCustomRoutes = require('next/dist/lib/load-custom-routes').default;
  const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');
  const config = load('next.config.ts', { '@sentry/nextjs': { withSentryConfig: (value) => value } }).default;
  const { redirects } = await loadCustomRoutes({ ...defaultConfig, ...config });
  assert.ok(redirects.some((rule) => getPathMatch(rule.source)('/opengraph-image')));
  assert.ok(!redirects.some((rule) => getPathMatch(rule.source)('/og/default.png')));
});
