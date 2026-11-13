import { describe, expect, it } from 'vitest';
import { canOpen, shareStep } from './collections.ts';
import { metaSwap } from './metaSwap.ts';

describe('collections privacy', () => {
  const team = { owner: null, pub: true }, mine = { owner: 'me', pub: false }, minePublic = { owner: 'me', pub: true };
  it('a private collection opens only for its owner', () => {
    expect(canOpen(mine, 'me')).toBe(true);
    expect(canOpen(mine, 'other')).toBe(false);
    expect(canOpen(minePublic, 'other')).toBe(true);
    expect(canOpen(team, 'other')).toBe(true);
  });
  it('sharing a private one asks to make it public first', () => {
    expect(shareStep(mine, 'me')).toBe('makePublicFirst');
    expect(shareStep(minePublic, 'me')).toBe('share');
    expect(shareStep(team, 'me')).toBe('share');
    expect(shareStep(mine, 'other')).toBe('none');
  });
});

describe('metaSwap', () => {
  const p = { cat: 'Cafes', city: 'Cairo', area: 'Zamalek' };
  it('picking a category keeps the area', () => expect(metaSwap(p, 'cat', 'Restaurants')).toEqual({ city: 'Cairo', area: 'Zamalek', cat: 'Restaurants' }));
  it('picking an area keeps the category', () => expect(metaSwap(p, 'area', 'Maadi')).toEqual({ city: 'Cairo', area: 'Maadi', cat: 'Cafes' }));
  it('a place without an area leaves the area open', () => expect(metaSwap({ ...p, area: null }, 'cat', 'Parks').area).toBeNull());
});
