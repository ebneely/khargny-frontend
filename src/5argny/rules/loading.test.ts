import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { failKind, retryQuery, revealOf, REVEAL_MS, SKELETON_DELAY_MS } from './loading.ts';

const http = (status: number) => Object.assign(new Error(`status ${status}`), { status });

describe('loading', () => {
  it('a load under 150 ms shows no skeleton, so the content just appears', () => {
    expect(revealOf(1000, 1149)).toBe('none');
    expect(revealOf(null, 5000)).toBe('none'); // the data was already there
  });
  it('a load the skeleton was shown for cross-fades into the content', () => {
    expect(revealOf(1000, 1150)).toBe('fade');
    expect(revealOf(1000, 6000)).toBe('fade');
  });
  it('the stylesheet waits the same 150 ms and fades in the same 200 ms', () => {
    const css = readFileSync(new URL('../web.css', import.meta.url), 'utf8');
    expect(css).toContain(`--sk-delay:${SKELETON_DELAY_MS}ms`);
    expect(css).toContain(`--sk-fade:${REVEAL_MS}ms`);
  });
  it('names what failed so the words fit it', () => {
    expect(failKind(http(404))).toBe('gone');
    expect(failKind(http(410))).toBe('gone');
    expect(failKind(http(500))).toBe('server');
    expect(failKind(http(503))).toBe('server');
    expect(failKind(http(400))).toBe('server');
    expect(failKind(http(408))).toBe('slow');
    expect(failKind(http(504))).toBe('slow');
    expect(failKind(Object.assign(new Error('x'), { name: 'TimeoutError' }))).toBe('slow');
    expect(failKind(new TypeError('Failed to fetch'))).toBe('network');
    expect(failKind(http(500), false)).toBe('offline'); // offline wins: the banner says the rest
  });
  it('retries once for the network and the server, never for an answer that will not change', () => {
    expect(retryQuery(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(retryQuery(0, http(503))).toBe(true);
    expect(retryQuery(1, http(503))).toBe(false);
    expect(retryQuery(0, http(404))).toBe(false);
    expect(retryQuery(0, http(403))).toBe(false);
    expect(retryQuery(0, http(429))).toBe(true);
    expect(retryQuery(0, http(408))).toBe(true);
  });
});
