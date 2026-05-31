import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/data/data-curation' }),
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      const map = {
        nav_data_curation: 'Data Curation',
        data_curation_sub: 'Curate, clean, and review collected records.',
        data_curation_empty: 'Data curation tools are coming soon.',
      };
      return map[key] ?? opts?.defaultValue ?? key;
    },
  }),
}));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => null),
  retrieveSignOutFunction: jest.fn(() => Promise.resolve()),
}));

jest.mock('app/services/parse', () => ({
  __esModule: true,
  default: { initialize: jest.fn() },
}));

jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children, breadcrumb }) => (
    <div data-testid="appshell" data-breadcrumb={JSON.stringify(breadcrumb)}>{children}</div>
  ),
  PageHeader: ({ title }) => <h1>{title}</h1>,
  EmptyState: ({ message }) => <div data-testid="empty-state">{message}</div>,
}));

const DataCuration = require('pages/data/data-curation/index').default;

describe('DataCuration page', () => {
  it('renders inside AppShell with Data breadcrumb', () => {
    render(<DataCuration />);
    const shell = screen.getByTestId('appshell');
    expect(JSON.parse(shell.dataset.breadcrumb)).toContain('Data');
  });

  it('renders a Data Curation heading', () => {
    render(<DataCuration />);
    expect(screen.getByRole('heading', { name: /data curation/i })).toBeInTheDocument();
  });
});
