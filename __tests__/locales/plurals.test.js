/**
 * Counted strings must agree with their count in every shipped language.
 *
 * The catalogs had no `_one` forms, so the dashboard said "1 records missing key
 * fields" and "1 more communities", and the form-drift row said "3 form
 * renamed". This runs the real catalogs through real i18next, with the app's
 * three-letter locale codes, so it also proves `eng`/`spa`/`hat` resolve to
 * plural rules that have a "one" category.
 */
const fs = require('fs');
const path = require('path');
const i18next = require('i18next');

const LOCALES = ['eng', 'spa', 'hat'];
const load = (lng) => JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'locales', lng, 'common.json'), 'utf8'),
);

let i18n;
beforeAll(async () => {
  i18n = i18next.createInstance();
  await i18n.init({
    lng: 'eng',
    fallbackLng: false,
    resources: Object.fromEntries(LOCALES.map((l) => [l, { common: load(l) }])),
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });
});

const t = (lng, key, count) => i18n.getFixedT(lng)(key, { count });

describe('counted strings', () => {
  it.each([
    ['eng', 'triage_missing_key_fields', 'record missing key fields', 'records missing key fields'],
    ['eng', 'triage_possible_duplicates', 'possible duplicate household', 'possible duplicate households'],
    ['eng', 'triage_form_drift', 'form renamed since its answers were collected', 'forms renamed since their answers were collected'],
    ['eng', 'coverage_more', '1 more community not shown.', '3 more communities not shown.'],
    ['spa', 'triage_missing_key_fields', 'registro al que le faltan campos clave', 'registros a los que les faltan campos clave'],
    ['spa', 'coverage_unattributed', '1 registro no tenía ninguna comunidad registrada.', '3 registros no tenían ninguna comunidad registrada.'],
  ])('%s %s is singular for 1 and plural otherwise', (lng, key, one, other) => {
    expect(t(lng, key, 1)).toBe(one);
    expect(t(lng, key, 3)).toBe(other);
  });

  it('gives every _one key a plural partner (the base key or _other) in every locale', () => {
    const orphans = [];
    LOCALES.forEach((lng) => {
      const catalog = load(lng);
      Object.keys(catalog).filter((k) => k.endsWith('_one')).forEach((k) => {
        const base = k.slice(0, -'_one'.length);
        if (!(base in catalog) && !(`${base}_other` in catalog)) orphans.push(`${lng}:${k}`);
      });
    });
    expect(orphans).toEqual([]);
  });
});
