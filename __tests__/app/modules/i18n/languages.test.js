import {
  LANGUAGES,
  stripLocalePrefix,
  syncDocumentLanguage,
  toBcp47,
} from 'app/modules/i18n/languages';

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

describe('stripLocalePrefix', () => {
  // _app.js checks the current URL against a list of public paths written
  // WITHOUT locale prefixes. On initial load that works, because Next strips
  // the locale from `asPath`. But `routeChangeComplete` hands over the full
  // URL — so after switching language, `/spa/account/login` is not in the
  // list, the auth guard treats a public page as private, and blanks it.
  it('removes a locale prefix so routing checks compare like with like', () => {
    expect(stripLocalePrefix('/spa/account/login')).toBe('/account/login');
    expect(stripLocalePrefix('/hat/forms/form-manager')).toBe('/forms/form-manager');
  });

  it('leaves an unprefixed path alone', () => {
    expect(stripLocalePrefix('/account/login')).toBe('/account/login');
  });

  it('maps a bare locale root to /', () => {
    expect(stripLocalePrefix('/spa')).toBe('/');
    expect(stripLocalePrefix('/hat/')).toBe('/');
  });

  it('does not strip a segment that merely starts with a locale code', () => {
    // "/spade" must not become "/de". Prefix matching has to be segment-exact.
    expect(stripLocalePrefix('/spades/x')).toBe('/spades/x');
    expect(stripLocalePrefix('/english')).toBe('/english');
  });

  it('drops the query string, which routing checks do not use', () => {
    expect(stripLocalePrefix('/spa/account/login?returnUrl=%2Fx')).toBe('/account/login');
  });
});

describe('syncDocumentLanguage', () => {
  // _document sets <html lang> correctly on the server, but Next overwrites
  // documentElement.lang with the RAW routing locale on client-side locale
  // changes — so a page served as lang="es" becomes lang="spa" the moment the
  // user switches without a reload. "spa" is not a valid BCP 47 tag where
  // "es" exists, so assistive technology stops pronouncing the page correctly.
  it('re-asserts the BCP 47 tag after a client-side locale change', () => {
    document.documentElement.lang = 'spa';
    syncDocumentLanguage('spa');
    expect(document.documentElement.lang).toBe('es');
  });

  it('falls back to the default tag for an unknown locale', () => {
    document.documentElement.lang = 'zz';
    syncDocumentLanguage('zz');
    expect(document.documentElement.lang).toBe('en');
  });
});
