import {
  checkLocaleParity,
  formatParityReport,
} from 'app/modules/i18n/localeParity';

describe('checkLocaleParity', () => {
  it('reports a key the default locale has and another locale lacks', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { greeting: 'Hello', farewell: 'Bye' } },
        spa: { common: { greeting: 'Hola' } },
      },
    });

    expect(report.missing).toEqual([
      { locale: 'spa', namespace: 'common', key: 'farewell' },
    ]);
  });
});

describe('formatParityReport', () => {
  it('groups missing keys under their locale so the failure is actionable', () => {
    const output = formatParityReport({
      missing: [
        { locale: 'spa', namespace: 'common', key: 'farewell' },
        { locale: 'spa', namespace: 'common', key: 'greeting' },
        { locale: 'hat', namespace: 'saas-landing', key: 'getstarted' },
      ],
      translated: [],
      stale: [],
    });

    expect(output).toContain('spa is missing 2 key(s)');
    expect(output).toContain('common:farewell');
    expect(output).toContain('common:greeting');
    expect(output).toContain('hat is missing 1 key(s)');
    expect(output).toContain('saas-landing:getstarted');
  });
});

describe('checkLocaleParity — interpolation placeholders', () => {
  // A key can exist and still be broken. i18next substitutes {{count}} at
  // render time; a translation that drops it renders a sentence with the
  // number missing, and one that renames it renders the raw "{{name}}" text.
  // Key-presence parity cannot see either, so CI has to compare the sets.
  it('flags a translation that drops a placeholder the source defines', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { synced: '{{count}} records synced' } },
        spa: { common: { synced: 'registros sincronizados' } },
      },
    });

    expect(report.placeholders).toEqual([
      {
        locale: 'spa', namespace: 'common', key: 'synced', expected: ['count'], actual: [],
      },
    ]);
  });

  it('flags a translation that renames a placeholder', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { greeting: 'Hello, {{name}}.' } },
        spa: { common: { greeting: 'Hola, {{nombre}}.' } },
      },
    });

    expect(report.placeholders).toHaveLength(1);
    expect(report.placeholders[0]).toMatchObject({ expected: ['name'], actual: ['nombre'] });
  });

  it('accepts a translation that reorders placeholders', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { range: '{{from}} to {{to}}' } },
        spa: { common: { range: 'hasta {{to}} desde {{from}}' } },
      },
    });

    expect(report.placeholders).toEqual([]);
  });
});

describe('checkLocaleParity — unexpected keys', () => {
  // The mirror of `missing`, and the half that was absent. The retired `deu`
  // catalog held a key literally named `zurück` — someone translated the KEY
  // rather than the value — so a real translation of "back to home" existed
  // that no `t('back')` call could ever reach. Nothing flagged it for months.
  it('flags a key the locale defines that the default locale does not', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'deu'],
      catalogs: {
        eng: { common: { back: 'back to home' } },
        deu: { common: { back: 'zurück nach Hause', 'zurück': 'zurück nach Hause' } },
      },
    });

    expect(report.unexpected).toEqual([
      { locale: 'deu', namespace: 'common', key: 'zurück' },
    ]);
  });

  it('flags every key of a namespace the default locale does not ship', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { greeting: 'Hello' } },
        spa: { common: { greeting: 'Hola' }, legacy: { old_key: 'viejo' } },
      },
    });

    expect(report.unexpected).toEqual([
      { locale: 'spa', namespace: 'legacy', key: 'old_key' },
    ]);
  });

  it('stays silent when the locale mirrors the default exactly', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { greeting: 'Hello' } },
        spa: { common: { greeting: 'Hola' } },
      },
    });

    expect(report.unexpected).toEqual([]);
  });
});

describe('checkLocaleParity — nested catalogs', () => {
  // next-i18next supports nested JSON, and Collect's catalogs are nested.
  // Manage's are flat today, so comparing only top-level keys happens to work
  // — but it fails OPEN: a nested child could vanish and the gate would call
  // the locale complete. A gate that under-checks silently is worse than no
  // gate, because the green build is taken as proof.
  it('reports a missing nested key by its dotted path', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { nav: { home: 'Home', away: 'Away' } } },
        spa: { common: { nav: { home: 'Inicio' } } },
      },
    });

    expect(report.missing).toEqual([
      { locale: 'spa', namespace: 'common', key: 'nav.away' },
    ]);
  });

  it('checks placeholders inside nested values', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { stats: { synced: '{{count}} synced' } } },
        spa: { common: { stats: { synced: 'sincronizados' } } },
      },
    });

    expect(report.placeholders).toEqual([
      {
        locale: 'spa', namespace: 'common', key: 'stats.synced', expected: ['count'], actual: [],
      },
    ]);
  });

  it('reports an unexpected nested key by its dotted path', () => {
    const report = checkLocaleParity({
      defaultLocale: 'eng',
      locales: ['eng', 'spa'],
      catalogs: {
        eng: { common: { nav: { home: 'Home' } } },
        spa: { common: { nav: { home: 'Inicio', legacy: 'viejo' } } },
      },
    });

    expect(report.unexpected).toEqual([
      { locale: 'spa', namespace: 'common', key: 'nav.legacy' },
    ]);
  });
});
