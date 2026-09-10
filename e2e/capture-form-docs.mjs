/**
 * Screenshots for the public guide at /guides/building-a-form/, using ENTIRELY
 * SYNTHETIC data. Sibling of capture-org-docs.mjs — same reasoning, same rules.
 *
 * Usage:  yarn dev    (in another shell)
 *         node e2e/capture-form-docs.mjs
 *
 * Why stubbed rather than a real login: published screenshots must never contain
 * real partner names, community names or household data. Not blurred, not "just
 * for the demo". The interface here is genuine and every backend answer invented.
 *
 * Blocks are placed with the KEYBOARD, not synthetic mouse drags.
 * react-beautiful-dnd supports lift/move/drop on Space + arrows, which is both
 * far more reliable to automate than dragging and a check that the builder is
 * usable without a mouse. If a lift stops working, that is a real finding.
 *
 * Capture only. It asserts nothing, so it is not the hand-rolled-Playwright
 * hazard run-e2e.mjs exists to prevent; anything needing an assertion is a suite.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = process.env.OUT
  || '/Users/hopetambala/Documents/development/puente/puente-react-nextjs-platform/docs/img/forms';
mkdirSync(OUT, { recursive: true });

const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function installStubs(ctx) {
  await ctx.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      objectId: 'USRa000001', username: 'ada@example.org', firstname: 'Ada',
      lastname: 'Example', organization: 'Example Health Trust', role: 'administrator',
    }));
  });
  await ctx.route('**/parseapi.back4app.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/functions/myOrganizationAccess')) {
      return json(route, { result: { isStaff: false, orgAdminOf: ['example-health-trust'] } });
    }
    if (url.includes('/classes/Organization')) {
      return json(route, { results: [{ objectId: 'ORGa000001', name: 'Example Health Trust', shortCode: 'example-health-trust', aliases: [], active: true }] });
    }
    return json(route, { results: [] });
  });
}

/** Place a palette block on the canvas using react-beautiful-dnd's keyboard API. */
async function placeBlock(page, blockName) {
  const item = page.getByText(blockName, { exact: false }).first();
  if (!(await item.count())) { console.log(`  ! palette item not found: ${blockName}`); return false; }
  const handle = item.locator('xpath=ancestor-or-self::*[@data-rbd-drag-handle-draggable-id][1]');
  const target = (await handle.count()) ? handle.first() : item;
  await target.focus();
  await page.keyboard.press('Space');          // lift
  await page.waitForTimeout(350);
  await page.keyboard.press('ArrowLeft');      // palette sits right of the canvas
  await page.waitForTimeout(350);
  await page.keyboard.press('Space');          // drop
  await page.waitForTimeout(700);
  return true;
}

const clip = async (page, selector, name) => {
  const el = page.locator(selector).first();
  if (!(await el.count())) { console.log(`  ! ${selector} not found — skipped ${name}`); return; }
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await installStubs(ctx);
  const page = await ctx.newPage();

  console.log('→ /forms/form-creator (synthetic)');
  await page.goto(`${BASE}/forms/form-creator`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  // The palette on its own: the seven blocks, which is the whole point of §2.
  await clip(page, '[class*="blocksSidebar"]', 'manage-02-blocks-palette');

  // A named form, so the shot shows a real thing being built rather than a blank.
  const nameBox = page.locator('#formName');
  if (await nameBox.count()) {
    await nameBox.fill('Water access — Example Community');
    await page.waitForTimeout(200);
  }
  const descBox = page.locator('#formDescription');
  if (await descBox.count()) {
    await descBox.fill('Sample form for the guide. Nothing here is real data.');
    await page.waitForTimeout(200);
  }
  await clip(page, '[class*="settingsCard"]', 'manage-03-form-settings');

  let placed = 0;
  for (const name of ['Question - Text response', 'Question - Number response', 'Question - Single select']) {
    if (await placeBlock(page, name)) placed += 1;
  }
  console.log(`  blocks placed: ${placed}`);
  await page.waitForTimeout(800);

  await clip(page, '[class*="builderSection"]', 'manage-04-blocks-on-canvas');

  // Selecting a CANVAS block (not a palette one — both are draggables) opens the
  // Inspector, where the question text is written. That text becomes the column
  // heading in the export, which is the whole point of the guide's §4.
  // Pick the NUMBER block specifically. Selecting whatever happens to be first
  // produced a shot whose label said "How many people live in this house?" over
  // a key reading `geolocation_...`, which teaches the reader the wrong thing.
  const canvasBlock = page
    .locator('[class*="builderSection"] [data-rbd-draggable-id]')
    .filter({ hasText: /Number response/i })
    .first();
  if (await canvasBlock.count()) {
    await canvasBlock.click().catch(() => {});
    await page.waitForTimeout(800);
  } else {
    console.log('  ! no Number-response block on the canvas to select');
  }

  // Type a real question so the Inspector shows something meaningful.
  const qBox = page.locator('[class*="blocksSidebar"] input[type="text"], [class*="blocksSidebar"] textarea').first();
  if (await qBox.count()) {
    await qBox.fill('How many people live in this house?');
    await page.waitForTimeout(600);
  } else {
    console.log('  ! inspector question field not found');
  }
  await clip(page, '[class*="blocksSidebar"]', 'manage-05-inspector');
  await clip(page, '[class*="builderSection"]', 'manage-04-blocks-on-canvas');

  await page.screenshot({ path: `${OUT}/manage-01-form-creator.png`, fullPage: true });
  console.log('  ✓ manage-01-form-creator.png');

  await browser.close();
  console.log(`\nSaved to ${OUT}`);
})();
