import { sweepProgress } from './harness-lib.mjs';

/**
 * Driving the Form Creator's block palette.
 *
 * Blocks are added by DRAG AND DROP (react-beautiful-dnd 13.1.1), not by
 * clicking. Two of my suites clicked the block buttons, added nothing, and
 * published forms with `"fields": []` — which then did not list, which I
 * misread as a product bug. Clicking a block does nothing at all.
 *
 * This uses rbd's KEYBOARD dragging rather than simulated mouse events:
 *
 *   focus the drag handle → Space (lift) → ArrowLeft ×2 (move to the canvas)
 *   → Space (drop)
 *
 * Keyboard is the right choice twice over. It is deterministic, where synthetic
 * mouse drags against rbd are a well-known source of flake. And it exercises the
 * accessible path — if this stops working, a keyboard user can no longer build a
 * form, which is a real regression a mouse-driven test would never notice.
 */

/**
 * The Form Manager page-loaded signal, shared so the suites and the standalone
 * sweep cannot drift apart — they did once already, and the copies disagreeing
 * is what let a stale wait survive in one file after being fixed in another.
 *
 * "SurveyData" is one of the four BUILT-IN form names, hardcoded in a local
 * const in app/epics/FormManager/index.js. It is not organization data, so no
 * rename or deletion in the database can move it. And it renders only inside
 * that component's `!loading` branch, which is what makes waiting on it mean
 * "the custom-form fetch has settled" rather than merely "a page appeared".
 *
 * It is deliberately NOT the "Puente Forms" panel heading. That string comes
 * from i18n — spa "Formularios de Puente", hat "Fòm Puente yo" — so any suite
 * that ever runs in another locale would fail on the WAIT instead of on the
 * behaviour under test, and the failure would name the wrong culprit.
 *
 * One caveat worth knowing: a FAILED custom-forms fetch also clears `loading`,
 * so this signal means "settled", not "succeeded". A suite that counts rows
 * after it cannot tell an empty organization from a broken request.
 */
export const MANAGER_LOADED = { text: /SurveyData/ };

/** Drag handles, in palette order, with their visible labels. */
export async function paletteBlocks(page) {
  return page.locator('[data-rbd-drag-handle-draggable-id]')
    .evaluateAll((ns) => ns.map((n, i) => ({ index: i, label: n.innerText.replace(/\s+/g, ' ').trim() })));
}

/**
 * Add one block to the canvas by name.
 *
 * Returns the label actually dragged, so a caller can assert on it rather than
 * assuming the palette order.
 */
export async function addBlock(page, nameRe, { steps = 2 } = {}) {
  const handles = page.locator('[data-rbd-drag-handle-draggable-id]');
  const count = await handles.count();
  if (count === 0) throw new Error('No drag handles found — the block palette did not render.');

  let target = null;
  let label = '';
  for (let i = 0; i < count; i += 1) {
    const text = (await handles.nth(i).innerText()).replace(/\s+/g, ' ').trim();
    if (nameRe.test(text)) { target = handles.nth(i); label = text; break; }
  }
  if (!target) throw new Error(`No palette block matching ${nameRe}. Available: ${(await paletteBlocks(page)).map((b) => b.label).join(' | ')}`);

  await target.focus();
  await page.keyboard.press('Space');
  // rbd announces the lift asynchronously; give it a frame to enter drag state
  // rather than racing the next key.
  await page.waitForFunction(() => !!document.querySelector('[data-rbd-drag-handle-draggable-id][aria-pressed="true"], [data-rbd-placeholder-context-id]'),
    null, { timeout: 5000 }).catch(() => {});
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(250);
  }
  await page.keyboard.press('Space');
  await page.waitForLoadState('networkidle').catch(() => {});
  return label;
}

/**
 * Publish the form and wait for the SAVE to land.
 *
 * The wait is the whole point. An earlier version waited for
 * `/publish|saved|success/` in the page text — but "Publish" is the button's own
 * label, so the condition was already true, the wait returned instantly, and the
 * suite navigated away mid-request. The form then genuinely did not exist yet
 * when Form Manager was queried, which I twice misread as a product bug.
 *
 * Waiting on the Cloud Code response is deterministic and cannot be satisfied by
 * chrome that happens to contain the word.
 */
export async function publishForm(page, { timeout = 60000 } = {}) {
  const saved = page.waitForResponse(
    (r) => /postObjectsToClass|updateObject/i.test(r.url()) && r.status() === 200,
    { timeout },
  );
  await page.getByRole('button', { name: /^publish$/i }).first().click();
  const res = await saved;
  const body = await res.json().catch(() => ({}));
  await page.waitForLoadState('networkidle').catch(() => {});
  return body.result ?? body;
}

/**
 * Delete the form in `row`, including the confirmation step.
 *
 * "Delete" only OPENS an in-page confirmation — "Do you want to remove this
 * form?" with a "Delete form" button. Clicking Delete alone produces no network
 * activity at all, which I mistook first for a broken delete and then for
 * forms that could not be removed. The confirm is the actual delete.
 *
 * Note for whoever owns this surface: the confirmation is NOT exposed as a
 * dialog — `getByRole('dialog')` finds nothing — so a screen reader will not
 * announce it as one, and focus is not trapped. Worth fixing; not this suite's
 * job to work around beyond clicking the button.
 */
export async function deleteFormRow(page, row, { timeout = 60000 } = {}) {
  // A native dialog is not used, but accept one harmlessly if that ever changes.
  page.once('dialog', (d) => d.accept().catch(() => {}));
  await row.getByRole('button', { name: /^delete$/i }).first().click();

  const confirm = page.getByRole('button', { name: /^delete form$/i }).first();
  await confirm.waitFor({ state: 'visible', timeout: 15000 });

  const done = page.waitForResponse(
    (r) => /parseapi|back4app/i.test(r.url()) && r.request().method() !== 'GET',
    { timeout },
  ).catch(() => null);
  await confirm.click();
  await done;
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Remove every form whose name matches `pattern`, reloading between deletes.
 *
 * Shared so the inline sweep in a suite and the standalone recovery tool cannot
 * drift apart — they did, and the suite's copy kept the old click-counting bug
 * that reported "40 removed" when nothing had been deleted at all.
 *
 * Returns { removed, remaining, stopped }.
 */
export async function sweepForms(page, pattern, { base, managerPath = '/forms/form-manager', max = 100 } = {}) {
  let removed = 0;
  let stopped = '';
  for (let pass = 0; pass < max; pass += 1) {
    const row = page.locator('tr', { hasText: pattern }).first();
    if (await row.count() === 0) { stopped = 'list is clear'; break; }
    const parsed = (await row.innerText()).match(/e2e-[\w-]+/);
    if (!parsed) {
      // Refuse to delete a row we cannot name. The previous version used '?' as
      // the name, which made the survival check query a different row set
      // entirely — so the delete was counted as successful with no evidence.
      stopped = 'a matching row could not be named — refusing to delete it';
      break;
    }
    const name = parsed[0];
    const before = await page.locator('tr', { hasText: pattern }).count();
    // Return the message rather than assigning `stopped` from inside a .catch()
    // closure declared in the loop. That was safe only because the next line
    // breaks immediately; returning it removes the need to know that.
    const threw = await deleteFormRow(page, row).then(() => '').catch((e) => String(e).slice(0, 80));
    if (threw) { stopped = `delete threw: ${threw}`; break; }
    await page.goto(`${base ?? new URL(page.url()).origin}${managerPath}`);
    await page.getByText(MANAGER_LOADED.text).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const after = await page.locator('tr', { hasText: pattern }).count();
    const progress = sweepProgress(before, after);
    if (await page.locator('tr', { hasText: name }).count() > 0) {
      stopped = `"${name}" survived its delete`; break;
    }
    removed += 1;
    if (!progress.continue && after > 0) { stopped = progress.reason; break; }
  }
  const remaining = await page.locator('tr', { hasText: pattern }).count();
  return { removed, remaining, stopped };
}
