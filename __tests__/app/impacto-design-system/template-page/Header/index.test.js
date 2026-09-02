import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), pathname: '/' }) }));
jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn().mockResolvedValue(null),
  logOutUser: jest.fn(),
}));

const Header = require('app/impacto-design-system/template-page/Header').default;

describe('template-page Header — copy', () => {
  it('reuses the navigation catalog keys for the account and logout items', () => {
    render(<Header><div /></Header>);
    expect(screen.getByText('nav_account')).toBeInTheDocument();
    expect(screen.getByText('nav_logout')).toBeInTheDocument();
  });
});
