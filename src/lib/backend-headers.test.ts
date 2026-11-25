import { describe, expect, it } from 'vitest';
import { CLIENT_IP_HEADER, FORWARDER_HEADER, backendHeaders, forwarderSecret, isAddress, visitorAddress } from './backend-headers';
import { apiInternalUrl, getApiBaseUrl } from './config';

const SECRET = 'a'.repeat(32) + '-0123456789';

describe('the backend origin a server call uses', () => {
  it('prefers API_INTERNAL_URL on the server, and never for a browser', () => {
    const options = { mode: 'direct', internal: 'http://backend-service:3000/' };
    expect(apiInternalUrl(options.internal)).toBe('http://backend-service:3000');
    // What the function does with the environment value it is given; the real call reads process.env at call time.
    expect(apiInternalUrl('')).toBe('');
    expect(apiInternalUrl('   ')).toBe('');
  });

  it('falls back to the public API URL when no internal one is configured', () => {
    const withInternal = process.env.API_INTERNAL_URL;
    const previous = process.env.API_INTERNAL_URL;
    try {
      process.env.API_INTERNAL_URL = 'http://backend-service:3000';
      expect(getApiBaseUrl({ browser: false, mode: 'direct' })).toBe('http://backend-service:3000');
      expect(getApiBaseUrl({ browser: true, mode: 'direct' })).toBe('https://backend.5argny.com');

      delete process.env.API_INTERNAL_URL;
      expect(getApiBaseUrl({ browser: false, mode: 'direct' })).toBe('https://backend.5argny.com');
      expect(getApiBaseUrl({ browser: true, mode: 'same-origin' })).toBe('/api');
    } finally {
      if (withInternal === undefined) delete process.env.API_INTERNAL_URL;
      else process.env.API_INTERNAL_URL = previous;
    }
  });
});

describe('the headers a server-side backend call carries', () => {
  it('sends the forwarder secret and the visitor address when the render has a visitor', () => {
    const source = new Headers({ 'cf-connecting-ip': '102.44.7.9', 'x-forwarded-for': '10.0.0.1, 102.44.7.9' });
    expect(backendHeaders(source, SECRET)).toEqual({
      [FORWARDER_HEADER]: SECRET,
      [CLIENT_IP_HEADER]: '102.44.7.9',
    });
  });

  it('sends the forwarder only for a cached or build-time render (no visitor)', () => {
    expect(backendHeaders(undefined, SECRET)).toEqual({ [FORWARDER_HEADER]: SECRET });
    expect(backendHeaders(new Headers(), SECRET)).toEqual({ [FORWARDER_HEADER]: SECRET });
  });

  it('sends no secret when it is missing or unusable, and never logs it', () => {
    expect(forwarderSecret(undefined)).toBeNull();
    expect(forwarderSecret('short')).toBeNull();
    expect(forwarderSecret(` ${SECRET}`)).toBeNull();
    expect(forwarderSecret(`${SECRET}\n`)).toBeNull();
    expect(forwarderSecret(SECRET)).toBe(SECRET);
    expect(backendHeaders(undefined, '')).toEqual({});
  });

  it('reads the visitor from Cloudflare first, then the first valid forwarded address', () => {
    expect(visitorAddress(new Headers({ 'cf-connecting-ip': '102.44.7.9', 'x-forwarded-for': '8.8.8.8' }))).toBe('102.44.7.9');
    expect(visitorAddress(new Headers({ 'x-forwarded-for': 'unknown, 8.8.8.8, 1.1.1.1' }))).toBe('8.8.8.8');
    expect(visitorAddress(new Headers({ 'x-forwarded-for': 'not-an-ip' }))).toBeNull();
    expect(visitorAddress(new Headers())).toBeNull();
    expect(visitorAddress(null)).toBeNull();
  });

  it('accepts a real address and refuses anything else (no header injection)', () => {
    expect(isAddress('102.44.7.9')).toBe('102.44.7.9');
    expect(isAddress('::1')).toBe('::1');
    expect(isAddress('999.1.1.1')).toBeNull();
    expect(isAddress('102.44.7.9\r\nx-evil: 1')).toBeNull();
    expect(isAddress('')).toBeNull();
    expect(isAddress(null)).toBeNull();
  });
});
