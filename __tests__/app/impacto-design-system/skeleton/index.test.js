import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import Skeleton from 'app/impacto-design-system/skeleton';

describe('Skeleton', () => {
  it('renders a hidden span with aria-hidden', () => {
    const { container } = render(<Skeleton width={100} height={16} />);
    const el = container.querySelector('span');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies width and height via inline style', () => {
    const { container } = render(<Skeleton width={80} height={20} />);
    const span = container.querySelector('span');
    expect(span.style.width).toBe('80px');
    expect(span.style.height).toBe('20px');
  });

  it('accepts string width (percentage)', () => {
    const { container } = render(<Skeleton width="60%" height={13} />);
    const span = container.querySelector('span');
    expect(span.style.width).toBe('60%');
  });

  it('merges extra style prop', () => {
    const { container } = render(<Skeleton width={40} height={8} style={{ borderRadius: '50%' }} />);
    const span = container.querySelector('span');
    expect(span.style.borderRadius).toBe('50%');
  });

  it('appends extra className', () => {
    const { container } = render(<Skeleton width={40} height={8} className="myExtra" />);
    const span = container.querySelector('span');
    expect(span.className).toContain('myExtra');
  });

  it('renders without optional props', () => {
    // Regression: no className or style should not throw
    expect(() => render(<Skeleton width={32} height={12} />)).not.toThrow();
  });
});
