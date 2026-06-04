import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

// ─── RED: wrong h1 title in account management (audit F-02) ──────────────────
// The page currently renders <Text text="PUENTE" element="h1"> inside a Card —
// wrong title AND wrong component pattern. PageHeader should be used, and the
// title should describe the page ("Account Settings"), not the brand name.

const mockPush = jest.fn();
let mockQuery = { objectId: 'user-123' };

jest.mock('next/router', () => ({
  useRouter: () => ({ query: mockQuery, push: mockPush }),
}));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => ({ id: 'user-123' })),
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

const { retrieveCurrentUserAsyncFunction } = require('app/modules/user');
const ManagementWrapper = require('pages/account/management/index').default;

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = { objectId: 'user-123' };
  retrieveCurrentUserAsyncFunction.mockReturnValue({ id: 'user-123' });
});

describe('Unauthenticated access', () => {
  // /account/management is a public route in _app.js. When opened with no
  // objectId param AND no signed-in user, the page must redirect to login
  // instead of spinning forever.
  it('redirects to /account/login when there is no objectId and no current user', async () => {
    mockQuery = {};
    retrieveCurrentUserAsyncFunction.mockReturnValue(null);
    render(<ManagementWrapper />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/account/login'));
  });
});

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
