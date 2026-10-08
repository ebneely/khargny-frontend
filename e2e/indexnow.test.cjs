const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NextRequest } = require('next/server');
const { load } = require('./offline-loader.cjs');
const { dependencies, origin } = require('./seo-fixtures.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { getPathMatch } = require('next/dist/shared/lib/router/utils/path-match');

function config() {
  return load('next.config.ts', { '@sentry/nextjs': { withSentryConfig: (value) => value } }).default;
}

test('exact root key file returns plain text, exactly the key and no locale redirect', async () => {
  const key = 'Abcd1234-test';
  const deps = dependencies({ env: { INDEXNOW_KEY: key } });
  const handler = load('src/app/api/indexnow/[keyFile]/route.ts', deps).GET;
  for (const prefix of ['/', '/api/indexnow/']) {
    const response = await handler(new Request(origin + prefix + key + '.txt'), { params: Promise.resolve({ keyFile: key + '.txt' }) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(await response.text(), key);
  }
  const middleware = load('src/proxy.ts', deps).proxy;
  const passed = middleware(new NextRequest(origin + '/' + key + '.txt'));
  assert.equal(passed.headers.get('x-middleware-next'), '1');
  assert.equal(passed.headers.get('location'), null);
  assert.equal(passed.headers.get('x-middleware-rewrite'), null);
});

test('wrong name and missing or invalid key return 404', async () => {
  for (const [key, pathname] of [
    ['abcdefgh', '/wrong.txt'], [undefined, '/abcdefgh.txt'], ['short', '/short.txt'],
    ['bad_key_123', '/bad_key_123.txt'], ['a'.repeat(129), '/' + 'a'.repeat(129) + '.txt'],
  ]) {
    const handler = load('src/app/api/indexnow/[keyFile]/route.ts', dependencies({ env: { INDEXNOW_KEY: key } })).GET;
    const response = await handler(new Request(origin + pathname), { params: Promise.resolve({ keyFile: pathname.split('/').filter(Boolean).at(-1) }) });
    assert.equal(response.status, 404);
    assert.notEqual(await response.text(), key);
  }
});

test('only key-shaped root text paths rewrite after real routes and public files', async () => {
  const rewrites = await config().rewrites();
  assert.equal(rewrites.beforeFiles.length, 0);
  const rule = rewrites.afterFiles.find((entry) => entry.destination === '/api/indexnow/:keyFile');
  assert.ok(rule);
  const match = getPathMatch(rule.source, { strict: true });
  assert.equal(match('/Abcd1234-test.txt').keyFile, 'Abcd1234-test.txt');
  assert.equal(match('/' + 'a'.repeat(128) + '.txt').keyFile, 'a'.repeat(128) + '.txt');
  for (const pathname of ['/zzz-nope', '/en/zzz-nope/', '/robots.txt', '/short.txt', '/bad_key_123.txt', '/ar/abcdefgh.txt', '/abcdefgh.txt/', '/' + 'a'.repeat(129) + '.txt']) {
    assert.equal(match(pathname), false);
  }
});

test('no root-level dynamic segment can capture unknown addresses with a route handler', () => {
  const root = path.join(__dirname, '../src/app');
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('[')) continue;
    assert.ok(!fs.readdirSync(path.join(root, entry.name)).some((filename) => /^route\.(?:[cm]?[jt]sx?)$/.test(filename)), entry.name);
  }
});

test('robots.txt remains exempt and serves production robots independently of the key route', async () => {
  const deps = dependencies({ env: { INDEXNOW_KEY: 'abcdefgh' } });
  const response = load('src/proxy.ts', deps).proxy(new NextRequest(origin + '/robots.txt'));
  assert.equal(response.headers.get('x-middleware-next'), '1');
  const robots = load('src/lib/robots.ts', deps).default();
  const { resolveRouteData } = require('next/dist/build/webpack/loaders/metadata/resolve-route-data');
  assert.match(resolveRouteData(robots, 'robots'), /Sitemap: https:\/\/web.invalid\/sitemap.xml/);
  assert.match(resolveRouteData(robots, 'robots'), /Allow: \//);
});
