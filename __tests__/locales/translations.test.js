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

// ─── The supported language set ─────────────────────────────────────────────
// Puente supports exactly three languages, in both Manage and Collect:
// English, Spanish, Haitian Creole. This is a product decision, not an
// implementation detail — the field operation is in the Dominican Republic,
// and Collect made the same call long before Manage did.
//
// The parity check above guarantees a locale is COMPLETE. It says nothing
// about which locales may exist, so a fully-translated `deu` would sail
// through it. This guards the set itself. Manage previously shipped five
// Next.js template locales (ara/deu/ind/prt/zho) that nobody supported and
// nobody noticed were 47 keys stale; the point of this test is that they
// cannot come back by accident.
//
// Collect uses the two-letter equivalents (en/es/hk) for the same three
// languages. Adding a language is a deliberate change to BOTH repos and to
// docs/i18n/README.md — not a one-line edit here.
const SUPPORTED_LOCALES = ['eng', 'spa', 'hat'];

describe('Supported languages', () => {
  it('ships exactly English, Spanish, and Haitian Creole', () => {
    expect([...locales].sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it('defaults to English, which is the source catalog every locale is compared against', () => {
    expect(defaultLocale).toBe('eng');
    expect(SUPPORTED_LOCALES).toContain(defaultLocale);
  });

  it('has no catalog directory on disk outside the supported set', () => {
    const onDisk = fs
      .readdirSync(LOCALES_DIR)
      .filter((entry) => fs.statSync(path.join(LOCALES_DIR, entry)).isDirectory());
    expect(onDisk.sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });
});

// The review worksheet is how a native Creole speaker checks the strings
// Claude wrote. It drifted stale within a single session — four keys were
// added after it was generated, so a reviewer would have silently skipped
// them, including one this repo authored. A worksheet that quietly omits rows
// is worse than no worksheet, because it looks complete.
describe('Translation review worksheet', () => {
  it('covers every key in every namespace', () => {
    const csv = fs.readFileSync(
      path.join(__dirname, '..', '..', 'docs', 'i18n', 'review-worksheet.csv'),
      'utf8',
    );
    // Column 2 is `key`; rows are quoted only where a value needs it, and the
    // first two columns never do, so a prefix match is enough to enumerate.
    const covered = new Set(
      csv
        .split('\n')
        .slice(1)
        .filter(Boolean)
        .map((line) => line.split(',').slice(0, 2).join(':')),
    );

    const expected = [];
    Object.keys(catalogs[defaultLocale]).forEach((namespace) => {
      Object.keys(catalogs[defaultLocale][namespace]).forEach((key) => {
        expected.push(`${namespace}:${key}`);
      });
    });

    const uncovered = expected.filter((entry) => !covered.has(entry));
    expect(uncovered).toEqual([]);
  });
});
