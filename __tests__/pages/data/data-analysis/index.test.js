import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// ─── RED: PageHeader adoption (audit F-02) ────────────────────────────────────
// If the raw <h1> is restored instead of PageHeader, the page-header testid
// disappears — catches heading pattern regression before deploy.

jest.mock('app/modules/user', () => ({
  parseUserValue: jest.fn(() => null),
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
    expect(JSON.parse(shell.dataset.breadcrumb)).toEqual(['Data', 'Analysis']);
  });
});

describe('PageHeader', () => {
  it('renders via PageHeader component (not a raw h1)', () => {
    render(<DataAnalysis />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('displays "Data Analysis" as the title', () => {
    render(<DataAnalysis />);
    expect(screen.getByRole('heading', { name: 'Data Analysis' })).toBeInTheDocument();
  });
});

describe('Content', () => {
  it('renders the DataAnalyticsManager sub-component', () => {
    render(<DataAnalysis />);
    expect(screen.getByTestId('data-analytics-manager')).toBeInTheDocument();
  });
});
