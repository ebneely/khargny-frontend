function loopbackGuard({ origin, mockPath }) {
  const originalFetch = window.fetch.bind(window);
  const originalBeacon = navigator.sendBeacon?.bind(navigator);
  let sequence = 0;
  const documentId = Math.random().toString(36).slice(2);
  const target = (address, method, source, keepalive) => {
    const url = new URL(address, location.href);
    const path = url.pathname.replace(/^\/api(?=\/v1\/)/, '');
    const sensitive = path.startsWith('/v1/likes/') || /^\/v1\/places\/[^/]+\/like$/.test(path) || ['/v1/analytics/events', '/v1/ads/events', '/v1/guest/handover', '/v1/guest/adopt', '/v1/saved-places'].includes(path) || (path === '/v1/search/places' && url.searchParams.get('settled') === '1');
    if (method === 'GET' && !sensitive) return null;
    const local = new URL(mockPath, origin);
    local.searchParams.set('guard', JSON.stringify({ id: `${documentId}:${++sequence}`, url: url.href, method, source, keepalive }));
    return local.href;
  };
  window.fetch = (input, init = {}) => {
    const supplied = input instanceof Request ? input : null;
    const method = String(init.method ?? supplied?.method ?? 'GET').toUpperCase();
    const keepalive = init.keepalive ?? supplied?.keepalive ?? false;
    const local = target(supplied?.url ?? String(input), method, 'fetch', keepalive);
    if (!local) return originalFetch(input, init);
    if (!supplied) return originalFetch(local, init);
    const request = new Request(supplied, init);
    const options = { method, headers: request.headers, credentials: request.credentials, cache: request.cache, redirect: request.redirect, mode: request.mode, signal: request.signal, keepalive };
    return (request.body ? request.arrayBuffer() : Promise.resolve(undefined)).then(body => originalFetch(local, { ...options, body }));
  };
  navigator.sendBeacon = (address, data) => {
    const local = target(address, 'POST', 'sendBeacon', true);
    if (originalBeacon) return originalBeacon(local, data);
    void originalFetch(local, { method: 'POST', body: data, keepalive: true, credentials: 'include' }).catch(() => {});
    return true;
  };
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, address, ...args) {
    const local = target(address, String(method).toUpperCase(), 'XMLHttpRequest', false);
    return originalOpen.call(this, method, local ?? address, ...args);
  };
}

module.exports = { loopbackGuard };
