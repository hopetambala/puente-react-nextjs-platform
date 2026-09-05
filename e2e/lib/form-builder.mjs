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
