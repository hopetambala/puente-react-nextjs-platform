import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

const Badge = require('app/impacto-design-system/badge').default;

// ─── RED: variant mapping ─────────────────────────────────────────────────────
// If the CSS module key for a variant is renamed or the styles[variant] lookup
// is removed, the variant class test fails before a token rename silently
// strips all badge colors.

describe('Rendering', () => {
  it('renders children text', () => {
    render(<Badge variant="green">Published</Badge>);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders as a span', () => {
    const { container } = render(<Badge variant="blue">Draft</Badge>);
    expect(container.firstChild.tagName).toBe('SPAN');
  });
});

describe('Variants', () => {
  const variants = ['green', 'yellow', 'orange', 'blue', 'red', 'purple'];

  it.each(variants)('applies the %s variant class', (variant) => {
    const { container } = render(<Badge variant={variant}>{variant}</Badge>);
    expect(container.firstChild.className).toMatch(variant);
  });

  it('defaults to blue variant', () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild.className).toMatch('blue');
  });
});

describe('Dot prop', () => {
  it('renders a pulse dot element when dot is true', () => {
    const { container } = render(<Badge variant="purple" dot>Live</Badge>);
    // dot is a nested span inside the badge span
    expect(container.firstChild.querySelector('span')).toBeInTheDocument();
  });

  it('does not render a dot element by default', () => {
    const { container } = render(<Badge variant="green">Published</Badge>);
    expect(container.firstChild.querySelector('span')).not.toBeInTheDocument();
  });
});
