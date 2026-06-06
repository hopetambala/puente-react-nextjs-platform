import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

const PageHeader = require('app/impacto-design-system/AppShell/PageHeader').default;

// ─── RED: h1 contract ─────────────────────────────────────────────────────────
// If title is moved from <h1> to a <div>, screen.getByRole('heading') fails,
// catching an accessibility regression before any screen reader is affected.

describe('Required props', () => {
  it('renders title as an h1', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });
});

describe('Optional props', () => {
  it('renders eyebrow when provided', () => {
    render(<PageHeader title="Dashboard" eyebrow="Monday · May 18" />);
    expect(screen.getByText('Monday · May 18')).toBeInTheDocument();
  });

  it('does not render eyebrow element when omitted', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    // No eyebrow text node other than the title itself
    expect(container.textContent).toBe('Dashboard');
  });

  it('renders sub paragraph when provided', () => {
    render(<PageHeader title="Dashboard" sub="Here's what's moving." />);
    expect(screen.getByText("Here's what's moving.")).toBeInTheDocument();
  });

  it('does not render sub element when omitted', () => {
    const { container } = render(<PageHeader title="Only title" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });
});

describe('Actions slot', () => {
  it('renders passed actions node', () => {
    render(<PageHeader title="Dashboard" actions={<button type="button">+ New form</button>} />);
    expect(screen.getByRole('button', { name: '+ New form' })).toBeInTheDocument();
  });

  it('renders no actions container when omitted', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    // Should only have the title content, no extra wrapper for actions
    expect(container.querySelectorAll('div')).toHaveLength(2); // pageHeader wrapper + inner div
  });
});
