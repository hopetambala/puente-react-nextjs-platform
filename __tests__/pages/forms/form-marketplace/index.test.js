import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// ─── RED: PageHeader missing from Marketplace page (audit F-02) ───────────────
// If the page renders a raw h1 instead of PageHeader, or if PageHeader is
// replaced with a wrapper div, the page-header testid disappears — caught
// before the heading pattern regression reaches production.

jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('app/store', () => ({
  useGlobalState: () => ({ contextManagment: { addPropToStore: jest.fn(), store: {} } }),
}));
jest.mock('app/modules/user', () => ({ parseUserValue: () => ({ organization: 'test-org' }) }));
jest.mock('app/modules/user/useCurrentUser', () => ({
  __esModule: true,
  default: jest.fn(() => ({ organization: 'hook-org' })),
}));
jest.mock('app/epics/FormMarketplace', () => jest.fn(() => <div data-testid="marketplace-epic" />));
jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children }) => <div>{children}</div>,
  PageHeader: ({ title, sub }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  ),
}));

const Marketplace = require('pages/forms/form-marketplace/index').default;

describe('PageHeader', () => {
  it('renders via PageHeader component (not a raw h1)', () => {
    render(<Marketplace />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('displays "Form Marketplace" as the title', () => {
    render(<Marketplace />);
    expect(screen.getByRole('heading', { name: 'Form Marketplace' })).toBeInTheDocument();
  });
});

describe('Epic rendered', () => {
  it('renders the FormMarketplace epic below the header', () => {
    render(<Marketplace />);
    expect(screen.getByTestId('marketplace-epic')).toBeInTheDocument();
  });
});

describe('Reactive user', () => {
  it('passes the user from useCurrentUser to the FormMarketplace epic', () => {
    render(<Marketplace />);
    const FormMarketplace = require('app/epics/FormMarketplace');
    expect(FormMarketplace).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ organization: 'hook-org' }) }),
      expect.anything(),
    );
  });
});
