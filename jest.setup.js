/**
 * Runs after the test framework is installed, before every test file.
 *
 * jest-axe: `expect(await axe(container)).toHaveNoViolations()` is available in
 * every test without an import of the matcher. Each design-system primitive and
 * each epic's main component is expected to render with zero axe violations in
 * every state it has (see docs/responsive-a11y-overhaul.md, "A11y tooling
 * stack"). Import `axe` from `__test-utils__/axe` rather than from jest-axe
 * directly, so every test runs the same WCAG rule set.
 */
const { toHaveNoViolations } = require('jest-axe');

expect.extend(toHaveNoViolations);
