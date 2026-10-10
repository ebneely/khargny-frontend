const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./offline-loader.cjs");
const fs = require("node:fs");

test("drop phases, landing roll and interruption obey the shared clock", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { createLikeGesture } = load("src/lib/like-interaction.ts");
  const { MOTION } = load("src/lib/motion.ts");
  let state;
  const gesture = createLikeGesture((value) => {
    state = value;
  });
  gesture.tap(true, false, "button", 7);
  assert.equal(state.phase, "lift");
  assert.equal(state.kind, "like");
  context.mock.timers.tick(MOTION.lift);
  assert.equal(state.phase, "drop");
  context.mock.timers.tick(MOTION.landingAt - MOTION.lift);
  assert.equal(state.phase, "fill");
  gesture.tap(false, false, "button", 6);
  assert.equal(state.kind, "drain");
  assert.equal(state.phase, "fill");
  context.mock.timers.tick(MOTION.drain);
  assert.equal(state.phase, "rest");
  context.mock.timers.tick(1000);
  assert.equal(state.kind, "none");
  gesture.tap(true, false, "button", 10);
  assert.equal(state.milestone, true);
  context.mock.timers.tick(MOTION.buttonTotal);
  assert.equal(state.phase, "rest");
  gesture.dispose();
});

test("photo waits for arrival, an already-liked arrival only squashes, a refusal drains, reduced motion travels nowhere", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { createLikeGesture } = load("src/lib/like-interaction.ts");
  let state;
  const gesture = createLikeGesture((value) => {
    state = value;
  });
  gesture.tap(true, false, "photo", 10);
  assert.equal(state.kind, "waiting");
  context.mock.timers.tick(600);
  assert.equal(state.kind, "waiting");
  gesture.arrive(false, false, 10);
  assert.equal(state.kind, "landing");
  gesture.rollback(false, false);
  assert.equal(state.kind, "drain");
  context.mock.timers.tick(1000);
  gesture.arrive(true, false, 25);
  assert.equal(state.kind, "squash");
  assert.equal(state.milestone, false);
  gesture.tap(true, true, "button", 100);
  assert.equal(state.kind, "none");
  assert.equal(state.phase, "rest");
  context.mock.timers.tick(1000);
  assert.equal(state.kind, "none");
  gesture.dispose();
});

test("live dip is visible, public, increasing, once per refresh and never interrupts own motion", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { createLikeGesture, shouldLiveTick, LIKE_MILESTONES } = load(
    "src/lib/like-interaction.ts",
  );
  assert.deepEqual(
    Array.from(LIKE_MILESTONES),
    [10, 25, 50, 100, 250, 500, 1000],
  );
  const valid = {
    before: 7,
    count: 8,
    visible: true,
    own: false,
    reduced: false,
  };
  assert.equal(shouldLiveTick(valid), true);
  for (const change of [
    { before: 8 },
    { count: 6 },
    { visible: false },
    { own: true },
    { reduced: true },
  ])
    assert.equal(shouldLiveTick({ ...valid, ...change }), false);
  let dips = 0;
  const gesture = createLikeGesture((state) => {
    if (state.kind === "live") dips++;
  });
  gesture.live(1, valid);
  gesture.live(1, valid);
  assert.equal(dips, 1);
  gesture.tap(true, false, "button", 10);
  gesture.live(2, valid);
  assert.equal(dips, 1);
  context.mock.timers.tick(1000);
  gesture.live(2, valid);
  assert.equal(dips, 1);
  gesture.live(3, valid);
  assert.equal(dips, 2);
  gesture.dispose();
});

test("timings have one CSS mirror and old Instagram effects and website haptics are absent", () => {
  const { MOTION, motionProperties } = load("src/lib/motion.ts");
  const properties = motionProperties();
  assert.equal(properties["--motion-fill"], MOTION.fill + "ms");
  assert.equal(properties["--motion-flight"], MOTION.flight + "ms");
  assert.ok(MOTION.buttonTotal < 600);
  const css = fs.readFileSync(
    "src/components/ds/DropMotion.module.css",
    "utf8",
  );
  assert.match(
    css,
    /calc\(var\(--motion-landing-at\) - var\(--motion-lift\)\)/,
  );
  assert.doesNotMatch(css, /\b\d+ms\b/);
  for (const file of [
    "src/components/ds/LikeButton.tsx",
    "src/components/ds/LikeButton.module.css",
    "src/lib/like-effects.ts",
  ]) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /celebrate|like-ring|like-particle|data-like-burst|vibrate\(/,
    );
  }
});

test("water rollback starts at the current clipped level, not an opacity fade or a full-heart jump", () => {
  const animations = [];
  const element = {
    style: { transform: "translateY(24px)" },
    animate(frames, options) {
      const animation = {
        frames,
        options,
        playState: "running",
        cancelled: false,
        cancel() {
          this.cancelled = true;
        },
      };
      animations.push(animation);
      return animation;
    },
  };
  const { animateWater } = load("src/lib/motion-water.ts", {
    window: { getComputedStyle: () => ({ transform: "matrix(1,0,0,1,0,12)" }) },
  });
  const filling = animateWater(element, 0, 320, 170);
  assert.equal(filling.frames[0].transform, "translateY(24px)");
  assert.equal(filling.options.delay, 170);
  const draining = animateWater(element, 24, 180, 0, filling);
  assert.equal(filling.cancelled, true);
  assert.equal(draining.frames[0].transform, "matrix(1,0,0,1,0,12)");
  assert.equal(draining.frames[1].transform, "translateY(24px)");
  animateWater(element, 0, 320, 0, draining, true);
  assert.equal(animations.length, 2);
  assert.equal(element.style.transform, "translateY(0px)");
  const heart = fs.readFileSync("src/components/ds/WaterHeart.tsx", "utf8");
  assert.match(heart, /clipPath/);
  assert.match(heart, /LIKE_HEART_PATH/);
  assert.match(heart, /translateX\(-24px\)/);
  assert.match(heart, /data-like-water/);
  assert.doesNotMatch(heart, /opacity:/);
});

function flightFixture() {
  const elements = [];
  const listeners = new Set();
  const events = [];
  let liked = false;
  let reduced = false;
  let writes = 0;
  class Node {
    constructor(name) {
      this.name = name;
      this.attributes = {};
      this.children = [];
      this.animations = [];
      this.isConnected = true;
      this.style = {
        setProperty(name, value) {
          this[name] = value;
        },
      };
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    append(...nodes) {
      for (const node of nodes) {
        node.parent = this;
        this.children.push(node);
      }
    }
    remove() {
      this.isConnected = false;
      if (this.parent)
        this.parent.children = this.parent.children.filter(
          (node) => node !== this,
        );
    }
    animate(frames, options) {
      const animation = {
        frames,
        options,
        cancelled: false,
        cancel() {
          this.cancelled = true;
        },
      };
      this.animations.push(animation);
      return animation;
    }
  }
  let left = 30;
  const icon = {
    getBoundingClientRect: () => ({ left, top: 350, width: 24, height: 24 }),
  };
  const button = {
    dataset: { likePlaceId: "place" },
    getBoundingClientRect: () => ({
      left,
      right: left + 60,
      top: 340,
      bottom: 384,
      width: 60,
      height: 44,
    }),
    querySelector: () => icon,
    contains: (node) => node === button,
    dispatchEvent: (event) => events.push(event.detail),
  };
  const doc = {
    body: new Node("body"),
    visibilityState: "visible",
    addEventListener() {},
    removeEventListener() {},
    createElementNS(_ns, name) {
      const node = new Node(name);
      elements.push(node);
      return node;
    },
    createElement(name) {
      const node = new Node(name);
      elements.push(node);
      return node;
    },
    querySelectorAll: () => [button],
    elementFromPoint: () => button,
  };
  const host = new Node("photo");
  host.ownerDocument = doc;
  host.getBoundingClientRect = () => ({ left: 0, top: 80, bottom: 320 });
  host.closest = () => ({ querySelector: () => button });
  const browser = {
    document: doc,
    innerWidth: 390,
    innerHeight: 844,
    matchMedia: () => ({ matches: reduced }),
    getComputedStyle: () => ({
      display: "block",
      visibility: "visible",
      direction: "ltr",
    }),
    CustomEvent: class {
      constructor(_name, options) {
        this.detail = options.detail;
      }
    },
  };
  const store = {
    liked: () => liked,
    enabled: () => true,
    blocked: () => false,
    set(_id, state, options) {
      assert.equal(options.immediate, true);
      assert.equal(options.source, "photo");
      liked = state;
      writes++;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const tools = load("src/lib/like-effects.ts", {
    window: browser,
    "@/lib/likes": { likeStore: store },
  });
  return {
    tools,
    host,
    doc,
    elements,
    events,
    writes: () => writes,
    move: (value) => {
      left = value;
    },
    reduce: () => {
      reduced = true;
    },
    refuse: () => {
      liked = false;
      listeners.forEach((listener) => listener());
    },
  };
}

test("photo drop uses one fixed heart, measures the moving button at flight start, lands once and cleans every node", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const fixture = flightFixture();
  const { MOTION } = load("src/lib/motion.ts");
  fixture.tools.dropPhotoLike(fixture.host, { x: 100, y: 180 }, "place");
  assert.equal(
    fixture.writes(),
    1,
    "Request starts at the double tap, not at arrival",
  );
  assert.equal(fixture.doc.body.children.length, 1);
  const heart = fixture.doc.body.children[0];
  assert.equal(heart.style.position, "fixed");
  assert.equal(heart.style.pointerEvents, "none");
  assert.equal(heart.attributes["data-like-flight"], "drop");
  context.mock.timers.tick(MOTION.photoDrop);
  assert.equal(heart.attributes["data-like-flight"], "rest");
  fixture.move(140);
  context.mock.timers.tick(MOTION.photoRest);
  assert.equal(heart.attributes["data-like-flight"], "travel");
  assert.ok(
    heart.animations
      .at(-1)
      .frames.at(-1)
      .transform.includes("translate(52px, 182px)"),
  );
  assert.equal(
    fixture.host.children[0].animations[0].options.duration,
    MOTION.ripple,
  );
  assert.equal(
    fixture.host.children[0].animations[0].cancelled,
    false,
    "Ground stays at the tap point throughout its own ripple",
  );
  context.mock.timers.tick(MOTION.flight);
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.events)), [
    { already: false, quiet: false },
  ]);
  assert.equal(fixture.doc.body.children.length, 0);
  assert.equal(fixture.host.children.length, 0);
  fixture.tools.dropPhotoLike(fixture.host, { x: 100, y: 180 }, "place");
  context.mock.timers.tick(MOTION.photoDrop + MOTION.photoRest);
  context.mock.timers.tick(MOTION.flight);
  assert.equal(fixture.writes(), 1);
  assert.equal(fixture.events.at(-1).already, true);
});

test("offscreen destination sinks, refusal cancels flight, and reduced motion creates no travelling element", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const { MOTION } = load("src/lib/motion.ts");
  const fixture = flightFixture();
  fixture.tools.dropPhotoLike(fixture.host, { x: 100, y: 180 }, "place");
  fixture.move(400);
  context.mock.timers.tick(MOTION.photoDrop + MOTION.photoRest);
  assert.equal(
    fixture.doc.body.children[0].attributes["data-like-flight"],
    "sink",
  );
  context.mock.timers.tick(MOTION.flight);
  assert.equal(fixture.events.at(-1).quiet, true);
  fixture.tools.dropPhotoLike(fixture.host, { x: 100, y: 180 }, "place");
  fixture.refuse();
  assert.equal(fixture.doc.body.children.length, 0);
  assert.equal(fixture.host.children.length, 0);
  fixture.reduce();
  fixture.tools.dropPhotoLike(fixture.host, { x: 100, y: 180 }, "place");
  assert.equal(fixture.doc.body.children.length, 0);
  assert.equal(fixture.host.children.length, 0);
  context.mock.timers.tick(2000);
  assert.equal(fixture.doc.body.children.length, 0);
});

test("visitor gestures send immediately; public refresh signals exclude pending writes and write answers", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const drain = async () => {
    for (let turn = 0; turn < 30; turn++) await Promise.resolve();
  };
  let count = 7;
  let release;
  const writes = [];
  const store = load("src/lib/likes.ts", {
    "@/lib/api/client": {},
  }).createLikeStore(async (method, path) => {
    if (path.endsWith("/mine")) return { data: [], meta: { has_more: false } };
    if (method === "GET") return { place: { liked: false, likeCount: count } };
    writes.push(method);
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  await store.start("place");
  count = 8;
  await store.refresh(["place"]);
  const signal = store.refreshSignal("place");
  assert.equal(signal.before, 7);
  assert.equal(signal.count, 8);
  const { setVisitorLike } = load("src/lib/like-effects.ts", {
    "@/lib/likes": { likeStore: store },
  });
  setVisitorLike("place", true);
  assert.deepEqual(writes, ["PUT"]);
  await store.refresh(["place"]);
  assert.equal(store.refreshSignal("place").sequence, signal.sequence);
  release({ liked: true, likeCount: 10 });
  await drain();
  assert.equal(store.refreshSignal("place").sequence, signal.sequence);
  assert.equal(store.count("place"), 10);
});

test("mounted Like exposes lift/drop/fill/rest; a refused request drains and live refresh never replays the visitor landing", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const React = require("react");
  const { mount } = require("./render-harness.cjs");
  const drain = async () => {
    for (let turn = 0; turn < 30; turn++) await Promise.resolve();
  };
  let reject;
  let count = 7;
  const animations = [];
  const store = load("src/lib/likes.ts", {
    "@/lib/api/client": {},
  }).createLikeStore(async (method, path) => {
    if (path.endsWith("/mine")) return { data: [], meta: { has_more: false } };
    if (method === "GET") return { place: { liked: false, likeCount: count } };
    return new Promise((_resolve, refuse) => {
      reject = refuse;
    });
  });
  await store.start("place");
  const harness = await mount((browser) => {
    browser.matchMedia = () => ({ matches: false });
    browser.document = global.document;
    browser.getComputedStyle = (element) => ({
      transform: element.style.transform,
    });
    const create = browser.document.createElementNS;
    browser.document.createElementNS = (namespace, tag) => {
      const node = create(namespace, tag);
      node.animate = (frames, options) => {
        const animation = {
          node,
          frames,
          options,
          playState: "running",
          cancel() {
            this.playState = "idle";
          },
        };
        animations.push(animation);
        return animation;
      };
      return node;
    };
    const { LikeButton } = load("src/components/ds/LikeButton.tsx", {
      window: browser,
      "@/lib/likes": { likeStore: store },
      "@/i18n/LocaleProvider": {
        useI18n: () => ({ locale: "en", t: (key) => key }),
      },
    });
    return React.createElement(LikeButton, { placeId: "place", name: "Nile" });
  });
  const { MOTION } = load("src/lib/motion.ts");
  const button = () =>
    harness.nodes(
      (node) => node.getAttribute?.("data-like-button") === "true",
    )[0];
  try {
    assert.equal(button().getAttribute("data-like-phase"), "rest");
    await React.act(async () =>
      harness
        .props(button())
        .onClick({ preventDefault() {}, stopPropagation() {} }),
    );
    assert.equal(button().getAttribute("data-like-phase"), "lift");
    assert.equal(button().getAttribute("aria-pressed"), "true");
    const fill = animations.find(
      (animation) => animation.node.getAttribute("data-like-water") !== null,
    );
    assert.equal(
      fill.frames[0].transform,
      "translateY(24px)",
      "A child layout effect must not snap the water full before the parent starts the gesture",
    );
    assert.equal(fill.frames[1].transform, "translateY(0px)");
    assert.equal(fill.options.delay, 170);
    await React.act(async () => context.mock.timers.tick(MOTION.lift));
    assert.equal(button().getAttribute("data-like-phase"), "drop");
    await React.act(async () =>
      context.mock.timers.tick(MOTION.landingAt - MOTION.lift),
    );
    assert.equal(button().getAttribute("data-like-phase"), "fill");
    await React.act(async () => {
      reject({ status: 503, retryAfter: 2 });
      await drain();
    });
    assert.equal(button().getAttribute("data-like-gesture"), "drain");
    assert.equal(button().getAttribute("aria-pressed"), "false");
    assert.equal(button().textContent, "7");
    await React.act(async () => context.mock.timers.tick(MOTION.drain));
    assert.equal(button().textContent, "7");
    assert.equal(button().getAttribute("data-like-phase"), "rest");
    count = 8;
    await React.act(async () => store.refresh(["place"]));
    assert.equal(button().getAttribute("data-like-gesture"), "live");
    assert.equal(
      harness.nodes((node) => node.getAttribute?.("class") === "ground").length,
      0,
    );
    await React.act(async () => context.mock.timers.tick(MOTION.live));
    assert.equal(button().getAttribute("data-like-gesture"), "none");
  } finally {
    await harness.close();
  }
});

test("public refresh off screen updates the number without rolling or replaying a tick on return", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const React = require("react");
  const { mount } = require("./render-harness.cjs");
  let count = 7;
  let visible = false;
  const store = load("src/lib/likes.ts", {
    "@/lib/api/client": {},
  }).createLikeStore(async (_method, path) => {
    if (path.endsWith("/mine")) return { data: [], meta: { has_more: false } };
    return { place: { liked: false, likeCount: count } };
  });
  await store.start("place");
  const harness = await mount((browser) => {
    const { LikeButton } = load("src/components/ds/LikeButton.tsx", {
      window: browser,
      "@/lib/likes": { likeStore: store },
      "@/lib/motion-client": {
        useReducedMotion: () => false,
        useMotionVisibility: () => visible,
      },
      "@/i18n/LocaleProvider": {
        useI18n: () => ({ locale: "en", t: (key) => key }),
      },
    });
    return React.createElement(LikeButton, { placeId: "place", name: "Nile" });
  });
  const button = () =>
    harness.nodes(
      (node) => node.getAttribute?.("data-like-button") === "true",
    )[0];
  try {
    count = 8;
    await React.act(async () => store.refresh(["place"]));
    assert.equal(button().getAttribute("data-like-gesture"), "none");
    assert.equal(button().textContent, "8");
    assert.equal(
      harness.nodes(
        (node) => node.textContent === "8" && node.style.animation === "none",
      ).length,
      1,
    );
    visible = true;
    await React.act(async () => store.dismiss());
    assert.equal(
      button().getAttribute("data-like-gesture"),
      "none",
      "Returning on screen does not replay a consumed refresh",
    );
    count = 9;
    await React.act(async () => store.refresh(["place"]));
    assert.equal(button().getAttribute("data-like-gesture"), "live");
    await React.act(async () => context.mock.timers.tick(140));
    await React.act(async () => store.dismiss());
    assert.equal(button().getAttribute("data-like-gesture"), "none");
  } finally {
    await harness.close();
  }
});

for (const scenario of ["tap", "early answer", "late answer", "photo", "refusal", "late refusal", "photo refusal", "unlike", "restart drain", "reduced"]) test(`Like number rolls once at the landing boundary: ${scenario}`, async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const React = require("react");
  const { mount } = require("./render-harness.cjs");
  const { MOTION } = load("src/lib/motion.ts");
  const pending = [];
  const store = load("src/lib/likes.ts", { "@/lib/api/client": {} }).createLikeStore(async (method, path) => {
    if (path.endsWith("/mine")) return { data: [], meta: { has_more: false } };
    if (method === "GET") return { place: { liked: false, likeCount: 7 } };
    return new Promise((resolve, reject) => pending.push({ method, resolve, reject }));
  });
  await store.start("place");
  let land;
  const harness = await mount(browser => {
    browser.document = global.document;
    browser.matchMedia = () => ({ matches: scenario === "reduced" });
    const create = browser.document.createElement;
    browser.document.createElement = (...args) => {
      const node = create(...args);
      if (args[0] === "button") node.addEventListener = (name, listener) => { if (name === "khg-like-land") land = listener; };
      return node;
    };
    const { LikeButton } = load("src/components/ds/LikeButton.tsx", {
      window: browser,
      "@/lib/likes": { likeStore: store },
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale: "en", t: key => key }) },
    });
    return React.createElement(LikeButton, { placeId: "place", name: "Nile" });
  });
  const button = () => harness.nodes(node => node.getAttribute?.("data-like-button") === "true")[0];
  const roll = () => harness.nodes(node => node.getAttribute?.("class") === "roll")[0];
  const tick = async duration => React.act(async () => context.mock.timers.tick(duration));
  const flush = async () => { for (let turn = 0; turn < 30; turn++) await Promise.resolve(); };
  const answer = async (index, liked, likeCount) => React.act(async () => { pending[index].resolve({ liked, likeCount }); await flush(); });
  try {
    const original = roll();
    await React.act(async () => { store.set("place", true, { source: scenario.startsWith("photo") ? "photo" : "button", immediate: true }); await flush(); });
    assert.equal(pending.length, 1, "PUT must start at the tap");
    assert.equal(button().getAttribute("aria-pressed"), "true");
    if (scenario === "reduced") {
      assert.equal(button().textContent, "7", "Reduced motion also waits for confirmation, not decoration");
      await answer(0, true, 8);
      assert.equal(button().textContent, "8");
      assert.equal(roll().style.animation, "none");
      return;
    }
    assert.equal(button().textContent, "7", "Keep the previous number while the heart travels");
    assert.equal(roll(), original, "Do not remount/roll the old number at the tap");
    if (scenario.includes("refusal")) {
      if (scenario === "late refusal") {
        await tick(MOTION.buttonTotal);
        assert.equal(button().textContent, "7", "An unanswered like must not move the number, even after landing");
      }
      await React.act(async () => { pending[0].reject({ status: 429, retryAfter: 1 }); await flush(); });
      await tick(MOTION.buttonTotal + MOTION.drain);
      assert.equal(button().textContent, "7");
      assert.equal(roll(), original, "Refusal before landing never rolls a number");
      assert.equal(roll().style.animation, undefined, "Leaving photo wait must not re-enable an animation on the old number");
      assert.equal(button().getAttribute("aria-pressed"), "false");
      return;
    }
    const total = scenario === "early answer" ? 12 : 8;
    if (scenario !== "late answer") await answer(0, true, total);
    await tick((scenario === "photo" ? MOTION.photoTotal : MOTION.landingAt) - 1);
    assert.equal(button().textContent, "7", "An early answer is held until landing too");
    assert.equal(roll(), original);
    await tick(1);
    if (scenario === "photo") await React.act(async () => land({ detail: { already: false, quiet: false } }));
    if (scenario === "late answer") {
      assert.equal(button().textContent, "7", "A late answer rolls once when confirmation arrives, never speculatively");
      assert.equal(roll(), original);
      await answer(0, true, total);
    }
    assert.equal(button().textContent, String(total));
    const landed = roll();
    assert.notEqual(landed, original);
    assert.equal(landed.parentNode.style["--count-roll-delay"], undefined, "The landing roll has no second CSS delay");
    await tick(MOTION.buttonTotal);
    assert.equal(roll(), landed, "Answer and rest never replay the same number");
    if (scenario === "photo") {
      await React.act(async () => land({ detail: { already: true, quiet: false } }));
      await tick(MOTION.land);
      assert.equal(roll(), landed, "An already-liked flight only squashes the button");
    }
    if (scenario === "unlike" || scenario === "restart drain") {
      await React.act(async () => { store.set("place", false, { immediate: true }); await flush(); });
      await answer(1, false, 7);
      assert.equal(button().textContent, "8");
      await tick(MOTION.drain - 1);
      assert.equal(roll(), landed, "Unlike holds the number through the drain");
      if (scenario === "restart drain") {
        await React.act(async () => { store.set("place", true, { immediate: true }); await flush(); });
        assert.equal(button().getAttribute("data-like-phase"), "lift");
        await answer(2, true, 8);
        await tick(MOTION.buttonTotal);
        assert.equal(button().textContent, "8");
        assert.equal(roll(), landed, "A cancelled drain does not flash the lower number");
      } else {
        await tick(1);
        assert.equal(button().textContent, "7");
        const drained = roll();
        assert.notEqual(drained, landed);
        assert.equal(drained.style["--count-roll-from"], "-100%", "The decrement rolls down, not up");
        await tick(MOTION.buttonTotal);
        assert.equal(roll(), drained);
      }
    }
  } finally { await harness.close(); }
});

for (const control of ["LikeButton", "PlaceActions", "ShareButton"]) test(`${control}: touch press clears on release, cancellation, leave and blur`, async () => {
  const React = require("react");
  const { mount } = require("./render-harness.cjs");
  const store = load("src/lib/likes.ts", { "@/lib/api/client": {} }).createLikeStore(async (method, path) => path.endsWith("/mine") ? { data: [], meta: { has_more: false } } : method === "GET" ? { place: { liked: false, likeCount: 7 } } : { liked: true, likeCount: 8 });
  await store.start("place");
  const harness = await mount(browser => {
    browser.document = global.document;
    browser.matchMedia = () => ({ matches: false });
    const component = load(`src/components/ds/${control}.tsx`, {
      window: browser,
      "@/lib/likes": { likeStore: store },
      "@/lib/api/hooks/use-saved-places": { useSaveToggle: () => ({ saved: false, count: 2, toggle() {} }) },
      "@/lib/share-place": { sharePlace: async () => "cancelled" },
      "@/i18n/LocaleProvider": { useI18n: () => ({ locale: "en", t: key => key }) },
    })[control];
    return React.createElement(component, { placeId: "place", name: "Nile", href: "/explorer/aswan/nile/" });
  });
  const attribute = control === "LikeButton" ? "data-like-button" : control === "PlaceActions" ? "data-save-button" : "data-share-button";
  try {
    const button = harness.nodes(node => node.getAttribute?.(attribute) === "true")[0];
    for (const release of ["onPointerUp", "onPointerCancel", "onPointerLeave", "onBlur"]) {
      await React.act(async () => harness.props(button).onPointerDown({ pointerType: "touch" }));
      assert.equal(button.getAttribute("data-pressed"), "true");
      await React.act(async () => harness.props(button)[release]({}));
      assert.equal(button.getAttribute("data-pressed"), null);
    }
    await React.act(async () => harness.props(button).onKeyDown({ key: " " }));
    assert.equal(button.getAttribute("data-pressed"), "true");
    await React.act(async () => harness.props(button).onKeyUp({ key: " " }));
    assert.equal(button.getAttribute("data-pressed"), null);
    await React.act(async () => harness.props(button).onKeyDown({ key: "Enter" }));
    await React.act(async () => harness.props(button).onClick({ preventDefault() {}, stopPropagation() {} }));
    assert.equal(button.getAttribute("data-pressed"), null, "Activation releases press feedback even when a disabled/native-sheet button never receives keyup");
  } finally { await harness.close(); }
});

test("Like, Save and Share hover backgrounds are gated to real hover/fine pointers", () => {
  for (const [file, selector] of [["LikeButton.module.css", ".button"], ["PostCard.module.css", ".save"], ["ShareButton.module.css", ".button"]]) {
    const css = fs.readFileSync(`src/components/ds/${file}`, "utf8");
    assert.match(css, new RegExp(`@media \\(hover: hover\\) and \\(pointer: fine\\)\\s*\\{\\s*${selector.replace(".", "\\.")}:hover`));
    assert.ok(css.includes(`${selector}[data-pressed='true']`));
    assert.ok(!css.includes(`${selector}:active`));
  }
});

test("mounted Save tucks only on intention, lifts on unsave and stays still under reduced motion", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const React = require("react");
  const { mount } = require("./render-harness.cjs");
  for (const reduced of [false, true]) {
    let update;
    const harness = await mount((browser) => {
      browser.matchMedia = () => ({ matches: reduced });
      const { SaveIcon } = load("src/components/ds/SaveIcon.tsx", {
        window: browser,
      });
      function Control() {
        const [state, setState] = React.useState({
          filled: false,
          sequence: 0,
        });
        update = setState;
        return React.createElement(SaveIcon, state);
      }
      return React.createElement(Control);
    });
    const icon = () => harness.nodes((node) => node.tagName === "SVG")[0];
    try {
      assert.equal(icon().getAttribute("data-save-phase"), "rest");
      await React.act(async () => update({ filled: true, sequence: 0 }));
      assert.equal(
        icon().getAttribute("data-save-phase"),
        "rest",
        "Preparation is not a tuck",
      );
      await React.act(async () => update({ filled: false, sequence: 1 }));
      assert.equal(
        icon().getAttribute("data-save-phase"),
        reduced ? "rest" : "unsave",
      );
      await React.act(async () => update({ filled: true, sequence: 2 }));
      assert.equal(
        icon().getAttribute("data-save-phase"),
        reduced ? "rest" : "save",
      );
      await React.act(async () => context.mock.timers.tick(220));
      assert.equal(icon().getAttribute("data-save-phase"), "rest");
      assert.ok(harness.nodes((node) => node.tagName === "CLIPPATH").length);
    } finally {
      await harness.close();
    }
  }
});
