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
    // eslint-disable-next-line no-await-in-loop
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
    // eslint-disable-next-line no-await-in-loop
    await page.keyboard.press('ArrowLeft');
    // eslint-disable-next-line no-await-in-loop
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
    // eslint-disable-next-line no-await-in-loop
    if (await row.count() === 0) { stopped = 'list is clear'; break; }
    // eslint-disable-next-line no-await-in-loop
    const parsed = (await row.innerText()).match(/e2e-[\w-]+/);
    if (!parsed) {
      // Refuse to delete a row we cannot name. The previous version used '?' as
      // the name, which made the survival check query a different row set
      // entirely — so the delete was counted as successful with no evidence.
      stopped = 'a matching row could not be named — refusing to delete it';
      break;
    }
    const name = parsed[0];
    // eslint-disable-next-line no-await-in-loop
    const before = await page.locator('tr', { hasText: pattern }).count();
    // eslint-disable-next-line no-await-in-loop
    await deleteFormRow(page, row).catch((e) => { stopped = `delete threw: ${String(e).slice(0, 80)}`; });
    if (stopped) break;
    // eslint-disable-next-line no-await-in-loop
    await page.goto(`${base ?? new URL(page.url()).origin}${managerPath}`);
    // eslint-disable-next-line no-await-in-loop
    await page.getByText(/SurveyData/).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    // eslint-disable-next-line no-await-in-loop
    // eslint-disable-next-line no-await-in-loop
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
