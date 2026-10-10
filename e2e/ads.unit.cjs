const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const path = require("node:path");
const { createRequire } = require("node:module");
// These tests check the website against the backend's own validation rules, so they need a
// backend checkout with its dependencies installed. KHARGNY_BACKEND_ROOT names it; otherwise
// the usual sibling folders are tried.
const backendRoot = [process.env.KHARGNY_BACKEND_ROOT, "../backend", "../ads-identity-backend", "../../ads-identity-backend", "../khargny-backend"]
  .filter(Boolean)
  .map((candidate) => path.resolve(candidate))
  .find((candidate) => fs.existsSync(path.join(candidate, "node_modules", "reflect-metadata")) && fs.existsSync(path.join(candidate, "src/ads/dto/ads.dto.ts")));
if (!backendRoot) throw new Error("No backend checkout with installed dependencies found; set KHARGNY_BACKEND_ROOT");
const backendRequire = createRequire(path.join(backendRoot, "package.json"));
backendRequire("reflect-metadata");
const validators = backendRequire("class-validator");
const transformer = backendRequire("class-transformer");
const dtoExports = {};
const dtoSource = fs.readFileSync(path.join(backendRoot, "src/ads/dto/ads.dto.ts"), "utf8");
const dtoJavascript = ts.transpileModule(dtoSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true } }).outputText;
vm.runInThisContext("(function(exports, require) { " + dtoJavascript + "\n })")(dtoExports, (name) => {
  const imports = {
    "class-validator": validators, "class-transformer": transformer,
    "@nestjs/swagger": { ApiProperty: () => () => {}, ApiPropertyOptional: () => () => {} },
    "../ads.logic": load(path.join(backendRoot, "src/ads/ads.logic.ts")),
  };
  assert.ok(Object.hasOwn(imports, name));
  return imports[name];
});
function validateBatch(body) {
  return validators.validateSync(transformer.plainToInstance(dtoExports.AdEventsBatchDto, JSON.parse(JSON.stringify(body))), { whitelist: true, forbidNonWhitelisted: true });
}
const backendAcceptsEventId = validateBatch({ platform: "web", deviceId: "page-load-id", events: [{ campaignId: "11111111-1111-4111-8111-111111111111", type: "impression", placement: "featured", eventId: "55555555-5555-4555-8555-555555555555" }] }).length === 0;
function assertBatch(request, events) {
  const body = JSON.parse(JSON.stringify(request.body));
  assert.equal(request.endpoint, "/v1/ads/events");
  assert.equal(request.keepalive, true);
  for (const event of body.events) {
    assert.deepEqual(Object.keys(event).sort(), ["campaignId", "eventId", "occurredAt", "placement", "type"]);
    assert.match(event.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  }
  assert.deepEqual({ ...body, events: body.events.map(({ eventId, ...event }) => event) }, { platform: "web", deviceId: "44444444-4444-4444-8444-444444444444", events });
  assert.deepEqual(validateBatch(body), []);
}
const at = (milliseconds = 0) => new Date(Date.parse("2026-10-06T12:00:00.000Z") + milliseconds).toISOString();
const adEvent = (type, placement = "featured", milliseconds = 0, identifier = campaignId) => ({ campaignId: identifier, type, placement, occurredAt: at(milliseconds) });

// HomeAds chooses the Top 10 city through the shared picker (a pill that opens a sheet), not a
// raw <select>. In a static render only the pill is on the page.
function homeAdsPickerStubs() {
  const React = require("react");
  return {
    "lucide-react": { MapPin: () => null },
    "@/components/explorer/SelectPill": { SelectPill: ({ label, allLabel, value, options }) => React.createElement("button", { type: "button", "data-city-picker": value ?? "", "aria-label": label }, value ? options.find((option) => option.value === value)?.label ?? value : allLabel) },
  };
}

function load(file, globals = {}, imports = {}, sourceOverride) {
  const source = sourceOverride ?? fs.readFileSync(file, "utf8");
  const javascript = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(javascript, { exports, require: (name) => {
    if (name === '@/lib/api/transport') return require('./offline-loader.cjs').load('src/lib/api/transport.ts', { ...globals, ...imports });
    assert.ok(Object.hasOwn(imports, name), `Unmocked import: ${name}`);
    return imports[name];
  }, ...globals });
  return exports;
}

const campaignId = "11111111-1111-4111-8111-111111111111";
const place = { id: "22222222-2222-4222-8222-222222222222", cityId: "33333333-3333-4333-8333-333333333333", slug: "test-place", name: "Test place" };
const rotation = { bucket: 7, nextAt: "2026-10-06T18:10:00.000Z" };
const item = { sponsored: true, campaignId, place };

test("normalization rejects malformed data and keeps sponsorship/position", () => {
  const { normalizeFeaturedPlaces, normalizeTopPlaces } = load("src/lib/ads/placements.ts", { URL });
  for (const invalid of [null, [], {}, { items: [] }, { items: [item] }]) assert.equal(normalizeFeaturedPlaces(invalid), null);
  const featured = normalizeFeaturedPlaces({ section: { titleAr: "Featured", titleEn: "Featured" }, rotation, items: [item] });
  assert.equal(featured.items[0].campaignId, campaignId);
  assert.equal(featured.rotation.bucket, 7);
  assert.equal(normalizeTopPlaces({ rotation, items: [{ ...item, position: 0 }] }), null);
  assert.equal(normalizeTopPlaces({ items: [{ ...item, campaignId: "bad", position: 1 }] }), null);
  const top = normalizeTopPlaces({ rotation, items: [{ ...item, position: 3, place: { ...place, coverImage: "https://unknown.invalid/image.jpg" } }] });
  assert.equal(top.items[0].position, 3);
  assert.equal(top.items[0].place.coverImage, undefined);
});

function environment({ manual = false, sourceOverride } = {}) {
  let now = Date.parse("2026-10-06T12:00:00.000Z");
  let timerId = 0;
  let allowed = true;
  let uuidSequence = 0;
  const timers = new Map();
  const listeners = new Map();
  const requests = [];
  const completions = [];
  const observers = [];
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const addListener = (name, callback) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(callback);
  };
  const removeListener = (name, callback) => listeners.get(name)?.delete(callback);
  const document = { visibilityState: "visible", addEventListener: addListener, removeEventListener: removeListener };
  const window = { crypto: { randomUUID: () => { uuidSequence += 1; return uuidSequence === 1 ? "44444444-4444-4444-8444-444444444444" : "55555555-5555-4555-8555-" + String(uuidSequence).padStart(12, "0"); } }, addEventListener: addListener, removeEventListener: removeListener };
  const navigator = { userAgent: "Mozilla/5.0" };
  const tracking = load("src/lib/ads/tracking.ts", {
    document, window, navigator, Date: ClockDate,
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, at: now + delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    IntersectionObserver: class {
      constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
      observe(element) { this.element = element; }
      disconnect() { this.disconnected = true; }
      takeRecords() { const entries = this.pending ?? []; this.pending = []; return entries; }
    },
  }, { "@/lib/analytics/track": {
    isTrackingAllowed: () => allowed,
    sendTrackingBatch: (endpoint, body, keepalive) => {
      requests.push({ endpoint, body, keepalive });
      if (manual) return new Promise((resolve) => completions.push(resolve));
      return { then: (callback) => { callback(true); return Promise.resolve(true); } };
    },
  }, "./placements": load("src/lib/ads/placements.ts", { URL }) }, sourceOverride);
  const advance = (duration) => {
    const end = now + duration;
    while (true) {
      const due = [...timers].filter(([, timer]) => timer.at <= end).sort((left, right) => left[1].at - right[1].at)[0];
      if (!due) break;
      now = due[1].at;
      timers.delete(due[0]);
      due[1].callback();
    }
    now = end;
  };
  return { window, navigator, timers, completions, ...tracking, document, listeners, requests, observers, advance, emit: (name) => listeners.get(name)?.forEach((callback) => callback()), optOut: () => { allowed = false; } };
}

test("event batches dedupe per placement/bucket and protect taps", () => {
  const env = environment();
  const tracker = env.createAdTracker();
  tracker.track(campaignId, "featured", "impression", 7);
  tracker.track(campaignId, "top10", "impression", 7);
  tracker.track(campaignId, "top10", "impression", 8);
  env.advance(5000);
  assert.equal(env.requests.length, 1);
  assertBatch(env.requests[0], [adEvent("impression"), adEvent("impression", "top10"), adEvent("impression", "top10")]);
  tracker.track(campaignId, "top10", "tap", 8);
  const request = env.requests.at(-1);
  assert.equal(request.endpoint, "/v1/ads/events");
  assert.equal(request.keepalive, true);
  assert.match(request.body.deviceId, /^[A-Za-z0-9_-]{8,64}$/);
  assert.deepEqual(Object.keys(request.body).sort(), ["deviceId", "events", "platform"]);
  assert.deepEqual(Object.keys(request.body.events[0]).sort(), ["campaignId", "eventId", "occurredAt", "placement", "type"]);
  assertBatch(request, [adEvent("tap", "top10", 5000)]);
  assert.ok(Number.isFinite(Date.parse(request.body.events[0].occurredAt)));
  tracker.track(campaignId, "top10", "tap", 8);
  assert.equal(env.requests.length, 3);
  const nextView = env.createAdTracker();
  nextView.track(campaignId, "featured", "impression", 7);
  nextView.flush();
  assert.equal(env.requests.length, 4);
});

test("half-visible continuous second, interrupted exposure, hidden tabs and cleanup", () => {
  const env = environment();
  const tracker = env.createAdTracker();
  const cleanup = env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
  const observer = env.observers[0];
  assert.equal(observer.options.threshold[1], 0.5);
  observer.callback([{ isIntersecting: true, intersectionRatio: 0.49 }]);
  env.advance(1100);
  tracker.flush();
  assert.equal(env.requests.length, 0);
  observer.callback([{ isIntersecting: true, intersectionRatio: 0.5 }]);
  env.advance(999);
  observer.callback([{ isIntersecting: false, intersectionRatio: 0 }]);
  env.advance(1);
  tracker.flush();
  assert.equal(env.requests.length, 0);
  observer.callback([{ isIntersecting: true, intersectionRatio: 0.75 }]);
  env.advance(500);
  env.document.visibilityState = "hidden";
  env.emit("visibilitychange");
  env.advance(1000);
  tracker.flush();
  assert.equal(env.requests.length, 0);
  env.document.visibilityState = "visible";
  env.emit("visibilitychange");
  env.advance(1000);
  tracker.flush();
  assert.equal(env.requests[0].body.events[0].type, "impression");
  cleanup();
  assert.equal(observer.disconnected, true);
});

test("queued observer crossings and cleanup cancel a pending impression", () => {
  const env = environment();
  const tracker = env.createAdTracker();
  const cleanup = env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
  const observer = env.observers[0];
  observer.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
  env.advance(900);
  observer.pending = [{ isIntersecting: false, intersectionRatio: 0.2 }];
  env.advance(100);
  tracker.flush();
  assert.equal(env.requests.length, 0);
  observer.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
  cleanup();
  env.advance(1000);
  tracker.flush();
  assert.equal(env.requests.length, 0);
});

test("a queued exit and reentry restarts the full visible second", () => {
  const env = environment();
  const tracker = env.createAdTracker();
  env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
  const observer = env.observers[0];
  observer.callback([{ isIntersecting: true, intersectionRatio: 1 }]);
  env.advance(900);
  observer.pending = [{ isIntersecting: false, intersectionRatio: 0 }, { isIntersecting: true, intersectionRatio: 1 }];
  env.advance(100);
  tracker.flush();
  assert.equal(env.requests.length, 0);
  env.advance(1000);
  tracker.flush();
  assert.equal(env.requests.length, 1);
});

test("privacy opt-out, invalid campaigns and lifecycle flush never break navigation", () => {
  const env = environment();
  const tracker = env.createAdTracker();
  const stop = tracker.listen();
  tracker.track("bad", "featured", "tap", 7);
  tracker.track(campaignId, "featured", "impression", null);
  tracker.flush();
  assert.equal(env.requests.length, 0);
  tracker.track(campaignId, "featured", "impression", 7);
  env.emit("pagehide");
  assert.equal(env.requests[0].keepalive, true);
  tracker.track(campaignId, "featured", "impression", 8);
  env.optOut();
  tracker.track(campaignId, "featured", "tap", 8);
  tracker.flush(true);
  assert.equal(env.requests.length, 1);
  stop();
  assert.equal(env.listeners.get("pagehide").size, 0);
});

test("query city placeholders, rotation intervals, failures and timeout", async () => {
  const queries = [];
  const calls = [];
  let mode = "success";
  const hooks = load("src/lib/api/hooks/use-home-ads.ts", { AbortController, Date, setTimeout: (callback) => setTimeout(callback, 5), clearTimeout }, {
    "@tanstack/react-query": { useQuery: (query) => { queries.push(query); return query; }, keepPreviousData: "previous" },
    "@/lib/api/client": { apiRequest: async (...args) => {
      calls.push(args);
      if (mode === "failure") throw new Error("offline");
      if (mode === "timeout") return new Promise((resolve, reject) => args[2].signal.addEventListener("abort", () => reject(new Error("timeout"))));
      return { section: { titleAr: "Featured" }, rotation, items: [{ ...item, position: 1 }] };
    } },
    "@/lib/ads/placements": load("src/lib/ads/placements.ts", { URL }),
  });
  hooks.useFeaturedPlaces();
  hooks.useTopPlaces("cairo");
  assert.equal(queries[1].placeholderData, "previous");
  assert.equal(queries[0].retry, false);
  await queries[1].queryFn({ signal: new AbortController().signal });
  assert.equal(calls[0][0], "GET");
  assert.equal(calls[0][1], "/v1/home/top-places");
  assert.equal(calls[0][2].params.city, "cairo");
  const nextAt = new Date(Date.now() + 2000).toISOString();
  const interval = queries[0].refetchInterval({ state: { data: { rotation: { nextAt } } } });
  assert.ok(interval > 1900 && interval <= 2000);
  assert.equal(queries[0].refetchInterval({ state: { data: null } }), 600000);
  assert.equal(queries[0].refetchInterval({ state: { data: { rotation: { nextAt: "2000-01-01" } }, dataUpdatedAt: 0 } }), 1);
  mode = "failure";
  assert.equal(await queries[0].queryFn({ signal: new AbortController().signal }), null);
  mode = "timeout";
  assert.equal(await queries[0].queryFn({ signal: new AbortController().signal }), null);
});

test("existing analytics keeps its envelope, credentials, privacy and batching", () => {
  const requests = [];
  const navigator = { doNotTrack: "0" };
  const tracker = load("src/lib/analytics/track.ts", {
    window: { addEventListener() {} }, document: { addEventListener() {} }, navigator,
    setTimeout: () => 1, clearTimeout() {},
    fetch: (url, options) => { requests.push({ url, options }); return Promise.resolve({ ok: true }); },
  }, { "@/lib/config": { getApiBaseUrl: () => "https://mock.invalid" } });
  tracker.trackPageView("/");
  tracker.trackPlaceView(place.id);
  tracker.flushAnalytics(true);
  assert.equal(requests[0].url, "https://mock.invalid/v1/analytics/events");
  assert.equal(requests[0].options.credentials, "include");
  assert.equal(requests[0].options.keepalive, true);
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.platform, "web");
  assert.deepEqual(body.events.map((event) => event.type), ["page_view", "place_view"]);
  navigator.doNotTrack = "1";
  tracker.trackPageView("/");
  assert.equal(tracker.isTrackingAllowed(), false);
  tracker.flushAnalytics();
  assert.equal(requests.length, 1);
  navigator.doNotTrack = "0";
  navigator.globalPrivacyControl = true;
  assert.equal(tracker.isTrackingAllowed(), false);
  tracker.trackPlaceAction("save", place.id);
  tracker.flushAnalytics();
  assert.equal(requests.length, 1);
});

test("shared sender silently drops both synchronous and asynchronous transport failures", async () => {
  const tracker = load("src/lib/analytics/track.ts", {
    fetch: () => { throw new Error("blocked"); },
  }, { "@/lib/config": { getApiBaseUrl: () => "https://mock.invalid" } });
  assert.doesNotThrow(() => tracker.sendTrackingBatch("/v1/ads/events", { deviceId: "mock-session", events: [] }, true));
  const asynchronous = load("src/lib/analytics/track.ts", {
    fetch: () => Promise.reject(new Error("offline")),
  }, { "@/lib/config": { getApiBaseUrl: () => "https://mock.invalid" } });
  assert.doesNotThrow(() => asynchronous.sendTrackingBatch("/v1/ads/events", {}, true));
  await Promise.resolve();
});

function discovery({ featured = null, top = null, sections = [], cities = [], locale = "en" } = {}) {
  const { dictionaries } = load("src/i18n/dictionaries.ts");
  const t = (key) => key.split(".").reduce((value, part) => value?.[part], dictionaries[locale]) ?? key;
  return load("src/app/_home/useHomeDiscovery.ts", {}, {
    react: { useState: (value) => [value, () => {}], useEffect: () => {}, useMemo: (callback) => callback(), useCallback: (callback) => callback },
    "next/navigation": { useRouter: () => ({ push() {} }) },
    "@/lib/api/hooks/use-categories": { useCategories: () => ({ data: [] }) },
    "@/lib/api/hooks/use-cities": { useCities: () => ({ data: cities, isPending: false }) },
    "@/lib/api/hooks/use-home": { useHomeSections: () => ({ data: sections }) },
    "@/lib/api/hooks/use-home-ads": { useFeaturedPlaces: () => ({ data: featured }), useTopPlaces: () => ({ data: top }) },
    "@/lib/api/hooks/use-saved-places": { useSavePlace: () => ({ mutate() {} }) },
    "@/i18n/LocaleProvider": { useI18n: () => ({ locale, t }) },
    "@/lib/egypt-regions": { regionLabel: (region) => region },
  }).useHomeDiscovery();
}

const city = { id: place.cityId, slug: "cairo", name: "القاهرة", nameEn: "Cairo", status: "active" };
const featured = { section: { titleAr: "أماكن مميزة", titleEn: "Featured places" }, rotation, items: [item] };
const top = { rotation, items: [{ ...item, position: 3 }] };
const sections = [
  { key: "featured", kind: "featured", titleAr: "قسم مميز", titleEn: "Editorial featured", places: [place] },
  { key: "custom", kind: "custom", titleAr: "اختيارات", titleEn: "Editorial custom", places: [place] },
];

test("home suppresses only a duplicate featured section and preserves the failure fallback", () => {
  const loaded = discovery({ featured, top, sections, cities: [city] });
  assert.deepEqual(Array.from(loaded.rails, (rail) => rail.title), ["Editorial custom"]);
  assert.equal(loaded.featured.items.length, 1);
  const fallback = discovery({ sections, cities: [city] });
  assert.deepEqual(Array.from(fallback.rails, (rail) => rail.title), ["Editorial featured", "Editorial custom"]);
  assert.equal(discovery({ featured, sections, cities: [{ ...city, status: "draft" }] }).featured, null);
  assert.equal(discovery({ featured, cities: [] }).featured, null);
  assert.equal(discovery().rails.length, 0);
});

test("home placement markup is bilingual, linked, numbered and accessible without empty headings", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const jsx = require("react/jsx-runtime");
  const { dictionaries } = load("src/i18n/dictionaries.ts");
  for (const locale of ["ar", "en"]) {
    const t = (key) => key.split(".").reduce((value, part) => value?.[part], dictionaries[locale]) ?? key;
    const { HomeAds } = load("src/app/_home/HomeAds.tsx", {}, {
      ...homeAdsPickerStubs(),
      react: React, "react/jsx-runtime": jsx,
      "@/lib/place-photo": load("src/lib/place-photo.ts", { URL }),
      "@/components/ds/PlaceCard": realPlaceCard(React, locale, t),
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale, t }) },
      "@/lib/ads/tracking": { createAdTracker: () => ({ listen: () => () => {} }), observeSponsoredImpression: () => () => {} },
    });
    const data = discovery({ featured, top, cities: [city], locale });
    const markup = renderToStaticMarkup(React.createElement(HomeAds, { d: data }));
    assert.ok(markup.includes(locale === "ar" ? "إعلان" : "Sponsored"));
    assert.ok(markup.includes(locale === "ar" ? "كل مصر" : "All Egypt"));
    assert.ok(markup.includes(locale === "ar" ? "أماكن مميزة" : "Featured places"));
    assert.ok(markup.includes(`href="/${locale}/explorer/cairo/test-place/"`));
    assert.ok(markup.includes("data-city-picker") && !markup.includes("<select"));
    // The owner: "just a tag like mobile with blue sponsored ... and hide position #".
    assert.ok(!markup.includes(locale === "ar" ? "المركز" : "Position"));
    assert.ok(!markup.includes(" ? "));
    assert.ok(markup.includes('data-badge-tone="sponsored"'));
    const empty = renderToStaticMarkup(React.createElement(HomeAds, { d: discovery({ cities: [city], locale }) }));
    assert.equal(empty, "");
    const skeleton = renderToStaticMarkup(React.createElement(HomeAds, { d: { ...data, featured: null, topPlaces: null, featuredLoading: true, topPlacesInitialLoading: true } }));
    assert.equal(skeleton, "");
    assert.ok(!skeleton.includes("<h2"));

    const { Home, HomeRails } = load("src/app/_home/Home.tsx", {}, {
      "./HomeHero": { HomeHero: () => null },
      react: React, "react/jsx-runtime": jsx,
      "lucide-react": { Search: () => null, ArrowRight: () => null, MapPin: () => null },
      "@/components/ds/PlaceCard": { PlaceCard: ({ title }) => React.createElement("div", null, title) },
      "@/lib/place-photo": load("src/lib/place-photo.ts", { URL }),
      "@/components/ds/Toast": { Toast: () => null },
      "@/components/ds/SiteHeader": { SiteHeader: () => React.createElement("header") },
      "@/components/ds/SiteFooter": { SiteFooter: () => React.createElement("footer") },
      "@/components/explorer/CityGrid": { CityGrid: () => React.createElement("div", null, "Regions") },
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale, t }) },
      "./HomeAds": { HomeAds },
    });
    const renderHome = (discoveryData) => renderToStaticMarkup(React.createElement(Home, { d: discoveryData, cityCounts: {}, secondary: React.createElement(HomeRails, { d: discoveryData }) }));
    const populated = renderHome(discovery({ featured, top, sections, cities: [city], locale }));
    assert.ok(populated.indexOf('id="khg-regions"') < populated.indexOf('data-ad-placement="featured"'));
    assert.ok(populated.indexOf('data-ad-placement="featured"') < populated.indexOf('data-ad-placement="top10"'));
    assert.ok(populated.indexOf('data-ad-placement="top10"') < populated.indexOf(locale === "ar" ? "اختيارات" : "Editorial custom"));
    assert.ok(!populated.includes(locale === "ar" ? "قسم مميز" : "Editorial featured"));
    const adsOnly = renderHome(data);
    assert.ok(!adsOnly.includes(t("home.emptyTitle")));
    const fallback = renderHome(discovery({ cities: [city], locale }));
    assert.ok(fallback.includes(t("home.emptyTitle")));
  }
});

function realPlaceCard(React, locale, t) {
  const icons = Object.fromEntries(["Bookmark", "Navigation", "Eye", "Star", "BadgeCheck", "Tag"].map((name) => [name, () => null]));
  const common = { react: React, "react/jsx-runtime": require("react/jsx-runtime"), "lucide-react": icons, "@/i18n/LocaleProvider": { useI18n: () => ({ locale, t }) } };
  const photos = load("src/lib/place-photo.ts", { URL });
  const priceBands = load("src/lib/price-bands.ts");
  const photo = load("src/components/ds/PhotoImage.tsx", {}, { ...common, "@/lib/place-photo": photos, "./PhotoImage.module.css": { default: {} } });
  const badges = load("src/components/ds/PlaceBadges.tsx", {}, { ...common, "@/lib/price-bands": priceBands, "./PlaceBadges.module.css": { default: {} } });
  return require('./offline-loader.cjs').load("src/components/ds/PlaceCard.tsx", {
    ...common, "./PhotoImage": photo, "./PlaceBadges": badges, "@/lib/price-bands": priceBands,
    "./LikeButton": { LikeButton: () => null },
    "@/lib/compact-count": load("src/lib/compact-count.ts"),
    "./IconButton": load("src/components/ds/IconButton.tsx", {}, common),
    "next/link": { default: ({ prefetch, ...props }) => { assert.equal(prefetch, false); return React.createElement("a", props); } },
    "@/lib/api/hooks/use-saved-places": { useSaveToggle: () => ({ saved: false, toggle() {} }) },
  });
}

if (typeof module !== "undefined") require(path.resolve("e2e/ads.regressions.cjs"))({ load, environment, campaignId, place, item, rotation, featured, top, city, discovery, assertBatch, validateBatch, validateTrackedBatch: validateBatch, backendAcceptsEventId, adEvent, realPlaceCard });
