import { describe, expect, it } from 'vitest';
import { govKey } from './governorates.ts';

describe('govKey', () => {
  it('our city slugs map to their governorate', () => {
    expect(['cairo', 'giza', 'alexandria', 'port-said', 'red-sea', 'matrouh', 'luxor', 'aswan', 'ismailia'].map(govKey))
      .toEqual(['cairo', 'giza', 'alexandria', 'port_said', 'red_sea', 'matrouh', 'luxor', 'aswan', 'ismailia']);
  });
  it('English names with spaces map too', () => expect(govKey('Red Sea')).toBe('red_sea'));
  it('other spellings map through the aliases', () => {
    expect(govKey('Fayoum')).toBe('faiyum');
    expect(govKey('Marsa Matrouh')).toBe('matrouh');
    expect(govKey('Cairo Governorate')).toBe('cairo');
  });
  it('unknown or empty is null', () => { expect(govKey('Atlantis')).toBeNull(); expect(govKey(null)).toBeNull(); });
});
