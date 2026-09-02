import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: jest.fn().mockResolvedValue({ _nextI18Next: {} }),
}));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), query: { objectId: 'u1' } }) }));

// The page reaches Parse through this module; without the mock the browser SDK
// initialises against no server and takes the whole worker down.
jest.mock('app/modules/user', () => ({ updateUser: jest.fn().mockResolvedValue({}) }));

jest.mock('app/impacto-design-system', () => ({
  Card: ({ children }) => <div>{children}</div>,
  Page: ({ children }) => <div>{children}</div>,
  Text: ({ text, element: El = 'span' }) => <El>{text}</El>,
}));

const Redirect = require('pages/account/verify/redirect').default;

describe('Verify redirect page — copy', () => {
  it('routes its only message through t()', () => {
    render(<Redirect />);
    expect(screen.getByText('account_hold_on')).toBeInTheDocument();
  });
});
