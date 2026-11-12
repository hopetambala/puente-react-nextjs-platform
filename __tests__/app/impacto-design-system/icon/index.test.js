import '@testing-library/jest-dom';
import { render } from '@testing-library/react';

import Icon, { ICON_NAMES } from 'app/impacto-design-system/icon';

// The in-house set that replaced the MUI icon registry: only the glyphs the app
// draws, decorative by default. The control around an icon carries the name.
describe('Icon', () => {
  it.each(ICON_NAMES)('draws %s as a decorative svg', (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    expect(svg.querySelector('path').getAttribute('d')).not.toBe('');
  });

  it('has the magnifier the record search draws', () => {
    expect(ICON_NAMES).toContain('search');
  });
});
