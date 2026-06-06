import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// ─── RED: PageHeader adoption (audit F-02) ────────────────────────────────────
// If the page reverts to <Text element="h1"> the page-header testid disappears —
// catches the heading pattern regression before any deploy.

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ pathname: '/forms/form-manager', push: jest.fn() })),
}));

jest.mock('app/modules/user', () => ({
  parseUserValue: jest.fn(() => ({ organization: 'test-org' })),
}));

jest.mock('app/store', () => ({
  useGlobalState: jest.fn(() => ({
    contextManagment: { addPropToStore: jest.fn(), store: {} },
  })),
}));

jest.mock('app/epics/FormManager', () =>
  jest.fn(() => <div data-testid="form-manager-epic" />));

jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children }) => <div data-testid="appshell">{children}</div>,
  PageHeader: ({ title, sub }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  ),
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
}));

const Manager = require('pages/forms/form-manager/index').default;

describe('Shell', () => {
  it('renders AppShell', () => {
    render(<Manager />);
    expect(screen.getByTestId('appshell')).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders via PageHeader component (not a raw heading element)', () => {
    render(<Manager />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('displays "Form Manager" as the title', () => {
    render(<Manager />);
    expect(screen.getByRole('heading', { name: 'Form Manager' })).toBeInTheDocument();
  });

  it('renders a descriptive sub line', () => {
    render(<Manager />);
    expect(screen.getByText(/manage.*forms/i)).toBeInTheDocument();
  });
});

describe('Content', () => {
  it('renders the FormManager epic sub-component', () => {
    render(<Manager />);
    expect(screen.getByTestId('form-manager-epic')).toBeInTheDocument();
  });
});
