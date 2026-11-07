import { render } from '@testing-library/react';

import { axe } from '__test-utils__/axe';

// The matcher is wired in jest.setup.js. These prove the wiring both ways: a
// gate that cannot fail is the bug this whole PR exists to remove (the 860px
// overflow check in e2e/suites/dashboard.mjs could never fail).

describe('jest-axe gate', () => {
  it('fails a form control that has no accessible name', async () => {
    const { container } = render(<input type="text" />);
    const results = await axe(container);
    expect(results.violations.map((v) => v.id)).toContain('label');
    expect(() => expect(results).toHaveNoViolations()).toThrow();
  });

  it('passes a labelled control', async () => {
    const { container } = render(
      <>
        <label htmlFor="org">Organization</label>
        <input id="org" type="text" autoComplete="organization" />
      </>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('passes the design-system Button', async () => {
    const Button = require('app/impacto-design-system/button').default;
    const { container } = render(<Button text="Save" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
