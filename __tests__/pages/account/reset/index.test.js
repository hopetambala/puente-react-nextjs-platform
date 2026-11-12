import '@testing-library/jest-dom';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

// /account/reset?objectId=… is where someone finishes their account after a
// reset link: their details, prefilled, and a new password.
//
// Real react-hook-form, real yup, real design-system fields: the earlier test
// mocked all three away and so could not see that the new password showed as
// plain text, that fields had no autocomplete or input type, that labels and
// validation spoke English to everyone (the fields were named by English object
// keys, which also made ids with spaces in them), or that the h1 said "PUENTE".

const mockPush = jest.fn();
const mockQuery = { current: { objectId: 'USR1' } };
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, query: mockQuery.current })),
}));

// The real English catalog, so missing keys fail visibly.
jest.mock('next-i18next', () => {
  // eslint-disable-next-line global-require
  const catalog = require('../../../../public/locales/eng/common.json');
  return { useTranslation: () => ({ t: (key) => catalog[key] ?? key }) };
});

jest.mock('next/head', () => function MockHead({ children }) {
  return <div data-testid="head">{children}</div>;
});

jest.mock('app/impacto-design-system/toast/notify', () => ({ toast: jest.fn() }));

jest.mock('app/modules/user', () => ({
  retrieveSignInFunction: jest.fn().mockResolvedValue({}),
  retrieveUserByObjectId: jest.fn(),
  updateUser: jest.fn(),
}));

const { retrieveSignInFunction, retrieveUserByObjectId, updateUser } = require('app/modules/user');
const { toast } = require('app/impacto-design-system/toast/notify');
const Reset = require('pages/account/reset/index').default;

const STORED = {
  firstname: 'Ada', lastname: 'Example', organization: 'Puente', phonenumber: '8095550100', email: 'ada@example.org',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.current = { objectId: 'USR1' };
  retrieveUserByObjectId.mockResolvedValue({ attributes: STORED });
  updateUser.mockResolvedValue({ username: 'ada@example.org', password: 'new-secret' });
});

const fieldsReady = () => screen.findByDisplayValue('Ada');

describe('Reset — page structure', () => {
  it('uses the shared signed-out frame: brand column, <main>, skip link, title', async () => {
    render(<Reset />);
    await fieldsReady();
    expect(screen.getByTestId('auth-brand')).toBeInTheDocument();
    expect(screen.getByTestId('auth-form')).toBe(screen.getByRole('main'));
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(screen.getByTestId('head')).toHaveTextContent('Account Details · Puente');
  });

  it('names the page with an h1 that says what it is for, not "PUENTE"', async () => {
    render(<Reset />);
    await fieldsReady();
    expect(within(screen.getByRole('main')).getByRole('heading', { level: 1, name: 'Account Details' })).toBeInTheDocument();
  });

  it('does not clear localStorage on mount', async () => {
    const clearSpy = jest.spyOn(window.localStorage.__proto__, 'clear');
    render(<Reset />);
    await fieldsReady();
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('Reset — fields', () => {
  it('labels every field from the catalog and prefills it from the stored account', async () => {
    render(<Reset />);
    await fieldsReady();
    expect(screen.getByLabelText(/First Name/)).toHaveValue('Ada');
    expect(screen.getByLabelText(/Last Name/)).toHaveValue('Example');
    expect(screen.getByLabelText(/Organization/)).toHaveValue('Puente');
    expect(screen.getByLabelText(/Phone Number/)).toHaveValue('8095550100');
    expect(screen.getByLabelText(/Email Address/)).toHaveValue('ada@example.org');
  });

  it('masks the new password and tells password managers what each field is', async () => {
    render(<Reset />);
    await fieldsReady();
    const password = screen.getByLabelText(/^Password/);
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/Email Address/)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/Phone Number/)).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText(/First Name/)).toHaveAttribute('autocomplete', 'given-name');
  });

  it('makes Continue the submit button of a real form', async () => {
    render(<Reset />);
    await fieldsReady();
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button.closest('form')).not.toBeNull();
  });
});

describe('Reset — validation in the reader\'s language', () => {
  it('explains a missing password from the catalog, linked to the field, and does not submit', async () => {
    render(<Reset />);
    await fieldsReady();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const password = screen.getByLabelText(/^Password/);
    await waitFor(() => expect(password).toHaveAttribute('aria-invalid', 'true'));
    expect(password).toHaveAccessibleDescription('Password is required');
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe('Reset — submitting (the updateUser contract)', () => {
  it('sends the account fields under their model names, signs in, and goes to the dashboard', async () => {
    render(<Reset />);
    await fieldsReady();
    await userEvent.type(screen.getByLabelText(/^Password/), 'new-secret');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('USR1', {
      ...STORED, password: 'new-secret',
    }));
    await waitFor(() => expect(retrieveSignInFunction).toHaveBeenCalledWith('ada@example.org', 'new-secret'));
    expect(mockPush).toHaveBeenCalledWith('/quick-start');
  });

  it('says what went wrong, in the reader\'s language, when the update fails', async () => {
    updateUser.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<Reset />);
    await fieldsReady();
    await userEvent.type(screen.getByLabelText(/^Password/), 'new-secret');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({
      text: "Couldn't reach Puente. Check your connection and try again.",
      isError: true,
    }));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('Reset — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<Reset />);
    await fieldsReady();
    expect(await axe(container)).toHaveNoViolations();
  });
});


// Design review C9: with no account in the link the page was a blank form.
describe('Reset — a link with no account in it', () => {
  it('says the link is incomplete and how to fix it, instead of an empty form', () => {
    mockQuery.current = {};
    render(<Reset />);
    expect(screen.getByRole('heading', { level: 1, name: 'This reset link is incomplete' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Open the link from your email again');
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/account/login');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(retrieveUserByObjectId).not.toHaveBeenCalled();
  });

  it('says the account could not be loaded, with a way to retry, instead of an empty form', async () => {
    retrieveUserByObjectId.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<Reset />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach Puente. Check your connection and try again.");
    retrieveUserByObjectId.mockResolvedValueOnce({ attributes: STORED });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByDisplayValue('Ada')).toBeInTheDocument();
  });
});
