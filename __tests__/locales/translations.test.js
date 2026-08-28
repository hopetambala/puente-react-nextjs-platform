import '@testing-library/jest-dom';

const fs = require('fs');
const path = require('path');
const {
  checkLocaleParity,
  formatParityReport,
} = require('app/modules/i18n/localeParity');

const nextI18NextConfig = require('../../next-i18next.config');

const { defaultLocale, locales } = nextI18NextConfig.i18n;
const LOCALES_DIR = path.join(__dirname, '..', '..', 'public', 'locales');

function loadCatalog(locale) {
  const dir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(dir)) return {};
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .reduce(
      (acc, file) => ({
        ...acc,
        [path.basename(file, '.json')]: JSON.parse(
          fs.readFileSync(path.join(dir, file), 'utf8'),
        ),
      }),
      {},
    );
}

const catalogs = locales.reduce(
  (acc, locale) => ({ ...acc, [locale]: loadCatalog(locale) }),
  {},
);

// Every locale next-i18next ships must be complete. There is no explicit
// `fallbackLng`, so a missing key renders the English string instead of a raw
// key name — the drift is invisible to users and to us. This is the only thing
// standing between "we ship six languages" and "we ship one language and five
// partial ones", which is how 47 keys accumulated unnoticed between June and
// August 2026.
describe('Locale parity', () => {
  it('every shipped locale defines every key the default locale defines', () => {
    const report = checkLocaleParity({ defaultLocale, locales, catalogs });
    expect(formatParityReport(report)).toBe('');
  });

  it('ships a catalog directory for every locale in the config', () => {
    const withoutCatalog = locales.filter(
      (locale) => Object.keys(catalogs[locale]).length === 0,
    );
    expect(withoutCatalog).toEqual([]);
  });
});

// Parity proves a key EXISTS. It cannot prove it was translated: copying the
// English value satisfies parity while leaving the user reading English. The
// navigation is the highest-traffic surface, so it gets the stricter check.
// (Prior art: the bug Copilot flagged on PR #71.)
const NAV_KEYS = [
  'nav_form_manager',
  'nav_form_creator',
  'nav_data',
  'nav_marketplace',
  'nav_settings',
  'nav_logout',
];

describe('Navigation is genuinely translated, not copied from English', () => {
  const translatedLocales = locales.filter((l) => l !== defaultLocale);

  translatedLocales.forEach((locale) => {
    describe(locale, () => {
      NAV_KEYS.forEach((key) => {
        it(`translates ${key}`, () => {
          const value = catalogs[locale].common[key];
          expect(value).toBeTruthy();
          expect(value).not.toBe(catalogs[defaultLocale].common[key]);
        });
      });
    });
  });
});
