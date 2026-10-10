const assert = require("node:assert/strict");
const { test } = require("node:test");
const { load } = require("./offline-loader.cjs");
const drain = async () => {
  for (let turn = 0; turn < 20; turn++) await Promise.resolve();
};
const makeStore = (request) =>
  load("src/lib/saves.ts", { "@/lib/api/client": {} }).createSaveStore(request);

test("save and unsave update the shared count immediately and never count an existing save twice", async () => {
  const calls = [];
  const store = makeStore(async (method, path) => {
    calls.push([method, path]);
    return method === "GET" ? [] : { placeId: "place" };
  });
  store.seed("place", 2);
  await store.start();
  store.set("place", true);
  assert.equal(store.saved("place"), true);
  assert.equal(store.count("place"), 3);
  await drain();
  assert.equal(store.count("place"), 3);
  store.seed("place", 2);
  assert.equal(store.count("place"), 3);
  store.set("place", false);
  assert.equal(store.count("place"), 2);
  await drain();
  assert.deepEqual(
    calls.map((call) => call[0]),
    ["GET", "POST", "DELETE"],
  );
  const existing = makeStore(async () => [
    { placeId: "place", place: { id: "place", saveCount: 2 } },
  ]);
  existing.seed("place", 2);
  await existing.start();
  assert.equal(existing.saved("place"), true);
  assert.equal(existing.count("place"), 2);
  existing.set("place", true);
  await drain();
  assert.equal(existing.count("place"), 2);
});

test("failure rolls back state and total together and exposes brief feedback", async () => {
  const store = makeStore(async (method) => {
    if (method === "GET") return [];
    throw { status: 503, retryAfter: 2 };
  });
  store.seed("place", 2);
  await store.start();
  store.set("place", true);
  assert.equal(store.count("place"), 3);
  await drain();
  assert.equal(store.saved("place"), false);
  assert.equal(store.count("place"), 2);
  assert.equal(store.feedback().kind, "busy");
  assert.equal(store.feedback().seconds, 2);
  store.dismiss();
  assert.equal(store.feedback(), null);
});

test("a refused initial preparation rolls back the first tap with the same localized feedback classification", async () => {
  const methods = [];
  const store = makeStore(async (method) => {
    methods.push(method);
    throw { status: 503, retryAfter: 2 };
  });
  store.seed("place", 2);
  store.set("place", true);
  assert.equal(store.count("place"), 3);
  await drain();
  assert.deepEqual(methods, ["GET"]);
  assert.equal(store.saved("place"), false);
  assert.equal(store.count("place"), 2);
  assert.equal(store.feedback().kind, "busy");
  assert.equal(store.feedback().seconds, 2);
});

test("latest intent during a request wins, serializes writes, and collapses intermediate taps", async () => {
  const writes = [];
  const answers = [];
  const store = makeStore(async (method) => {
    if (method === "GET") return [];
    writes.push(method);
    return new Promise((resolve, reject) => answers.push({ resolve, reject }));
  });
  store.seed("place", 2);
  await store.start();
  store.set("place", true);
  await drain();
  store.set("place", false);
  store.set("place", true);
  store.set("place", false);
  assert.equal(store.saved("place"), false);
  assert.equal(store.count("place"), 2);
  assert.deepEqual(writes, ["POST"]);
  answers.shift().resolve({ placeId: "place" });
  await drain();
  assert.deepEqual(writes, ["POST", "DELETE"]);
  answers.shift().resolve({ placeId: "place" });
  await drain();
  assert.equal(store.settled("place"), true);
  store.set("place", true);
  await drain();
  store.set("place", false);
  answers.shift().reject({ status: 429, retryAfter: 1 });
  await drain();
  assert.equal(store.saved("place"), false);
  assert.equal(store.count("place"), 2);
  assert.equal(writes.length, 3);
});

test("fresh data rebases once, stale reads and duplicate cards cannot wipe an optimistic delta", async () => {
  const store = makeStore(async (method) =>
    method === "GET" ? [] : { placeId: "place" },
  );
  store.seed("place", 2);
  await store.start();
  const stale = store.readTicket();
  store.set("place", true);
  await drain();
  store.observe("/v1/places", [{ id: "place", saveCount: 2 }], stale);
  assert.equal(store.count("place"), 3);
  store.observe(
    "/v1/places",
    [{ id: "place", saveCount: 3 }],
    store.readTicket(),
  );
  assert.equal(store.count("place"), 3);
  store.seed("place", 2);
  assert.equal(store.count("place"), 3);
  store.set("place", false);
  assert.equal(store.count("place"), 2);
  await drain();
  store.observe(
    "/v1/places",
    [{ id: "place", saveCount: 2 }],
    store.readTicket(),
  );
  assert.equal(store.count("place"), 2);
});

test("total is nonnegative and at least one while saved, including inconsistent cached totals", async () => {
  const store = makeStore(async (method) =>
    method === "GET" ? [{ placeId: "place" }] : { placeId: "place" },
  );
  store.seed("place", 0);
  await store.start();
  assert.equal(store.count("place"), 1);
  store.set("place", false);
  assert.equal(store.count("place"), 0);
  await drain();
  store.set("place", true);
  assert.equal(store.count("place"), 1);
  await drain();
  store.observe(
    "/v1/places",
    [{ id: "place", saveCount: -3 }],
    store.readTicket(),
  );
  assert.equal(store.count("place"), 1);
});

test("a tap before visitor preparation does not add a second save already in the plan", async () => {
  let release;
  const writes = [];
  const store = makeStore(async (method) => {
    if (method === "GET")
      return new Promise((resolve) => {
        release = resolve;
      });
    writes.push(method);
    return {};
  });
  let invalidations = 0;
  store.subscribeSettled(() => invalidations++);
  store.seed("place", 2);
  const reading = store.start();
  store.set("place", true);
  release([{ placeId: "place" }]);
  await reading;
  await drain();
  assert.equal(store.saved("place"), true);
  assert.equal(store.count("place"), 2);
  assert.deepEqual(writes, []);
  assert.equal(invalidations, 0);
});

test("two mounted card controls share synchronous state, rolling total and rollback, without pending disabling", async () => {
  const React = require("react");
  const { mount } = require("./render-harness.cjs");
  for (const locale of ["en", "ar"]) {
    const answers = [];
    const store = makeStore(async (method) =>
      method === "GET"
        ? []
        : new Promise((resolve, reject) => answers.push({ resolve, reject })),
    );
    await store.start();
    const dictionaries = load("src/i18n/dictionaries.ts").dictionaries[locale];
    const dependencies = {
      "@/lib/saves": { saveStore: store },
      "@tanstack/react-query": { useQuery: () => ({ data: [] }) },
      "@/components/ds/LikeButton": { LikeButton: () => null },
      "@/i18n/LocaleProvider": {
        useI18n: () => ({
          locale,
          t: (key, vars = {}) =>
            Object.entries(vars).reduce(
              (text, [name, value]) =>
                text.replaceAll("{" + name + "}", String(value)),
              key.split(".").reduce((value, part) => value[part], dictionaries),
            ),
        }),
      },
    };
    const { PlaceActions } = load(
      "src/components/ds/PlaceActions.tsx",
      dependencies,
    );
    const harness = await mount(() =>
      React.createElement(
        "div",
        null,
        ...[1, 2].map((key) =>
          React.createElement(PlaceActions, {
            key,
            placeId: "place",
            name: "Nile",
            metrics: { saves: 2 },
          }),
        ),
      ),
    );
    const buttons = () =>
      harness.nodes(
        (node) => node.attributes["data-save-button"] !== undefined,
      );
    const click = async (button) =>
      React.act(async () =>
        harness
          .props(button)
          .onClick({ preventDefault() {}, stopPropagation() {} }),
      );
    try {
      assert.equal(buttons().length, 2);
      await click(buttons()[0]);
      assert.ok(
        buttons().every(
          (button) =>
            button.textContent === "3" &&
            button.attributes["aria-pressed"] === "true",
        ),
      );
      assert.ok(buttons().every((button) => !button.attributes.disabled));
      await click(buttons()[1]);
      assert.ok(
        buttons().every(
          (button) =>
            button.textContent === "2" &&
            button.attributes["aria-pressed"] === "false",
        ),
      );
      await React.act(async () => {
        answers.shift().resolve({});
        await drain();
      });
      await React.act(async () => {
        answers.shift().reject({ status: 503 });
        await drain();
      });
      assert.ok(
        buttons().every(
          (button) =>
            button.textContent === "3" &&
            button.attributes["aria-pressed"] === "true",
        ),
      );
    } finally {
      await harness.close();
    }
  }
});

test("shared count motion respects reduced motion; save feedback keys exist in both languages", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const css = fs.readFileSync(
    path.join(__dirname, "../src/components/ds/RollingCount.module.css"),
    "utf8",
  );
  assert.match(css, /transform: translateY/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*animation: none/);
  const { dictionaries } = load("src/i18n/dictionaries.ts");
  for (const locale of ["en", "ar"])
    for (const key of ["saveRateLimit", "saveBusy", "saveUnavailable"])
      assert.equal(typeof dictionaries[locale].place[key], "string");
});

test("API transport keeps credentials and fresh public reads rebase the same singleton without an extra request", async () => {
  let total = 2;
  const requests = [];
  const dependencies = {
    window: {},
    "@/lib/api/transport": {
      fetchApi: async (path, options) => {
        requests.push({
          path,
          method: options.method,
          credentials: options.credentials,
        });
        let data;
        if (path === "/v1/places")
          data = { items: [{ id: "place", saveCount: total }] };
        else if (path === "/v1/saved-places")
          data =
            options.method === "GET" ? [] : [{ id: "save", placeId: "place" }];
        else
          assert.fail(`Unmocked transport request: ${options.method} ${path}`);
        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
        });
      },
    },
  };
  const api = load("src/lib/api/client.ts", dependencies);
  const { saveStore: store } = load("src/lib/saves.ts", dependencies);
  await api.apiRequest("GET", "/v1/places");
  await store.start();
  assert.equal(store.count("place"), 2);
  await store.set("place", true);
  assert.equal(store.count("place"), 3);
  total = 3;
  await api.apiRequest("GET", "/v1/places");
  assert.equal(store.count("place"), 3);
  assert.deepEqual(
    requests.map((request) => request.method),
    ["GET", "GET", "POST", "GET"],
  );
  assert.ok(requests.every((request) => request.credentials === "include"));
});
