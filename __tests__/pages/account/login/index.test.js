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

jest.mock('app/impacto-design-system/toast/notify', () => ({ toast: jest.fn() }));

// next/head only renders through Next's head manager; inline its children so
// the document title can be asserted.
jest.mock('next/head', () => function MockHead({ children }) {
  return <div data-testid="head">{children}</div>;
});

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(), query: {}, asPath: '/account/login', locale: 'eng',
  }),
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
const { toast } = require('app/impacto-design-system/toast/notify');
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

// Settings sits behind BOTH authentication and English. Someone who cannot
// read the login screen cannot navigate to Settings to change the language,
// so the switcher has to be reachable here or it never reaches the person who
// needs it. Each language is named in its own language, never translated.
describe('Language switcher', () => {
  it('offers the supported languages before sign-in, each in its own language', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Español' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kreyòl Ayisyen' })).toBeInTheDocument();
  });
});

// Found by visual QA, not by any test: the Spanish page rendered a translated
// heading, fields and button, then an English subtitle and an English "or".
// Shipping a language switcher onto a half-translated page promises something
// the page does not deliver. The mock returns the key for anything it does not
// map, so asserting the key proves the string goes through t().
describe('No hardcoded English in the sign-in card', () => {
  it('translates the subtitle', () => {
    render(<Login />);
    expect(screen.getByText('login_sub')).toBeInTheDocument();
  });

  it('translates the divider between sign-in and the alternatives', () => {
    render(<Login />);
    expect(screen.getByText('divider_or')).toBeInTheDocument();
  });
});

// ─── Sign-in has to work the way every sign-in form works ───────────────────
// The page had no <form> and a type="button" button: pressing Enter did
// nothing at all, with no error and no request. The fields had no label link,
// so screen readers announced "edit text" and password managers couldn't tell
// which box was the username.
describe('Keyboard and assistive technology', () => {
  it('signs in when Enter is pressed in the password field', async () => {
    render(<Login />);
    retrieveSignInFunction.mockResolvedValue({});
    await userEvent.type(screen.getByLabelText(/email or phone number/i), 'TestUser');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret{enter}');
    await waitFor(() => expect(retrieveSignInFunction).toHaveBeenCalledWith('TestUser', 'secret'));
  });

  it('names each field by its label', () => {
    render(<Login />);
    expect(screen.getByLabelText(/email or phone number/i)).toHaveAttribute('name', 'usernameV');
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('name', 'passwordV');
  });

  it('tells password managers which field is which', () => {
    render(<Login />);
    expect(screen.getByLabelText(/email or phone number/i)).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute('autocomplete', 'current-password');
  });

  it('makes Sign in the form\'s submit button', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: /sign in/i })).toHaveAttribute('type', 'submit');
  });
});


// ─── The frame every signed-out page shares (overhaul PR 4) ─────────────────
describe('Page structure', () => {
  it('puts the sign-in card in a <main> with a skip link and a document title', () => {
    render(<Login />);
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(screen.getByRole('link', { name: 'skip_to_content' })).toHaveAttribute('href', '#main');
    expect(screen.getByTestId('head')).toHaveTextContent('Sign in · Puente');
  });

  // Design review X20: "Yolanda M." is a mock persona, not a sourced quote. The
  // line stays as the product's tagline, translated, with no attribution.
  it('shows the brand line as a translated tagline, not a quote attributed to a placeholder person', () => {
    render(<Login />);
    expect(screen.getByText('login_tagline')).toBeInTheDocument();
    expect(screen.queryByText(/Yolanda/)).not.toBeInTheDocument();
    expect(document.querySelector('blockquote, figure')).toBeNull();
  });
});

// ─── No English that the reader didn't choose ───────────────────────────────
describe('Errors in the reader\'s language', () => {
  it('shows the empty-field messages from the catalog, not hardcoded English', async () => {
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('login_error_username_required')).toBeInTheDocument();
    expect(screen.getByText('login_error_password_required')).toBeInTheDocument();
    expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
  });

  it('turns a wrong password into the translated message, not Parse\'s English', async () => {
    retrieveSignInFunction.mockRejectedValue(Object.assign(new Error('Invalid username/password.'), { code: 101 }));
    render(<Login />);
    await userEvent.type(screen.getByLabelText(/email or phone number/i), 'TestUser');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrong{enter}');
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ text: 'auth_error_invalid_credentials', isError: true }));
  });

  it('tells an offline coordinator it is the connection, not their password', async () => {
    retrieveSignInFunction.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<Login />);
    await userEvent.type(screen.getByLabelText(/email or phone number/i), 'TestUser');
    await userEvent.type(screen.getByLabelText(/^password/i), 'secret{enter}');
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ text: 'auth_error_offline', isError: true }));
  });
});
