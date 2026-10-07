const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const output = ts.transpileModule(fs.readFileSync('src/lib/place-photo.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const media = {};
vm.runInNewContext(output, { exports: media, URL });
const photo = { urls: { thumb: '/thumb.webp', small: '/small.webp', medium: '/medium.webp', large: '/large.webp', original: '/original.webp' }, width: 2000, height: 1500 };

function photoImageModule(react = require('react')) {
  const exported = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/ds/PhotoImage.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports: exported, require: (name) => {
    if (name === 'react') return react;
    if (name === '@/lib/place-photo') return media;
    if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => String(key) }) };
    return require(name);
  } });
  return exported;
}

test('framing includes the 30% boundary in both directions', () => {
  for (const [loss, expected] of [[0, 'cover'], [0.29, 'cover'], [0.30, 'cover'], [0.31, 'contain']]) {
    assert.equal(media.photoFit(1 - loss, 1), expected);
    assert.equal(media.photoFit(1 / (1 - loss), 1), expected);
  }
  assert.equal(media.photoFit(9 / 16, 16 / 9), 'contain');
  assert.equal(media.photoFit(9 / 16, 1), 'contain');
  assert.equal(media.photoFit(16 / 9, 1), 'contain');
  assert.equal(media.photoFit(null, 1), 'cover');
});

test('card frames permit 55% loss while hero and gallery retain the 30% threshold', () => {
  for (const frame of ['card', 'city']) assert.equal(media.PHOTO_CROP_LIMITS[frame], 0.55);
  for (const frame of ['hero', 'gallery', 'strip']) assert.equal(media.PHOTO_CROP_LIMITS[frame], 0.3);
  for (const ratio of [16 / 9, 3 / 2, 9 / 16]) assert.equal(media.photoFit(ratio, 1, media.PHOTO_CROP_LIMITS.card), 'cover');
  for (const ratio of [3 / 1, 9 / 21]) assert.equal(media.photoFit(ratio, 1, media.PHOTO_CROP_LIMITS.card), 'contain');
  for (const [loss, expected] of [[0.55, 'cover'], [0.56, 'contain']]) {
    assert.equal(media.photoFit(1 - loss, 1, 0.55), expected);
    assert.equal(media.photoFit(1 / (1 - loss), 1, 0.55), expected);
  }
  assert.equal(media.photoFit(0.7, 1, media.PHOTO_CROP_LIMITS.hero), 'cover');
  assert.equal(media.photoFit(0.69, 1, media.PHOTO_CROP_LIMITS.hero), 'contain');
});

test('only contain frames request a backdrop; unknown cards defer it until natural dimensions need it', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { PhotoImage } = photoImageModule();
  for (const ratio of [16 / 9, 3 / 2, 1]) {
    const markup = renderToStaticMarkup(React.createElement(PhotoImage, { photo: { ...photo, width: ratio * 900, height: 900 }, alt: 'A card', frame: 'card' }));
    assert.ok(markup.includes('data-photo-fit="cover"'));
    assert.ok(!markup.includes('src="/thumb.webp"'));
    assert.ok(markup.includes('object-position:50% 40%'));
  }
  const panorama = renderToStaticMarkup(React.createElement(PhotoImage, { photo: { ...photo, width: 3000, height: 1000 }, alt: 'Panorama', frame: 'card' }));
  assert.ok(panorama.includes('data-photo-fit="contain"'));
  assert.ok(panorama.includes('src="/thumb.webp"'));
  for (const frame of ['hero', 'gallery']) {
    const fitting = renderToStaticMarkup(React.createElement(PhotoImage, { photo, alt: 'A place', frame }));
    const tall = renderToStaticMarkup(React.createElement(PhotoImage, { photo: { ...photo, width: 900, height: 2100 }, alt: 'Tall photo', frame }));
    assert.ok(!fitting.includes('src="/thumb.webp"'));
    assert.ok(tall.includes('src="/thumb.webp"'));
  }

  for (const ratio of [16 / 9, 3 / 1]) {
    const states = [];
    let cursor = 0;
    const hooks = { ...React, useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    }, useRef: () => ({ current: null }), useEffect: () => {}, useCallback: (callback) => callback };
    const outer = photoImageModule(hooks).PhotoImage({ photo: { urls: photo.urls }, alt: 'Unknown ratio', frame: 'card' });
    const render = () => { cursor = 0; return outer.type(outer.props); };
    const first = render();
    assert.ok(!renderToStaticMarkup(first).includes('src="/thumb.webp"'));
    const picture = React.Children.toArray(first.props.children).find((child) => child.type === 'picture');
    const sharp = React.Children.toArray(picture.props.children).find((child) => child.type === 'img');
    sharp.props.onLoad({ currentTarget: { naturalWidth: ratio * 900, naturalHeight: 900, currentSrc: '/small.webp' } });
    const loaded = renderToStaticMarkup(render());
    assert.equal(loaded.includes('src="/thumb.webp"'), ratio === 3);
    assert.ok(loaded.includes('class="sharp loaded"'));
  }
});

test('thumb and original never enter srcset; small sources are not overdeclared', () => {
  assert.equal(media.photoSrcSet(photo), '/small.webp 480w, /medium.webp 960w, /large.webp 1600w');
  assert.equal(media.photoSrcSet({ ...photo, width: 300 }), '/small.webp 300w');
  assert.equal(media.photoSrcSet({ urls: { thumb: '/thumb.webp', original: '/original.webp' } }), undefined);
  assert.equal(media.photoSource({ url: '/original.webp' }), undefined);
});

function evaluateSizes(sizes, viewport) {
  for (const choice of sizes.replace(/^auto,\s*/, '').split(/,\s*/)) {
    const match = choice.match(/^(?:\(min-width:\s*(\d+)px\)\s*)?(.+)$/);
    if (match[1] && viewport < Number(match[1])) continue;
    const expression = match[2].replace(/calc\((.*)\)/, '$1').replace(/([\d.]+)vw/g, (_, amount) => String(Number(amount) * viewport / 100)).replace(/px/g, '');
    assert.match(expression, /^[\d.\s()+*/-]+$/);
    return vm.runInNewContext(expression);
  }
  throw new Error(`No matching sizes: ${sizes}`);
}

test('offline candidates for all frames at 390, 768 and 1366px, at 1x and 2x', () => {
  const expected = {
    hero: [[480, 960], [960, 1600], [1600, 1600]],
    gallery: [[480, 960], [960, 1600], [960, 1600]],
    strip: [[480, 480], [480, 480], [480, 480]],
    card: [[480, 480], [480, 480], [480, 960]],
    city: [[480, 480], [480, 960], [480, 960]],
  };
  for (const [frame, rows] of Object.entries(expected)) {
    for (const [index, viewport] of [390, 768, 1366].entries()) {
      const slot = evaluateSizes(media.PHOTO_SIZES[frame], viewport);
      const candidates = media.photoCandidates(photo, frame === 'card' && viewport < 640 ? 480 : undefined);
      for (const [densityIndex, density] of [1, 2].entries()) {
        const chosen = candidates.find((candidate) => candidate.width >= slot * density) ?? candidates.at(-1);
        assert.equal(chosen.width, rows[index][densityIndex], `${frame} ${viewport}px @${density}x (slot ${slot})`);
        console.log(`${frame} ${viewport}px @${density}x: ${chosen.width}w`);
      }
    }
  }
  assert.ok(Math.abs(evaluateSizes(media.PHOTO_SIZES.card, 672) - (0.92 * 672 - 16) / 2) < 0.01);
  assert.ok(Math.abs(evaluateSizes(media.PHOTO_SIZES.card, 896) - (896 - 96) / 3) < 0.01);
});

test('failure order: down the ladder, next hero photo, neutral placeholder', () => {
  const photos = [photo, { urls: { small: '/second-small.webp', medium: '/second-medium.webp' } }];
  let attempt = media.nextPhotoAttempt(photos, 0, '/large.webp');
  assert.equal(attempt.url, '/medium.webp');
  attempt = media.nextPhotoAttempt(photos, attempt.photoIndex, attempt.url);
  assert.equal(attempt.url, '/small.webp');
  attempt = media.nextPhotoAttempt(photos, attempt.photoIndex, attempt.url);
  assert.equal(attempt.photoIndex, 1);
  assert.equal(attempt.url, undefined);
  assert.equal(media.nextPhotoAttempt(photos, 1, '/second-medium.webp').url, '/second-small.webp');
  assert.equal(media.nextPhotoAttempt(photos, 1, '/second-small.webp'), null);
  assert.equal(media.nextPhotoAttempt([photo], 0, '/small.webp'), null);
});

test('only proven storage ladders expand; single city URLs are not fabricated', () => {
  const card = media.normalizePhoto('https://storage.5argny.com/places/cover_small.webp');
  assert.ok(media.photoSrcSet(card).includes('cover_medium.webp 960w'));
  assert.equal(card.urls.thumb, 'https://storage.5argny.com/places/cover_thumb.webp');
  const city = media.normalizePhoto('https://storage.5argny.com/cities/cairo.webp');
  assert.equal(media.photoSource(city), 'https://storage.5argny.com/cities/cairo.webp');
  assert.equal(media.photoSrcSet(city), undefined);
});

test('absolute browser currentSrc descends correctly even when payload URLs are relative', () => {
  assert.equal(media.nextPhotoAttempt([photo], 0, 'https://storage.5argny.com/medium.webp').url, '/small.webp');
});

test('home rails and fixed alternate cards also evaluate their actual sizes', () => {
  for (const viewport of [390, 768, 1366]) {
    for (const density of [1, 2]) {
      for (const [name, sizes] of [['home rail', media.CARD_RAIL_SIZES], ['alternate small', 'auto, 260px'], ['alternate medium', 'auto, 300px']]) {
        const slot = evaluateSizes(sizes, viewport);
        const candidates = media.photoCandidates(photo, viewport < 640 ? 480 : undefined);
        const chosen = candidates.find((candidate) => candidate.width >= slot * density) ?? candidates.at(-1);
        assert.equal(chosen.width, viewport === 390 || density === 1 ? 480 : 960);
        console.log(`${name} ${viewport}px @${density}x: ${chosen.width}w`);
      }
    }
  }
});

test('PhotoImage markup wires the actual sizes, mobile cap, thumbnail, preload, lazy loading and neutral state', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const exported = photoImageModule();
  const hero = renderToStaticMarkup(React.createElement(exported.PhotoImage, { photo, alt: 'A place', frame: 'hero', priority: true }));
  assert.match(hero, /<link[^>]*imageSrcSet="\/small.webp 480w, \/medium.webp 960w, \/large.webp 1600w"[^>]*imageSizes=/);
  assert.ok(hero.includes('fetchPriority="high"'));
  assert.ok(hero.includes('loading="eager"'));
  assert.ok(hero.includes('decoding="async"'));
  assert.ok(!hero.includes('src="/thumb.webp"'));
  const card = renderToStaticMarkup(React.createElement(exported.PhotoImage, { photo, alt: 'A card', frame: 'card' }));
  assert.match(card, /<source[^>]*media="\(max-width: 639px\)"[^>]*srcSet="\/small.webp 480w"/);
  assert.ok(card.includes('loading="lazy"'));
  assert.ok(card.includes('sizes="auto,'));
  assert.ok(!card.includes('original.webp'));
  assert.ok(!card.includes('/_next/image'));
  const empty = renderToStaticMarkup(React.createElement(exported.PhotoImage, { alt: 'Empty place', frame: 'hero' }));
  assert.ok(empty.includes('class="placeholder"'));
  assert.ok(!empty.includes('<img'));
  const css = fs.readFileSync('src/components/ds/PhotoImage.module.css', 'utf8');
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(css.includes('transition: none'));
  assert.ok(css.includes('blur(14px) brightness(0.75)'));
});

test('existing server place fetch supplies the initial responsive cover preload without an extra request', async () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const exported = {};
  const calls = [];
  const source = ts.transpileModule(fs.readFileSync('src/app/explorer/[citySlug]/[placeSlug]/layout.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const seo = { currentLocale: async () => 'en', urlFor: (value) => `https://www.5argny.com/en${value}/`, clampDescription: (value) => value, graph: (...schemas) => ({ '@graph': schemas }), breadcrumbSchema: () => ({}), jsonLdScript: (value) => JSON.stringify(value).replace(/</g, '\\u003c') };
  const dependencies = {
    '@/lib/region-location': {},
    '@/lib/egypt-regions': { regionLabel: () => '' },
    '@/lib/price-bands': { priceBandLabel: () => undefined },
    '@/lib/api/normalize-place': { normalizePlaceFlags: (value) => value },
    '@/lib/config': { API_BASE_URL: 'https://api.example.invalid', SITE_URL: 'https://www.5argny.com' },
    '@/lib/seo': seo,
    '@/lib/place-photo': media,
    '@/lib/place-address': require('./offline-loader.cjs').load('src/lib/place-address.ts'),
    'next/headers': { headers: async () => new Headers() },
    'next/navigation': { permanentRedirect: () => { throw new Error('Unexpected redirect'); }, notFound: () => { throw new Error('Unexpected not found'); } },
  };
  vm.runInNewContext(source, { exports: exported, fetch: async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ data: url.includes('/places/') ? { name: 'A place', images: [photo] } : { name: 'Cairo' } }) };
  }, require: (name) => name in dependencies ? dependencies[name] : require(name) });
  const markup = renderToStaticMarkup(await exported.default({ params: Promise.resolve({ citySlug: 'cairo', placeSlug: 'a-place' }), children: React.createElement('main') }));
  assert.equal(calls.length, 2);
  const cover = renderToStaticMarkup(React.createElement(photoImageModule().PhotoImage, { photo, alt: 'Cover', frame: 'hero', priority: true }));
  const preload = markup.match(/<link\b[^>]*imageSrcSet="([^"]+)"[^>]*imageSizes="([^"]+)"/);
  const sharp = cover.match(/<img\b[^>]*srcSet="([^"]+)"[^>]*sizes="([^"]+)"/);
  assert.ok(preload && sharp);
  assert.equal(preload[1], sharp[1]);
  assert.equal(preload[2], sharp[2]);
  assert.ok(markup.includes(`imageSizes="${media.PHOTO_SIZES.hero}"`));
  assert.ok(markup.includes('imageSrcSet="/small.webp 480w, /medium.webp 960w, /large.webp 1600w"'));
  assert.ok(!markup.includes('/original.webp'));
});

test('the lead gallery exposes a distinct lazy medium candidate and does not preload the cover', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const exported = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/explorer/MediaShowcase.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports: exported, require: (name) => {
    if (name === '@/components/ds/PhotoImage') return photoImageModule();
    if (name === '@/lib/place-photo') return media;
    if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
    return require(name);
  } });
  const galleryPhoto = { ...photo, urls: { thumb: '/next-thumb.webp', small: '/next-small.webp', medium: '/next-medium.webp', large: '/next-large.webp' } };
  const markup = renderToStaticMarkup(React.createElement(exported.MediaShowcase, { items: [{ type: 'image', photo: galleryPhoto, alt: 'Next photo' }] }));
  assert.ok(markup.includes('data-photo-frame="gallery"'));
  assert.ok(markup.includes('/next-medium.webp 960w'));
  assert.ok(markup.includes('loading="lazy"'));
  assert.ok(markup.includes('decoding="async"'));
  assert.ok(!markup.includes('rel="preload"'));
  assert.ok(!markup.includes('/medium.webp'));
  const page = fs.readFileSync('src/app/explorer/[citySlug]/[placeSlug]/page.tsx', 'utf8');
  assert.ok(page.includes('const cover = allImages[0]'));
  assert.ok(page.includes('const galleryImages = allImages.slice(1)'));
  const plan = fs.readFileSync('src/app/plan/page.tsx', 'utf8');
  assert.match(plan, /<PhotoImage\s+photo=\{sp\.place\.coverImage\}/);
  assert.ok(plan.includes('sizes="auto, 72px"'));
});
