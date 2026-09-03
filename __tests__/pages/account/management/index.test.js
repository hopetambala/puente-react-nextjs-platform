import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

// ─── RED: wrong h1 title in account management (audit F-02) ──────────────────
// The page currently renders <Text text="PUENTE" element="h1"> inside a Card —
// wrong title AND wrong component pattern. PageHeader should be used, and the
// title should describe the page ("Account Settings"), not the brand name.

const mockPush = jest.fn();
let mockQuery = { objectId: 'user-123' };

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

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
  AppShell: ({ children, breadcrumb }) => (
    <div data-testid="appshell" data-breadcrumb={JSON.stringify(breadcrumb)}>{children}</div>
  ),
  PageHeader: ({ title, sub }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  ),
  Button: ({ text, onClick }) => <button type="button" onClick={onClick}>{text}</button>,
  Card: ({ children }) => <div>{children}</div>,
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
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
      expect(screen.getByRole('heading', { name: 'account_settings_title' })).toBeInTheDocument(),
    );
  });
});

// The durable home for the language choice, matching Collect's mental model.
// It sits OUTSIDE the FormProvider on purpose — that form is yup-validated,
// submits, re-authenticates and redirects, and language is not a _User field.
// It also sits outside the loading ternary, so the choice stays available
// while the profile is still being fetched.
describe('Language switcher', () => {
  it('renders on the settings page', async () => {
    render(<ManagementWrapper />);
    await waitFor(() => {
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });
  });
});

describe('Organization is not self-service', () => {
  // Organization is the tenancy and billing principal. A free-text box here let
  // anyone move themselves into another organization and see its data — the
  // last free-text door into _User.organization after the register picker
  // landed, and the likeliest source of the 17 'Puente ' (trailing space)
  // accounts in production. A picker would not fix it; it would make
  // tenant-hopping easier by listing the destinations.
  it('does not render an editable organization field', async () => {
    const { container } = render(<ManagementWrapper />);
    await waitFor(() => expect(container.querySelector('input[name="First Name"]')).toBeTruthy());

    expect(container.querySelector('input[name="Organization"]')).toBeNull();
  });

  it('still shows which organization the account belongs to', async () => {
    render(<ManagementWrapper />);

    expect(await screen.findByText('test-org')).toBeInTheDocument();
  });

  it('tells the person how to change it', async () => {
    render(<ManagementWrapper />);

    expect(await screen.findByTestId('organization-change-note')).toBeInTheDocument();
  });
});

describe('Account Settings page — copy', () => {
  it('routes the breadcrumb, title and subtitle through t()', () => {
    render(<ManagementWrapper />);
    const shell = screen.getByTestId('appshell');
    expect(JSON.parse(shell.dataset.breadcrumb)).toEqual(['breadcrumb_settings']);
    expect(screen.getByText('account_settings_title')).toBeInTheDocument();
    expect(screen.getByText('account_settings_sub')).toBeInTheDocument();
  });
});
