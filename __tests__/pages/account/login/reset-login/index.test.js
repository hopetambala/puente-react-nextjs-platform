import '@testing-library/jest-dom';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../../__test-utils__/axe';

// /account/login/reset-login: "I can't sign in." The person names their account
// and picks how the reset reaches them.
//
// Real react-hook-form, yup and design-system fields (the earlier test mocked the
// design system away). The channel choice was two buttons whose only sign of
// selection was colour (WCAG 1.4.1, 4.1.2); it is a fieldset of radios now.

jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), query: {} }) }));
jest.mock('next-i18next', () => {
  // eslint-disable-next-line global-require
  const catalog = require('../../../../../public/locales/eng/common.json');
  return { useTranslation: () => ({ t: (key) => catalog[key] ?? key }) };
});
jest.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: jest.fn(async () => ({ _nextI18Next: {} })),
}));
jest.mock('next/head', () => function MockHead({ children }) {
  return <div data-testid="head">{children}</div>;
});
jest.mock('app/impacto-design-system/toast/notify', () => ({ toast: jest.fn() }));
jest.mock('app/modules/user', () => ({
  queryUser: jest.fn(),
  retrieveSignOutFunction: jest.fn().mockResolvedValue(),
}));
jest.mock('app/modules/cloud-code', () => ({ sendMessage: jest.fn() }));

const { queryUser, retrieveSignOutFunction } = require('app/modules/user');
const { sendMessage } = require('app/modules/cloud-code');
const { toast } = require('app/impacto-design-system/toast/notify');
const ResetLogin = require('pages/account/login/reset-login').default;

const USER = { objectId: 'USR1', firstname: 'Ada', email: 'ada@example.org' };

beforeEach(() => {
  jest.clearAllMocks();
  queryUser.mockResolvedValue(USER);
  sendMessage.mockResolvedValue({});
});

describe('Reset login — page structure', () => {
  it('uses the shared signed-out frame with an h1 and its own title', () => {
    render(<ResetLogin />);
    expect(within(screen.getByRole('main')).getByRole('heading', { level: 1, name: 'Reset your account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
    expect(screen.getByTestId('head')).toHaveTextContent('Reset your account · Puente');
  });

  it('loads the common catalog server-side', async () => {
    const { getStaticProps } = require('pages/account/login/reset-login');
    const result = await getStaticProps({ locale: 'spa' });
    expect(result.props).toHaveProperty('_nextI18Next');
  });
});

describe('Reset login — choosing how the reset arrives', () => {
  it('is a labelled group of radios, email chosen by default', () => {
    render(<ResetLogin />);
    const group = screen.getByRole('group', { name: 'Send the reset by' });
    expect(within(group).getByRole('radio', { name: 'Email' })).toBeChecked();
    expect(within(group).getByRole('radio', { name: 'Text message' })).not.toBeChecked();
  });

  it('switches the channel and the submit button\'s wording together', async () => {
    render(<ResetLogin />);
    expect(screen.getByRole('button', { name: 'Send reset email' })).toHaveAttribute('type', 'submit');
    await userEvent.click(screen.getByRole('radio', { name: 'Text message' }));
    expect(screen.getByRole('radio', { name: 'Text message' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Send reset text' })).toBeInTheDocument();
  });
});

describe('Reset login — submitting (queryUser → sendMessage contract)', () => {
  const field = () => screen.getByLabelText(/Phone Number or Email Address/);

  it('explains an empty field in the reader\'s language and sends nothing', async () => {
    render(<ResetLogin />);
    await userEvent.click(screen.getByRole('button', { name: 'Send reset email' }));
    await waitFor(() => expect(field()).toHaveAttribute('aria-invalid', 'true'));
    expect(field()).toHaveAccessibleDescription('Enter your email or phone number.');
    expect(queryUser).not.toHaveBeenCalled();
  });

  it('looks the account up and sends the reset on the chosen channel, then confirms', async () => {
    render(<ResetLogin />);
    await userEvent.click(screen.getByRole('radio', { name: 'Text message' }));
    await userEvent.type(field(), '8095550100{enter}');
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith(USER, 'text'));
    expect(queryUser).toHaveBeenCalledWith('8095550100');
    expect(toast).toHaveBeenCalledWith({ text: 'Request Sent!' });
  });

  it('signs out and explains a failure in the reader\'s language, not Parse\'s', async () => {
    queryUser.mockRejectedValueOnce(Object.assign(new Error('Object not found.'), { code: 101 }));
    render(<ResetLogin />);
    await userEvent.type(field(), 'nobody@example.org{enter}');
    await waitFor(() => expect(toast).toHaveBeenCalledWith({
      text: "That email, phone number or password isn't right. Check them and try again.",
      isError: true,
    }));
    expect(retrieveSignOutFunction).toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('Reset login — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<ResetLogin />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
