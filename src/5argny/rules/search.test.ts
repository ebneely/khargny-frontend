import { describe, expect, it } from 'vitest';
import { highlightRange, intentFor, matchText, momentFor, searchNormalize } from './search.ts';

describe('searchNormalize', () => {
  it('alef forms become one alef', () => expect(searchNormalize('أإآٱ')).toBe('اااا'));
  it('ة reads as ه and ى as ي', () => expect(searchNormalize('قهوة مستشفى')).toBe('قهوه مستشفي'));
  it('diacritics and tatweel go', () => expect(searchNormalize('قَهْـــوَة')).toBe('قهوه'));
  it('Latin accents go too', () => expect(searchNormalize('Café')).toBe('cafe'));
  it('Arabic and Persian digits become western', () => expect(searchNormalize('١٢٣ ۴۵')).toBe('123 45'));
  it('lower case, one space, trimmed', () => expect(searchNormalize('  Zamalek   CAFE ')).toBe('zamalek cafe'));
});

describe('intentFor', () => {
  it('needs 2 letters', () => expect(intentFor('c')).toBeNull());
  it('an English label prefix', () => expect(intentFor('have f')?.key).toBe('fun'));
  it('an Arabic label typed any way', () => expect(intentFor('إقامه')?.key).toBe('stay'));
  it('a category prefix', () => expect(intentFor('historic l')?.key).toBe('history'));
  it('a synonym inside a longer query', () => expect(intentFor('best mall in cairo')?.key).toBe('shop'));
  it('Franco-Arabic synonyms', () => expect(intentFor('akl')?.key).toBe('eat'));
  it('nothing for an unknown word', () => expect(intentFor('zzzz')).toBeNull());
});

describe('matchText', () => {
  const cafe = { en: 'Beano’s Zamalek', ar: 'بينوز', cat: 'Cafes', area: 'Zamalek', city: 'Cairo', services: [{ n: 'Specialty coffee' }] };
  it('matches names, area and services', () => {
    expect(matchText(cafe, 'zamalek')).toBe(true);
    expect(matchText(cafe, 'specialty')).toBe(true);
  });
  it('Arabic and English find the same place through the intent', () => {
    expect(matchText(cafe, 'كافيه')).toBe(true);
    expect(matchText(cafe, 'coffee')).toBe(true);
  });
  it('another intent does not match', () => expect(matchText(cafe, 'hotel')).toBe(false));
});

describe('momentFor', () => {
  it('the Right now card follows the hour', () => {
    expect(momentFor(7)).toEqual({ intent: 'coffee', title: 'morningCoffee' });
    expect(momentFor(13)).toEqual({ intent: 'eat', title: 'lunch' });
    expect(momentFor(17)).toEqual({ intent: 'outdoors', title: 'goldenHour' });
    expect(momentFor(19)).toEqual({ intent: 'eat', title: 'dinner' });
    expect(momentFor(23)).toEqual({ intent: 'fun', title: 'lateNight' });
    expect(momentFor(3)).toEqual({ intent: 'fun', title: 'lateNight' });
  });
});

describe('highlightRange', () => {
  it('finds the typed word in the original text', () => expect(highlightRange('Zamalek Cafe', 'cafe')).toEqual([8, 12]));
  it('positions stay right with Arabic diacritics before the match', () => expect(highlightRange('قَهْوَة الفيشاوي', 'الفيشاوي')).toEqual([8, 16]));
  it('a match ending on a diacritic keeps the mark', () => expect(highlightRange('قَهْوَة', 'قهوه')).toEqual([0, 7]));
  it('collapsed spaces still map', () => expect(highlightRange('Garden  8', 'garden 8')).toEqual([0, 9]));
  it('no match is null', () => expect(highlightRange('Garden', 'sushi')).toBeNull());
});
