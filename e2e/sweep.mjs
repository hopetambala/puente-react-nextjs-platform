#!/usr/bin/env node
/**
 * Remove every `e2e-*` form left behind by a crashed or interrupted run.
 *
 * `form-create` sweeps at the end of its own run, but a run that dies mid-way
 * cannot. This is the standalone recovery, and it exists because writing these
 * suites left dozens of abandoned forms in staging before the sweep worked.
 *
 *   node e2e/sweep.mjs            # report what it would remove
 *   node e2e/sweep.mjs --delete   # actually remove them
 *
 * Scoped to names beginning `e2e-` and refused against production, so it can
 * never touch a form a person made.
 */
import { openSession } from './lib/harness.mjs';
import { sweepProgress } from './lib/harness-lib.mjs';

const E2E_FORM = /e2e-(form|probe)/;
const MANAGER_LOADED = { text: /SurveyData/ };
const APPLY = process.argv.includes('--delete');

(async () => {
  const s = await openSession({ suite: 'sweep', owned: [/forms/] });
  await s.login();
  await s.requireWritableEnvironment();

  await s.withExpectedErrors(/supplied to `Stack`|headerActions|does not recognize the/, async () => {
    await s.go('/forms/form-manager', MANAGER_LOADED, 'open Form Manager');

    const names = async () => s.page.locator('tr', { hasText: E2E_FORM })
      .evaluateAll((rows) => rows.map((r) => (r.innerText.match(/e2e-[a-z]+-?\d*/) || [''])[0]).filter(Boolean));

    const before = await names();
    console.log(`\n  found ${before.length} e2e form(s)`);
    before.slice(0, 12).forEach((n) => console.log(`    ${n}`));
    if (before.length > 12) console.log(`    …and ${before.length - 12} more`);

    if (!APPLY) {
      await s.check('sweep is a dry run unless --delete is passed', true,
        `${before.length} form(s) would be removed`);
      return;
    }

    let removed = 0;
    let stopped = '';
    for (let pass = 0; pass < 200; pass += 1) {
      // eslint-disable-next-line no-await-in-loop
      const count = await s.page.locator('tr', { hasText: E2E_FORM }).count();
      if (count === 0) { stopped = 'list is clear'; break; }

      const row = s.page.locator('tr', { hasText: E2E_FORM }).first();
      s.page.once('dialog', (d) => d.accept());
      // eslint-disable-next-line no-await-in-loop
      await row.getByRole('button', { name: /delete/i }).first().click().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await s.page.waitForLoadState('networkidle').catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      const after = await s.page.locator('tr', { hasText: E2E_FORM }).count();

      // Ask whether that delete achieved anything. Without this the loop
      // hammered two undeletable rows thirty times over.
      const p = sweepProgress(count, after);
      if (after < count) removed += count - after;
      if (!p.continue) { stopped = p.reason; break; }
      if (removed % 10 === 0) console.log(`    removed ${removed}…`);
    }
    if (stopped) console.log(`\n  stopped: ${stopped}`);

    await s.step('reload to confirm against the server, not the DOM',
      () => s.page.reload(), MANAGER_LOADED);
    const after = await names();
    console.log(`\n  removed ${removed}, ${after.length} remaining`);
    await s.check('no e2e forms remain', after.length === 0,
      after.length
        ? `${removed} removed; ${after.length} UNDELETABLE: ${after.slice(0, 5).join(', ')}`
        : `${removed} removed`);
  });

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
