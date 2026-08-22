import { formatQuietDuration } from 'app/epics/DashboardTriage/coverage';

describe('formatQuietDuration', () => {
  it('uses days at a scale where a day is meaningful', () => {
    expect(formatQuietDuration(18)).toEqual({ key: 'coverage_quiet_days', count: 18 });
  });

  it('switches to months once day-precision is noise', () => {
    expect(formatQuietDuration(120)).toEqual({ key: 'coverage_quiet_months', count: 4 });
  });

  it('switches to years rather than reporting four-digit days', () => {
    // 2072 days rendered as "quiet 2072d" is false precision.
    expect(formatQuietDuration(2072)).toEqual({ key: 'coverage_quiet_years', count: 5 });
  });

  it('reports today as today, not zero days', () => {
    expect(formatQuietDuration(0)).toEqual({ key: 'coverage_quiet_today', count: 0 });
  });

  it('returns null for an unknown duration rather than guessing', () => {
    expect(formatQuietDuration(null)).toBeNull();
  });
});
