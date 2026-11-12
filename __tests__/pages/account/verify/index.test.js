import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

// /account/verify?objectId=…: where an admin-verified account lands. The h1 was
// empty on first render and then said "Verified" or "Error" in English, unseen
// by screen readers.

const mockPush = jest.fn();
const mockQuery = { current: { objectId: 'USR1' } };
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockPush, query: mockQuery.current }),
}));
jest.mock('next-i18next', () => {
  // eslint-disable-next-line global-require
  const catalog = require('../../../../public/locales/eng/common.json');
  return { useTranslation: () => ({ t: (key) => catalog[key] ?? key }) };
});
jest.mock('next/head', () => function MockHead({ children }) {
  return <div data-testid="head">{children}</div>;
});

const Verify = require('pages/account/verify/index').default;

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.current = { objectId: 'USR1' };
});

describe('Verify — a verified account', () => {
  it('uses the shared frame and says, in the reader\'s language, that the account is verified', () => {
    render(<Verify />);
    expect(screen.getByTestId('auth-brand')).toBeInTheDocument();
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1, name: 'Account verified' })).toBeInTheDocument();
    expect(screen.getByTestId('head')).toHaveTextContent('Account verified · Puente');
  });

  it('announces the result as a status (WCAG 4.1.3)', () => {
    render(<Verify />);
    expect(screen.getByRole('status')).toHaveTextContent('Account verified');
  });

  it('continues to sign-in', async () => {
    render(<Verify />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(mockPush).toHaveBeenCalledWith('/account/login');
  });
});

describe('Verify — a link with no account in it', () => {
  it('explains what went wrong and how to fix it, as an alert, never an empty heading', () => {
    mockQuery.current = {};
    render(<Verify />);
    expect(screen.getByRole('heading', { level: 1, name: 'This verification link is incomplete' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Open the link from your email again');
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/account/login');
  });
});

describe('Verify — accessibility', () => {
  it.each([[{ objectId: 'USR1' }], [{}]])('has no axe violations (query %j)', async (query) => {
    mockQuery.current = query;
    const { container } = render(<Verify />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
