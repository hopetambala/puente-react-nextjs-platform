/**
 * Screenshot matrix for the review loop (docs/responsive-a11y-overhaul.md,
 * "Screenshot review loop"): routes × 375/768/1440 × eng/spa.
 *
 *   node e2e/capture-matrix.mjs                         # every route, label = current branch
 *   node e2e/capture-matrix.mjs --label pr-2-before     # name the set
 *   node e2e/capture-matrix.mjs --routes /quick-start,/billing
 *   node e2e/capture-matrix.mjs --text-200              # also shoot each at 200% text size
 *   E2E_BASE=http://localhost:3001 node e2e/capture-matrix.mjs --label master
 *                                                       # the "before" set, from a master server
 *
 * Writes .e2e-artifacts/<label>/<route>/<width>-<locale>[-text200].png and an
 * index.json listing every shot, for a before/after gallery. The data is the
 * synthetic world, so the shots are safe to share in a PR or an Artifact: no
 * real partner, person or household appears.
 *
 * Capture only: it asserts nothing. The responsive-a11y suite is the gate.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import a11yConfig from '../a11y.config.cjs';
import { settle } from './lib/a11y-checks.mjs';
import { ARTIFACTS, BASE, LOCALE_PREFIX } from './lib/harness.mjs';
import { ROUTES } from './lib/routes.mjs';
import { installWorld } from './lib/synthetic-world.mjs';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
};
const branch = () => {
  try { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return 'capture'; }
};
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root';

const label = slug(arg('label') ?? branch());
const routes = arg('routes')?.split(',') ?? ROUTES.map((r) => r.path);
const text200 = process.argv.includes('--text-200');
const OUT = join(ARTIFACTS, label);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const shots = [];
  try {
    for (const [locale, prefix] of Object.entries(LOCALE_PREFIX)) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
      await installWorld(ctx);
      const page = await ctx.newPage();
      for (const route of routes) {
        mkdirSync(join(OUT, slug(route)), { recursive: true });
        for (const width of a11yConfig.CAPTURE_WIDTHS) {
          await page.setViewportSize({ width, height: 1000 });
          const path = `${prefix}${route === '/' && prefix ? '' : route}`;
          await page.goto(`${BASE}${path}`, { timeout: 120000, waitUntil: 'domcontentloaded' });
          await settle(page);
          const variants = [{ suffix: '', css: null }];
          if (text200) variants.push({ suffix: '-text200', css: 'html { font-size: 200% !important; }' });
          for (const { suffix, css } of variants) {
            const handle = css ? await page.addStyleTag({ content: css }) : null;
            const file = join(slug(route), `${width}-${locale}${suffix}.png`);
            await page.screenshot({ path: join(OUT, file), fullPage: true });
            if (handle) await handle.evaluate((n) => n.remove());
            shots.push({ route, width, locale, variant: suffix.slice(1) || 'default', file, url: page.url() });
            console.log(`  ✓ ${file}`);
          }
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify({ label, base: BASE, takenAt: new Date().toISOString(), shots }, null, 1));
  console.log(`\n${shots.length} screenshots in ${OUT}`);
})();
