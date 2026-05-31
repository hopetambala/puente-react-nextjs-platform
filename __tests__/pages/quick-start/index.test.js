import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

const mockFind = jest.fn().mockResolvedValue([]);
const mockCount = jest.fn().mockResolvedValue(0);
const mockDistinct = jest.fn().mockResolvedValue([]);
const mockQueryChain = {
  descending: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  greaterThanOrEqualTo: jest.fn().mockReturnThis(),
  equalTo: jest.fn().mockReturnThis(),
  find: mockFind,
  count: mockCount,
  distinct: mockDistinct,
};

let capturedQueryClasses = [];

jest.mock('parse', () => ({
  Parse: {
    Object: { extend: jest.fn(() => ({})) },
    Query: jest.fn((cls) => {
      capturedQueryClasses.push(cls);
      return mockQueryChain;
    }),
  },
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/quick-start' }),
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const map = {
        stat_records_today: 'Records today',
        stat_active_surveyors: 'Active surveyors',
        stat_households: 'Households surveyed',
        field_activity: 'Field activity',
        your_forms: 'Your forms',
        dashboard_good_morning: opts ? `Good morning, ${opts.name}.` : 'Good morning.',
        dashboard_sub: "Here's what's moving.",
        dashboard_new_form: '+ New form',
        stat_active_surveyors_meta: 'Last 7 days',
        stat_households_meta: 'in territory',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => ({
    get: (key) => ({ firstName: 'Hope', organization: 'TestOrg' }[key] ?? null),
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
  capturedQueryClasses = [];
  mockFind.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
  mockDistinct.mockResolvedValue([]);
});

// ─── RED: activity panel removal ─────────────────────────────────────────────
// If the "Field activity" panel is removed or its heading key changes, the
// panel test fails before any deploy — catching silent UI regressions.

describe('Shell', () => {
  it('renders AppShell with Dashboard breadcrumb', async () => {
    render(<Dashboard />);
    const shell = screen.getByTestId('appshell');
    await waitFor(() => {
      expect(JSON.parse(shell.dataset.breadcrumb)).toEqual(['Dashboard']);
    });
  });
});

describe('Stat strip', () => {
  it('renders Records today label', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Records today')).toBeInTheDocument();
    });
  });

  it('renders Active surveyors label', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Active surveyors')).toBeInTheDocument();
    });
  });

  it('renders Households surveyed label', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Households surveyed')).toBeInTheDocument();
    });
  });
});

describe('Panels', () => {
  it('renders Field activity panel heading', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Field activity')).toBeInTheDocument();
    });
  });

  it('renders Your forms panel heading', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Your forms')).toBeInTheDocument();
    });
  });
});

describe('Empty states', () => {
  it('shows "No recent submissions." when query returns empty array', async () => {
    mockFind.mockResolvedValue([]);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('No recent submissions.')).toBeInTheDocument();
    });
  });

  it('shows "No forms yet." when forms query returns empty array', async () => {
    mockFind.mockResolvedValue([]);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('No forms yet.')).toBeInTheDocument();
    });
  });
});

describe('Data states', () => {
  it('renders activity record text when query resolves with a record', async () => {
    const mockRecord = {
      createdAt: new Date('2026-05-18T10:30:00Z'),
      get: (key) => ({ surveyingUser: 'Yolanda' }[key]),
    };
    // First call = activity, second = forms
    mockFind
      .mockResolvedValueOnce([mockRecord])
      .mockResolvedValueOnce([]);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Yolanda submitted a record')).toBeInTheDocument();
    });
  });

  it('renders form name when forms query resolves with a form', async () => {
    const mockForm = {
      get: (key) => ({
        name: 'WaSH Survey',
        active: 'true',
      }[key]),
    };
    mockFind
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([mockForm]);
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('WaSH Survey')).toBeInTheDocument();
    });
  });
});

// ─── RED: real data queries ───────────────────────────────────────────────────
// These fail until the source uses FormSpecificationsV2 and a count query.

describe('Real data wiring', () => {
  it('queries FormSpecificationsV2 (not the old Form class)', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(mockFind).toHaveBeenCalled());
    expect(capturedQueryClasses).toContain('FormSpecificationsV2');
    expect(capturedQueryClasses).not.toContain('Form');
  });

  it('shows the real records-today count instead of \'–\' when count > 0', async () => {
    mockCount.mockResolvedValue(42);
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
  });

  it('shows 0 for records today when count returns 0', async () => {
    mockCount.mockResolvedValue(0);
    render(<Dashboard />);
    await waitFor(() => {
      // 0 should appear, not '–'
      const statValue = screen.getAllByText('0');
      expect(statValue.length).toBeGreaterThan(0);
    });
  });

  it('filters forms query to active forms only', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(mockFind).toHaveBeenCalled());
    expect(mockQueryChain.equalTo).toHaveBeenCalledWith('active', 'true');
  });
});

// ─── RED: Phase 2 — org-scoped real stats ────────────────────────────────────
// These fail until all 3 stat queries use equalTo('surveyingOrganization', org)
// and Active Surveyors uses distinct('surveyingUser').

describe('Phase 2 — Org-scoped stats', () => {
  it('scopes Records Today query to org via surveyingOrganization', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(mockCount).toHaveBeenCalled());
    expect(mockQueryChain.equalTo).toHaveBeenCalledWith('surveyingOrganization', 'TestOrg');
  });

  it('calls distinct("surveyingUser") for Active Surveyors', async () => {
    render(<Dashboard />);
    await waitFor(() => expect(mockDistinct).toHaveBeenCalled());
    expect(mockDistinct).toHaveBeenCalledWith('surveyingUser');
  });

  it('shows Active Surveyors count (not "–") when distinct returns array', async () => {
    mockDistinct.mockResolvedValue(['alice', 'bob', 'carol']);
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
  });

  it('shows Households count (not "–") when count resolves', async () => {
    mockCount.mockResolvedValue(99);
    render(<Dashboard />);
    await waitFor(() => {
      const values = screen.getAllByText('99');
      expect(values.length).toBeGreaterThan(0);
    });
  });
});
