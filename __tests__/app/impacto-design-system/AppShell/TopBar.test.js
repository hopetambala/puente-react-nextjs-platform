import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => null),
}));

const { useRouter } = require('next/router');
const { retrieveCurrentUserAsyncFunction } = require('app/modules/user');
const TopBar = require('app/impacto-design-system/AppShell/TopBar').default;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── RED: user avatar call ────────────────────────────────────────────────────
// If the useEffect calling retrieveCurrentUserAsyncFunction is deleted, the
// avatar test fails — protecting against regression to the Parse-not-initialized
// crash that previously broke every authenticated page.

describe('Breadcrumb', () => {
  it('renders all crumb strings', () => {
    render(<TopBar breadcrumb={['Forms', 'Form Manager']} />);
    expect(screen.getByText('Forms')).toBeInTheDocument();
    expect(screen.getByText('Form Manager')).toBeInTheDocument();
  });

  it('last crumb has crumbCurrent class', () => {
    render(<TopBar breadcrumb={['Forms', 'Form Manager']} />);
    const current = screen.getByText('Form Manager');
    expect(current.className).toMatch('crumbCurrent');
  });

  it('non-last crumbs do not have crumbCurrent class', () => {
    render(<TopBar breadcrumb={['Forms', 'Form Manager']} />);
    const parent = screen.getByText('Forms');
    expect(parent.className).not.toMatch('crumbCurrent');
  });

  it('renders single-item breadcrumb without separator', () => {
    render(<TopBar breadcrumb={['Dashboard']} />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });
});

describe('Avatar — no user', () => {
  it('shows ? when retrieveCurrentUserAsyncFunction returns null', async () => {
    retrieveCurrentUserAsyncFunction.mockReturnValue(null);
    render(<TopBar breadcrumb={['Dashboard']} />);
    await waitFor(() => {
      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  it('calls retrieveCurrentUserAsyncFunction on mount', () => {
    render(<TopBar breadcrumb={['Dashboard']} />);
    expect(retrieveCurrentUserAsyncFunction).toHaveBeenCalledTimes(1);
  });
});

describe('Avatar — with user', () => {
  // Parse stores name attributes as `firstname`/`lastname` (see registration and
  // account management), so the avatar must read those keys — not camelCase.
  it('shows initials from firstname and lastname', async () => {
    retrieveCurrentUserAsyncFunction.mockReturnValue({
      get: (key) => ({ firstname: 'Hope', lastname: 'Tambala' }[key]),
    });
    render(<TopBar breadcrumb={['Dashboard']} />);
    await waitFor(() => {
      expect(screen.getByText('HT')).toBeInTheDocument();
    });
  });

  it('shows first-letter-only when only firstname is available', async () => {
    retrieveCurrentUserAsyncFunction.mockReturnValue({
      get: (key) => ({ firstname: 'Hope', lastname: undefined }[key]),
    });
    render(<TopBar breadcrumb={['Dashboard']} />);
    await waitFor(() => {
      expect(screen.getByText('H')).toBeInTheDocument();
    });
  });
});

// ─── RED: Phase 3 — TopBar avatar navigation ─────────────────────────────────
// Clicking the avatar must navigate to /account/management.

describe('Phase 3 — Avatar navigation', () => {
  it('avatar has aria-label="Account settings"', () => {
    render(<TopBar breadcrumb={['Dashboard']} />);
    expect(screen.getByRole('button', { name: 'Account settings' })).toBeInTheDocument();
  });

  it('clicking avatar calls router.push("/account/management")', () => {
    const push = jest.fn();
    useRouter.mockReturnValue({ push });
    render(<TopBar breadcrumb={['Dashboard']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Account settings' }));
    expect(push).toHaveBeenCalledWith('/account/management');
  });
});
