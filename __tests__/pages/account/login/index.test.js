import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('app/services/parse', () => ({
  __esModule: true,
  default: { initialize: jest.fn() },
}));

jest.mock('app/modules/user', () => ({
  retrieveSignInFunction: jest.fn(),
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}));

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      sign_in_to: 'Sign in to',
      sign_in: 'Sign in',
      login_field_email: 'Email or phone number',
      login_field_password: 'Password',
      forgot_password: 'Forgot password',
      create_account: 'Create account',
      login_collect_hint: 'Collecting in the field? Open Puente Collect on your phone instead.',
    }[key] ?? key),
  }),
}));

const parseService = require('app/services/parse').default;
const { retrieveSignInFunction } = require('app/modules/user');
const Login = require('pages/account/login/index').default;

beforeEach(() => {
  jest.clearAllMocks();
  // react-hook-form v6 triggers internal state updates outside act() during
  // validation — suppress the warning to keep test output readable.
  jest.spyOn(console, 'error').mockImplementation((msg) => {
    if (typeof msg === 'string' && msg.includes('not wrapped in act')) return;
    // eslint-disable-next-line no-console
    console.warn(msg);
  });
});

afterEach(() => {
  console.error.mockRestore();
});

// ─── RED: would have caught the bug before the useEffect fix ─────────────────
// Without parseService.initialize() in a useEffect on the login page, this
// test fails — Parse is unconfigured so logIn() silently errors.

describe('Parse initialization', () => {
  it('calls parseService.initialize() on mount', async () => {
    render(<Login />);
    await waitFor(() => {
      expect(parseService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  it('does not initialize more than once per mount', async () => {
    render(<Login />);
    await waitFor(() => expect(parseService.initialize).toHaveBeenCalled());
    expect(parseService.initialize).toHaveBeenCalledTimes(1);
  });
});

// ─── GREEN: form renders and submits correctly ────────────────────────────────

describe('Form fields', () => {
  it('renders the username and password inputs', () => {
    const { container } = render(<Login />);
    expect(container.querySelector('input[name="usernameV"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="passwordV"]')).toBeInTheDocument();
  });

  it('renders the sign-in button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('Form submission', () => {
  it('calls retrieveSignInFunction with the entered credentials', async () => {
    retrieveSignInFunction.mockResolvedValue({});
    const { container } = render(<Login />);

    await userEvent.type(container.querySelector('input[name="usernameV"]'), 'hope@puente-dr.org');
    await userEvent.type(container.querySelector('input[name="passwordV"]'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(retrieveSignInFunction).toHaveBeenCalledWith('hope@puente-dr.org', 'secret');
    });
  });

  it('does not call retrieveSignInFunction when fields are empty', async () => {
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(retrieveSignInFunction).not.toHaveBeenCalled();
    });
  });
});
