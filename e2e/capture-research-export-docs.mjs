/**
 * Screenshots of the research export, for the "Sharing data with researchers"
 * guide (puente-dr.github.io/guides/research/).
 *
 *   yarn dev                                   # in another shell
 *   node e2e/capture-research-export-docs.mjs  # writes both languages
 *
 * NEVER LOGS IN. Same reasoning as capture-export-docs.mjs: the screen lists an
 * organization's forms and the export is patient data, so the interface is
 * genuine and every backend answer is a stub. Every form, person and
 * organization here is invented.
 *
 * Capture only. It asserts nothing beyond "the thing I am photographing is on
 * screen"; anything needing a real assertion belongs in a run-e2e.mjs suite.
 */
import {
  BASE, captureBothLocales, clip, json, shot, stubbedPage,
} from './capture-lib.mjs';

const ROOT = process.env.OUT
  || '/Users/hopetambala/Documents/development/puente/puente-react-nextjs-platform/docs/img/research-export';

const FORMS = [
  {
    objectId: 'FSPr000001',
    name: 'Vision exam — Example Clinic',
    description: 'Sample form for the guide.',
    organizations: ['Example Eye Study'],
    active: 'true',
    customForm: true,
    allowResearchExport: true,
    fields: [],
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-23T10:00:00.000Z',
  },
  {
    objectId: 'FSPr000002',
    name: 'Clinic sign-in (Example)',
    description: 'Sample form for the guide.',
    organizations: ['Example Eye Study'],
    active: 'true',
    customForm: true,
    fields: [],
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-21T10:00:00.000Z',
  },
];

async function installStubs(ctx) {
  await ctx.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      objectId: 'USRr000001', username: 'ada@example.org', firstname: 'Ada',
      lastname: 'Example', organization: 'Example Eye Study', role: 'administrator',
    }));
  });

  await ctx.route('**/parseapi.back4app.com/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/functions/myOrganizationAccess')) {
      return json(route, { result: { isStaff: false, orgAdminOf: ['example-eye-study'] } });
    }
    if (url.includes('/classes/Organization')) {
      return json(route, {
        results: [{
          objectId: 'ORGr000001', name: 'Example Eye Study', shortCode: 'example-eye-study', aliases: [], active: true,
        }],
      });
    }
    if (url.includes('/classes/FormSpecificationsV2')) return json(route, { results: FORMS });
    return json(route, { results: [] });
  });
}

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
