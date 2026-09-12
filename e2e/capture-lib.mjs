/**
 * Shared scaffolding for the guide screenshot captures.
 *
 * Three capture scripts (`capture-export-docs`, `capture-form-docs`,
 * `capture-org-docs`) each walk the same interface twice — once in English at
 * `/`, once in Spanish at `/spa` — because the public guides are bilingual and
 * used to show an English app on their Spanish pages. Everything that differs
 * between them is the WALK and the STUBS; everything here is what was
 * identical in all three.
 *
 * Capture only. Nothing here asserts, so these scripts are not the
 * hand-rolled-Playwright hazard `run-e2e.mjs` exists to prevent; anything
 * needing a real assertion belongs in a suite.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

export const BASE = 'http://localhost:3000';

/** Fulfil a stubbed route with JSON. */
export const json = (route, body) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/** Whole-viewport screenshot. */
export const shot = async (page, name, out) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
};

/**
 * Screenshot one element.
 *
 * A missing selector logs and skips rather than throwing: one shot that cannot
 * be taken should not cost the other eleven, and the log line is what tells
 * you an image is stale rather than absent.
 */
export const clip = async (page, selector, name, out) => {
  const el = page.locator(selector).first();
  if (!(await el.count())) {
    console.log(`  ! ${selector} not found — skipped ${name}`);
    return;
  }
  await el.screenshot({ path: `${out}/${name}.png` });
  console.log(`  ✓ ${name}.png`);
};

/** The viewport every guide screenshot is taken at. */
export const VIEWPORT = { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 };

/**
 * A fresh context with its stubs installed, and a page on it.
 *
 * One context per SCENARIO, not per script: stubs are installed per context,
 * so a capture that needs the server to answer differently (rows, then empty,
 * then a 500) needs a context for each.
 */
export async function stubbedPage(browser, installStubs) {
  const ctx = await browser.newContext(VIEWPORT);
  await installStubs(ctx);
  const page = await ctx.newPage();
  return { ctx, page };
}

/**
 * Run one capture walk in both languages, writing each to its own directory.
 *
 * `walk({ browser, prefix, out })` does the work and owns its contexts — see
 * stubbedPage. This owns only the browser, the two locales and the
 * directories. Spanish goes to `<root>/es/`, the layout the guides' language
 * toggle expects.
 */
export async function captureBothLocales(root, walk) {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const { prefix, out, label } of [
      { prefix: '', out: root, label: 'English' },
      { prefix: '/spa', out: `${root}/es`, label: 'Español' },
    ]) {
      mkdirSync(out, { recursive: true });
      console.log(`\n=== ${label} → ${out} ===`);
      await walk({ browser, prefix, out });
    }
  } finally {
    await browser.close();
  }
  console.log(`\nSaved to ${root} and ${root}/es`);
}
