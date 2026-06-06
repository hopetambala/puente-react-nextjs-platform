import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

// Per-query mock: each Parse.Query() returns its own recorder, and find()
// resolves by content (class + whether select() was used) so tests don't depend
// on the order effects fire in.
let mockQueryInstances = [];
let mockRecordsCount = 0;
let mockActivityData = [];
let mockFormsData = [];
let mockSurveyorsData = [];

jest.mock('parse', () => ({
  Parse: {
    Object: { extend: jest.fn((cls) => cls) },
    Query: jest.fn((cls) => {
      const inst = {
        cls,
        _select: null,
        descending: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        equalTo: jest.fn().mockReturnThis(),
        greaterThanOrEqualTo: jest.fn().mockReturnThis(),
        select: jest.fn(function select(f) { this._select = f; return this; }),
        count: jest.fn(() => Promise.resolve(mockRecordsCount)),
        distinct: jest.fn(() => Promise.resolve([])),
        find: jest.fn(function find() {
          if (this.cls === 'FormSpecificationsV2') return Promise.resolve(mockFormsData);
          if (this._select === 'surveyingUser') return Promise.resolve(mockSurveyorsData);
          return Promise.resolve(mockActivityData);
        }),
      };
      mockQueryInstances.push(inst);
      return inst;
    }),
  },
}));

const surveyDataQueries = () => mockQueryInstances.filter((q) => q.cls === 'SurveyData');
const recordsQuery = () => surveyDataQueries().find((q) => q.count.mock.calls.length > 0);
const surveyorsQuery = () => surveyDataQueries().find((q) => q.select.mock.calls.length > 0);
const activityQuery = () => surveyDataQueries().find(
  (q) => q.descending.mock.calls.length > 0 && q.select.mock.calls.length === 0,
);
const formsQuery = () => mockQueryInstances.find((q) => q.cls === 'FormSpecificationsV2');
const daysAgo = (d) => Math.round((Date.now() - d.getTime()) / 86400000);

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/quick-start' }),
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const map = {
        stat_records: 'Records',
        stat_active_surveyors: 'Active surveyors',
        stat_window_30d: 'Last 30 days',
        field_activity: 'Field activity',
        your_forms: 'Your forms',
        dashboard_good_morning: opts ? `Good morning, ${opts.name}.` : 'Good morning.',
        dashboard_sub: "Here's what's moving.",
        dashboard_new_form: '+ New form',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('app/modules/user', () => ({
  // Parse stores the name as `firstname` (lowercase) — see registration/account.
  retrieveCurrentUserAsyncFunction: jest.fn(() => ({
    get: (key) => ({ firstname: 'Hope', organization: 'TestOrg' }[key] ?? null),
  })),
}));

jest.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: jest.fn().mockResolvedValue({}),
}));

// AppShell and its sub-components pull in router/i18n — mock as passthrough
jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children, breadcrumb }) => (
    <div data-testid="appshell" data-breadcrumb={JSON.stringify(breadcrumb)}>{children}</div>
  ),
  PageHeader: ({ eyebrow, title, sub }) => (
    <div data-testid="page-header">
      {eyebrow && <span>{eyebrow}</span>}
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  ),
  Badge: ({ children, variant }) => <span data-testid={`badge-${variant}`}>{children}</span>,
  Skeleton: ({ width, height }) => <span data-testid="skeleton" style={{ width, height }} />,
}));

const Dashboard = require('pages/quick-start/index').default;

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryInstances = [];
  mockRecordsCount = 0;
  mockActivityData = [];
  mockFormsData = [];
  mockSurveyorsData = [];
});

describe('Shell', () => {
  it('renders AppShell with Dashboard breadcrumb', async () => {
    render(<Dashboard />);
    const shell = screen.getByTestId('appshell');
    await waitFor(() => {
      expect(JSON.parse(shell.dataset.breadcrumb)).toEqual(['Dashboard']);
    });
  });
});

describe('Greeting', () => {
  // Reads the Parse `firstname` attribute — not camelCase `firstName`, which
  // silently left the greeting nameless for real users.
  it('greets the user by their firstname', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Good morning, Hope.')).toBeInTheDocument();
    });
  });
});

describe('Stat strip', () => {
  it('renders the "Records" label over a 30-day window (not "Records this month")', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Records')).toBeInTheDocument());
    expect(screen.queryByText('Records this month')).not.toBeInTheDocument();
    expect(screen.queryByText('Records today')).not.toBeInTheDocument();
  });

  it('shows a "Last 30 days" meta on both stat cards', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Active surveyors')).toBeInTheDocument());
    expect(screen.getAllByText('Last 30 days').length).toBe(2);
    expect(screen.queryByText('Last 7 days')).not.toBeInTheDocument();
  });

  it('does NOT render the Households card', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Active surveyors')).toBeInTheDocument());
    expect(screen.queryByText('Households surveyed')).not.toBeInTheDocument();
    expect(screen.queryByText('in territory')).not.toBeInTheDocument();
  });
});

describe('Metric windows — everything over the last 30 days', () => {
  it('queries records from ~30 days ago (not the start of the month)', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(recordsQuery()).toBeTruthy());
    const dates = recordsQuery().greaterThanOrEqualTo.mock.calls
      .filter(([f]) => f === 'createdAt').map(([, d]) => d);
    expect(dates.some((d) => daysAgo(d) >= 29 && daysAgo(d) <= 31)).toBe(true);
  });

  it('queries active surveyors from ~30 days ago', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(surveyorsQuery()).toBeTruthy());
    const dates = surveyorsQuery().greaterThanOrEqualTo.mock.calls
      .filter(([f]) => f === 'createdAt').map(([, d]) => d);
    expect(dates.some((d) => daysAgo(d) >= 29 && daysAgo(d) <= 31)).toBe(true);
  });

  it('queries field activity from ~30 days ago', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(activityQuery()).toBeTruthy());
    const dates = activityQuery().greaterThanOrEqualTo.mock.calls
      .filter(([f]) => f === 'createdAt').map(([, d]) => d);
    expect(dates.some((d) => daysAgo(d) >= 29 && daysAgo(d) <= 31)).toBe(true);
  });
});

describe('Org scoping — everything across the org, not just the user', () => {
  it('scopes the records query to the org', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(recordsQuery()).toBeTruthy());
    expect(recordsQuery().equalTo).toHaveBeenCalledWith('surveyingOrganization', 'TestOrg');
  });

  it('scopes the active-surveyors query to the org', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(surveyorsQuery()).toBeTruthy());
    expect(surveyorsQuery().equalTo).toHaveBeenCalledWith('surveyingOrganization', 'TestOrg');
  });

  it('scopes the field-activity query to the org', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(activityQuery()).toBeTruthy());
    expect(activityQuery().equalTo).toHaveBeenCalledWith('surveyingOrganization', 'TestOrg');
  });

  it('scopes the forms query to the org via organizations', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(formsQuery()).toBeTruthy());
    expect(formsQuery().equalTo).toHaveBeenCalledWith('organizations', 'TestOrg');
  });
});

describe('Panels', () => {
  it('renders Field activity panel heading', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Field activity')).toBeInTheDocument());
  });

  it('renders Your forms panel heading', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Your forms')).toBeInTheDocument());
  });
});

describe('Empty states', () => {
  it('shows "No recent submissions." when activity is empty', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('No recent submissions.')).toBeInTheDocument());
  });

  it('shows "No forms yet." when forms are empty', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('No forms yet.')).toBeInTheDocument());
  });
});

describe('Activity feed', () => {
  it('renders activity record text', async () => {
    mockActivityData = [{
      createdAt: new Date(2026, 4, 18, 10, 30),
      get: (key) => ({ surveyingUser: 'Yolanda' }[key]),
    }];
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Yolanda submitted a record')).toBeInTheDocument());
  });

  it('shows the date (not just the time) so rows read in order', async () => {
    mockActivityData = [{
      createdAt: new Date(2026, 4, 18, 10, 30), // May 18, 2026 (local)
      get: (key) => ({ surveyingUser: 'Yolanda' }[key]),
    }];
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/May\s*18/)).toBeInTheDocument());
  });
});

describe('Sparkline', () => {
  it('does not render a static sparkline chart', async () => {
    mockRecordsCount = 5;
    mockActivityData = [];
    mockFormsData = [];
    mockSurveyorsData = [];
    const { container } = render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Records')).toBeInTheDocument());
    expect(container.querySelector('.sparkline')).not.toBeInTheDocument();
    expect(container.querySelector('.bar')).not.toBeInTheDocument();
  });
});

describe('Forms panel', () => {
  it('renders form name when forms query resolves with a form', async () => {
    mockFormsData = [{ get: (key) => ({ name: 'WaSH Survey', active: 'true' }[key]) }];
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('WaSH Survey')).toBeInTheDocument());
  });

  it('filters forms to active only', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(formsQuery()).toBeTruthy());
    expect(formsQuery().equalTo).toHaveBeenCalledWith('active', 'true');
  });

  it('does not display a count number next to each form name', async () => {
    mockRecordsCount = 5;
    mockFormsData = [{ get: (key) => ({ name: 'Test Form', active: 'true' }[key]) }];
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Test Form')).toBeInTheDocument());
    const formRow = screen.getByText('Test Form').closest('.formRow');
    expect(formRow.querySelector('.formCount')).not.toBeInTheDocument();
  });
});

describe('Stat values', () => {
  it('shows the real records count', async () => {
    mockRecordsCount = 42;
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });

  it('counts distinct surveyors from sampled records (find + select, no distinct)', async () => {
    const surveyor = (u) => ({ get: (k) => (k === 'surveyingUser' ? u : undefined) });
    mockSurveyorsData = [surveyor('alice'), surveyor('bob'), surveyor('alice')];
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument());
    expect(mockQueryInstances.every((q) => q.distinct.mock.calls.length === 0)).toBe(true);
  });
});

describe('Dashboard stat copy (eng locale)', () => {
  // eslint-disable-next-line global-require
  const eng = require('public/locales/eng/common.json');

  it('uses "Records" and drops the old month/today keys', () => {
    expect(eng.stat_records).toBe('Records');
    expect(eng.stat_records_month).toBeUndefined();
    expect(eng.stat_records_today).toBeUndefined();
  });

  it('uses a shared "Last 30 days" window key', () => {
    expect(eng.stat_window_30d).toBe('Last 30 days');
  });

  it('removes the Households stat keys', () => {
    expect(eng.stat_households).toBeUndefined();
    expect(eng.stat_households_meta).toBeUndefined();
  });
});
