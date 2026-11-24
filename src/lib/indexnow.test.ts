import { describe, expect, it } from 'vitest';
import { publishedIndexNowKey } from './indexnow';

describe('IndexNow key file', () => {
  it('publishes a well-formed key only under its own file name', () => {
    expect(publishedIndexNowKey('abc12345', 'abc12345.txt')).toBe('abc12345');
  });

  it('refuses a different file name', () => {
    expect(publishedIndexNowKey('abc12345', 'other.txt')).toBeNull();
    expect(publishedIndexNowKey('abc12345', 'abc12345.xml')).toBeNull();
  });

  it('refuses a missing or malformed key', () => {
    expect(publishedIndexNowKey(undefined, 'abc12345.txt')).toBeNull();
    expect(publishedIndexNowKey('short', 'short.txt')).toBeNull();
    expect(publishedIndexNowKey('not/allowed', 'not/allowed.txt')).toBeNull();
    expect(publishedIndexNowKey('abc defgh', 'abc defgh.txt')).toBeNull();
  });
});
