import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

// ─── RED: wrong h1 title in account management (audit F-02) ──────────────────
// The page currently renders <Text text="PUENTE" element="h1"> inside a Card —
// wrong title AND wrong component pattern. PageHeader should be used, and the
// title should describe the page ("Account Settings"), not the brand name.

jest.mock('next/router', () => ({
  useRouter: () => ({ query: { objectId: 'user-123' }, push: jest.fn() }),
}));

jest.mock('app/modules/user', () => ({
  retrieveSignInFunction: jest.fn().mockResolvedValue({}),
  retrieveUserByObjectId: jest.fn().mockResolvedValue({
    attributes: {
      firstname: 'Hope',
      lastname: 'Tambala',
      organization: 'test-org',
      phonenumber: '555-1234',
      email: 'hope@puente-dr.org',
    },
  }),
  updateUser: jest.fn().mockResolvedValue({ username: 'hope', password: 'pass' }),
}));

jest.mock('@hookform/resolvers', () => ({ yupResolver: () => () => ({}) }));
jest.mock('yup', () => ({
  object: () => ({ shape: () => ({ required: () => ({}) }) }),
  string: () => ({ required: () => ({}) }),
}));

jest.mock('app/impacto-design-system', () => ({
  AppShell: ({ children }) => <div>{children}</div>,
  PageHeader: ({ title, sub }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  ),
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Card: ({ children }) => <div>{children}</div>,
  Spinner: () => <div data-testid="spinner" />,
  Stack: ({ children }) => <div>{children}</div>,
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
}));

const ManagementWrapper = require('pages/account/management/index').default;

describe('PageHeader', () => {
  it('renders via PageHeader component (not raw h1 "PUENTE")', async () => {
    render(<ManagementWrapper />);
    await waitFor(() => expect(screen.getByTestId('page-header')).toBeInTheDocument());
  });

  it('does not show "PUENTE" as the page heading', async () => {
    render(<ManagementWrapper />);
    await waitFor(() => expect(screen.getByTestId('page-header')).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'PUENTE' })).not.toBeInTheDocument();
  });

  it('shows "Account Settings" as the title', async () => {
    render(<ManagementWrapper />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Account Settings' })).toBeInTheDocument(),
    );
  });
});
