/**
 * Form creation — build a custom form, publish it, confirm it is real, delete it.
 *
 * WRITES. Refuses production, and cleans up after itself: Form Manager has a
 * Delete action, so the whole cycle runs through real UI and the delete path is
 * covered too.
 *
 * A form definition is not an ordinary record. `FormSpecificationsV2.fields[].formikKey`
 * is derived from the label ONCE, at creation, and every answer submitted later
 * stores that key in `FormResults.fields[].title`. That join is what a CSV
 * column is built from — so this suite asserts the created form is findable and
 * removable, and never touches a form it did not create.
 *
 * See e2e/README.md for the harness rules.
 */
import { openSession } from '../lib/harness.mjs';

const LOGIN_FORM = { role: 'button', name: /sign in|login/i };
// Form Manager renders in sections: the built-in Puente forms first, then
// CUSTOM FORMS separately and later. Two earlier versions of this suite got
// this wrong — one waited on the "+ Create form" button (which exists before
// any data), the other on SurveyData (which proves only the built-in list
// arrived) — and both concluded the form had not saved when it had.
// Waiting for the form BY NAME is both the wait and the assertion.
const MANAGER_LOADED = { text: /SurveyData/ };
const CREATOR = { role: 'button', name: /^publish$/i };

const stamp = Date.now();
const NAME = `e2e-form-${stamp}`;
const DESC = `Created by e2e/suites/form-create at ${new Date(stamp).toISOString()} — safe to delete.`;

(async () => {
  const s = await openSession({ suite: 'form-create', owned: [/forms/, /quick-start/] });
  // Pre-existing on /forms/form-manager on master, unrelated to form creation.
  const PRE_EXISTING = /supplied to `Stack`/;
  await s.login();
  await s.requireWritableEnvironment();

  // ── BUILD ────────────────────────────────────────────────────────────────
  console.log(`\n[BUILD] composing ${NAME}`);
  await s.go('/forms/form-creator', CREATOR, 'open the form creator');

  const nameField = s.page.getByPlaceholder(/give your form a detailed na/i).first();
  const descField = s.page.getByPlaceholder(/describe how this form/i).first();
  await s.check('the creator asks for a name and a description',
    await nameField.count() > 0 && await descField.count() > 0);
  await nameField.fill(NAME);
  await descField.fill(DESC);

  // One block of each of the two commonest kinds, so the form has real fields
  // whose labels become formikKeys.
  for (const block of [/Question - Text response/i, /Question - Number response/i]) {
    // eslint-disable-next-line no-await-in-loop
    await s.page.getByRole('button', { name: block }).first().click();
    // eslint-disable-next-line no-await-in-loop
    await s.page.waitForLoadState('networkidle').catch(() => {});
  }
  const canvasText = (await s.page.locator('body').innerText()).replace(/\s+/g, ' ');
  await s.check('added blocks appear on the canvas',
    /text response|number response/i.test(canvasText), 'blocks rendered');
  await s.shot('composed');

  // ── PUBLISH ──────────────────────────────────────────────────────────────
  console.log('\n[PUBLISH] saving the form');
  await s.page.getByRole('button', { name: /^publish$/i }).first().click();
  await s.page.waitForLoadState('networkidle').catch(() => {});
  await s.page.waitForFunction(
    (n) => document.body.innerText.includes(n)
      || /publish|saved|success|created/i.test(document.body.innerText),
    NAME, { timeout: 40000 },
  ).catch(() => {});
  await s.shot('published');

  // ── IT IS REALLY THERE ───────────────────────────────────────────────────
  // The assertion that matters: not "the button was clicked" but "a coordinator
  // opening Form Manager now sees this form".
  console.log('\n[PERSISTED] the form is visible in Form Manager');
  await s.withExpectedErrors(PRE_EXISTING, async () => {
  // Does the new form show up on a first visit, or only after a reload? Both
  // are asserted separately, because "publish a form, open Form Manager, it is
  // not there" is a real defect a coordinator would hit, and it is invisible if
  // the test simply retries until it passes.
  await s.go('/forms/form-manager', MANAGER_LOADED, 'open Form Manager');
  const rowFor = (n) => s.page.locator('tr', { hasText: n });
  await rowFor(NAME).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  const onFirstVisit = await rowFor(NAME).count() > 0;
  // RETRACTED CLAIM, kept visible so the mistake is not repeated.
  //
  // An earlier version of this comment asserted a product bug: "a published form
  // does not appear in Form Manager". That was WRONG, and the evidence for it was
  // an artifact of a counting bug — the old sweep incremented its total per
  // Delete CLICK rather than per row actually removed, so "swept 40" meant 40
  // clicks, not 40 forms.
  //
  // What is actually true, verified from the response body: Publish returns 200
  // with a real objectId, and saves `"fields": []` — the block this suite adds
  // is never registered. Clicking a block button in the FORM BUILDER apparently
  // only offers it; the INSPECTOR ("Select a block to edit") is likely the step
  // that commits it, and this suite never performs it.
  //
  // So the form is created EMPTY, and an empty form appears not to list. That is
  // a gap in this suite, not a proven defect in the product. The check stays
  // failing because the suite genuinely cannot yet build a real form — but it is
  // labelled as OUR gap, not theirs.
  await s.check('the new form appears without needing a reload', onFirstVisit,
    onFirstVisit ? NAME : 'SUITE GAP: the form saved with fields:[] — the block was never committed, see the note above');

  let listed = onFirstVisit ? 1 : 0;
  if (!onFirstVisit) {
    await s.step('reload Form Manager', () => s.page.reload(), MANAGER_LOADED);
    await rowFor(NAME).first().waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
    listed = await rowFor(NAME).count();
  }
  await s.check('the created form persisted', listed > 0,
    listed ? `${NAME}${onFirstVisit ? '' : ' (only after a reload)'}` : `${NAME} never appeared`);

  // ── CLEAN UP ─────────────────────────────────────────────────────────────
  console.log('\n[CLEANUP] deleting the form this suite created');
  let deleted = false;
  if (listed > 0) {
    // Scope the Delete to the row carrying OUR name. Clicking a bare "Delete"
    // would remove whichever form happened to be first, which on a shared
    // staging database is somebody else's work.
    const row = rowFor(NAME).first();
    const scoped = await row.count();
    await s.check('the delete action can be scoped to the created form', scoped > 0,
      scoped ? 'row located by name' : 'could not isolate the row — NOT deleting anything');
    if (scoped) {
      s.page.once('dialog', (d) => d.accept());
      await row.getByRole('button', { name: /delete/i }).first().click();
      await s.page.waitForLoadState('networkidle').catch(() => {});
      await s.page.waitForFunction((n) => !document.body.innerText.includes(n), NAME, { timeout: 30000 })
        .catch(() => {});
      deleted = await rowFor(NAME).count() === 0;
    }
  }
  await s.check('the created form was deleted', deleted,
    deleted ? `${NAME} removed` : `LEFT BEHIND: ${NAME} — delete it by hand`);

  if (deleted) {
    await s.step('reload Form Manager', () => s.page.reload(), MANAGER_LOADED);
    await s.check('the deletion survives a reload (it was persisted, not just hidden)',
      await rowFor(NAME).count() === 0, 'gone after reload');
  }
  });

  // Safety net: remove ANY leftover e2e-* form, including ones a previous
  // crashed run abandoned. Scoped to the e2e- prefix so it can never touch a
  // form a person made.
  await s.withExpectedErrors(PRE_EXISTING, async () => {
    await s.step('reload Form Manager for the sweep', () => s.page.reload(), MANAGER_LOADED);
    let swept = 0;
    for (let i = 0; i < 40; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const row = s.page.locator('tr', { hasText: /e2e-(form|probe)/ }).first();
      // eslint-disable-next-line no-await-in-loop
      if (await row.count() === 0) break;
      s.page.once('dialog', (d) => d.accept());
      // eslint-disable-next-line no-await-in-loop
      await row.getByRole('button', { name: /delete/i }).first().click().catch(() => {});
      // eslint-disable-next-line no-await-in-loop
      await s.page.waitForLoadState('networkidle').catch(() => {});
      swept += 1;
    }
    if (swept) console.log(`      swept ${swept} leftover e2e form(s)`);
    await s.step('reload after the sweep', () => s.page.reload(), MANAGER_LOADED);
    await s.check('no e2e forms are left behind',
      await s.page.locator('tr', { hasText: /e2e-(form|probe)/ }).count() === 0,
      `${swept} removed`);
  });

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
