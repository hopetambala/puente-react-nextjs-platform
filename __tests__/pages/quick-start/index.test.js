import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

// Resolve t() against the REAL eng locale and shout when a key is absent, so a
// single assertion below proves every key the page uses actually ships.
// eslint-disable-next-line global-require
const eng = require('public/locales/eng/common.json');

const translate = (key, opts) => {
  if (!(key in eng)) return `MISSING:${key}`;
  let out = eng[key];
  if (opts) {
    Object.entries(opts).forEach(([k, v]) => {
      out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    });
  }
  return out;
};

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: translate }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), pathname: '/quick-start' }) }));
jest.mock('parse', () => ({ Parse: { Query: jest.fn(), Object: { extend: jest.fn() } } }));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: () => ({
    get: (f) => ({ firstname: 'Yolanda', organization: 'Puente' }[f]),
  }),
}));

const mockLoad = jest.fn();
jest.mock('app/epics/DashboardTriage/loadTriage', () => ({
  SAMPLE_SIZE: 1000,
  loadDashboardTriage: (...a) => mockLoad(...a),
}));

// eslint-disable-next-line import/first
import Dashboard from 'pages/quick-start';

const payload = (over = {}) => ({
  accountsSynced: { count: 7, exact: false },
  sync: { lastSyncAt: new Date(Date.now() - 3 * 3600 * 1000), recordsLast24h: 47 },
  signals: {
    missingKeyFields: { count: 12, exact: true },
    unresolvedParent: { count: 2, exact: true },
    possibleDuplicates: { count: 3, exact: false },
    possibleFormDrift: { count: 1, exact: false },
  },
  coverage: {
    records: [
      { community: 'Batey 7', syncedAt: new Date(Date.now() - 18 * 86400000) },
      { community: 'Los Alcarrizos', syncedAt: new Date() },
    ],
    sampleSize: 1000,
  },
  ...over,
});

beforeEach(() => {
  mockLoad.mockReset();
  mockLoad.mockResolvedValue(payload());
});

describe('Shell', () => {
  it('renders inside AppShell with the Dashboard breadcrumb', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(mockLoad).toHaveBeenCalled());

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

describe('Org scoping', () => {
  it('loads triage data for the signed-in user organization', async () => {
    render(<Dashboard />);

    await waitFor(() => expect(mockLoad).toHaveBeenCalledWith(
      expect.objectContaining({ orgValues: ['Puente'] }),
    ));
  });
});

describe('Composition', () => {
  it('renders the sync ribbon', async () => {
    render(<Dashboard />);

    expect(await screen.findByTestId('sync-ribbon')).toBeInTheDocument();
  });

  it('renders a queue row for each signal that has work', async () => {
    render(<Dashboard />);

    expect(await screen.findByTestId('triage-row-form-drift')).toBeInTheDocument();
    expect(screen.getByTestId('triage-row-missing-key-fields')).toBeInTheDocument();
    expect(screen.getByTestId('triage-row-unresolved-parent')).toBeInTheDocument();
    expect(screen.getByTestId('triage-row-possible-duplicates')).toBeInTheDocument();
  });

  it('puts the form-drift row first, above larger counts', async () => {
    render(<Dashboard />);
    await screen.findByTestId('triage-row-form-drift');

    // Scope to the queue: AppShell's nav also renders links.
    const ids = screen.getAllByRole('link')
      .map((a) => a.getAttribute('data-testid'))
      .filter((id) => id && id.startsWith('triage-row-'));
    expect(ids[0]).toBe('triage-row-form-drift');
  });

  it('renders the coverage rail with the quietest community first', async () => {
    render(<Dashboard />);

    expect(await screen.findByTestId('coverage-row-Batey 7')).toBeInTheDocument();
  });
});

describe('Honesty', () => {
  it('every translation key the page uses exists in the eng locale', async () => {
    render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    expect(document.body.textContent).not.toMatch(/MISSING:/);
  });

  it('never calls a timestamp "collected" — createdAt is sync time', async () => {
    render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    // The defect guarded against is labelling SYNC time as collection time.
    // The ribbon is where the timestamp lives, so it must never say "collected".
    expect(screen.getByTestId('sync-ribbon')).not.toHaveTextContent(/collected/i);
    expect(screen.getByTestId('sync-ribbon')).toHaveTextContent(/synced/i);

    // The context strip DOES say "collected" on purpose — it draws the contrast
    // ("accounts that synced, not people who collected"). Drawing that
    // distinction explicitly is the desired behaviour, so assert the contrast
    // survives rather than banning the word.
    expect(screen.getByTestId('context-strip')).toHaveTextContent(/synced/i);
    expect(screen.getByTestId('context-strip')).toHaveTextContent(/not people who collected/i);
  });

  it('discloses that the surveyor figure is sampled rather than exact', async () => {
    render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    expect(screen.getByTestId('context-strip')).toHaveTextContent(/sampled/i);
  });
});

describe('Removed by design', () => {
  it('does not greet the user — the most-visited screen spends no row on it', async () => {
    render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    expect(screen.queryByText(/good morning/i)).not.toBeInTheDocument();
  });

  it('does not render the undifferentiated activity feed', async () => {
    render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    expect(screen.queryByText(eng.field_activity)).not.toBeInTheDocument();
    expect(screen.queryByText(/submitted a record/i)).not.toBeInTheDocument();
  });

  it('does not render the forms list — navigation is not attention', async () => {
    render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    expect(screen.queryByText(eng.your_forms)).not.toBeInTheDocument();
  });

  it('does not render a chart', async () => {
    const { container } = render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    expect(container.querySelector('svg[class*="spark"], canvas')).toBeNull();
  });
});

describe('Empty and failure states', () => {
  it('says the queue is clear rather than showing a void', async () => {
    mockLoad.mockResolvedValue(payload({
      signals: {
        missingKeyFields: { count: 0, exact: true },
        unresolvedParent: { count: 0, exact: true },
        possibleDuplicates: { count: 0, exact: false },
        possibleFormDrift: { count: 0, exact: false },
      },
    }));
    render(<Dashboard />);

    expect(await screen.findByTestId('triage-clear')).toBeInTheDocument();
  });

  it('withholds the all-clear when a single check failed to run', async () => {
    mockLoad.mockResolvedValue(payload({
      signals: {
        missingKeyFields: { count: 0, exact: true },
        unresolvedParent: { count: 0, exact: true },
        possibleDuplicates: null, // query failed
        possibleFormDrift: { count: 0, exact: false },
      },
    }));
    render(<Dashboard />);

    // A failed check must never look like a passed check on this screen.
    expect(await screen.findByTestId('triage-partial')).toBeInTheDocument();
    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
  });

  it('still renders the page when loading the data fails outright', async () => {
    mockLoad.mockRejectedValue(new Error('offline'));
    render(<Dashboard />);

    await waitFor(() => expect(mockLoad).toHaveBeenCalled());
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('tells a brand-new organization where records come from, instead of an all-clear', async () => {
    // Never synced: the reads RAN (lastSyncAvailable) and genuinely found
    // nothing, so every check returns an exact zero. Reporting that as "every
    // record passed the quality checks" is a quality verdict on an empty
    // database — and it is the first thing a new user sees.
    mockLoad.mockResolvedValue(payload({
      sync: { lastSyncAt: null, lastSyncAvailable: true, recordsLast24h: 0 },
      signals: {
        missingKeyFields: { count: 0, exact: true },
        unresolvedParent: { count: 0, exact: true },
        possibleDuplicates: { count: 0, exact: false },
        possibleFormDrift: { count: 0, exact: false },
      },
      coverage: { records: [], sampleSize: 1000 },
    }));
    render(<Dashboard />);

    expect(await screen.findByTestId('triage-no-records')).toBeInTheDocument();
    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
    // Records are not entered in this web app, so the onboarding copy has to
    // ship in the locale — a raw key here strands a first-time user.
    expect(document.body.textContent).not.toMatch(/MISSING:/);
  });

  it('does not turn a failed freshness read into a claim about the organization', async () => {
    // The freshness read FAILED (network, permissions) while every quality
    // check ran and returned an exact zero. A failed request tells us nothing
    // about this organization's fieldwork, so the screen must not spend it on
    // any claim about their data.
    mockLoad.mockResolvedValue(payload({
      sync: { lastSyncAt: null, lastSyncAvailable: false, recordsLast24h: 0 },
      signals: {
        missingKeyFields: { count: 0, exact: true },
        unresolvedParent: { count: 0, exact: true },
        possibleDuplicates: { count: 0, exact: false },
        possibleFormDrift: { count: 0, exact: false },
      },
      coverage: { records: [], sampleSize: 1000 },
    }));
    render(<Dashboard />);

    // Nothing found, but the screen cannot account for everything.
    expect(await screen.findByTestId('triage-partial')).toBeInTheDocument();
    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
    expect(screen.queryByTestId('triage-no-records')).not.toBeInTheDocument();

    // "Nothing has synced yet" asserts the organization has never collected
    // anything — our own failed read must never be reported as their fieldwork.
    expect(screen.getByTestId('sync-ribbon')).not.toHaveTextContent(/Nothing has synced yet/);

    expect(document.body.textContent).not.toMatch(/MISSING:/);
  });

  it('does not report a total load failure as a clean bill of health', async () => {
    // The whole load failed, so NOTHING was checked. The screen knows nothing
    // about this organization's data quality — least of all that it is fine.
    mockLoad.mockRejectedValue(new Error('offline'));
    render(<Dashboard />);

    await waitFor(() => expect(mockLoad).toHaveBeenCalled());
    // Wait for the queue to actually finish loading before asserting an
    // ABSENCE, otherwise the assertion passes vacuously against a skeleton
    // that simply has not rendered a verdict yet.
    await waitFor(() => expect(screen.queryByTestId('triage-loading')).not.toBeInTheDocument());

    expect(screen.queryByTestId('triage-clear')).not.toBeInTheDocument();
    // A failed load must still leave the page standing, not blank the screen.
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows a placeholder in the context strip when the 24-hour count could not be read', async () => {
    // The load SUCCEEDED — only the 24h count query failed — so `data` is
    // present and every other figure on the strip is real. React renders that
    // lone `null` as nothing, leaving an empty slot beside "Records synced ·
    // last 24 hours", which reads as a broken screen rather than as a figure we
    // could not read.
    mockLoad.mockResolvedValue(payload({
      sync: {
        lastSyncAt: new Date(Date.now() - 3 * 3600 * 1000),
        lastSyncAvailable: true,
        recordsLast24h: null,
      },
    }));
    render(<Dashboard />);
    await screen.findByTestId('sync-ribbon');

    const strip = screen.getByTestId('context-strip');
    // The same em-dash the strip already shows when the whole load failed, so a
    // value we could not read looks deliberate instead of missing.
    expect(strip).toHaveTextContent('—');
    // A zero that is not part of a longer number, so the zeros inside the
    // "1,000 records" caveat cannot satisfy it and a bare "0" abutting the
    // label still can: the only thing that matches is a fabricated count.
    expect(strip).not.toHaveTextContent(/(?<!\d)0(?!\d)/);
  });
});
