/**
 * The one axe configuration for unit tests.
 *
 * Tags match the Playwright responsive sweep (e2e/suites/responsive-a11y.mjs)
 * so a component that passes here is judged by the same rules as the page it
 * renders in. jsdom has no layout, so the rules that need rendered geometry
 * or colour (contrast, target size, scrollable regions) are off here; the e2e
 * sweep and the Storybook test-runner check those in a real browser.
 */
const { configureAxe } = require('jest-axe');

const { WCAG_TAGS } = require('../a11y.config.cjs');

const axe = configureAxe({
  runOnly: { type: 'tag', values: WCAG_TAGS },
  rules: {
    'color-contrast': { enabled: false },
    'target-size': { enabled: false },
  },
});

module.exports = { axe, WCAG_TAGS };
