import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

import { axe } from '../../../../../__test-utils__/axe';

// /account/verify/redirect?objectId=…: the link an admin follows to verify an
// account. It marks the account verified, then moves on to /account/verify.
// A failed update used to leave "Hold On" on screen forever, with nothing said.

const mockPush = jest.fn();
const mockQuery = { current: { objectId: 'USR1' } };
jest.mock('next/router', () => ({ useRouter: () => ({ push: mockPush, query: mockQuery.current }) }));
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
jest.mock('app/modules/user', () => ({ updateUser: jest.fn() }));

const { updateUser } = require('app/modules/user');
const Redirect = require('pages/account/verify/redirect').default;

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.current = { objectId: 'USR1' };
  updateUser.mockResolvedValue({});
});

describe('Verify redirect', () => {
  it('uses the shared frame, with an h1 and a loading status while it works', () => {
    updateUser.mockReturnValue(new Promise(() => {}));
    render(<Redirect />);
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1, name: 'Hold On' }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('marks the account admin-verified, then moves on to /account/verify (the updateUser contract)', async () => {
    render(<Redirect />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/account/verify?objectId=USR1'));
    expect(updateUser).toHaveBeenCalledWith('USR1', { adminVerified: true });
  });

  it('sends a link with no account to sign-in without touching any account', async () => {
    mockQuery.current = {};
    render(<Redirect />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/account/login'));
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('says so, in the reader\'s language, when the update fails, and stays put', async () => {
    updateUser.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<Redirect />);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't reach Puente. Check your connection and try again.");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    updateUser.mockReturnValue(new Promise(() => {}));
    const { container } = render(<Redirect />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
