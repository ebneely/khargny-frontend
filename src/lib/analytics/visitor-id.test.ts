import { describe, expect, it } from 'vitest';
import {
  parseConfig, pickVisitorId, readCookie, sharedCookieDomain, shouldSendSignal, softSignalText, visitorCookie,
} from './visitor-id.ts';

const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const make = () => 'n'.repeat(32);

describe('visitor id', () => {
  it('keeps the id it already has: the cookie restores localStorage and localStorage restores the cookie', () => {
    expect(pickVisitorId(A, A, make)).toEqual({ id: A, fresh: false, writeStorage: false });
    expect(pickVisitorId(A, null, make)).toEqual({ id: A, fresh: false, writeStorage: true }); // storage was cleared
    expect(pickVisitorId(null, B, make)).toEqual({ id: B, fresh: false, writeStorage: false }); // cookie was cleared
    expect(pickVisitorId(A, B, make)).toEqual({ id: A, fresh: false, writeStorage: true }); // the cookie is what the API sees
  });

  it('makes a new id, marked fresh, only when both stores are empty or hold rubbish', () => {
    expect(pickVisitorId(null, null, make)).toEqual({ id: make(), fresh: true, writeStorage: true });
    expect(pickVisitorId('', '', make).fresh).toBe(true);
    expect(pickVisitorId('short', 'has spaces in it', make).id).toBe(make());
    expect(pickVisitorId('<script>alert(1)</script>', null, make).fresh).toBe(true);
    expect(pickVisitorId('x'.repeat(65), B, make).id).toBe(B);
  });

  it('shares the cookie with the API host only under a domain both sit on', () => {
    expect(sharedCookieDomain('www.5argny.com', 'backend.5argny.com')).toBe('5argny.com');
    expect(sharedCookieDomain('5argny.com', 'backend.5argny.com')).toBe('5argny.com');
    expect(sharedCookieDomain('WWW.5argny.com', 'backend.5ARGNY.com')).toBe('5argny.com');
    expect(sharedCookieDomain('www.5argny.com', 'api.example.com')).toBeNull(); // only "com" in common
    expect(sharedCookieDomain('www.5argny.com', 'www.5argny.com')).toBeNull(); // same host: no Domain needed
    expect(sharedCookieDomain('localhost', 'localhost')).toBeNull();
    expect(sharedCookieDomain('192.168.1.20', '192.168.1.20')).toBeNull();
    expect(sharedCookieDomain('10.1.0.5', '10.2.0.5')).toBeNull(); // addresses never share a domain
  });

  it('writes a year-long, first-party cookie', () => {
    expect(visitorCookie(A, 365, '5argny.com', true)).toBe(`k_vid=${A}; Max-Age=31536000; Path=/; SameSite=Lax; Domain=5argny.com; Secure`);
    expect(visitorCookie(A, 30, null, false)).toBe(`k_vid=${A}; Max-Age=2592000; Path=/; SameSite=Lax`);
  });

  it('reads one cookie out of the cookie line', () => {
    expect(readCookie(`a=1; k_vid=${A}; b=2`, 'k_vid')).toBe(A);
    expect(readCookie(`xk_vid=${B}; a=1`, 'k_vid')).toBeNull();
    expect(readCookie('', 'k_vid')).toBeNull();
    expect(readCookie('k_vid=', 'k_vid')).toBeNull();
  });

  it('sends the soft signal with a new id and once a day after, only while the server has it switched on', () => {
    expect(shouldSendSignal(true, null, '2026-11-14', true)).toBe(true);
    expect(shouldSendSignal(true, '2026-11-14', '2026-11-14', true)).toBe(true); // new id: always
    expect(shouldSendSignal(false, '2026-11-14', '2026-11-14', true)).toBe(false); // already sent today
    expect(shouldSendSignal(false, '2026-11-13', '2026-11-14', true)).toBe(true);
    expect(shouldSendSignal(false, null, '2026-11-14', true)).toBe(true);
    expect(shouldSendSignal(true, null, '2026-11-14', false)).toBe(false);
    expect(shouldSendSignal(false, '2026-11-13', '2026-11-14', false)).toBe(false);
  });

  it('builds the soft signal as one short line the server can hash', () => {
    const signal = softSignalText({ userAgent: 'UA|x', platform: 'iPhone', language: 'ar-EG', timeZone: 'Africa/Cairo', width: 390, height: 844, pixelRatio: 3, memory: 8 });
    expect(signal).toBe('UA x|iPhone|ar-EG|Africa/Cairo|390x844@3|8');
    expect(softSignalText({})).toBe('||||0x0@1|');
    expect(softSignalText({ userAgent: 'u'.repeat(900) }).length).toBe(400); // the API accepts at most 400
    expect(softSignalText({ userAgent: 'same', width: 390, height: 844 })).toBe(softSignalText({ userAgent: 'same', width: 390, height: 844 }));
  });

  it('keeps the lifetime the server sent, within 1 to 730 days, and a year otherwise; the soft signal stays off until the server says on', () => {
    expect(parseConfig(null)).toEqual({ days: 365, soft: false });
    expect(parseConfig('not json')).toEqual({ days: 365, soft: false });
    expect(parseConfig('{"days":30,"soft":false}')).toEqual({ days: 30, soft: false });
    expect(parseConfig('{"days":0}')).toEqual({ days: 365, soft: false });
    expect(parseConfig('{"days":30,"soft":true}')).toEqual({ days: 30, soft: true });
    expect(parseConfig('{"days":30,"soft":"yes"}').soft).toBe(false);
    expect(parseConfig('{"days":9999,"soft":true}')).toEqual({ days: 365, soft: true });
    expect(parseConfig('{"days":"x"}').days).toBe(365);
    expect(parseConfig('{"days":730}').days).toBe(730);
  });
});
