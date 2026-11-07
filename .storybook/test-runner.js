/**
 * `yarn test-storybook`: axe on every story at every dlite breakpoint.
 *
 * Each story is rendered once, then resized through BREAKPOINTS (640, 768,
 * 1024, 1280) and checked with the WCAG 2.2 AA rule set from a11y.config.cjs.
 * A violation fails the story unless `a11y-known-failures.json` lists it as
 * `"<story id> @ <width>": ["<axe rule id>", …]`. Listed failures that no longer
 * occur are printed as fixed, so the PR that fixed them can delete the entry.
 *
 * A story can opt out only through its own `parameters.a11y.disable`, which
 * shows up in review next to the story it excuses.
 */
const { getStoryContext } = require('@storybook/test-runner');
const { getViolations, injectAxe } = require('axe-playwright');

const { BREAKPOINTS, WCAG_TAGS } = require('../a11y.config.cjs');
const KNOWN = require('./a11y-known-failures.json').failures;

module.exports = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const story = await getStoryContext(page, context);
    if (story.parameters?.a11y?.disable) return;

    const problems = [];
    const fixed = [];
    for (const [name, width] of Object.entries(BREAKPOINTS)) {
      await page.setViewportSize({ width, height: 900 });
      const violations = await getViolations(page, '#storybook-root', {
        runOnly: { type: 'tag', values: WCAG_TAGS },
      });
      const key = `${context.id} @ ${width}`;
      const known = KNOWN[key] ?? [];
      const found = [...new Set(violations.map((v) => v.id))];
      violations
        .filter((v) => !known.includes(v.id))
        .forEach((v) => problems.push(
          `${name} ${width}px  ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})\n`
          + `      ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join('\n      ')}`,
        ));
      known.filter((id) => !found.includes(id)).forEach((id) => fixed.push(`${key}  ${id}`));
    }

    if (fixed.length) {
      process.stdout.write(`Fixed, delete from .storybook/a11y-known-failures.json:\n  ${fixed.join("\n  ")}\n`);
    }
    if (problems.length) {
      throw new Error(`axe found ${problems.length} new violation(s) in ${context.id}:\n  ${problems.join('\n  ')}`);
    }
  },
};
