import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { axe } from '../../../../__test-utils__/axe';

// AuthLayout: the frame every signed-out page shares (login, register, reset,
// reset-login, verify, verify/redirect). Docked brand column from dlite's md
// breakpoint up, a compact brand bar below it: that switch is CSS and is checked
// in a real browser by the e2e sweep. Here: the structure every width keeps.

jest.mock('next-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock('next/head', () => function MockHead({ children }) {
  return <div data-testid="head">{children}</div>;
});

const AuthLayout = require('app/impacto-design-system/auth-layout').default;

const renderLayout = (props = {}) => render(
  <AuthLayout title="Sign in" {...props}>
    <h1>Puente Manage</h1>
    <label htmlFor="u">Email</label>
    <input id="u" />
  </AuthLayout>,
);

describe('AuthLayout', () => {
  it('puts the page in a <main> landmark the skip link points at', () => {
    renderLayout();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('link', { name: 'skip_to_content' })).toHaveAttribute('href', '#main');
  });

  it('makes the skip link the first keyboard stop (WCAG 2.4.1)', async () => {
    renderLayout();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'skip_to_content' })).toHaveFocus();
  });

  it('gives the page its own document title (WCAG 2.4.2)', () => {
    renderLayout({ title: 'Create account' });
    expect(within(screen.getByTestId('head')).getByText('Create account · Puente')).toBeInTheDocument();
  });

  it('keeps the brand outside <main> and out of the heading outline', () => {
    renderLayout();
    const brand = screen.getByTestId('auth-brand');
    expect(screen.getByRole('main')).not.toContainElement(brand);
    expect(within(brand).queryByRole('heading')).not.toBeInTheDocument();
    expect(within(brand).getByText('Puente')).toBeInTheDocument();
  });

  it('renders the page content inside <main>', () => {
    renderLayout();
    expect(within(screen.getByRole('main')).getByRole('heading', { level: 1, name: 'Puente Manage' })).toBeInTheDocument();
  });

  it('shows an optional tagline in the brand column', () => {
    renderLayout({ tagline: 'Records reach the clinic before you pack up.' });
    expect(within(screen.getByTestId('auth-brand')).getByText('Records reach the clinic before you pack up.')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderLayout({ tagline: 'A tagline' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
