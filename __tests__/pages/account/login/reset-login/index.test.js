import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/impacto-design-system', () => ({
  ...jest.requireActual('app/impacto-design-system'),
}));
jest.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: jest.fn().mockResolvedValue({ _nextI18Next: {} }),
}));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), query: {} }) }));
jest.mock('app/modules/cloud-code', () => ({
  sendMessage: jest.fn().mockResolvedValue({}),
}));
jest.mock('app/modules/user', () => ({
  queryUser: jest.fn().mockResolvedValue({}),
  sendMessage: jest.fn().mockResolvedValue({}),
  retrieveSignOutFunction: jest.fn(),
}));

const ResetLogin = require('pages/account/login/reset-login').default;

describe('Reset login page — copy', () => {
  it('routes the heading and field label through t()', () => {
    render(<ResetLogin />);
    expect(screen.getByText('account_reset_title')).toBeInTheDocument();
    expect(screen.getByText('account_reset_field')).toBeInTheDocument();
  });

  // The submit button read `Send reset ${notificationType}` — an English word
  // concatenated with a stored code. It rendered "Send reset email" in Spanish,
  // beneath two correctly translated buttons. The channel picks a whole key,
  // rather than being interpolated, because "email"/"text" are codes and the
  // two sentences do not share a shape across languages.
  it('routes the submit button through t(), defaulting to the email channel', () => {
    render(<ResetLogin />);
    expect(screen.getByText('account_reset_submit_email')).toBeInTheDocument();
  });

  it('loads the common catalog server-side', async () => {
    const { getStaticProps } = require('pages/account/login/reset-login');
    const result = await getStaticProps({ locale: 'spa' });
    expect(result.props).toHaveProperty('_nextI18Next');
  });
});

// Every account form submits like a form: its main action is the form's submit
// button, so Enter works and nothing depends on a click handler. The sign-in
// page shipped without this and Enter silently did nothing.
describe('form semantics', () => {
  it('the send button is the submit button of a form', async () => {
    render(<ResetLogin />);
    const button = await screen.findByRole('button', { name: 'account_reset_submit_email' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button.closest('form')).not.toBeNull();
  });
});

// Reset by text message went to Puente's SMS functions, which were retired in
// October 2026 (serverless/README.md), so choosing it sent nothing while the
// page said the message was on its way. Email is the only channel offered.
describe('Reset channel', () => {
  it('offers no text-message option', () => {
    render(<ResetLogin />);
    expect(screen.queryByText('account_reset_send_text')).not.toBeInTheDocument();
    expect(screen.queryByText('account_reset_submit_text')).not.toBeInTheDocument();
  });

  it('sends the reset by email', async () => {
    const { sendMessage } = require('app/modules/cloud-code');
    const { queryUser } = require('app/modules/user');
    queryUser.mockResolvedValue({ objectId: 'u1' });
    render(<ResetLogin />);
    fireEvent.change(screen.getByLabelText(/account_reset_field/), { target: { value: 'ana@example.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'account_reset_submit_email' }));
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ objectId: 'u1' }, 'email'));
  });
});
