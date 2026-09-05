/**
 * Form editing — create a form, edit it in a fresh session, confirm the change
 * persisted, delete it.
 *
 * WRITES. Refuses production, and only ever touches a form it created itself.
 *
 * TWO SESSIONS ON PURPOSE. `form-create` established that a form published in a
 * session does not appear in Form Manager during that session. So this suite
 * creates in session 1, closes the browser, and edits in session 2 — which is
 * both the workaround and a second demonstration of the finding.
 *
 * It edits the DESCRIPTION, never a field LABEL. `formikKey` is derived from a
 * label once, at creation, and every answer already submitted stores that key in
 * `FormResults.fields[].title`. Renaming a label leaves historical answers under
 * the old key, which is what silently empties a CSV column. A test has no
 * business doing that to a shared database, and the suite says so rather than
 * quietly avoiding it.
 *
 * See e2e/README.md for the harness rules.
 */
import { openSession } from '../lib/harness.mjs';
import { addBlock, deleteFormRow, publishForm } from '../lib/form-builder.mjs';

const MANAGER_LOADED = { text: /SurveyData/ };
const CREATOR = { role: 'button', name: /^publish$/i };
const PRE_EXISTING = /supplied to `Stack`|supplied to `Card`|headerActions|does not recognize the/;

const stamp = Date.now();
const NAME = `e2e-form-${stamp}`;
const DESC_BEFORE = `original description ${stamp}`;
const DESC_AFTER = `EDITED description ${stamp}`;

const rowFor = (page, n) => page.locator('tr', { hasText: n });

(async () => {
  // ── SESSION 1: CREATE ────────────────────────────────────────────────────
  const a = await openSession({ suite: 'form-edit', owned: [/forms/] });
  await a.login();
  await a.requireWritableEnvironment();

  console.log(`\n[CREATE] session 1 publishes ${NAME}`);
  a.expectPreExisting = true;
  await a.withExpectedErrors(PRE_EXISTING, async () => {
  await a.go('/forms/form-creator', CREATOR, 'open the form creator');
  await a.page.getByPlaceholder(/give your form a detailed na/i).first().fill(NAME);
  await a.page.getByPlaceholder(/describe how this form/i).first().fill(DESC_BEFORE);
  await addBlock(a.page, /Question - Text response/i);
  const created = await publishForm(a.page);
  await a.check('session 1 published a form that saved', !!created.objectId,
    created.objectId ? `${NAME} → ${created.objectId}` : JSON.stringify(created).slice(0, 80));
  await a.shot('session1-published');
  });
  await a.finish();

  // ── SESSION 2: FIND, EDIT, VERIFY, DELETE ────────────────────────────────
  const s = await openSession({ suite: 'form-edit-s2', owned: [/forms/] });
  await s.login();
  await s.requireWritableEnvironment();

  let deleted = false;
  await s.withExpectedErrors(PRE_EXISTING, async () => {
    console.log('\n[FIND] session 2 sees the form session 1 created');
    await s.go('/forms/form-manager', MANAGER_LOADED, 'open Form Manager');
    await rowFor(s.page, NAME).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const found = await rowFor(s.page, NAME).count() > 0;
    await s.check('a form created in a previous session is visible in this one', found,
      found ? NAME : `${NAME} not visible even in a fresh session`);
    if (!found) return;

    await s.check('the form carries the description it was created with',
      (await rowFor(s.page, NAME).first().innerText()).includes(DESC_BEFORE),
      DESC_BEFORE);

    // ── EDIT ───────────────────────────────────────────────────────────────
    console.log('\n[EDIT] changing the description');
    await rowFor(s.page, NAME).first().getByRole('button', { name: /^edit$/i }).first().click();
    await s.page.waitForLoadState('networkidle').catch(() => {});
    await s.see(CREATOR);

    const descField = s.page.getByPlaceholder(/describe how this form/i).first();
    const loaded = await descField.inputValue().catch(() => '');
    await s.check('Edit opens the form with its existing content loaded',
      loaded.includes(DESC_BEFORE), JSON.stringify(loaded.slice(0, 50)));

    await descField.fill(DESC_AFTER);
    const edited = await publishForm(s.page);
    await s.check('the edit saved', !!edited.objectId || !!edited.updatedAt,
      JSON.stringify(edited).slice(0, 80));
    await s.shot('edited');

    // ── VERIFY ─────────────────────────────────────────────────────────────
    // Against the server, not the DOM the edit just mutated.
    console.log('\n[VERIFY] the change survives a reload');
    // Navigate, do not reload: clicking Edit moved us to the form creator, so a
    // reload here reloads the creator and never finds Form Manager.
    await s.go('/forms/form-manager', MANAGER_LOADED, 'return to Form Manager');
    await rowFor(s.page, NAME).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const rowText = await rowFor(s.page, NAME).first().innerText().catch(() => '');

    await s.check('the edited description persisted', rowText.includes(DESC_AFTER),
      rowText.includes(DESC_BEFORE) ? 'still shows the ORIGINAL description — the edit did not save'
        : JSON.stringify(rowText.replace(/\s+/g, ' ').slice(0, 80)));

    // An edit that saved a SECOND form instead of updating the first is the
    // failure that matters here: two definitions, two sets of formikKeys, and a
    // CSV column that silently splits. Cheap to check, expensive to miss.
    const copies = await rowFor(s.page, NAME).count();
    await s.check('editing updated the form rather than creating a duplicate',
      copies === 1, `${copies} row(s) named ${NAME}`);

    // ── DELETE ─────────────────────────────────────────────────────────────
    console.log('\n[CLEANUP] deleting the form this suite created');
    if (await rowFor(s.page, NAME).count() > 0) {
      await deleteFormRow(s.page, rowFor(s.page, NAME).first());
    }
    await s.go('/forms/form-manager', MANAGER_LOADED, 'confirm the delete against the server');
    deleted = await rowFor(s.page, NAME).count() === 0;
    await s.check('the form this suite created was deleted', deleted,
      deleted ? `${NAME} removed` : `LEFT BEHIND: ${NAME} — run e2e/sweep.mjs --delete`);
  });

  const { failed } = await s.finish();
  process.exit(failed.length ? 1 : 0);
})();
