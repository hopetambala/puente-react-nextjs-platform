import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// ─── RED: EmptyState component missing ───────────────────────────────────────
// If EmptyState is removed, screens fall back to unstyled <p> tags for empty
// conditions — the test fails before visual regressions reach production.

const EmptyState = require('app/impacto-design-system/empty-state').default;

describe('Rendering', () => {
  it('renders the message text', () => {
    render(<EmptyState message="No custom forms yet." />);
    expect(screen.getByText('No custom forms yet.')).toBeInTheDocument();
  });

  it('renders sub text when provided', () => {
    render(<EmptyState message="No forms." sub="Create one to get started." />);
    expect(screen.getByText('Create one to get started.')).toBeInTheDocument();
  });

  it('does not render sub element when sub is omitted', () => {
    const { container } = render(<EmptyState message="No forms." />);
    expect(container.querySelector('.sub')).not.toBeInTheDocument();
  });
});

describe('Structure', () => {
  it('has a root element with emptyState class', () => {
    const { container } = render(<EmptyState message="Empty." />);
    expect(container.querySelector('.emptyState')).toBeInTheDocument();
  });

  it('has a message element with message class', () => {
    const { container } = render(<EmptyState message="Nothing here." />);
    expect(container.querySelector('.message')).toBeInTheDocument();
    expect(container.querySelector('.message')).toHaveTextContent('Nothing here.');
  });
});
