const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function loadModule(relativePath, dependencies = {}, browser = true) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exported = {};
  const warnings = [];
  const sandbox = {
    exports: exported,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    console: { warn: (...args) => warnings.push(args) },
    ...(browser ? { window: {} } : {}),
  };
  vm.runInNewContext(output, sandbox, { filename });
  return { ...exported, warnings };
}

function catalogue(browser = true) {
  return loadModule('src/lib/egypt-regions.ts', {}, browser);
}

function optionsModule(regions) {
  return loadModule('src/lib/region-options.ts', { './egypt-regions': regions });
}

function icons(React) {
  return Object.fromEntries(['ChevronDown', 'Check', 'Heart', 'Navigation', 'Eye', 'Star']
    .map((name) => [name, () => React.createElement('svg', { 'aria-hidden': true })]));
}

test('stable English keys and scoped Arabic names distinguish Ismailia and Giza', () => {
  const regions = catalogue();
  assert.equal(regions.findRegion('Sheikh Zayed').governorate, 'Giza');
  assert.equal(regions.findRegion('El Sheikh Zayed').governorate, 'Ismailia');
  assert.equal(regions.findRegion('الشيخ زايد'), undefined);
  assert.equal(regions.findRegion('الشيخ زايد', 'الإسماعيلية').value, 'El Sheikh Zayed');
  assert.equal(regions.findRegion('الشيخ زايد', 'Giza').value, 'Sheikh Zayed');
  assert.equal(regions.findRegion('الشيخ زايد', 'Cairo'), undefined);
  assert.equal(regions.findRegion('الشيخ زايد', 'unknown city'), undefined);
  assert.equal(regions.findRegion('المنتزه'), undefined);
  assert.equal(regions.findRegion('المنتزه', 'Alexandria').value, 'Montaza');
  assert.equal(regions.findRegion('المنتزه', 'South Sinai').value, 'Montazah Sharm');
  for (const city of [undefined, 'Cairo', 'Ismailia', 'Sharm El Sheikh', 'sharm-el-sheikh', 'child-city-id']) {
    assert.equal(regions.findRegion('Sheikh Zayed', city).value, 'Sheikh Zayed');
    assert.equal(regions.findRegion('El Sheikh Zayed', city).value, 'El Sheikh Zayed');
    assert.equal(regions.findRegion('خليج نعمة', city).value, 'Naama Bay');
    assert.equal(regions.regionLabel('خليج نعمة', 'en', city), 'Naama Bay');
  }
  assert.equal(regions.findRegion('الشيخ زايد', 'Ismailia').value, 'El Sheikh Zayed');
  assert.equal(regions.findRegion('الشيخ زايد', 'الجيزة').value, 'Sheikh Zayed');
  assert.equal(regions.findRegion('الشيخ زايد', 'ismailia'), regions.findRegion('El Sheikh Zayed'));
  for (const city of ['ismailia-city', 'child-city-id', 'Sharm El Sheikh']) {
    assert.equal(regions.findRegion('الشيخ زايد', city), undefined);
  }
});

test('every globally unique Arabic name resolves independently of non-governorate context', () => {
  const regions = catalogue();
  for (const region of regions.EGYPT_REGIONS) {
    if (regions.EGYPT_REGIONS.filter((entry) => entry.nameAr === region.nameAr).length !== 1) continue;
    for (const city of [undefined, 'Sharm El Sheikh', 'sharm-el-sheikh', 'child-city-id', 'Cairo']) {
      assert.equal(regions.findRegion(region.nameAr, city).value, region.value, `${region.nameAr} / ${city}`);
    }
  }
});

test('catalogue labels translate and unknown labels require only the correct letter script', () => {
  const regions = catalogue();
  assert.equal(regions.regionLabel('El Sheikh Zayed', 'ar', 'Ismailia'), 'الشيخ زايد');
  assert.equal(regions.regionLabel('الشيخ زايد', 'en', 'Ismailia'), 'El Sheikh Zayed');
  assert.equal(regions.regionLabel('الشيخ زايد', 'en'), '');
  assert.equal(regions.regionLabel('Legacy Quarter 2', 'en', 'Cairo'), 'Legacy Quarter 2');
  assert.equal(regions.regionLabel('حي قديم ٢', 'ar', 'Cairo'), 'حي قديم ٢');
  for (const value of ['حي قديم', 'Mixed حي', '旧区', '123', '🧭']) {
    assert.equal(regions.regionLabel(value, 'en', 'Cairo'), '');
  }
  for (const value of ['Legacy Quarter', 'Mixed حي', '旧区', '123']) {
    assert.equal(regions.regionLabel(value, 'ar', 'Cairo'), '');
  }
  for (const value of [null, undefined, '', '   ']) {
    assert.equal(regions.regionLabel(value, 'en', 'Cairo'), '');
  }
});

test('dropped values warn once across repeated renders, cities and locale changes; SSR stays silent', () => {
  const regions = catalogue();
  regions.regionLabel('Mixed حي', 'en', 'Ismailia');
  regions.regionLabel('Mixed حي', 'en', 'Giza');
  regions.regionLabel('Mixed حي', 'ar', 'Ismailia');
  assert.equal(regions.warnings.length, 1);
  assert.ok(regions.warnings[0].includes('Mixed حي'));
  assert.ok(regions.warnings[0].includes('Ismailia'));
  const server = catalogue(false);
  server.regionLabel('حي قديم', 'en', 'Ismailia');
  assert.equal(server.warnings.length, 0);
  const reload = catalogue();
  reload.regionLabel('Mixed حي', 'en', 'Ismailia');
  assert.equal(reload.warnings.length, 1);
});

test('selector de-duplicates labels, prefers catalogue keys and sorts labels', () => {
  const regions = catalogue();
  const { buildRegionOptions } = optionsModule(regions);
  const stored = ['الزمالك', 'Zamalek', 'Zamalek', 'Legacy Quarter', 'حي قديم', '', 'Mixed حي'];
  const options = buildRegionOptions(stored, 'en', 'Cairo');
  assert.deepEqual(Array.from(options, (option) => option.label), ['Legacy Quarter', 'Zamalek']);
  assert.deepEqual(Array.from(options, (option) => option.value), ['Legacy Quarter', 'Zamalek']);
  assert.ok(options.every((option) => !('values' in option)));
  const arabic = buildRegionOptions(stored, 'ar', 'Cairo');
  assert.ok(arabic.every((option) => option.label && !/[A-Za-z]/.test(option.label)));
});

test('duplicate warnings identify each dropped value once, even when a later key wins', () => {
  const regions = catalogue();
  const { buildRegionOptions } = optionsModule(regions);
  const stored = ['الزمالك', 'zamalek', 'Zamalek', ' Zamalek ', 'الزمالك'];
  for (const locale of ['en', 'ar', 'en']) {
    const options = buildRegionOptions(stored, locale, 'Cairo');
    assert.equal(options.length, 1);
    assert.equal(options[0].value, 'Zamalek');
  }
  assert.equal(regions.warnings.length, 3);
  for (const value of ['الزمالك', 'zamalek', ' Zamalek ']) {
    assert.equal(regions.warnings.filter((warning) => warning.includes(value)).length, 1);
  }
  assert.ok(regions.warnings.every((warning) => warning.includes('Cairo')));
});

test('without a catalogue key the first sorted stored value wins regardless of input order', () => {
  const regions = catalogue();
  const { buildRegionOptions } = optionsModule(regions);
  for (const stored of [['Legacy Quarter', ' Legacy Quarter'], [' Legacy Quarter', 'Legacy Quarter']]) {
    const options = buildRegionOptions(stored, 'en', 'Cairo');
    assert.equal(options.length, 1);
    assert.equal(options[0].value, ' Legacy Quarter');
    assert.equal(options[0].label, 'Legacy Quarter');
  }
  assert.equal(regions.warnings.length, 1);
  assert.ok(regions.warnings[0].includes('Legacy Quarter'));
});

test('both Sheikh Zayed selectors prefer the matching catalogue key in either language', () => {
  for (const [city, key] of [['Giza', 'Sheikh Zayed'], ['Ismailia', 'El Sheikh Zayed']]) {
    const regions = catalogue();
    const { buildRegionOptions } = optionsModule(regions);
    for (const locale of ['ar', 'en']) {
      const options = buildRegionOptions(['الشيخ زايد', key], locale, city);
      assert.equal(options.length, 1);
      assert.equal(options[0].value, key);
      assert.equal(options[0].label, locale === 'ar' ? 'الشيخ زايد' : key);
    }
    assert.equal(regions.warnings.length, 1);
    assert.ok(regions.warnings[0].includes('الشيخ زايد'));
    assert.ok(regions.warnings[0].includes(city));
  }
  const server = catalogue(false);
  optionsModule(server).buildRegionOptions(['الزمالك', 'Zamalek'], 'en', 'Cairo');
  assert.equal(server.warnings.length, 0);
});

function callsIn(source, name) {
  const parsed = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === name) calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return { parsed, calls };
}

test('city listing retains the two-argument single-value query; area discovery needs no request', () => {
  const root = path.join(__dirname, '..');
  const cityPath = 'src/app/explorer/[citySlug]/page.tsx';
  const source = fs.readFileSync(path.join(root, cityPath), 'utf8');
  const actual = callsIn(source, 'usePlaces');
  assert.equal(actual.calls.length, 1);
  assert.equal(actual.calls[0].arguments.length, 2);
  const [filters, enabled] = actual.calls[0].arguments;
  assert.ok(ts.isObjectLiteralExpression(filters));
  assert.deepEqual(Array.from(filters.properties, (property) => [property.name.getText(actual.parsed), property.initializer.getText(actual.parsed)]), [
    ['cityId', 'currentCity?.id'],
    ['categoryId', 'activeCategory || undefined'],
    ['region', 'activeRegion || undefined'],
    ['priceRange', 'filters.priceRange?.length ? filters.priceRange.join(",") : undefined'],
    ['featured', 'filters.featured || undefined'],
    ['amenityIds', 'filters.amenityIds?.length ? filters.amenityIds.join(",") : undefined'],
    ['tagIds', 'filters.tagIds?.length ? filters.tagIds.join(",") : undefined'],
    ['skip', 'page * PAGE_SIZE'],
    ['limit', 'PAGE_SIZE'],
  ]);
  assert.equal(enabled.getText(actual.parsed), 'Boolean(currentCity?.id) && !searching');
  const browseEnabled = new Function('currentCity', 'searching', `return ${enabled.getText(actual.parsed)}`);
  assert.equal(browseEnabled({ id: 'aswan' }, false), true);
  assert.equal(browseEnabled({ id: 'aswan' }, true), false);
  assert.equal(browseEnabled(undefined, false), false);
  assert.equal(callsIn(source, 'useCityPlaces').calls.length, 0);
  assert.ok(!source.includes('cityPlaces'));
});

test('a card says only the area: the city page never passes the street address to a card', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/app/explorer/[citySlug]/page.tsx'), 'utf8');
  const { parsed, calls } = callsIn(source, 'cardArea');
  assert.equal(calls.length, 1);
  assert.deepEqual(Array.from(calls[0].arguments).slice(0, 2).map((argument) => argument.getText(parsed)), ['place.region', 'locale']);
  assert.equal(callsIn(source, 'regionLocation').calls.length, 0);
  assert.ok(!/area={[^}]*address/.test(source), 'no card area may be built from an address');
  const similar = fs.readFileSync(path.join(__dirname, '..', 'src/components/explorer/SimilarPlaces.tsx'), 'utf8');
  assert.ok(!similar.includes('p.address'), 'similar-place cards must not print the address');
  const regions = catalogue();
  const { cardArea } = loadModule('src/lib/region-location.ts', { './egypt-regions': regions });
  assert.equal(cardArea('El Sheikh Zayed', 'en', 'Ismailia'), 'El Sheikh Zayed');
  assert.equal(cardArea('El Sheikh Zayed', 'ar', 'Ismailia'), 'الشيخ زايد');
  assert.equal(cardArea(null, 'en', 'Ismailia'), '');
});

test('the place page calls the imported production location composition', () => {
  for (const file of ['src/app/explorer/[citySlug]/[placeSlug]/page.tsx']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const { parsed, calls } = callsIn(source, 'regionLocation');
    const sharedImport = parsed.statements.find((statement) => ts.isImportDeclaration(statement)
      && statement.moduleSpecifier.text === '@/lib/region-location');
    assert.ok(sharedImport, `${file} must import the shared location composition`);
    assert.ok(sharedImport.importClause.namedBindings.elements.some((binding) => binding.name.text === 'regionLocation'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].arguments.length, 4);
    assert.deepEqual(Array.from(calls[0].arguments).slice(0, 3).map((argument) => argument.getText(parsed)), ['place.region', 'place.address', 'locale']);
  }
});

test('omitting an area leaves no empty location line or dangling separator', () => {
  const regions = catalogue();
  const { regionLocation } = loadModule('src/lib/region-location.ts', { './egypt-regions': regions });
  const location = (value, address) => regionLocation(value, address, 'en', 'Ismailia');
  assert.equal(location('حي قديم', null), '');
  assert.equal(location('حي قديم', '12 Lake Road'), '12 Lake Road');
  assert.equal(location('El Sheikh Zayed', '12 Lake Road'), 'El Sheikh Zayed · 12 Lake Road');
  assert.equal(location('El Sheikh Zayed', null), 'El Sheikh Zayed');
  assert.equal(location(null, undefined), '');
  assert.equal(regionLocation('خليج نعمة', null, 'en', 'Sharm El Sheikh'), 'Naama Bay');
  assert.equal(regionLocation('El Sheikh Zayed', null, 'ar', 'Ismailia'), 'الشيخ زايد');
});

function placesHook(apiRequest) {
  return loadModule('src/lib/api/hooks/use-places.ts', {
    '@tanstack/react-query': { useQuery: (options) => options },
    '@/lib/api/client': { apiRequest },
    '@/lib/api/normalize-place': loadModule('src/lib/api/normalize-place.ts'),
  });
}

test('All areas and a single stored key preserve the original request and enabled state', async () => {
  const calls = [];
  const hooks = placesHook(async (method, route, options) => {
    calls.push({ method, route, options });
    return { data: [], meta: { skip: options.params.skip, limit: options.params.limit, total: 0 } };
  });
  const allFilters = { cityId: 'cairo-id', skip: 24, limit: 24 };
  const all = hooks.usePlaces(allFilters, false);
  assert.equal(all.enabled, false);
  const queryContext = { get signal() { throw new Error('Legacy query must not consume signal'); } };
  await all.queryFn(queryContext);
  const { buildRegionOptions } = optionsModule(catalogue());
  const option = buildRegionOptions(['الزمالك', 'Zamalek'], 'en', 'Cairo')[0];
  const singleFilters = { cityId: 'cairo-id', categoryId: 'cafes', region: option.value, priceRange: '1,2', featured: true, amenityIds: 'wifi', tagIds: 'quiet', skip: 24, limit: 24 };
  const single = hooks.usePlaces(singleFilters, true);
  const result = await single.queryFn(queryContext);
  assert.equal(single.enabled, true);
  assert.equal(single.staleTime, 5 * 60 * 1000);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.params, allFilters);
  assert.equal(calls[1].options.params, singleFilters);
  assert.equal(calls[1].options.params.region, 'Zamalek');
  assert.ok(calls.every((call) => call.method === 'GET' && call.route === '/v1/places' && !('signal' in call.options)));
  assert.equal(JSON.stringify(all.queryKey), JSON.stringify(['places', 'list', allFilters]));
  assert.equal(JSON.stringify(single.queryKey), JSON.stringify(['places', 'list', singleFilters]));
  assert.equal(result.total, 0);
  assert.equal(result.skip, 24);
  assert.equal(result.limit, 24);
});

test('rendered selector selects one catalogue key in both locales and All areas clears it', () => {
  const React = require('react');
  const jsx = require('react/jsx-runtime');
  const { renderToStaticMarkup } = require('react-dom/server');
  const select = loadModule('src/components/explorer/SelectPill.tsx', {
    react: React,
    'react/jsx-runtime': jsx,
    'lucide-react': icons(React),
  });
  const regions = catalogue();
  const options = optionsModule(regions);
  let locale = 'en';
  let selectedProps;
  const selector = loadModule('src/components/explorer/RegionSelector.tsx', {
    react: React,
    'react/jsx-runtime': jsx,
    '@/i18n/LocaleProvider': { useI18n: () => ({ locale, t: (key) => key === 'explorer.regionAll' ? 'All areas' : key }) },
    '@/lib/region-options': options,
    './SelectPill': { SelectPill: (props) => {
      selectedProps = props;
      return React.createElement(select.SelectPill, props);
    } },
  });
  let selected;
  const props = { regions: ['الزمالك', 'Zamalek', 'حي قديم', 'Legacy Quarter'], city: 'Cairo', value: 'Zamalek', onChange: (value) => { selected = value; } };
  const english = renderToStaticMarkup(React.createElement(selector.RegionSelector, props));
  assert.ok(english.includes('Zamalek'));
  assert.ok(!english.includes('حي قديم'));
  assert.equal(selectedProps.options.length, 2);
  assert.equal(selectedProps.value, 'Zamalek');
  selectedProps.onChange('Zamalek');
  assert.equal(selected, 'Zamalek');
  selectedProps.onChange('');
  assert.equal(selected, null);
  locale = 'ar';
  const arabic = renderToStaticMarkup(React.createElement(selector.RegionSelector, props));
  assert.ok(arabic.includes('الزمالك'));
  assert.ok(!arabic.includes('Legacy Quarter'));
  assert.equal(selectedProps.value, 'Zamalek');
  assert.ok(selectedProps.options.every((option) => option.label));
});

test('rendered place cards omit the area element when its safe label is empty', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const card = loadModule('src/components/ds/PlaceCard.tsx', {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'lucide-react': icons(React),
    'next/link': { default: () => assert.fail('Area-only card fixtures must not render a link') },
    './IconButton': { IconButton: () => null },
    './PlaceBadges': { PlaceBadges: () => null },
    './PhotoImage': { PhotoImage: () => null },
    '@/lib/price-bands': loadModule('src/lib/price-bands.ts'),
    '@/lib/api/hooks/use-saved-places': { useSaveToggle: () => ({ saved: false, toggle: () => {}, isPending: false }) },
    '@/i18n/LocaleProvider': { useI18n: () => ({ locale: 'en', t: (key) => key }) },
  });
  const regions = catalogue();
  const hidden = renderToStaticMarkup(React.createElement(card.PlaceCard, { title: 'Place', area: regions.regionLabel('حي قديم', 'en', 'Ismailia') }));
  const visible = renderToStaticMarkup(React.createElement(card.PlaceCard, { title: 'Place', area: regions.regionLabel('El Sheikh Zayed', 'en', 'Ismailia') }));
  assert.ok(!hidden.includes('حي قديم'));
  assert.ok(!hidden.includes('title=""'));
  assert.ok(visible.includes('title="El Sheikh Zayed"'));
});
