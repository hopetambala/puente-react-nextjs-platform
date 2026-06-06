import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

// ─── RED: Panel component missing ────────────────────────────────────────────
// If Panel is removed from the design system, every screen that uses it for
// sectioning (Form Manager, Quick Insights) loses its structured card wrapper —
// caught before the visual regression reaches production.

const Panel = require('app/impacto-design-system/panel').default;

describe('Rendering', () => {
  it('renders children inside the panel body', () => {
    render(<Panel title="Field activity"><p>content</p></Panel>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('renders the title in the panel header', () => {
    render(<Panel title="Field activity"><span /></Panel>);
    expect(screen.getByText('Field activity')).toBeInTheDocument();
  });

  it('renders an action node when provided', () => {
    render(
      <Panel title="Forms" action={<a href="/forms">Open →</a>}>
        <span />
      </Panel>,
    );
    expect(screen.getByRole('link', { name: 'Open →' })).toBeInTheDocument();
  });

  it('renders no action element when action is omitted', () => {
    const { container } = render(<Panel title="Forms"><span /></Panel>);
    expect(container.querySelector('[data-testid="panel-action"]')).not.toBeInTheDocument();
  });
});

describe('Structure', () => {
  it('has a dedicated header element containing the title', () => {
    const { container } = render(<Panel title="My Panel"><span /></Panel>);
    const header = container.querySelector('.panelHeader');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('My Panel');
  });

  it('has a body element containing the children', () => {
    const { container } = render(
      <Panel title="My Panel"><p data-testid="body-child">hi</p></Panel>,
    );
    const body = container.querySelector('.panelBody');
    expect(body).toBeInTheDocument();
    expect(body).toContainElement(screen.getByTestId('body-child'));
  });

  it('applies noPadding class to body when noPadding prop is set', () => {
    const { container } = render(<Panel title="X" noPadding><span /></Panel>);
    expect(container.querySelector('.panelBodyNoPadding')).toBeInTheDocument();
    expect(container.querySelector('.panelBody')).not.toBeInTheDocument();
  });
});
