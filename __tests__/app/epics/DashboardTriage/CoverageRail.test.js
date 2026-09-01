import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key}:${JSON.stringify(opts)}` : key) }),
}));

// eslint-disable-next-line import/first
import CoverageRail from 'app/epics/DashboardTriage/CoverageRail';

const summary = (over = {}) => ({
  communities: [
    { name: 'Batey 7', records: 198, lastSyncedAt: new Date(), daysQuiet: 18 },
    { name: 'Los Alcarrizos', records: 412, lastSyncedAt: new Date(), daysQuiet: 0 },
  ],
  approximate: false,
  skippedNoCommunity: 0,
  counted: 610,
  ...over,
});

describe('CoverageRail', () => {
  it('lists each community with its record count', () => {
    render(<CoverageRail summary={summary()} loading={false} />);

    expect(screen.getByText('Batey 7')).toBeInTheDocument();
    expect(screen.getByText('198')).toBeInTheDocument();
  });

  it('flags a community that has gone quiet', () => {
    render(<CoverageRail summary={summary()} loading={false} />);

    expect(screen.getByTestId('coverage-row-Batey 7')).toHaveTextContent(/coverage_quiet/);
  });

  it('does not flag a community that synced recently', () => {
    render(<CoverageRail summary={summary()} loading={false} />);

    expect(screen.getByTestId('coverage-row-Los Alcarrizos')).not.toHaveTextContent(/coverage_quiet/);
  });

  it('discloses that the figures are sampled when the sample saturated', () => {
    render(<CoverageRail summary={summary({ approximate: true })} loading={false} />);

    expect(screen.getByText(/coverage_sampled/)).toBeInTheDocument();
  });

  it('stays silent about sampling when the sample did not saturate', () => {
    render(<CoverageRail summary={summary({ approximate: false })} loading={false} />);

    expect(screen.queryByText(/coverage_sampled/)).not.toBeInTheDocument();
  });

  it('reports records it could not attribute to any community', () => {
    render(<CoverageRail summary={summary({ skippedNoCommunity: 4 })} loading={false} />);

    expect(screen.getByText(/coverage_unattributed/)).toBeInTheDocument();
  });

  it('shows at most six communities so the rail cannot outweigh the queue', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `C${i}`, records: 1, lastSyncedAt: new Date(), daysQuiet: 100 + i,
    }));
    render(<CoverageRail summary={summary({ communities: many })} loading={false} />);

    expect(screen.getAllByTestId(/^coverage-row-/)).toHaveLength(6);
  });

  it('says how many communities it did not show', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `C${i}`, records: 1, lastSyncedAt: new Date(), daysQuiet: 100 + i,
    }));
    render(<CoverageRail summary={summary({ communities: many })} loading={false} />);

    expect(screen.getByText(/coverage_more.*"count":14/)).toBeInTheDocument();
  });

  it('does not add a more-note when everything fits', () => {
    render(<CoverageRail summary={summary()} loading={false} />);

    expect(screen.queryByText(/coverage_more/)).not.toBeInTheDocument();
  });

  it('coarsens a multi-year silence instead of printing four-digit days', () => {
    render(<CoverageRail
      summary={summary({
        communities: [{ name: 'Old', records: 1, lastSyncedAt: new Date(), daysQuiet: 2072 }],
      })}
      loading={false}
    />);

    expect(screen.getByTestId('coverage-row-Old')).toHaveTextContent(/coverage_quiet_years.*"count":5/);
    expect(screen.getByTestId('coverage-row-Old')).not.toHaveTextContent(/2072/);
  });

  it('shows an empty state when no community has synced', () => {
    render(<CoverageRail summary={summary({ communities: [] })} loading={false} />);

    expect(screen.getByTestId('coverage-empty')).toBeInTheDocument();
  });

  it('shows placeholders while loading', () => {
    render(<CoverageRail summary={null} loading />);

    expect(screen.getByTestId('coverage-loading')).toBeInTheDocument();
  });
});

describe('CoverageRail denominator', () => {
  it('states the denominator once for the whole rail rather than repeating it per row', () => {
    render(<CoverageRail summary={summary({ counted: 610 })} loading={false} />);

    expect(screen.getByTestId('coverage-denominator'))
      .toHaveTextContent(/coverage_denominator:\{"count":610\}/);
  });
});
