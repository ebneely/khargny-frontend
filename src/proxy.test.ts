import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server/api-forwarder', () => ({ forwardBrowserApi: () => null }));

import { proxy } from './proxy';

const request = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(url, { headers });

describe('proxy trusted headers', () => {
  it('drops forged locale, path, search and marker headers from an external request', async () => {
    const res = await proxy(request('https://www.example.com/', {
      'x-khargny-locale': 'ar',
      'x-khargny-path': '/ar/attacker',
      'x-khargny-search': '?q=attacker',
      'x-khargny-internal-rewrite': '1',
    }));

    expect(res.headers.get('x-middleware-request-x-khargny-locale')).toBe('en');
    expect(res.headers.get('x-middleware-request-x-khargny-path')).toBe('/');
    expect(res.headers.get('x-middleware-request-x-khargny-search')).toBe('');
    expect(res.headers.get('x-middleware-request-x-khargny-internal-rewrite')).toBeNull();
  });

  it('keeps Arabic and adds noindex for a search query', async () => {
    const res = await proxy(request('https://www.example.com/ar/explorer/?q=cafe'));

    expect(res.headers.get('x-middleware-request-x-khargny-locale')).toBe('ar');
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.example.com/explorer/?q=cafe');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, follow');
  });

  it('does not noindex a query with only campaign tracking keys', async () => {
    const res = await proxy(request('https://www.example.com/explorer/?utm_source=news&fbclid=abc&gclid=def'));
    expect(res.headers.get('X-Robots-Tag')).toBeNull();
  });

  it('builds a rewrite from nextUrl, never from the Host header', async () => {
    const res = await proxy(request('https://www.example.com/ar/', { host: 'evil.example' }));

    expect(res.headers.get('x-middleware-rewrite')).toBe('https://www.example.com/');
    expect(res.headers.get('x-middleware-rewrite')).not.toContain('evil.example');
  });

  it('accepts a rewrite second pass only with the per-process secret', async () => {
    const first = await proxy(request('https://www.example.com/ar/explorer/'));
    const token = first.headers.get('x-middleware-request-x-khargny-internal-rewrite');
    expect(token).toBeTruthy();

    const second = await proxy(request('https://www.example.com/explorer/', {
      'x-khargny-locale': 'ar',
      'x-khargny-path': '/explorer',
      'x-khargny-search': '',
      'x-khargny-internal-rewrite': token!,
    }));
    expect(second.headers.get('x-middleware-next')).toBe('1');
    expect(second.headers.get('x-middleware-rewrite')).toBeNull();
  });
});
