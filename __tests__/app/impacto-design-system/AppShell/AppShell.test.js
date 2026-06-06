import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ pathname: '/quick-start', push: jest.fn() })),
}));

jest.mock('next/link', () => {
  const React = require('react');
  return function MockLink({ href, children }) {
    return React.cloneElement(React.Children.only(children), { href });
  };
});

jest.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      nav_dashboard: 'Dashboard',
      nav_form_manager: 'Form Manager',
      nav_form_creator: 'Form Creator',
      nav_forms: 'Forms',
      nav_data: 'Data',
      nav_marketplace: 'Marketplace',
      nav_surveyors: 'Surveyors',
      nav_households: 'Households',
      nav_consent: 'Consent & GDPR',
      nav_members: 'Members',
      nav_settings: 'Settings',
      nav_account: 'Account',
      nav_logout: 'Log out',
    }[key] ?? key),
  }),
}));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => null),
  retrieveSignOutFunction: jest.fn(() => Promise.resolve()),
}));

jest.mock('app/services/parse', () => ({
  __esModule: true,
  default: { initialize: jest.fn() },
}));

const { useRouter } = require('next/router');
const AppShell = require('app/impacto-design-system/AppShell/AppShell').default;

function setPathname(pathname) {
  useRouter.mockReturnValue({ pathname, push: jest.fn() });
}

function renderShell(pathname) {
  setPathname(pathname);
  return render(
    <AppShell breadcrumb={['Test']}>
      <div data-testid="content">page content</div>
    </AppShell>,
  );
}

// ─── RED: deriveActiveRoute ───────────────────────────────────────────────────
// If the /forms/form-marketplace branch is accidentally merged into the /forms
// catch-all, the marketplace nav item never highlights — caught before release.

describe('Route → active nav item', () => {
  it('/quick-start highlights Dashboard', () => {
    renderShell('/quick-start');
    const btn = screen.getByText('Dashboard').closest('a');
    expect(btn.className).toMatch('navItemActive');
  });

  it('/forms/form-manager highlights Form Manager', () => {
    renderShell('/forms/form-manager');
    const btn = screen.getByText('Form Manager').closest('a');
    expect(btn.className).toMatch('navItemActive');
  });

  it('/forms/form-marketplace highlights Marketplace (not Form Manager)', () => {
    renderShell('/forms/form-marketplace');
    const marketplace = screen.getByText('Marketplace').closest('a');
    const forms = screen.getByText('Form Manager').closest('a');
    expect(marketplace.className).toMatch('navItemActive');
    expect(forms.className).not.toMatch('navItemActive');
  });

  it('/data/data-curation highlights Data', () => {
    renderShell('/data/data-curation');
    const btn = screen.getByText('Data').closest('a');
    expect(btn.className).toMatch('navItemActive');
  });

  it('/account/management highlights Settings', () => {
    renderShell('/account/management');
    const btn = screen.getByText('Settings').closest('a');
    expect(btn.className).toMatch('navItemActive');
  });

  it('unknown path defaults to Dashboard active', () => {
    renderShell('/some/unknown/path');
    const btn = screen.getByText('Dashboard').closest('a');
    expect(btn.className).toMatch('navItemActive');
  });
});

describe('Nav click routing', () => {
  it('clicking Data navigates to /data/data-curation', () => {
    render(<AppShell breadcrumb={['Test']}><div /></AppShell>);
    const link = screen.getByText('Data').closest('a');
    expect(link).toHaveAttribute('href', '/data/data-curation');
  });
});



describe('Render', () => {
  it('renders children', () => {
    renderShell('/quick-start');
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders TopBar breadcrumb text', () => {
    setPathname('/quick-start');
    render(<AppShell breadcrumb={['Forms', 'Form Manager']}>child</AppShell>);
    // 'Forms' appears in the breadcrumb; 'Form Manager' appears in nav + breadcrumb
    expect(screen.getAllByText('Forms').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Form Manager').length).toBeGreaterThanOrEqual(1);
  });

  it('fullBleed applies fullBleed page class instead of page', () => {
    setPathname('/quick-start');
    const { container } = render(
      <AppShell breadcrumb={['Test']} fullBleed>child</AppShell>,
    );
    const mainCol = container.querySelector('.main');
    const fullBleedPage = mainCol && mainCol.querySelector('.pageFullBleed');
    const regularPage = mainCol && mainCol.querySelector('.page');
    expect(fullBleedPage).toBeInTheDocument();
    expect(regularPage).not.toBeInTheDocument();
  });
});

// ─── RED: Sidebar org name ───────────────────────────────────────────────────

describe('Sidebar org name', () => {
  it("shows the user's organization name in the sidebar", async () => {
    const { retrieveCurrentUserAsyncFunction } = require('app/modules/user');
    retrieveCurrentUserAsyncFunction.mockResolvedValueOnce({
      get: (key) => ({ organization: 'TestOrg' }[key] ?? null),
    });

    const { waitFor } = require('@testing-library/react');
    setPathname('/quick-start');
    render(<AppShell breadcrumb={['Test']}><div /></AppShell>);

    await waitFor(() => {
      expect(screen.getByText('TestOrg')).toBeInTheDocument();
    });
  });
});

// ─── RED: Phase 1 — dead links removed + Form Creator added ──────────────────

describe('Phase 1 — Navigation Fixes', () => {
  it('Surveyors is removed from the sidebar', () => {
    renderShell('/quick-start');
    expect(screen.queryByText('Surveyors')).not.toBeInTheDocument();
  });

  it('Households is removed from the sidebar', () => {
    renderShell('/quick-start');
    expect(screen.queryByText('Households')).not.toBeInTheDocument();
  });

  it('Consent is removed from the sidebar', () => {
    renderShell('/quick-start');
    expect(screen.queryByText('Consent & GDPR')).not.toBeInTheDocument();
  });

  it('Members is removed from the sidebar', () => {
    renderShell('/quick-start');
    expect(screen.queryByText('Members')).not.toBeInTheDocument();
  });

  it('Form Creator nav item is present', () => {
    renderShell('/quick-start');
    expect(screen.getByText('Form Creator')).toBeInTheDocument();
  });

  it('clicking Form Creator navigates to /forms/form-creator', () => {
    render(<AppShell breadcrumb={['Test']}><div /></AppShell>);
    const link = screen.getByText('Form Creator').closest('a');
    expect(link).toHaveAttribute('href', '/forms/form-creator');
  });

  it('/forms/form-creator highlights Form Creator in the nav', () => {
    renderShell('/forms/form-creator');
    const btn = screen.getByText('Form Creator').closest('a');
    expect(btn.className).toMatch('navItemActive');
  });

  it('"Forms" label is replaced by "Form Manager"', () => {
    renderShell('/quick-start');
    expect(screen.queryByText('Forms')).not.toBeInTheDocument();
    expect(screen.getByText('Form Manager')).toBeInTheDocument();
  });
});

// ─── RED: Nav accessibility ───────────────────────────────────────────────────

describe('Nav accessibility', () => {
  it('nav items render as anchor links, not buttons', () => {
    renderShell('/quick-start');
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink.tagName).toBe('A');
    // The Dashboard nav item should NOT be a button
    expect(screen.getByText('Dashboard').closest('button')).toBeNull();
  });
});
