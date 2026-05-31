import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── RED: isLoading does not disable the button ───────────────────────────────
// If `disabled={!!isDisabled || !!isLoading}` is removed, a loading button
// becomes clickable — catching double-submit bugs (login, form publish) before
// they reach production.

// ─── RED: intent class not applied ────────────────────────────────────────────
// If the intent → className mapping breaks, danger buttons no longer render
// red and primary buttons no longer render brand-blue — caught before every
// CTA in the app loses its visual meaning.

jest.mock('app/impacto-design-system/icon', () => jest.fn(() => null));
jest.mock('app/impacto-design-system/Link', () =>
  jest.fn(({ href, children, className }) => <a href={href} className={className}>{children}</a>));
jest.mock('app/impacto-design-system/spinner', () =>
  jest.fn(() => <div data-testid="spinner" />));
jest.mock('app/impacto-design-system/text', () =>
  jest.fn(({ text }) => <span>{text}</span>));
jest.mock('app/impacto-design-system/tooltip', () =>
  jest.fn(({ children }) => <>{children}</>));

const Button = require('app/impacto-design-system/button').default;

beforeEach(() => jest.clearAllMocks());

describe('Rendering', () => {
  it('renders the text prop', () => {
    render(<Button text="Log in" />);
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  it('renders a <button> by default', () => {
    render(<Button text="Submit" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders an anchor when href is provided', () => {
    render(<Button text="Go" href="/somewhere" />);
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/somewhere');
  });
});

describe('onClick', () => {
  it('calls onClick when the button is clicked', async () => {
    const onClick = jest.fn();
    render(<Button text="Click me" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Loading state', () => {
  it('shows a spinner when isLoading is true', () => {
    render(<Button text="Saving…" isLoading />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('disables the button when isLoading is true', () => {
    render(<Button text="Saving…" isLoading />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire onClick while loading', async () => {
    const onClick = jest.fn();
    render(<Button text="Saving…" isLoading onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Disabled state', () => {
  it('disables the button when isDisabled is true', () => {
    render(<Button text="Submit" isDisabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Intent classes', () => {
  it('applies "danger" class when intent is "danger"', () => {
    render(<Button text="Delete" intent="danger" />);
    expect(screen.getByRole('button').className).toContain('danger');
  });

  it('applies "primary" class when intent is "primary"', () => {
    render(<Button text="Log in" intent="primary" />);
    expect(screen.getByRole('button').className).toContain('primary');
  });

  it('applies neither primary nor danger class by default', () => {
    render(<Button text="Cancel" />);
    const className = screen.getByRole('button').className;
    expect(className).not.toContain('primary');
    expect(className).not.toContain('danger');
  });
});
