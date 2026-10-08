const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { test } = require('node:test');
const { load } = require('./offline-loader.cjs');

test('gallery preserves order, real sizes, renditions, alt, video slides and unknown dimensions', () => {
  const { galleryItems } = load('src/lib/place-gallery.ts');
  const photo = { width: 2000, height: 1500, altText: 'Nile', urls: { small: '/480', medium: '/960', large: '/1600', original: '/original' } };
  const items = galleryItems([{ type: 'image', photo }, { type: 'video', url: '/video.mp4' }, { type: 'image', photo: { urls: { small: '/unknown' } }, alt: 'Unknown' }]);
  assert.deepEqual(Array.from(items, item => item.type), ['image', 'video', 'image']);
  assert.equal(items[0].width, 2000);
  assert.equal(items[0].height, 1500);
  assert.equal(items[0].src, '/1600');
  assert.equal(items[0].srcset, '/480 480w, /960 960w, /1600 1600w');
  assert.equal(items[0].alt, 'Nile');
  assert.equal(items[1].videoUrl, '/video.mp4');
  assert.equal(items[1].html, true);
  assert.equal(items[2].width, undefined);
  assert.ok(!JSON.stringify(items).includes('/original'));
  const measured = galleryItems([{ type: 'image', photo: { urls: { small: '/x' } } }], { 0: { width: 480, height: 720 } });
  assert.equal(measured[0].width / measured[0].height, 2 / 3);
  const phone = galleryItems([{ type: 'image', photo }], {}, 960)[0];
  assert.equal(phone.src, '/960');
  assert.equal(phone.srcset, '/480 480w, /960 960w');
  assert.equal(galleryItems([{ type: 'image', photo: { ...photo, width: -1, height: Infinity } }])[0].width, undefined);
  assert.equal(galleryItems([{ type: 'image', photo: { urls: { original: '/original' } } }])[0].src, undefined);
});

test('history Back and button-close consume one same-page entry and preserve framework state', () => {
  const { galleryHistory } = load('src/lib/gallery-history.ts');
  for (const source of ['back', 'button']) {
    const listeners = new Set();
    let position = 0;
    let pending = false;
    const entries = [{ next: 'preserved' }];
    const browser = { location: { href: 'https://offline.invalid/place/' }, history: {
      get state() { return entries[position]; },
      pushState(state, unused, address) { assert.equal(address, browser.location.href); entries.push(state); position += 1; },
      back() { pending = true; },
    }, addEventListener(name, fn) { listeners.add(fn); }, removeEventListener(name, fn) { listeners.delete(fn); } };
    let closes = 0;
    const controller = galleryHistory(browser, () => { closes += 1; controller.close(); });
    controller.open(); controller.open();
    assert.equal(position, 1);
    assert.equal(browser.history.state.next, 'preserved');
    if (source === 'button') { controller.close(); controller.close(); assert.equal(pending, true); }
    position -= 1;
    for (const fn of [...listeners]) fn({ state: entries[position] });
    assert.equal(closes, source === 'back' ? 1 : 0);
    assert.equal(position, 0);
    assert.deepEqual(browser.history.state, { next: 'preserved' });
    controller.dispose();
  }
});

test('gallery is loaded only through a dynamic boundary and warmed by pointer and touch intent', () => {
  const seen = new Set();
  function visit(filename) {
    if (seen.has(filename)) return;
    seen.add(filename);
    const ast = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      if (!statement.moduleSpecifier || statement.importClause?.isTypeOnly || statement.isTypeOnly) continue;
      const name = statement.moduleSpecifier.text;
      assert.ok(!name.startsWith('photoswipe'), `${filename} statically imports ${name}`);
      const base = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(filename), name) : null;
      if (base) { const resolved = ['.ts', '.tsx'].map(extension => base + extension).find(fs.existsSync); if (resolved) visit(resolved); }
    }
  }
  visit(path.resolve('src/app/explorer/[citySlug]/[placeSlug]/PlaceClient.tsx'));
  const source = fs.readFileSync('src/components/explorer/MediaShowcase.tsx', 'utf8');
  assert.match(source, /import\(['"]\.\/place-lightbox['"]\)/);
  assert.match(source, /onPointerEnter/);
  assert.match(source, /onTouchStart/);
  assert.ok(!/^import .*from ['"]photoswipe/m.test(source));
});

test('missing dimensions activate lazy thumbnails, read natural pixels and release listeners; timeouts fail cleanly', async () => {
  const timers = new Map();
  const window = { setTimeout(callback) { timers.set(1, callback); return 1; }, clearTimeout(id) { timers.delete(id); } };
  const filename = 'src/components/explorer/place-lightbox.ts';
  const { measure } = load(filename, { window, sources: { [filename]: fs.readFileSync(filename, 'utf8') + '\nexport { measure };' } });
  const events = new Map();
  const image = { complete: false, loading: 'lazy', naturalWidth: 0, naturalHeight: 0,
    addEventListener(name, callback) { events.set(name, callback); }, removeEventListener(name) { events.delete(name); } };
  const pending = measure(image);
  assert.equal(image.loading, 'eager');
  image.complete = true; image.naturalWidth = 480; image.naturalHeight = 720;
  events.get('load')();
  assert.deepEqual(JSON.parse(JSON.stringify(await pending)), { width: 480, height: 720 });
  assert.equal(events.size, 0); assert.equal(timers.size, 0);
  image.complete = false;
  const timeout = measure(image);
  timers.get(1)();
  await assert.rejects(timeout, /Thumbnail unavailable/);
  assert.equal(events.size, 0); assert.equal(timers.size, 0);
});

test('a closed viewer is let go, so the next photo of the grid opens', () => {
  // PhotoSwipe keeps reporting isOpen after it is destroyed. The hook's guard reads that flag,
  // so it must drop the instance on destroy; without this only the first photo ever opened.
  const fs = require('node:fs');
  const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/components/explorer/MediaShowcase.tsx'), 'utf8');
  assert.match(source, /gallery\?\.on\("destroy",[\s\S]{0,120}controller\.current = null/);
  const lightbox = fs.readFileSync(path.join(__dirname, '..', 'src/components/explorer/place-lightbox.ts'), 'utf8');
  assert.doesNotMatch(lightbox, /document\.body\.style\.(position|top)/, 'the page is locked without pinning <body>');
});
