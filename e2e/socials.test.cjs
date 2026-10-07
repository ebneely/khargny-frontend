const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(filename, dependencies = {}, globals = {}) {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exported = {};
  vm.runInNewContext(output, { exports: exported, URL, AbortSignal, ...globals, require: (name) => {
    if (name in dependencies) return dependencies[name];
    if (name === '@/lib/config' || name === './config') return { SITE_URL: 'https://www.5argny.com', API_BASE_URL: 'https://api.example.invalid' };
    if (name === '@/i18n/dictionaries') return { LOCALES: ['ar', 'en'], DEFAULT_LOCALE: 'ar' };
    if (name === '@/i18n/routing') return { stripLocale: (value) => value, withLocale: (value, locale) => `/${locale}${value}` };
    if (name === 'next/headers') return {};
    if (name === '@/lib/site-socials') return load('src/lib/site-socials.ts');
    return require(name);
  } });
  return exported;
}

const all = { instagram: 'https://www.instagram.com/5argny.eg/', facebook: 'https://www.facebook.com/5argny.eg/', tiktok: 'https://www.tiktok.com/@5argny', youtube: 'https://www.youtube.com/@5argny', whatsapp: '+20 1234567890', phone: '+20 1234567890', email: 'hello@5argny.com' };

test('Organization emits four socials and contact details only when set, using escaped JSON-LD', () => {
  const { organizationSchema, jsonLdScript } = load('src/lib/seo.ts');
  const organization = organizationSchema('ar', all);
  assert.deepEqual(JSON.parse(JSON.stringify(organization.sameAs)), [all.instagram, all.facebook, all.tiktok, all.youtube]);
  assert.equal(organization.contactPoint['@type'], 'ContactPoint');
  assert.equal(organization.contactPoint.telephone, all.phone);
  assert.equal(organization.contactPoint.email, all.email);
  assert.equal(organizationSchema('en', null).sameAs, undefined);
  assert.equal(organizationSchema('ar', {}).contactPoint, undefined);
  const hostile = organizationSchema('en', { ...all, instagram: 'javascript:alert(1)', facebook: 'https://facebook.com.attacker.invalid/', tiktok: 'https://www.tiktok.com/@name</script>', phone: '</script><script>alert(1)</script>', email: '</script>' });
  const encoded = jsonLdScript(hostile);
  assert.ok(!encoded.includes('</script>'));
  assert.ok(!encoded.includes('javascript:'));
  assert.ok(!encoded.includes('attacker.invalid'));
  assert.ok(encoded.includes('\\u003c'));
  JSON.parse(encoded);
});

test('footer exposes seven real, named, safe links with rel me and no missing fields', () => {
  const renderFooter = (settings) => {
    const { SiteFooter } = load('src/components/ds/SiteFooter.tsx', {
      '@/lib/api/hooks/use-site-settings': { useSiteSettings: () => ({ data: settings }) },
      '@/i18n/LocaleProvider': { useI18n: () => ({ t: (key) => key }) },
      'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
      'lucide-react': Object.fromEntries(['Instagram', 'Facebook', 'Youtube', 'MessageCircle', 'Mail', 'Phone', 'Music2'].map((name) => [name, () => React.createElement('svg')])),
    });
    return renderToStaticMarkup(React.createElement(SiteFooter));
  };
  const markup = renderFooter(all);
  const links = markup.match(/<a[^>]*class="khg-social"[^>]*>/g) ?? [];
  assert.equal(links.length, 7);
  for (const link of links) {
    assert.ok(link.includes('target="_blank"'));
    assert.ok(link.includes('rel="me noopener"'));
    assert.ok(link.includes('aria-label='));
  }
  for (const href of ['tel:+20 1234567890', 'mailto:hello@5argny.com', 'https://wa.me/201234567890']) assert.ok(markup.includes(`href="${href}"`));
  assert.ok(!renderFooter(null).includes('class="khg-social"'));
  assert.ok(!renderFooter({ instagram: 'javascript:alert(1)', facebook: 'https://evil.invalid' }).includes('class="khg-social"'));
});

test('server settings fetch revalidates hourly and degrades on errors or bad envelopes without real API', async () => {
  let response = { ok: true, json: async () => ({ success: true, data: all }) };
  let options;
  const { getSiteSettings } = load('src/lib/api/site-settings.ts', {}, { fetch: async (url, init) => {
    assert.equal(url, 'https://api.example.invalid/v1/site-settings');
    options = init;
    if (response instanceof Error) throw response;
    return response;
  } });
  assert.equal((await getSiteSettings()).instagram, all.instagram);
  assert.equal(options.next.revalidate, 3600);
  response = { ok: false };
  assert.equal(await getSiteSettings(), null);
  response = { ok: true, json: async () => ({ success: false }) };
  assert.equal(await getSiteSettings(), null);
  response = new Error('offline');
  assert.equal(await getSiteSettings(), null);
  const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert.ok(layout.includes('await getSiteSettings()'));
  assert.ok(layout.includes('organizationSchema(locale, settings)'));
  assert.ok(layout.includes('SiteSettingsProvider settings={settings}'));
});

test('root SSR provides settings to actual footer hooks so links are in the crawlable HTML', async () => {
  const settingsHooks = load('src/lib/api/hooks/use-site-settings.ts', {
    '@/lib/api/client': { apiRequest: () => { throw new Error('No real API allowed'); } },
  });
  const query = require('@tanstack/react-query');
  const noop = () => null;
  const wrapper = ({ children }) => React.createElement(React.Fragment, null, children);
  const footer = load('src/components/ds/SiteFooter.tsx', {
    '@/lib/api/hooks/use-site-settings': settingsHooks,
    '@/i18n/LocaleProvider': { useI18n: () => ({ t: (key) => key }) },
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    'lucide-react': Object.fromEntries(['Instagram', 'Facebook', 'Youtube', 'MessageCircle', 'Mail', 'Phone', 'Music2'].map((name) => [name, noop])),
  });
  const { default: RootLayout } = load('src/app/layout.tsx', {
    './globals.css': {},
    '@/components/QueryProvider': { QueryProvider: ({ children }) => React.createElement(query.QueryClientProvider, { client: new query.QueryClient() }, children) },
    '@/components/ui/toaster': { Toaster: noop },
    '@/components/analytics/PageViewTracker': { PageViewTracker: noop },
    '@/i18n/LocaleProvider': { LocaleProvider: wrapper },
    '@/lib/seo': load('src/lib/seo.ts'),
    '@/lib/api/site-settings': { getSiteSettings: async () => all },
    '@/lib/api/hooks/use-site-settings': settingsHooks,
    'next/headers': { headers: async () => new Map([['x-khargny-locale', 'en']]), cookies: async () => new Map() },
  });
  const markup = renderToStaticMarkup(await RootLayout({ children: React.createElement(footer.SiteFooter) }));
  assert.equal((markup.match(/class="khg-social"/g) ?? []).length, 7);
  const graph = JSON.parse(markup.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(graph['@graph'][0].sameAs.length, 4);
});
