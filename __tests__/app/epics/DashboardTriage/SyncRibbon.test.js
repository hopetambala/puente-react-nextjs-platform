import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({
  // Return the key so the tests assert on keys — a hardcoded English string
  // would show up as literal text and fail the no-English assertions.
  useTranslation: () => ({ t: (key, opts) => (opts ? `${key}:${JSON.stringify(opts)}` : key) }),
}));

// eslint-disable-next-line import/first
import SyncRibbon from 'app/epics/DashboardTriage/SyncRibbon';

const state = (over = {}) => ({
  status: 'fresh', hoursSince: 3, daysSince: 0, recordsLast24h: 47, ...over,
});

describe('SyncRibbon', () => {
  it('exposes itself as a labelled region so it can be reached directly', () => {
    render(<SyncRibbon state={state()} loading={false} />);

    expect(screen.getByRole('region')).toHaveAccessibleName();
  });

  it('shows how many records arrived', () => {
    render(<SyncRibbon state={state({ recordsLast24h: 47 })} loading={false} />);

    expect(screen.getByText(/47/)).toBeInTheDocument();
  });

  it('labels the timestamp as SYNCED, never as collected', () => {
    render(<SyncRibbon state={state()} loading={false} />);

    expect(screen.getByTestId('sync-ribbon')).toHaveTextContent(/sync_ribbon_synced/);
    expect(screen.queryByText(/collected/i)).not.toBeInTheDocument();
  });

  it('surfaces a warning when the last sync is stale', () => {
    render(<SyncRibbon state={state({ status: 'stale', daysSince: 9, hoursSince: 216 })} loading={false} />);

    expect(screen.getByTestId('sync-ribbon')).toHaveTextContent(/sync_ribbon_status_stale/);
  });

  it('does not claim staleness when the sync is fresh', () => {
    render(<SyncRibbon state={state()} loading={false} />);

    expect(screen.getByTestId('sync-ribbon')).not.toHaveTextContent(/status_stale/);
  });

  it('handles never-synced without crashing or showing a bogus count', () => {
    render(<SyncRibbon state={state({ status: 'never', hoursSince: null, daysSince: null, recordsLast24h: 0 })} loading={false} />);

    expect(screen.getByTestId('sync-ribbon')).toHaveTextContent(/sync_ribbon_status_never/);
  });

  it('renders a placeholder while loading instead of a zero', () => {
    render(<SyncRibbon state={null} loading />);

    expect(screen.getByTestId('sync-ribbon-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('sync-ribbon')).not.toBeInTheDocument();
  });
});
