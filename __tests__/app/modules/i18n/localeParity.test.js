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
