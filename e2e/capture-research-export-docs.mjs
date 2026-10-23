/**
 * Screenshots of the research export, for the "Sharing data with researchers"
 * guide (puente-dr.github.io/guides/research/).
 *
 *   yarn dev                                   # in another shell
 *   node e2e/capture-research-export-docs.mjs  # writes both languages
 *
 * NEVER LOGS IN: every backend answer is a stub — see research-export-stubs.mjs.
 *
 * Capture only. It asserts nothing beyond "the thing I am photographing is on
 * screen"; anything needing a real assertion belongs in a run-e2e.mjs suite.
 */
import {
  BASE, captureBothLocales, clip, shot, stubbedPage,
} from './capture-lib.mjs';
import { installStubs } from './research-export-stubs.mjs';

const ROOT = process.env.OUT
  || '/Users/hopetambala/Documents/development/puente/puente-react-nextjs-platform/docs/img/research-export';

async function walk({ browser, prefix, out }) {
  // ── the row: research file first, full records renamed, badge ────────────
  {
    const { ctx, page } = await stubbedPage(browser, installStubs);
    await page.goto(`${BASE}${prefix}/forms/form-manager`);
    await page.getByRole('button', { name: /Export research file|Exportar archivo de investigación/ })
      .waitFor({ timeout: 30000 });
    await shot(page, 'research-00-form-manager', out);
    await clip(page, 'table:has(tr:has-text("Vision exam"))', 'research-01-form-manager-row', out);

    // ── the row expanded: what each file contains, said in the open ────────
    await page.locator('tr', { hasText: 'Vision exam' }).getByRole('button', { name: /expand|expandir/i }).click();
    await page.getByText(/Research file:|Archivo de investigación:/).waitFor({ timeout: 15000 });
    await clip(page, 'table:has(tr:has-text("Vision exam"))', 'research-02-what-each-file-contains', out);

    // ── after Refresh: how many forms reached Puente (the evening check) ───
    await page.getByRole('button', { name: /^(Refresh|Actualizar)$/ }).click();
    await page.getByText(/37/).first().waitFor({ timeout: 15000 });
    await clip(page, 'table:has(tr:has-text("Vision exam"))', 'research-04-forms-collected', out);
    await ctx.close();
  }

  // ── the setting in the form builder ─────────────────────────────────────
  {
    const { ctx, page } = await stubbedPage(browser, installStubs);
    await page.goto(`${BASE}${prefix}/forms/form-creator`);
    const box = page.getByRole('checkbox', { name: /Allow research export|Permitir exportación/ });
    await box.waitFor({ timeout: 30000 });
    await box.check();
    await shot(page, 'research-03-allow-research-export', out);
    await ctx.close();
  }
}

captureBothLocales(ROOT, walk);
