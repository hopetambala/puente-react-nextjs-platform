import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
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

  it('loads the common catalog server-side', async () => {
    const { getStaticProps } = require('pages/account/login/reset-login');
    const result = await getStaticProps({ locale: 'spa' });
    expect(result.props).toHaveProperty('_nextI18Next');
  });
});
