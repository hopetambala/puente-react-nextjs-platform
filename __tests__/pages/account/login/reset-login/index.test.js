import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/impacto-design-system', () => ({
  ...jest.requireActual('app/impacto-design-system'),
}));
jest.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: jest.fn().mockResolvedValue({ _nextI18Next: {} }),
}));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), query: {} }) }));
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

  it('routes both delivery-channel buttons through t()', () => {
    render(<ResetLogin />);
    expect(screen.getByText('account_reset_send_email')).toBeInTheDocument();
    expect(screen.getByText('account_reset_send_text')).toBeInTheDocument();
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

  it('switches the submit key when the text channel is chosen', () => {
    render(<ResetLogin />);
    fireEvent.click(screen.getByText('account_reset_send_text'));
    expect(screen.getByText('account_reset_submit_text')).toBeInTheDocument();
    expect(screen.queryByText('account_reset_submit_email')).not.toBeInTheDocument();
  });

  it('loads the common catalog server-side', async () => {
    const { getStaticProps } = require('pages/account/login/reset-login');
    const result = await getStaticProps({ locale: 'spa' });
    expect(result.props).toHaveProperty('_nextI18Next');
  });
});
