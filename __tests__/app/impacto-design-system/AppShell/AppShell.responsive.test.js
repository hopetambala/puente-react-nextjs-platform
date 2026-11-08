/**
 * The shell's structure and the narrow-screen nav drawer
 * (docs/responsive-a11y-overhaul.md, PR 2).
 *
 * Layout itself (which breakpoint docks the sidebar) needs a real browser and is
 * checked by the e2e responsive sweep at 320–1440px. Here: landmarks, the skip
 * link, the page title, and the drawer's open/close/focus behaviour.
 */
import '@testing-library/jest-dom';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ pathname: '/forms/form-manager', push: jest.fn() })),
}));

jest.mock('next/link', () => {
  const React = require('react');
  return function MockLink({ href, children }) {
    return React.cloneElement(React.Children.only(children), { href });
  };
});

// next/head renders into document.head through a side-effect manager that
// isn't mounted in unit tests; render its children inline so the title can be
// asserted.
jest.mock('next/head', () => function MockHead({ children }) {
  return <div data-testid="head">{children}</div>;
});

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

jest.mock('app/modules/user', () => ({
  retrieveCurrentUserAsyncFunction: jest.fn(() => null),
  retrieveSignOutFunction: jest.fn(() => Promise.resolve()),
}));

const AppShell = require('app/impacto-design-system/AppShell/AppShell').default;

function renderShell(props = {}) {
  return render(
    <AppShell breadcrumb={['Forms', 'Form Manager']} {...props}>
      <h1>Page heading</h1>
    </AppShell>,
  );
}

describe('AppShell structure', () => {
  it('puts the page in a <main> landmark the skip link points at', () => {
    renderShell();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(screen.getByRole('link', { name: 'skip_to_content' })).toHaveAttribute('href', '#main');
  });

  it('makes the skip link the first thing keyboard focus reaches', async () => {
    renderShell();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'skip_to_content' })).toHaveFocus();
  });

  it('titles the document from the last breadcrumb by default (WCAG 2.4.2)', () => {
    renderShell();
    expect(within(screen.getByTestId('head')).getByText('Form Manager · Puente')).toBeInTheDocument();
  });

  it('uses an explicit title over the breadcrumb', () => {
    renderShell({ title: 'Records' });
    expect(within(screen.getByTestId('head')).getByText('Records · Puente')).toBeInTheDocument();
  });

  it('marks the current page in the nav and in the breadcrumb', () => {
    renderShell();
    const nav = screen.getByRole('navigation', { name: 'nav_main_label' });
    expect(within(nav).getByRole('link', { name: 'nav_form_manager' })).toHaveAttribute('aria-current', 'page');
    const crumbs = screen.getByRole('navigation', { name: 'breadcrumb_label' });
    expect(within(crumbs).getByText('Form Manager')).toHaveAttribute('aria-current', 'page');
    expect(within(crumbs).getByText('Forms')).not.toHaveAttribute('aria-current');
  });

  it('has no axe violations with the drawer closed', async () => {
    const { container } = renderShell();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('AppShell nav drawer', () => {
  const drawer = () => document.getElementById('app-nav-drawer');
  const menuButton = () => screen.getByRole('button', { name: 'nav_open_menu' });

  it('starts closed, with the menu button saying so', () => {
    renderShell();
    expect(drawer().open).toBe(false);
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveAttribute('aria-controls', 'app-nav-drawer');
  });

  it('opens as a modal holding the navigation', async () => {
    renderShell();
    await userEvent.click(menuButton());
    expect(drawer().open).toBe(true);
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    expect(within(drawer()).getByRole('navigation', { name: 'nav_main_label' })).toBeInTheDocument();
  });

  it('closes from its close button and returns focus to the menu button', async () => {
    renderShell();
    await userEvent.click(menuButton());
    await userEvent.click(within(drawer()).getByRole('button', { name: 'nav_close_menu' }));
    expect(drawer().open).toBe(false);
    expect(menuButton()).toHaveFocus();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when the backdrop is clicked', async () => {
    renderShell();
    await userEvent.click(menuButton());
    // A click whose target is the <dialog> itself, not its content, is a click
    // on the backdrop.
    await userEvent.click(drawer());
    expect(drawer().open).toBe(false);
  });

  it('stays in sync when the browser closes it (Esc)', async () => {
    renderShell();
    await userEvent.click(menuButton());
    drawer().close();
    expect(await screen.findByRole('button', { name: 'nav_open_menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveFocus();
  });

  it('has no axe violations while open', async () => {
    const { container } = renderShell();
    await userEvent.click(menuButton());
    expect(await axe(container)).toHaveNoViolations();
  });
});
