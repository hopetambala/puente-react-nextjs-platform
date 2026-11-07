/**
 * One source for the a11y gate's rule set and widths, read by
 *   - unit tests        (__test-utils__/axe.js, jest-axe)
 *   - Storybook         (.storybook/preview.js, .storybook/test-runner.js)
 *   - the e2e sweep     (e2e/suites/responsive-a11y.mjs, e2e/capture-matrix.mjs)
 * so every layer judges by the same WCAG rules at the same widths.
 * See docs/responsive-a11y-overhaul.md, "A11y tooling stack".
 */

/** axe-core tags: WCAG 2.0, 2.1 and 2.2, levels A and AA. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * dlite's breakpoint scale: Storybook viewport presets and test-runner widths.
 *
 * TODO(PR 1b): read from `style-dictionary-dlite-tokens/web/breakpoints.json`
 * once 0.4.0 is published; 0.2.7 emits breakpoints only as custom properties.
 */
const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 };

/** Page widths the e2e sweep checks: small phone, phone, tablet, laptop, desktop. */
const SWEEP_WIDTHS = [320, 375, 768, 1024, 1440];

/** Widths the screenshot review loop shoots. */
const CAPTURE_WIDTHS = [375, 768, 1440];

/** Locales, by URL prefix. Next serves Spanish under /spa. */
const LOCALES = { eng: '', spa: '/spa' };

module.exports = { WCAG_TAGS, BREAKPOINTS, SWEEP_WIDTHS, CAPTURE_WIDTHS, LOCALES };
