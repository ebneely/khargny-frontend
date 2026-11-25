import { describe, expect, it } from 'vitest';
import { GET } from './route';

const call = (locale: 'en' | 'ar') =>
  GET(new Request('http://localhost/not-found-place/view/', { headers: { 'x-khargny-locale': locale } }));

describe('unknown-place 404 document', () => {
  it('is a real 404 with one h1 and noindex', async () => {
    const res = await call('en');
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(res.headers.get('x-robots-tag')).toBe('noindex, follow');
    expect((html.match(/<h1(?:\s|>)/g) ?? []).length).toBe(1);
    expect(html).toContain('<html lang="en" dir="ltr">');
    expect(html).toContain('Place not found');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('hrefLang=');
    expect(html).toContain('--bg: #FBF6EE');
    expect(html).toContain('@media (prefers-color-scheme: dark)');
  });

  it('is Arabic by the URL header', async () => {
    const res = await call('ar');
    const html = await res.text();
    expect(res.status).toBe(404);
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain('المكان ده مش موجود');
    expect((html.match(/<h1(?:\s|>)/g) ?? []).length).toBe(1);
  });
});
