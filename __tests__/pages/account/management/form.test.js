import '@testing-library/jest-dom';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

// /account/management: the signed-in person's own details.
//
// Real react-hook-form, yup, fields and Modal (index.test.js mocks them away
// for its page-level checks). Fields were labelled by English object keys
// ("First Name"), validation and the organization note were English, the
// password showed as plain text, nothing had autocomplete, and Delete
// deactivated the account in one click with no confirmation.

const mockPush = jest.fn();
jest.mock('next/router', () => ({ useRouter: () => ({ query: { objectId: 'USR1' }, push: mockPush }) }));
jest.mock('next-i18next', () => {
  // eslint-disable-next-line global-require
  const catalog = require('../../../../public/locales/eng/common.json');
  return { useTranslation: () => ({ t: (key) => catalog[key] ?? key }) };
});
jest.mock('app/impacto-design-system/toast/notify', () => ({ toast: jest.fn() }));
jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => ({ id: 'USR1' })),
  retrieveSignInFunction: jest.fn().mockResolvedValue({}),
  retrieveUserByObjectId: jest.fn(),
  updateUser: jest.fn(),
}));
// The shell has its own tests; here it only needs to render the page in <main>.
jest.mock('app/impacto-design-system', () => ({
  ...jest.requireActual('app/impacto-design-system'),
  AppShell: ({ children }) => <main>{children}</main>,
  LanguageSwitcher: () => null,
}));

const { retrieveSignInFunction, retrieveUserByObjectId, updateUser } = require('app/modules/user');
const { toast } = require('app/impacto-design-system/toast/notify');
const Management = require('pages/account/management/index').default;

const STORED = {
  firstname: 'Ada', lastname: 'Example', organization: 'Puente', phonenumber: '8095550100', email: 'ada@example.org',
};

beforeEach(() => {
  jest.clearAllMocks();
  retrieveUserByObjectId.mockResolvedValue({ attributes: STORED });
  updateUser.mockResolvedValue({ username: 'ada@example.org', password: 'secret' });
});

const ready = () => screen.findByDisplayValue('Ada');

describe('Account settings — fields', () => {
  it('labels each field from the catalog, prefilled, with autocomplete and input types', async () => {
    render(<Management />);
    await ready();
    expect(screen.getByLabelText(/First Name/)).toHaveAttribute('autocomplete', 'given-name');
    expect(screen.getByLabelText(/Last Name/)).toHaveValue('Example');
    expect(screen.getByLabelText(/Phone Number/)).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText(/Email Address/)).toHaveAttribute('type', 'email');
    const password = screen.getByLabelText(/^Password/);
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(password).toHaveValue('');
  });

  it('shows the organization read-only, with the note from the catalog', async () => {
    render(<Management />);
    await ready();
    expect(screen.queryByLabelText(/Organization/)).not.toBeInTheDocument();
    expect(screen.getByText('Puente')).toBeInTheDocument();
    expect(screen.getByTestId('organization-change-note')).toHaveTextContent(
      'Your organization determines which records you can see. Email info@puente-dr.org to change it.',
    );
  });
});

describe('Account settings — validation in the reader\'s language', () => {
  it('explains a missing email from the catalog, linked to the field, and saves nothing', async () => {
    render(<Management />);
    await ready();
    await userEvent.clear(screen.getByLabelText(/Email Address/));
    await userEvent.click(screen.getByRole('button', { name: 'Update user' }));
    const email = screen.getByLabelText(/Email Address/);
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'));
    expect(email).toHaveAccessibleDescription('Email address is required');
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe('Account settings — saving (the updateUser contract)', () => {
  it('keeps the stored organization, leaves the password out when blank, re-signs in and goes home', async () => {
    render(<Management />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Update user' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('USR1', STORED));
    await waitFor(() => expect(retrieveSignInFunction).toHaveBeenCalledWith('ada@example.org', 'secret'));
    expect(mockPush).toHaveBeenCalledWith('/quick-start');
  });

  it('sends a new password only when one is typed', async () => {
    render(<Management />);
    await ready();
    await userEvent.type(screen.getByLabelText(/^Password/), 'new-secret');
    await userEvent.click(screen.getByRole('button', { name: 'Update user' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('USR1', { ...STORED, password: 'new-secret' }));
  });

  it('says what went wrong, in the reader\'s language, when saving fails', async () => {
    updateUser.mockRejectedValueOnce(Object.assign(new Error('Invalid session token'), { code: 209 }));
    render(<Management />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Update user' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ text: 'You were signed out. Sign in again to continue.', isError: true }));
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('Account settings — deleting asks first', () => {
  it('opens a confirmation and changes nothing until it is confirmed', async () => {
    render(<Management />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Delete user' }));
    const dialog = screen.getByRole('dialog', { name: 'Deactivate your account? You will be signed out and can no longer sign in.' });
    expect(updateUser).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('deactivates the account when confirmed and goes to sign-in', async () => {
    render(<Management />);
    await ready();
    await userEvent.click(screen.getByRole('button', { name: 'Delete user' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate account' }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith('USR1', { ...STORED, active: false }));
    expect(mockPush).toHaveBeenCalledWith('/account/login');
  });
});

describe('Account settings — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<Management />);
    await ready();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Account settings — every string it shows is in every catalog', () => {
  const fs = require('fs');
  const path = require('path');
  const KEYS = ['account_org_change_note', 'account_delete_confirm', 'account_delete_confirm_action'];
  it.each(['eng', 'spa', 'hat'])('%s has them', (lng) => {
    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'public', 'locales', lng, 'common.json'), 'utf8'));
    KEYS.forEach((k) => expect(catalog[k]).toEqual(expect.any(String)));
  });
});


// Design review C7: a failed account lookup left a spinner up forever.
describe('Account settings — when the account does not load', () => {
  it('says why, in the reader\'s language, and offers to try again', async () => {
    retrieveUserByObjectId.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<Management />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach Puente. Check your connection and try again.");
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    retrieveUserByObjectId.mockResolvedValueOnce({ attributes: STORED });
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByDisplayValue('Ada')).toBeInTheDocument();
  });

  it('sends someone whose session expired to sign in', async () => {
    retrieveUserByObjectId.mockRejectedValueOnce(Object.assign(new Error('Invalid session token'), { code: 209 }));
    render(<Management />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/account/login'));
  });
});
