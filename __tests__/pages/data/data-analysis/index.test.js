import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// ─── RED: PageHeader adoption (audit F-02) ────────────────────────────────────
// If the raw <h1> is restored instead of PageHeader, the page-header testid
// disappears — catches heading pattern regression before deploy.

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/modules/user', () => ({
  parseUserValue: jest.fn(() => null),
}));

jest.mock('app/modules/user/useCurrentUser', () => ({
  __esModule: true,
  default: jest.fn(() => ({ organization: 'hook-org' })),
}));

jest.mock('app/epics/DataAnalyticsManager', () =>
  jest.fn(() => <div data-testid="data-analytics-manager" />));

jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children, breadcrumb }) => (
    <div data-testid="appshell" data-breadcrumb={JSON.stringify(breadcrumb)}>{children}</div>
  ),
  PageHeader: ({ title, eyebrow, sub }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {eyebrow && <span>{eyebrow}</span>}
      {sub && <p>{sub}</p>}
    </div>
  ),
}));

const DataAnalysis = require('pages/data/data-analysis/index').default;

describe('Shell', () => {
  it('renders AppShell with Data / Analysis breadcrumb', () => {
    render(<DataAnalysis />);
    const shell = screen.getByTestId('appshell');
    expect(JSON.parse(shell.dataset.breadcrumb)).toEqual(['breadcrumb_data', 'breadcrumb_analysis']);
  });
});

describe('PageHeader', () => {
  it('renders via PageHeader component (not a raw h1)', () => {
    render(<DataAnalysis />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('routes the page title through t()', () => {
    render(<DataAnalysis />);
    expect(screen.getByRole('heading', { name: 'page_data_analysis_title' })).toBeInTheDocument();
  });
});

describe('Content', () => {
  it('renders the DataAnalyticsManager sub-component', () => {
    render(<DataAnalysis />);
    expect(screen.getByTestId('data-analytics-manager')).toBeInTheDocument();
  });
});

describe('Reactive user', () => {
  it('passes the user from useCurrentUser to the DataAnalyticsManager epic', () => {
    render(<DataAnalysis />);
    const DataAnalyticsManager = require('app/epics/DataAnalyticsManager');
    expect(DataAnalyticsManager).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ organization: 'hook-org' }) }),
      expect.anything(),
    );
  });
});

describe('Data Analysis page — copy', () => {
  it('routes the page title through t()', () => {
    render(<DataAnalysis />);
    expect(screen.getByText('page_data_analysis_title')).toBeInTheDocument();
  });

  // Without this the page ships no catalog to the client, and every `t()` on
  // it — including the shell's navigation — renders its key instead of a word.
  it('loads the common catalog server-side', async () => {
    const { getStaticProps } = require('pages/data/data-analysis');
    const result = await getStaticProps({ locale: 'spa' });
    expect(result.props).toHaveProperty('_nextI18Next');
  });
});
