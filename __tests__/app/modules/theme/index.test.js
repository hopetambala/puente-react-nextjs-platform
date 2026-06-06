// ─── RED: Source Serif 4 in-app body font (audit F-08) ───────────────────────
// If the MUI theme body fontFamily reverts to Source Serif 4, the editorial
// typeface bleeds into every MUI component across the app — caught before any
// designer notices inconsistent body text in production.

const theme = require('app/modules/theme').default;

describe('MUI theme typography (audit F-08)', () => {
  it('uses Plus Jakarta Sans as the base body font', () => {
    expect(theme.typography.fontFamily).toMatch('Plus Jakarta Sans');
  });

  it('does not use Source Serif 4 as the base body font', () => {
    expect(theme.typography.fontFamily).not.toMatch('Source Serif 4');
  });

  it('uses Plus Jakarta Sans for all heading variants', () => {
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((variant) => {
      expect(theme.typography[variant].fontFamily).toMatch('Plus Jakarta Sans');
    });
  });

  it('uses Plus Jakarta Sans for the button variant', () => {
    expect(theme.typography.button.fontFamily).toMatch('Plus Jakarta Sans');
  });
});
