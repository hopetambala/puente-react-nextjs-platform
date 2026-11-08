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

/**
 * jsdom has <dialog> but not its modal API. This stands in for the parts the
 * design system relies on (dialog/useModalDialog.js): showModal() opens it,
 * close() closes it and fires `close`, as browsers do. Esc and the inert
 * background are the browser's job and are covered by the e2e sweep, not here.
 */
if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
