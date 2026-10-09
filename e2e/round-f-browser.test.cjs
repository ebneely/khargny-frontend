const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const { loopbackGuard } = require('./browser-network-guard.cjs');
const origin = 'http://localhost:3108';
const backend = 'https://backend.5argny.com';
const mockPath = '/__round_f_mock__/request';

function harness(beacon = true) {
  const calls = [];
  const window = { fetch: (address, options) => { calls.push({ source: 'fetch', address, options }); return Promise.resolve(new Response('{}')); } };
  const navigator = beacon ? { sendBeacon: (address, data) => { calls.push({ source: 'sendBeacon', address, data }); return true; } } : {};
  class Xhr { open(method, address, ...args) { calls.push({ source: 'xhr', method, address, args }); } }
  vm.runInNewContext(`(${loopbackGuard.toString()})(${JSON.stringify({ origin, mockPath })})`, { window, navigator, XMLHttpRequest: Xhr, Request, URL, location: { href: `${origin}/en/` } });
  return { window, navigator, Xhr, calls };
}

function decoded(call) {
  const target = new URL(call.address);
  assert.equal(target.origin, origin); assert.equal(target.pathname, mockPath);
  return JSON.parse(target.searchParams.get('guard'));
}

test('browser guard preserves ordinary GETs and retargets every protected read/write with original metadata', async () => {
  const { window, calls } = harness();
  const ordinary = `${backend}/v1/search/places?q=nile`;
  const init = { credentials: 'include', headers: { 'Accept-Language': 'en' } };
  await window.fetch(ordinary, init);
  assert.equal(calls[0].address, ordinary); assert.equal(calls[0].options, init);
  const seen = new Set();
  for (const [method, path, keepalive] of [
    ['GET', '/v1/likes/state?placeIds=id', false], ['GET', '/v1/likes/mine?fields=ids', false],
    ['GET', '/v1/search/places?q=nile&settled=1', true], ['GET', '/api/v1/saved-places', false],
    ['PUT', '/v1/places/id/like', false], ['DELETE', '/api/v1/places/id/like', false],
    ['POST', '/v1/analytics/events', true], ['POST', '/v1/ads/events', true],
    ['POST', '/v1/guest/handover', false], ['POST', '/api/v1/guest/adopt', false],
  ]) {
    const address = path.startsWith('/api/') ? path : backend + path;
    const options = { method, credentials: 'include', keepalive, ...(method === 'POST' ? { body: '{"events":[]}' } : {}) };
    await window.fetch(address, options);
    const call = calls.at(-1); const metadata = decoded(call);
    assert.equal(metadata.url, new URL(address, origin).href); assert.equal(metadata.method, method);
    assert.equal(metadata.source, 'fetch'); assert.equal(metadata.keepalive, keepalive);
    assert.ok(!seen.has(metadata.id)); seen.add(metadata.id);
    assert.equal(call.options, options, 'Leave delivery and credentials must not be rewritten');
  }
});

test('sendBeacon and its fetch fallback never receive production URLs', async () => {
  for (const available of [true, false]) {
    const { navigator, calls } = harness(available);
    assert.equal(navigator.sendBeacon(`${backend}/v1/analytics/events`, '{"events":[]}'), true);
    const metadata = decoded(calls[0]);
    assert.equal(metadata.source, 'sendBeacon'); assert.equal(metadata.keepalive, true); assert.equal(metadata.method, 'POST');
    if (!available) assert.equal(calls[0].options.keepalive, true);
  }
});

test('unknown fetch/XHR writes are confined to loopback for the router to abort', async () => {
  const { window, Xhr, calls } = harness();
  await window.fetch('https://example.com/unexpected-write', { method: 'POST', keepalive: true });
  assert.equal(decoded(calls[0]).url, 'https://example.com/unexpected-write');
  const xhr = new Xhr(); xhr.open('POST', `${backend}/v1/unexpected-write`, true);
  assert.equal(decoded(calls[1]).source, 'XMLHttpRequest'); assert.equal(calls[1].method, 'POST');
});

test('Request-object fetch keeps its body, method, credentials and keepalive on loopback', async () => {
  const { window, calls } = harness();
  const request = new Request(`${backend}/v1/analytics/events`, { method: 'POST', credentials: 'include', keepalive: true, body: '{"events":[]}' });
  await window.fetch(request);
  const metadata = decoded(calls[0]);
  assert.equal(metadata.keepalive, true); assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[0].options.credentials, 'include');
  assert.equal(Buffer.from(calls[0].options.body).toString(), '{"events":[]}');
});
