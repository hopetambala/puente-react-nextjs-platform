import { LANGUAGES, toBcp47 } from 'app/modules/i18n/languages';

// One source of truth for the locale table. The switcher needs endonyms, and
// _document needs the BCP 47 tag for <Html lang>; before this they disagreed,
// and _document told every translated page it was English.
describe('language table', () => {
  it('lists exactly the locales next-i18next ships', () => {
    // eslint-disable-next-line global-require
    const { i18n } = require('../../../../next-i18next.config');
    expect(LANGUAGES.map((l) => l.locale).sort()).toEqual([...i18n.locales].sort());
  });

  it('gives every language an endonym written in that language', () => {
    expect(LANGUAGES.map((l) => l.endonym)).toEqual(
      expect.arrayContaining(['English', 'Español', 'Kreyòl Ayisyen']),
    );
  });
});

describe('toBcp47', () => {
  // The routing IDs are ISO 639-2/T. BCP 47 requires the shortest available
  // ISO 639 code, so "spa"/"hat" are invalid wherever "es"/"ht" exist.
  it('maps each routing locale to its registered BCP 47 tag', () => {
    expect(toBcp47('eng')).toBe('en');
    expect(toBcp47('spa')).toBe('es');
    expect(toBcp47('hat')).toBe('ht');
  });

  it('falls back to the default locale tag for an unknown or absent locale', () => {
    // _document renders before a locale is resolved on some error paths;
    // emitting `lang=""` or `lang="undefined"` is worse than defaulting.
    expect(toBcp47(undefined)).toBe('en');
    expect(toBcp47('xx')).toBe('en');
  });
});
