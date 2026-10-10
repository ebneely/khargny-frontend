const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("./offline-loader.cjs");
const { mount } = require("./render-harness.cjs");

const place = {
  name: "Nile",
  category: "Cafe",
  area: "Aswan",
  path: "/en/explorer/aswan/nile/?utm_source=test#photos",
  locale: "ar",
  placeId: "11111111-1111-4111-8111-111111111111",
};
const expected = {
  title: "Nile",
  text: "Nile · Cafe · Aswan",
  url: "https://www.5argny.com/ar/explorer/aswan/nile/",
};
function sharing(browser) {
  const events = [];
  const { sharePlace } = load("src/lib/share-place.ts", {
    navigator: browser,
    "@/lib/analytics/track": {
      trackPlaceAction: (...event) => events.push(event),
    },
  });
  return { share: () => sharePlace(place), events };
}
function provider(locale) {
  const { dictionaries } = load("src/i18n/dictionaries.ts");
  return {
    useI18n: () => ({
      locale,
      t: (key, values = {}) =>
        Object.entries(values).reduce(
          (text, [name, value]) => text.replaceAll(`{${name}}`, value),
          key
            .split(".")
            .reduce((value, name) => value[name], dictionaries[locale]),
        ),
    }),
  };
}

test("native share receives localized canonical URL, title and category/area text; one accepted share event", async () => {
  const calls = [];
  const { share, events } = sharing({
    share: async (payload) => calls.push(payload),
    clipboard: {
      writeText: () => assert.fail("No clipboard when native share exists"),
    },
  });
  const result = share();
  assert.equal(
    calls.length,
    1,
    "Native share must start before yielding the activation",
  );
  assert.equal(await result, "shared");
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [expected]);
  assert.deepEqual(events, [["share", place.placeId]]);
});

test("cancelled native share is silent, never copied and sends no event", async () => {
  const { share, events } = sharing({
    share: async () => {
      throw { name: "AbortError" };
    },
    clipboard: { writeText: () => assert.fail("Do not copy on cancellation") },
  });
  assert.equal(await share(), "cancelled");
  assert.equal(events.length, 0);
});

test("missing native share copies the canonical link and records a successful share", async () => {
  const copied = [];
  const { share, events } = sharing({
    clipboard: { writeText: async (value) => copied.push(value) },
  });
  assert.equal(await share(), "copied");
  assert.deepEqual(copied, [expected.url]);
  assert.equal(events.length, 1);
});

test("refused or missing clipboard and refused native share are brief failures without analytics", async () => {
  for (const browser of [
    {
      clipboard: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    },
    {
      clipboard: {
        writeText: async () => {
          throw { name: "AbortError" };
        },
      },
    },
    {},
    {
      share: async () => {
        throw { name: "NotAllowedError" };
      },
    },
  ]) {
    const { share, events } = sharing(browser);
    assert.equal(await share(), "failed");
    assert.equal(events.length, 0);
  }
});

test("card badges line exists with and without badges, outside its links, with Share last in both languages", () => {
  for (const locale of ["ar", "en"])
    for (const badges of [false, true]) {
      const { PlaceCard } = load("src/components/ds/PlaceCard.tsx", {
        "@/i18n/LocaleProvider": provider(locale),
        "next/link": {
          default: (props) =>
            React.createElement("a", { href: props.href }, props.children),
        },
        "@/components/ds/PostPhoto": { PostPhoto: () => null },
        "@/components/ds/PlaceActions": { PlaceActions: () => null },
        "@/components/ds/PlaceBadges": {
          PlaceBadges: (props) =>
            props.variant === "compact" && badges
              ? React.createElement(
                  "span",
                  { "data-fixture-badge": true },
                  "Badge",
                )
              : null,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(PlaceCard, {
          title: place.name,
          category: place.category,
          area: place.area,
          href: "/explorer/aswan/nile",
          hasMenu: badges,
        }),
      );
      const line = html.match(
        /<div[^>]*data-place-badges-line[^>]*>[\s\S]*?<\/div>/,
      )?.[0];
      assert.ok(line);
      assert.ok(line.includes("data-share-button"));
      assert.equal(line.includes("data-fixture-badge"), badges);
      assert.ok(
        [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].every(
          ([anchor]) => !anchor.includes("<button"),
        ),
      );
      assert.ok(html.includes(locale === "en" ? "Share Nile" : "شارك Nile"));
    }
});

test("Share click never propagates and clipboard feedback uses a portal of the site toast, outside the clipped card", async () => {
  const calls = [];
  const harness = await mount((browser) => {
    browser.matchMedia = () => ({ matches: false });
    browser.document = global.document;
    const { ShareButton } = load("src/components/ds/ShareButton.tsx", {
      window: browser,
      navigator: {
        clipboard: { writeText: async (value) => calls.push(value) },
      },
      "@/i18n/LocaleProvider": provider("en"),
      "@/lib/analytics/track": { trackPlaceAction() {} },
    });
    return React.createElement(ShareButton, {
      name: "Nile",
      href: "/explorer/aswan/nile/",
      category: "Cafe",
      area: "Aswan",
    });
  });
  try {
    const button = harness.nodes(
      (node) => node.attributes["data-share-button"] !== undefined,
    )[0];
    let prevented = 0;
    let stopped = 0;
    await React.act(async () =>
      harness.props(button).onClick({
        preventDefault() {
          prevented++;
        },
        stopPropagation() {
          stopped++;
        },
      }),
    );
    assert.equal(prevented, 1);
    assert.equal(stopped, 1);
    assert.equal(calls.length, 1);
    assert.equal(
      harness.nodes(
        (node) => node.attributes.role === "status",
        harness.document.body,
      )[0].textContent,
      "Link copied",
    );
    assert.equal(
      harness.nodes((node) => node.attributes.role === "status").length,
      0,
    );
    assert.equal(
      harness.nodes((node) => node.attributes["data-share-motion"] === "press")
        .length,
      1,
    );
  } finally {
    await harness.close();
  }
});

test("mounted share cancellation stays silent; clipboard refusal gives localized feedback in both languages", async () => {
  for (const locale of ["en", "ar"])
    for (const cancelled of [true, false]) {
      const harness = await mount((browser) => {
        browser.document = global.document;
        const { ShareButton } = load("src/components/ds/ShareButton.tsx", {
          window: browser,
          navigator: cancelled
            ? {
                share: async () => {
                  throw { name: "AbortError" };
                },
              }
            : {
                clipboard: {
                  writeText: async () => {
                    throw { name: "NotAllowedError" };
                  },
                },
              },
          "@/i18n/LocaleProvider": provider(locale),
          "@/lib/analytics/track": {
            trackPlaceAction: () =>
              assert.fail("No event for failed or cancelled share"),
          },
        });
        return React.createElement(ShareButton, {
          name: "Nile",
          href: "/explorer/aswan/nile",
        });
      });
      try {
        const button = harness.nodes(
          (node) => node.attributes["data-share-button"] !== undefined,
        )[0];
        await React.act(async () =>
          harness
            .props(button)
            .onClick({ preventDefault() {}, stopPropagation() {} }),
        );
        const messages = harness.nodes(
          (node) => node.attributes.role === "status",
          harness.document.body,
        );
        assert.equal(messages.length, Number(!cancelled));
        if (!cancelled)
          assert.equal(
            messages[0].textContent,
            provider(locale).useI18n().t("common.shareFailed"),
          );
        assert.ok(!button.attributes.disabled);
        assert.equal(button.attributes["aria-busy"], undefined);
      } finally {
        await harness.close();
      }
    }
});

test("accepted share uses the existing batched web sender and credentialed transport", async () => {
  const calls = [];
  const dependencies = {
    navigator: { clipboard: { writeText: async () => {} } },
    window: {},
    "@/lib/api/transport": {
      fetchApi: async (path, options) => {
        calls.push([path, options]);
        return new Response("{}");
      },
    },
  };
  const { sharePlace } = load("src/lib/share-place.ts", dependencies);
  const { flushAnalytics } = load("src/lib/analytics/track.ts", dependencies);
  await sharePlace(place);
  flushAnalytics(true);
  await Promise.resolve();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/v1/analytics/events");
  const request = calls[0][1];
  assert.equal(request.method, "POST");
  assert.equal(request.credentials, "include");
  assert.equal(request.keepalive, true);
  const payload = JSON.parse(request.body);
  assert.equal(payload.platform, "web");
  assert.deepEqual(
    payload.events.map(({ type, placeId }) => ({ type, placeId })),
    [{ type: "share", placeId: place.placeId }],
  );
});

test("badge/Share geometry and compact centered arrows use logical edges and motion tokens", () => {
  const css = fs.readFileSync("src/components/ds/PostCard.module.css", "utf8");
  const shareCss = fs.readFileSync(
    "src/components/ds/ShareButton.module.css",
    "utf8",
  );
  assert.match(css, /\.badges\s*\{[^}]*display:\s*flex/);
  assert.match(css, /\.badgesContent\s*\{[^}]*min-inline-size:\s*0/);
  assert.match(shareCss, /margin-inline-end:\s*-12px/);
  assert.match(shareCss, /margin-block:\s*-9px/);
  assert.match(
    css,
    /\.chevrons button\s*\{[^}]*display:\s*grid[^}]*place-items:\s*center[^}]*padding:\s*0[^}]*line-height:\s*0/,
  );
  assert.match(css, /top:\s*calc\(50% - 16px\)/);
  assert.match(css, /width:\s*32px;\s*height:\s*32px/);
  assert.doesNotMatch(css, /\.chevrons button:disabled/);
  const { MOTION, motionProperties } = load("src/lib/motion.ts");
  assert.equal(MOTION.share, 120);
  assert.equal(motionProperties()["--motion-share"], "120ms");
  assert.match(shareCss, /prefers-reduced-motion:\s*reduce/);
});

test("rail Share belongs to the 48px outlined action family, independent of global style order", () => {
  const css = fs.readFileSync(
    "src/components/ds/ShareButton.module.css",
    "utf8",
  );
  assert.match(
    css,
    /\.button\.rail\s*\{[^}]*block-size:\s*48px[^}]*border:\s*1px solid var\(--border-default\)/,
  );
});

test("carousel renders only reachable 18px arrows at first, middle and last slides", async () => {
  const harness = await mount((browser) => {
    browser.matchMedia = () => ({ matches: false });
    const { PostPhoto } = load("src/components/ds/PostPhoto.tsx", {
      window: browser,
      "@/i18n/LocaleProvider": provider("en"),
      "@/components/ds/usePhotoLike": { usePhotoLike: () => ({ cancel() {} }) },
      "@/components/ds/PhotoImage": { PhotoImage: () => null },
      "lucide-react": {
        ChevronLeft: (props) =>
          React.createElement("svg", { width: props.size }),
        ChevronRight: (props) =>
          React.createElement("svg", { width: props.size }),
      },
    });
    return React.createElement(PostPhoto, {
      title: "Nile",
      gallery: {
        total: 3,
        images: [1, 2, 3].map((index) => ({ url: `photo-${index}` })),
      },
    });
  });
  const arrows = () =>
    harness.nodes((node) => node.attributes["data-post-arrow"] !== undefined);
  try {
    assert.deepEqual(
      arrows().map((node) => node.attributes["data-post-arrow"]),
      ["next"],
    );
    const viewport = harness.nodes(
      (node) => node.attributes["data-post-gallery"] !== undefined,
    )[0];
    await React.act(async () =>
      harness
        .props(viewport)
        .onScroll({ currentTarget: { scrollLeft: 100, clientWidth: 100 } }),
    );
    assert.deepEqual(
      arrows().map((node) => node.attributes["data-post-arrow"]),
      ["previous", "next"],
    );
    assert.ok(
      arrows().every((node) => node.childNodes[0].attributes.width === "18"),
    );
    await React.act(async () =>
      harness
        .props(viewport)
        .onScroll({ currentTarget: { scrollLeft: 200, clientWidth: 100 } }),
    );
    assert.deepEqual(
      arrows().map((node) => node.attributes["data-post-arrow"]),
      ["previous"],
    );
  } finally {
    await harness.close();
  }
});
