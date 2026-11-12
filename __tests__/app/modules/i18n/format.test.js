/**
 * Dates and money in the interface's language, not the browser's (design
 * review X18). Four tables called toLocaleDateString() and billing used
 * Intl.NumberFormat(undefined), so a Spanish interface on an English browser
 * showed US month/day dates in a country that reads day/month.
 */
const { formatDate, formatDateTime, formatMoney } = require('app/modules/i18n/format');

const NOV_9 = new Date(Date.UTC(2026, 10, 9, 15, 30));

describe('formatDate', () => {
  it('writes day before month for Spanish and Creole, month first for English', () => {
    expect(formatDate(NOV_9, 'spa')).toMatch(/^9\/11\/2026$/);
    expect(formatDate(NOV_9, 'hat')).toMatch(/^9\/11\/2026$|^09\/11\/2026$/);
    expect(formatDate(NOV_9, 'eng')).toMatch(/^11\/9\/2026$/);
  });

  it('accepts ISO strings and timestamps, and shows a dash for nothing', () => {
    expect(formatDate('2026-11-09T15:30:00Z', 'spa')).toMatch(/^9\/11\/2026$/);
    expect(formatDate(NOV_9.getTime(), 'eng')).toMatch(/^11\/9\/2026$/);
    expect(formatDate(null, 'eng')).toBe('—');
    expect(formatDate('not a date', 'eng')).toBe('—');
  });

  it('falls back to English for an unknown interface language', () => {
    expect(formatDate(NOV_9, 'xx')).toMatch(/^11\/9\/2026$/);
  });
});

describe('formatDateTime', () => {
  it('includes the time, in the interface language', () => {
    expect(formatDateTime(NOV_9, 'spa')).toMatch(/^9\/11\/2026.*\d{1,2}:30/);
  });
});

describe('formatMoney', () => {
  it('formats Stripe minor units in the interface language', () => {
    expect(formatMoney(123456, 'usd', 'eng')).toBe('$1,234.56');
    expect(formatMoney(123456, 'usd', 'spa')).toMatch(/1[.\s ]?234,56/);
  });

  it('treats a missing amount as zero and a missing currency as USD', () => {
    expect(formatMoney(undefined, undefined, 'eng')).toBe('$0.00');
  });
});
