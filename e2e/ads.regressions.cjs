const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { QueryClient, QueryObserver, onlineManager, focusManager, keepPreviousData } = require("@tanstack/react-query");
const settle = () => new Promise((resolve) => setImmediate(resolve));
// HomeAds chooses the Top 10 city through the shared picker (a pill that opens a sheet), not a
// raw <select>. In a static render only the pill is on the page.
function homeAdsPickerStubs() {
  const React = require("react");
  return {
    "lucide-react": { MapPin: () => null },
    "@/components/explorer/SelectPill": { SelectPill: ({ label, allLabel, value, options }) => React.createElement("button", { type: "button", "data-city-picker": value ?? "", "aria-label": label }, value ? options.find((option) => option.value === value)?.label ?? value : allLabel) },
  };
}
const enter = (observer) => observer.callback([{ isIntersecting: true, intersectionRatio: 0.5 }]);

module.exports = ({ load, environment, campaignId, place, item, featured, top, city, discovery, assertBatch, validateBatch, validateTrackedBatch, backendAcceptsEventId, adEvent, realPlaceCard }) => {
  test("one module/page-load device id survives home mounts, without persistent storage", () => {
    const env = environment();
    let minted = 0;
    const mint = env.window.crypto.randomUUID;
    env.window.crypto.randomUUID = () => { minted += 1; return mint(); };
    for (let mount = 0; mount < 2; mount += 1) {
      const tracker = env.createAdTracker();
      tracker.track(campaignId, "featured", "impression", 7);
      tracker.flush();
      assertBatch(env.requests[mount], [adEvent("impression")]);
    }
    assert.equal(minted, 3);
    assert.equal(env.requests[0].body.deviceId, env.requests[1].body.deviceId);
    assert.notEqual(env.requests[0].body.events[0].eventId, env.requests[1].body.events[0].eventId);
  });

  test("tap before one second stays unqualified; a queued qualified impression/tap is one exact batch", () => {
    const env = environment();
    const tracker = env.createAdTracker();
    env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
    enter(env.observers[0]);
    env.advance(999);
    tracker.track(campaignId, "featured", "tap", 7);
    assert.equal(env.requests.length, 0);
    env.advance(1);
    tracker.track(campaignId, "featured", "tap", 7);
    assert.equal(env.requests.length, 1);
    assertBatch(env.requests[0], [adEvent("impression", "featured", 1000), adEvent("tap", "featured", 1000)]);
  });

  test("normal deliveries serialize slow impressions and only omit a dependency after confirmation", async () => {
    const env = environment({ manual: true });
    const tracker = env.createAdTracker();
    tracker.track(campaignId, "featured", "impression", 7);
    tracker.flush();
    tracker.track(campaignId, "featured", "tap", 7);
    assert.equal(env.requests.length, 1);
    assertBatch(env.requests[0], [adEvent("impression")]);
    env.completions[0](true);
    await settle();
    assert.equal(env.requests.length, 2);
    assertBatch(env.requests[1], [adEvent("tap")]);
    env.completions[1](true);
    await settle();
  });

  for (const lifecycle of ["pagehide", "visibilitychange", "unmount"]) {
    test(lifecycle + " immediately hands a waiting tap and impression to keepalive, despite an in-flight POST", async () => {
      const env = environment({ manual: true });
      const tracker = env.createAdTracker();
      const stop = tracker.listen();
      tracker.track(campaignId, "featured", "impression", 7);
      tracker.flush();
      tracker.track(campaignId, "featured", "tap", 7);
      if (lifecycle === "unmount") stop();
      else {
        if (lifecycle === "visibilitychange") env.document.visibilityState = "hidden";
        env.emit(lifecycle);
      }
      assert.equal(env.requests.length, 2);
      assertBatch(env.requests[1], [adEvent("impression"), adEvent("tap")]);
      for (const complete of env.completions) complete(true);
      await settle();
      stop();
    });
  }

  test("failed delivery retries the entire dependent batch once; privacy stops retry", async () => {
    for (const optedOut of [false, true]) {
      const env = environment({ manual: true });
      const tracker = env.createAdTracker();
      tracker.track(campaignId, "featured", "impression", 7);
      tracker.track(campaignId, "featured", "tap", 7);
      assertBatch(env.requests[0], [adEvent("impression"), adEvent("tap")]);
      if (optedOut) env.optOut();
      env.completions[0](false);
      await settle();
      assert.equal(env.requests.length, optedOut ? 1 : 2);
      if (!optedOut) {
        assertBatch(env.requests[1], [adEvent("impression"), adEvent("tap")]);
        env.completions[1](false);
        await settle();
        assert.equal(env.requests.length, 2);
      }
    }
  });

  test("effect cleanup/setup and hidden prerender activation require a fresh full second", () => {
    const env = environment();
    const tracker = env.createAdTracker();
    let cleanup = env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
    enter(env.observers.at(-1));
    env.advance(400);
    cleanup();
    cleanup = env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
    enter(env.observers.at(-1));
    env.advance(999);
    tracker.flush();
    assert.equal(env.requests.length, 0);
    env.advance(1);
    tracker.flush();
    assertBatch(env.requests[0], [adEvent("impression", "featured", 1400)]);
    cleanup();
    const hidden = environment();
    hidden.document.visibilityState = "hidden";
    hidden.document.prerendering = true;
    const hiddenTracker = hidden.createAdTracker();
    hidden.observeSponsoredImpression({}, campaignId, "featured", 7, hiddenTracker);
    enter(hidden.observers[0]);
    hidden.advance(5000);
    hidden.emit("pageshow");
    hiddenTracker.flush();
    assert.equal(hidden.requests.length, 0);
    hidden.document.visibilityState = "visible";
    hidden.document.prerendering = false;
    hidden.emit("visibilitychange");
    hidden.advance(999);
    hiddenTracker.flush();
    assert.equal(hidden.requests.length, 0);
    hidden.advance(1);
    hiddenTracker.flush();
    assertBatch(hidden.requests[0], [adEvent("impression", "featured", 6000)]);
  });

  test("campaign guard matches real IsUUID including versions/variants, dropping bad items without poisoning valid events", () => {
    const normalizers = load("src/lib/ads/placements.ts", { URL });
    const ids = [campaignId, campaignId.toUpperCase(), ...Array.from({ length: 8 }, (_, version) => campaignId.replace("-4111-", "-" + (version + 1) + "111-")), "00000000-0000-0000-0000-000000000000", "ffffffff-ffff-ffff-ffff-ffffffffffff", "11111111-1111-1111-1111-111111111111", campaignId.replace("-4111-", "-9111-"), "bad"];
    for (const identifier of ids) {
      const realAccepts = validateBatch({ platform: "web", deviceId: "page-load-id", events: [adEvent("impression", "featured", 0, identifier)] }).length === 0;
      assert.equal(normalizers.isAdCampaignId(identifier), realAccepts, identifier);
    }
    const badId = "11111111-1111-1111-1111-111111111111";
    const normalized = normalizers.normalizeFeaturedPlaces({ ...featured, items: [{ ...item, campaignId: badId }, item] });
    assert.equal(normalized.items.length, 1);
    assert.equal(normalized.items[0].campaignId, campaignId);
    const env = environment();
    const tracker = env.createAdTracker();
    tracker.track(badId, "featured", "impression", 7);
    tracker.track(campaignId, "featured", "impression", 7);
    tracker.flush();
    assertBatch(env.requests[0], [adEvent("impression")]);
  });

  test("exact impression assertions kill unsupported bucket and wrong-placement mutants", () => {
    const source = fs.readFileSync("src/lib/ads/tracking.ts", "utf8");
    const needle = 'const event: AdEvent = { eventId: uuid(), campaignId, type, placement, occurredAt: new Date().toISOString() };';
    assert.equal(source.split(needle).length - 1, 1);
    for (const replacement of [
      'const event: AdEvent = { eventId: uuid(), campaignId, type, placement, occurredAt: new Date().toISOString(), ...(type === "impression" ? { bucket } : {}) };',
      'const event: AdEvent = { eventId: uuid(), campaignId, type, placement: "top10", occurredAt: new Date().toISOString() };',
    ]) {
      const env = environment({ sourceOverride: source.replace(needle, replacement) });
      const tracker = env.createAdTracker();
      tracker.track(campaignId, "featured", "impression", 7);
      tracker.flush();
      assert.throws(() => assertBatch(env.requests[0], [adEvent("impression")]));
    }
  });

  function configs(read) {
    const options = [];
    const hooks = load("src/lib/api/hooks/use-home-ads.ts", { Date, AbortController, setTimeout, clearTimeout }, {
      "@tanstack/react-query": { useQuery: (option) => { options.push(option); return option; }, keepPreviousData },
      "@/lib/api/client": { apiRequest: read },
      "@/lib/ads/placements": load("src/lib/ads/placements.ts", { URL }),
    });
    return { hooks, options };
  }

  test("real QueryObserver expires rotations on mount, focus and city cache reuse", async () => {
    onlineManager.setOnline(true);
    let reads = 0;
    const nextAt = new Date(Date.now() + 60000).toISOString();
    const { hooks, options } = configs(async () => { reads += 1; return { ...featured, rotation: { bucket: 8, nextAt }, items: [{ ...item, position: 1 }] }; });
    hooks.useFeaturedPlaces();
    const config = { ...options[0], refetchInterval: false, gcTime: Infinity };
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    client.mount();
    const expired = { ...featured, rotation: { bucket: 7, nextAt: new Date(Date.now() - 1000).toISOString() } };
    client.setQueryData(config.queryKey, expired, { updatedAt: Date.now() - 2000 });
    assert.equal(options[0].refetchInterval({ state: { data: expired, dataUpdatedAt: Date.now() - 2000 } }), 1);
    const observer = new QueryObserver(client, config);
    const stop = observer.subscribe(() => {});
    try {
      assert.equal(reads, 1);
      await settle();
      assert.equal(observer.getCurrentResult().data.rotation.bucket, 8);
      focusManager.setFocused(false);
      client.setQueryData(config.queryKey, expired, { updatedAt: Date.now() - 2000 });
      focusManager.setFocused(true);
      await settle();
      assert.equal(reads, 2);
      hooks.useTopPlaces("cairo");
      const cityConfig = { ...options.at(-1), refetchInterval: false, gcTime: Infinity };
      client.setQueryData(cityConfig.queryKey, { ...top, city: "cairo", rotation: expired.rotation }, { updatedAt: Date.now() - 2000 });
      observer.setOptions(cityConfig);
      await settle();
      assert.equal(reads, 3);
      assert.equal(observer.getCurrentResult().data.city, "cairo");
      const updatedAt = Date.now() - 2000;
      assert.equal(cityConfig.staleTime({ state: { data: expired, dataUpdatedAt: updatedAt } }), Math.max(0, Date.parse(expired.rotation.nextAt) - updatedAt));
    } finally { stop(); observer.destroy(); client.unmount(); client.clear(); focusManager.setFocused(undefined); }
  });

  test("real paused offline QueryObserver never invokes the timeout queryFn; pending HomeAds reserves nothing", async () => {
    let reads = 0;
    const { hooks, options } = configs(async () => { reads += 1; return null; });
    hooks.useFeaturedPlaces();
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    onlineManager.setOnline(false);
    const observer = new QueryObserver(client, { ...options[0], refetchInterval: false, gcTime: Infinity });
    const stop = observer.subscribe(() => {});
    try {
      await settle();
      assert.equal(observer.getCurrentResult().fetchStatus, "paused");
      assert.equal(observer.getCurrentResult().isPending, true);
      assert.equal(reads, 0);
      const { HomeAds, render } = markup();
      assert.equal(render(HomeAds, { ...discovery({ cities: [city] }), featuredLoading: true, topPlacesInitialLoading: true }), "");
    } finally { stop(); observer.destroy(); client.clear(); onlineManager.setOnline(true); }
  });

  function markup() {
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { dictionaries } = load("src/i18n/dictionaries.ts");
    const t = (key) => key.split(".").reduce((value, part) => value?.[part], dictionaries.en) ?? key;
    const { HomeAds } = load("src/app/_home/HomeAds.tsx", {}, {
      ...homeAdsPickerStubs(),
      react: React, "react/jsx-runtime": require("react/jsx-runtime"),
      "next/link": { default: (props) => React.createElement("a", props) },
      "next/image": { default: () => null },
      "@/components/ds/PlaceCard": { PlaceCard: () => null },
      "@/lib/place-photo": load("src/lib/place-photo.ts", { URL }),
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale: "en", t }) },
      "@/lib/ads/tracking": { createAdTracker: () => ({ listen: () => () => {} }), observeSponsoredImpression: () => () => {} },
    });
    return { HomeAds, render: (Component, data) => renderToStaticMarkup(React.createElement(Component, { d: data })) };
  }

  test("a failed or empty chosen city retains the recovery selector, labelled fallback and no empty heading", () => {
    const { HomeAds, render } = markup();
    const data = { ...discovery({ top, cities: [city] }), topCity: "alexandria", topPlacesCity: undefined };
    const fallback = render(HomeAds, data);
    assert.ok(fallback.includes('data-city-picker="alexandria"') || fallback.includes('data-city-picker="cairo"'));
    assert.ok(fallback.includes("Showing:") && fallback.includes("All Egypt"));
    const unavailable = render(HomeAds, { ...data, topPlaces: null });
    assert.ok(unavailable.includes("data-city-picker") && !unavailable.includes("<select"));
    assert.ok(!unavailable.includes("<h2"));
    assert.ok(!unavailable.includes('id="home-top10-list"'));
    const lastGood = render(HomeAds, { ...data, topPlacesCity: "cairo" });
    assert.ok(lastGood.includes("Showing:") && lastGood.includes("Cairo"));
  });

  test("the real discovery hook labels placeholder, All Egypt fallback and last good city across query transitions", async () => {
    const { hooks } = configs(async () => null);
    const makeOptions = (slug) => ({ ...hooks.useTopPlaces(slug), refetchInterval: false, gcTime: Infinity });
    const client = new QueryClient();
    const future = { bucket: 7, nextAt: new Date(Date.now() + 60000).toISOString() };
    const allOptions = makeOptions();
    const cityOptions = makeOptions("cairo");
    client.setQueryData(allOptions.queryKey, { ...top, city: undefined, rotation: future });
    client.setQueryData(cityOptions.queryKey, { ...top, city: "cairo", rotation: future });
    const allObserver = new QueryObserver(client, allOptions);
    const cityObserver = new QueryObserver(client, cityOptions);
    const stopAll = allObserver.subscribe(() => {});
    const stopCity = cityObserver.subscribe(() => {});
    const state = ["", false, null, "cairo", null];
    let cursor = 0;
    let effects = [];
    const { useHomeDiscovery } = load("src/app/_home/useHomeDiscovery.ts", {}, {
      react: {
        useState: () => { const index = cursor++; return [state[index], (value) => { state[index] = value; }]; },
        useMemo: (callback) => callback(), useCallback: (callback) => callback,
        useEffect: (callback) => effects.push(callback),
      },
      "next/navigation": { useRouter: () => ({ push() {} }) },
      "@/lib/api/hooks/use-categories": { useCategories: () => ({ data: [] }) },
      "@/lib/api/hooks/use-cities": { useCities: () => ({ data: [city] }) },
      "@/lib/api/hooks/use-home": { useHomeSections: () => ({ data: [] }) },
      "@/lib/api/hooks/use-home-ads": {
        useFeaturedPlaces: () => ({ data: null }),
        useTopPlaces: (slug) => {
          if (!slug) return allObserver.getCurrentResult();
          cityObserver.setOptions(makeOptions(slug));
          return cityObserver.getCurrentResult();
        },
      },
      "@/lib/api/hooks/use-saved-places": { useSavePlace: () => ({ mutate() {} }) },
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale: "en", t: (key) => key }) },
      "@/lib/egypt-regions": { regionLabel: (value) => value },
    });
    const render = () => { cursor = 0; effects = []; const data = useHomeDiscovery(); effects.forEach((effect) => effect()); return data; };
    try {
      let data = render();
      assert.equal(data.topPlacesCity, "cairo");
      data.setTopCity("alexandria");
      data = render();
      assert.equal(data.topPlacesCity, "cairo");
      assert.equal(cityObserver.getCurrentResult().isPlaceholderData, true);
      await settle();
      data = render();
      assert.equal(cityObserver.getCurrentResult().data, null);
      assert.equal(data.topCity, "alexandria");
      assert.equal(data.topPlacesCity, undefined);
      assert.equal(data.topPlaces.items.length, 1);
      client.setQueryData(allOptions.queryKey, null);
      data = render();
      assert.equal(data.topCity, "alexandria");
      assert.equal(data.topPlacesCity, "cairo");
      assert.equal(data.topPlaces.items.length, 1);
      data.setTopCity(undefined);
      assert.equal(render().topCity, undefined);
    } finally { stopAll(); stopCity(); allObserver.destroy(); cityObserver.destroy(); client.clear(); }
  });

  test("TrackedCard observes the whole shared card and gates only its link, never its save heart", () => {
    const env = environment();
    const React = require("react");
    const effects = [];
    const react = {
      useState: (value) => [typeof value === "function" ? value() : value, () => {}],
      useMemo: (callback) => callback(),
      useRef: (value) => ({ current: value === null ? {} : value }),
      useEffect: (callback) => effects.push(callback),
    };
    const { HomeAds } = load("src/app/_home/HomeAds.tsx", {}, {
      ...homeAdsPickerStubs(),
      react, "react/jsx-runtime": require("react/jsx-runtime"),
      "next/link": { default: (props) => React.createElement("a", props) },
      "next/image": { default: () => null },
      "@/components/ds/PlaceCard": { PlaceCard: () => null },
      "@/lib/place-photo": load("src/lib/place-photo.ts", { URL }),
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale: "en", t: (key) => key }) },
      "@/lib/ads/tracking": env,
    });
    const findLink = (element) => {
      if (!element) return null;
      if (Array.isArray(element)) return element.map(findLink).find(Boolean);
      if (element.type?.name === "TrackedCard") return element;
      return findLink(element.props?.children);
    };
    const link = findLink(HomeAds({ d: discovery({ featured, cities: [city] }) }));
    const wrapper = link.type(link.props);
    const card = wrapper.props.children;
    const cleanups = effects.map((effect) => effect());
    link.props.tracker.track(campaignId, "featured", "impression", 7);
    assert.equal(env.observers[0].element, wrapper.props.ref.current);
    assert.equal(wrapper.props.onClick, undefined);
    assert.equal(card.props.href, "/explorer/cairo/test-place");
    card.props.onToggleFavorite(true);
    card.props.onTitleClick();
    link.props.tracker.flush();
    assertBatch(env.requests[0], [adEvent("impression")]);
    enter(env.observers[0]);
    env.advance(1000);
    card.props.onTitleClick();
    assertBatch(env.requests[1], [adEvent("tap", "featured", 1000)]);
    const cleanup = cleanups.at(-1);
    cleanup();
    const replayCleanup = effects.at(-1)();
    card.props.onTitleClick();
    assert.equal(env.requests.length, 2);
    replayCleanup();
    cleanups[0]();
  });

  test("many campaigns stay within the DTO limit and every tap retains its impression dependency", () => {
    const env = environment();
    const tracker = env.createAdTracker();
    const expected = [];
    for (let index = 1; index <= 55; index += 1) {
      const identifier = "aaaaaaaa-aaaa-4aaa-8aaa-" + String(index).padStart(12, "0");
      tracker.track(identifier, "featured", "impression", 7);
      expected.push(adEvent("impression", "featured", 0, identifier));
    }
    tracker.track("aaaaaaaa-aaaa-4aaa-8aaa-000000000055", "featured", "tap", 7);
    for (const request of env.requests) {
      assert.ok(request.body.events.length <= 50);
      assert.deepEqual(validateTrackedBatch(request.body), []);
    }
    const last = env.requests.at(-1);
    assertBatch(last, [...expected.slice(50), adEvent("tap", "featured", 0, "aaaaaaaa-aaaa-4aaa-8aaa-000000000055")]);
    assert.deepEqual(env.requests.flatMap((request) => JSON.parse(JSON.stringify(request.body.events)).map(({ eventId, ...event }) => event)), [...expected, adEvent("tap", "featured", 0, "aaaaaaaa-aaaa-4aaa-8aaa-000000000055")]);
  });


  test("late ad data never removes storefront sections already published while pending", () => {
    let ads = null;
    const editorial = [{ key: "featured", kind: "featured", titleAr: "Featured", titleEn: "Editorial featured", places: [place] }];
    const state = [];
    let cursor = 0;
    let effects = [];
    const { useHomeDiscovery } = load("src/app/_home/useHomeDiscovery.ts", {}, {
      react: {
        useState: (value) => { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], (next) => { state[index] = next; }]; },
        useMemo: (callback) => callback(), useCallback: (callback) => callback,
        useEffect: (callback) => effects.push(callback),
      },
      "next/navigation": { useRouter: () => ({ push() {} }) },
      "@/lib/api/hooks/use-categories": { useCategories: () => ({ data: [] }) },
      "@/lib/api/hooks/use-cities": { useCities: () => ({ data: [city] }) },
      "@/lib/api/hooks/use-home": { useHomeSections: () => ({ data: editorial }) },
      "@/lib/api/hooks/use-home-ads": { useFeaturedPlaces: () => ({ data: ads }), useTopPlaces: () => ({ data: null }) },
      "@/lib/api/hooks/use-saved-places": { useSavePlace: () => ({ mutate() {} }) },
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale: "en", t: (key) => key }) },
      "@/lib/egypt-regions": { regionLabel: (value) => value },
    });
    const render = () => { cursor = 0; effects = []; const result = useHomeDiscovery(); effects.forEach((effect) => effect()); return result; };
    assert.equal(render().rails.length, 1);
    ads = featured;
    const late = render();
    assert.equal(late.featured.items.length, 1);
    assert.equal(late.rails[0].title, "Editorial featured");
    ads = null;
    assert.equal(render().rails[0].title, "Editorial featured");
  });

  test("late ads alone do not remove an already-published storefront empty state", () => {
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const effects = [];
    let published = false;
    const { HomeRails } = load("src/app/_home/Home.tsx", {}, {
      react: { useState: () => [published, (next) => { published = next; }], useEffect: (callback) => effects.push(callback) },
      "react/jsx-runtime": require("react/jsx-runtime"),
      "lucide-react": { Search: () => null, ArrowRight: () => null, MapPin: () => null },
      "@/components/ds/PlaceCard": { PlaceCard: () => null },
      "@/lib/place-photo": load("src/lib/place-photo.ts", { URL }),
      "@/components/ds/Toast": { Toast: () => null },
      "@/components/ds/SiteHeader": { SiteHeader: () => null },
      "@/components/ds/SiteFooter": { SiteFooter: () => null },
      "@/components/explorer/CityGrid": { CityGrid: () => null },
      "@/i18n/LocaleProvider": { useI18n: () => ({ t: (key) => key }) },
      "./HomeAds": { HomeAds: () => React.createElement("section", null, "Optional rails") },
    });
    const render = (data) => { effects.length = 0; const text = renderToStaticMarkup(HomeRails({ d: data })); effects.forEach((effect) => effect()); return text; };
    assert.ok(render(discovery({ cities: [city] })).includes("home.emptyTitle"));
    assert.ok(render(discovery({ featured, cities: [city] })).includes("home.emptyTitle"));
  });


  test("a confirmed impression is never fabricated again when a qualified tap occurs after 30 minutes", () => {
    const env = environment();
    const tracker = env.createAdTracker();
    tracker.track(campaignId, "featured", "impression", 7);
    tracker.flush();
    assertBatch(env.requests[0], [adEvent("impression")]);
    env.advance(31 * 60000);
    tracker.track(campaignId, "featured", "tap", 7);
    assertBatch(env.requests[1], [adEvent("tap", "featured", 31 * 60000)]);
  });

  test("lost acknowledgement and immediate retry followed by a tap at 31 minutes never replay the exposure", async () => {
    const env = environment({ manual: true });
    const tracker = env.createAdTracker();
    env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
    enter(env.observers[0]);
    env.advance(1000);
    tracker.flush();
    env.completions[0](false);
    await settle();
    env.completions[1](false);
    await settle();
    assert.equal(env.requests.length, 2);
    env.advance(31 * 60000);
    tracker.track(campaignId, "featured", "tap", 7);
    assert.equal(env.requests.length, 3);
    assert.deepEqual(Array.from(env.requests[2].body.events, (event) => event.type), ["tap"]);
    assertBatch(env.requests[2], [adEvent("tap", "featured", 31 * 60000 + 1000)]);
  });

  test("a five-minute retry reuses the impression eventId; a re-qualified bucket gets a fresh id", async () => {
    const env = environment({ manual: true });
    const tracker = env.createAdTracker();
    env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
    enter(env.observers[0]);
    env.advance(1000);
    tracker.flush();
    const original = env.requests[0].body.events[0];
    assert.match(original.eventId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    env.advance(5 * 60000);
    env.completions[0](false);
    await settle();
    assert.deepEqual(env.requests[1].body.events[0], original);
    env.completions[1](true);
    await settle();
    env.observeSponsoredImpression({}, campaignId, "featured", 8, tracker);
    enter(env.observers[1]);
    env.advance(1000);
    tracker.flush();
    assert.notEqual(env.requests[2].body.events[0].eventId, original.eventId);
  });

  test("five-minute dependent tap replay keeps the original eventId; every distinct tap gets its own", async () => {
    const env = environment({ manual: true });
    const tracker = env.createAdTracker();
    tracker.track(campaignId, "featured", "impression", 7);
    tracker.flush();
    const original = env.requests[0].body.events[0];
    env.completions[0](false);
    await settle();
    env.completions[1](false);
    await settle();
    env.advance(5 * 60000);
    tracker.track(campaignId, "featured", "tap", 7);
    assertBatch(env.requests[2], [adEvent("impression"), adEvent("tap", "featured", 5 * 60000)]);
    assert.deepEqual(env.requests[2].body.events[0], original);
    assert.notEqual(env.requests[2].body.events[1].eventId, original.eventId);
    tracker.track(campaignId, "featured", "tap", 7);
    tracker.flush(true);
    assert.notEqual(env.requests[3].body.events[1].eventId, env.requests[2].body.events[1].eventId);
  });

  for (const elapsed of [30 * 60000, 31 * 60000]) {
    test(`an acknowledgement arriving at ${elapsed / 60000} minutes cannot retry any expired event`, async () => {
      const env = environment({ manual: true });
      const tracker = env.createAdTracker();
      tracker.track(campaignId, "featured", "impression", 7);
      tracker.flush();
      env.advance(elapsed);
      env.completions[0](false);
      await settle();
      assert.equal(env.requests.length, 1);
      tracker.track(campaignId, "featured", "tap", 7);
      assertBatch(env.requests[1], [adEvent("tap", "featured", elapsed)]);
      env.completions[1](true);
      await settle();
    });
  }

  test("waiting work is bounded during a hung transport, expires by age and cannot resurrect old qualifications", async () => {
    const env = environment({ manual: true });
    const tracker = env.createAdTracker();
    const identifier = (index) => "aaaaaaaa-aaaa-4aaa-8aaa-" + String(index).padStart(12, "0");
    for (let index = 1; index <= 1200; index += 1) tracker.track(identifier(index), "featured", "impression", 7);
    assert.equal(env.requests.length, 1);
    env.completions[0](true);
    await settle();
    for (let index = 1; index < env.completions.length; index += 1) {
      env.completions[index](true);
      await settle();
    }
    tracker.flush();
    const delivered = env.requests.flatMap((request) => request.body.events);
    assert.equal(delivered.length, 510);
    assert.equal(new Set(delivered.map((event) => event.eventId)).size, delivered.length);
    tracker.track(identifier(1), "featured", "impression", 7);
    tracker.flush();
    assert.equal(env.requests.flatMap((request) => request.body.events).length, 510);

    const expired = environment({ manual: true });
    const late = expired.createAdTracker();
    for (let index = 1; index <= 100; index += 1) late.track(identifier(index), "featured", "impression", 7);
    expired.advance(30 * 60000);
    expired.completions[0](false);
    await settle();
    late.flush(true);
    assert.equal(expired.requests.length, 1);
    late.track(identifier(100), "featured", "tap", 7);
    assertBatch(expired.requests[1], [adEvent("tap", "featured", 30 * 60000, identifier(100))]);
  });

  test("UUID fallback works without randomUUID, including unavailable crypto", () => {
    for (const secure of [true, false]) {
      const env = environment();
      delete env.window.crypto.randomUUID;
      if (secure) {
        let seed = 0;
        env.window.crypto.getRandomValues = (bytes) => { seed += 1; bytes.fill(seed); return bytes; };
      } else delete env.window.crypto;
      const tracker = env.createAdTracker();
      tracker.track(campaignId, "featured", "impression", 7);
      tracker.track(campaignId, "featured", "tap", 7);
      const batch = env.requests[0].body;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.match(batch.deviceId, uuid);
      batch.events.forEach((event) => assert.match(event.eventId, uuid));
      assert.equal(new Set([batch.deviceId, ...batch.events.map((event) => event.eventId)]).size, 3);
      assert.deepEqual(validateTrackedBatch(batch), []);
    }
  });

  test("bots and visible prerender documents produce no events; activation needs a fresh second", () => {
    for (const userAgent of ["Googlebot", "bingbot", "HeadlessChrome", "facebookexternalhit/1.1 preview"]) {
      const env = environment();
      env.navigator.userAgent = userAgent;
      const tracker = env.createAdTracker();
      env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
      enter(env.observers[0]);
      env.advance(6000);
      tracker.track(campaignId, "featured", "impression", 7);
      tracker.flush();
      assert.equal(env.requests.length, 0, userAgent);
    }
    const env = environment();
    const tracker = env.createAdTracker();
    env.document.prerendering = true;
    env.observeSponsoredImpression({}, campaignId, "featured", 7, tracker);
    enter(env.observers[0]);
    env.advance(6000);
    tracker.flush();
    assert.equal(env.requests.length, 0);
    env.document.prerendering = false;
    env.emit("visibilitychange");
    env.advance(999);
    tracker.flush();
    assert.equal(env.requests.length, 0);
    env.advance(1);
    tracker.flush();
    assertBatch(env.requests[0], [adEvent("impression", "featured", 7000)]);
  });

  test("only one impression per placement/bucket; re-observation cannot re-bill it", () => {
    const env = environment();
    const tracker = env.createAdTracker();
    for (const placement of ["featured", "featured", "top10", "top10"]) {
      env.observeSponsoredImpression({}, campaignId, placement, 7, tracker);
      enter(env.observers.at(-1));
    }
    env.advance(1000);
    tracker.flush();
    assertBatch(env.requests[0], [adEvent("impression", "featured", 1000), adEvent("impression", "top10", 1000)]);
    tracker.track(campaignId, "featured", "impression", 7);
    tracker.flush();
    assert.equal(env.requests.length, 1);
  });

  test("real backend validation exposes the eventId deployment gate instead of assuming unknown fields are ignored", (context) => {
    const body = { platform: "web", deviceId: "page-load-id", events: [{ ...adEvent("impression"), eventId: "55555555-5555-4555-8555-555555555555" }] };
    assert.equal(backendAcceptsEventId, true, "Backend must add optional IsUUID eventId before this client ships");
    assert.deepEqual(validateBatch(body), []);
    assert.notDeepEqual(validateBatch({ ...body, events: [{ ...body.events[0], eventId: "bad" }] }), []);
    assert.notDeepEqual(validateBatch({ ...body, events: [{ ...body.events[0], bucket: 7 }] }), []);
    context.diagnostic("Real local DTO accepts optional eventId and rejects unknown fields; deploy this backend contract first.");
    assert.deepEqual(validateTrackedBatch(body), []);
    assert.deepEqual(validateBatch({ ...body, events: [adEvent("impression")] }), []);
    assert.notDeepEqual(validateTrackedBatch({ ...body, events: [{ ...body.events[0], placement: "wrong" }] }), []);
  });

  test("pagehide hands off every queued batch without waiting for the first slow request", () => {
    const env = environment({ manual: true });
    const tracker = env.createAdTracker();
    tracker.listen();
    for (let index = 1; index <= 55; index += 1) {
      const identifier = "aaaaaaaa-aaaa-4aaa-8aaa-" + String(index).padStart(12, "0");
      tracker.track(identifier, "featured", "impression", 7);
    }
    assert.equal(env.requests.length, 1);
    env.emit("pagehide");
    assert.equal(env.requests.flatMap((request) => request.body.events).length, 55);
    env.requests.forEach((request) => {
      assert.equal(request.keepalive, true);
      assert.deepEqual(validateTrackedBatch(request.body), []);
    });
  });

  test("a shared card click returns immediately during a hung impression and sends a keepalive dependency batch", () => {
    const env = environment({ manual: true });
    const react = {
      useState: (value) => [typeof value === "function" ? value() : value, () => {}],
      useMemo: (callback) => callback(), useRef: (value) => ({ current: value === null ? {} : value }),
      useEffect: (callback) => effects.push(callback),
    };
    const effects = [];
    const { HomeAds } = load("src/app/_home/HomeAds.tsx", {}, {
      ...homeAdsPickerStubs(),
      react, "react/jsx-runtime": require("react/jsx-runtime"),
      "@/components/ds/PlaceCard": { PlaceCard: () => null },
      "@/lib/place-photo": load("src/lib/place-photo.ts", { URL }),
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale: "en", t: (key) => key }) },
      "@/lib/ads/tracking": env,
    });
    const find = (element) => {
      if (!element) return null;
      if (Array.isArray(element)) return element.map(find).find(Boolean);
      if (element.type?.name === "TrackedCard") return element;
      return find(element.props?.children);
    };
    const component = find(HomeAds({ d: discovery({ featured, cities: [city] }) }));
    const wrapper = component.type(component.props);
    const card = wrapper.props.children;
    effects.forEach((effect) => effect());
    enter(env.observers[0]);
    env.advance(1000);
    component.props.tracker.flush();
    assert.equal(card.props.onTitleClick(), undefined);
    assert.equal(card.props.href, "/explorer/cairo/test-place");
    assertBatch(env.requests[1], [adEvent("impression", "featured", 1000), adEvent("tap", "featured", 1000)]);
    assert.equal(env.requests[0].body.events[0].eventId, env.requests[1].body.events[0].eventId);
    card.props.onToggleFavorite(true);
    wrapper.props.onAuxClick({ button: 1, target: { closest: () => null } });
    wrapper.props.onAuxClick({ button: 2, target: { closest: () => ({}) } });
    assert.equal(env.requests.length, 2);
    wrapper.props.onAuxClick({ button: 1, target: { closest: () => ({}) } });
    assert.equal(env.requests.length, 3);
    assert.equal(env.requests[2].body.events[1].type, "tap");
  });

  test("both sponsored rails render the real PlaceCard, statuses, verified price band, save sibling and filling PhotoImage", () => {
    const React = require("react");
    const { renderToStaticMarkup } = require("react-dom/server");
    const { dictionaries } = load("src/i18n/dictionaries.ts");
    const normalizers = load("src/lib/ads/placements.ts", { URL });
    const photos = load("src/lib/place-photo.ts", { URL });
    const priceBands = load("src/lib/price-bands.ts");
    const rawItem = { ...item, place: { ...place, hasMenu: true, priceVerified: true, visitedByUs: true, priceRange: 2, coverImage: "https://storage.5argny.com/places/sample_small.webp" } };
    const normalizedFeatured = normalizers.normalizeFeaturedPlaces({ ...featured, items: [rawItem] });
    const normalizedTop = normalizers.normalizeTopPlaces({ ...top, items: [{ ...rawItem, position: 3 }] });
    assert.equal(normalizedFeatured.items[0].place.priceVerified, true);
    for (const locale of ["ar", "en"]) {
      const t = (key) => key.split(".").reduce((value, part) => value?.[part], dictionaries[locale]) ?? key;
      const { HomeAds } = load("src/app/_home/HomeAds.tsx", {}, {
      ...homeAdsPickerStubs(),
        react: React, "react/jsx-runtime": require("react/jsx-runtime"),
        "@/components/ds/PlaceCard": realPlaceCard(React, locale, t),
        "@/lib/place-photo": photos,
        "@/i18n/LocaleProvider": { useI18n: () => ({ locale, t }) },
        "@/lib/ads/tracking": { createAdTracker: () => ({ listen: () => () => {} }), observeSponsoredImpression: () => () => {} },
      });
      const html = renderToStaticMarkup(React.createElement(HomeAds, { d: discovery({ featured: normalizedFeatured, top: normalizedTop, cities: [city], locale }) }));
      const anchors = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g);
      assert.equal(anchors.length, 2);
      for (const anchor of anchors) {
        for (const key of ["home.sponsored", "place.menu", "place.priceVerified", "place.visitedByUs"]) assert.ok(anchor.includes(t(key)), key);
        assert.ok(anchor.includes(priceBands.priceBandLabel(2, locale)));
        assert.ok(anchor.includes('data-photo-frame="card"') && anchor.includes('data-photo-fit="cover"'));
        assert.ok(anchor.includes(photos.CARD_RAIL_SIZES));
        assert.ok(!anchor.includes("_thumb.webp"));
        assert.ok(!anchor.includes("<button"));
      }
      // Two save hearts and the Top 10 city picker's pill.
      assert.equal((html.match(/<button\b/g) ?? []).length, 3);
      assert.equal((html.match(/class="khg-home-rail no-scrollbar"/g) ?? []).length, 2);
    }
    const missing = normalizers.normalizeFeaturedPlaces({ ...featured, items: [item] }).items[0].place;
    assert.deepEqual([missing.hasMenu, missing.priceVerified, missing.visitedByUs, missing.priceRange], [false, false, false, null]);
  });
};

if (require.main === module) require("./ads.unit.cjs");
