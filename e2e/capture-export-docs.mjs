/**
 * Screenshots for the public guide at /guides/getting-your-data-out/, using
 * ENTIRELY SYNTHETIC data. Sibling of capture-form-docs.mjs and
 * capture-org-docs.mjs — same reasoning, same rules.
 *
 * Usage:  yarn dev    (in another shell)
 *         node e2e/capture-export-docs.mjs
 *
 * Why stubbed rather than a real login: an export screen lists a real
 * organization's forms and its record counts, and the export itself IS partner
 * data. Published images must never contain any of it. The interface here is
 * genuine; every backend answer is invented.
 *
 * BOTH LANGUAGES IN ONE RUN. Next serves Spanish under /spa, so the same walk
 * runs twice and writes English to <OUT>/ and Spanish to <OUT>/es/. The guides
 * previously shipped English screenshots on their Spanish pages; a reader who
 * needs the Spanish page is the reader least able to map an English button to
 * the one in front of them.
 *
 * Capture only. It asserts nothing beyond "the thing I am photographing is on
 * screen", so it is not the hand-rolled-Playwright hazard run-e2e.mjs exists to
 * prevent; anything needing a real assertion belongs in a suite.
 */
import {
  BASE, captureBothLocales, clip, json, shot, stubbedPage,
} from './capture-lib.mjs';

const ROOT = process.env.OUT
  || '/Users/hopetambala/Documents/development/puente/puente-react-nextjs-platform/docs/img/export';

/** Invented forms, invented organization. Nothing here exists. */
const CUSTOM_FORMS = [
  {
    objectId: 'FSPa000001',
    name: 'Water access — Example Community',
    description: 'Sample form for the guide.',
    organizations: ['Example Health Trust'],
    workflow: 'Water',
    active: 'true',
    customForm: true,
    fields: [],
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
  },
  {
    objectId: 'FSPa000002',
    name: 'Household follow-up (Example)',
    description: 'Sample form for the guide.',
    organizations: ['Example Health Trust'],
    workflow: 'Water',
    active: 'true',
    customForm: true,
    fields: [],
    createdAt: '2026-05-11T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
];

/**
 * The CSV body the export endpoint answers with.
 *
 * 'rows'  — a normal export
 * 'empty' — exactly "\n", which is what the aggregator sends for a form with no
 *           results. It is a 200, not an error, and the reason the empty case
 *           needs its own message at all.
 * 'fail'  — a 500, so the failure toast can be photographed next to the empty
 *           one. The whole point of §7 is that these two are different.
 */
const CSV_ROWS = [
  'idSupplementary,createdAt,objectId,fname,lname,communityname,Cuantas personas viven en la casa',
  'FRSa000001,2026-08-19T14:02:00.000Z,SDAa000001,Paciente,Ejemplo,Comunidad Ejemplo,4',
  'FRSa000002,2026-08-19T15:20:00.000Z,SDAa000002,Ejemplo,Ramirez,Comunidad Ejemplo,2',
].join('\n');

async function installStubs(ctx, csvMode) {
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
      return json(route, {
        results: [{
          objectId: 'ORGa000001',
          name: 'Example Health Trust',
          shortCode: 'example-health-trust',
          aliases: [],
          active: true,
        }],
      });
    }
    if (url.includes('/classes/FormSpecificationsV2')) {
      return json(route, { results: CUSTOM_FORMS });
    }
    return json(route, { results: [] });
  });

  // The exporter API, wherever it is pointed. Matching on the path rather than
  // the host keeps this working against any NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL.
  await ctx.route(
    (url) => /\/v[23]\/records/.test(url.pathname) || url.pathname.includes('records-custom-forms'),
    async (route) => {
      if (csvMode === 'fail') {
        return route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' });
      }
      return route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: csvMode === 'empty' ? '\n' : CSV_ROWS,
      });
    },
  );
}

/** The Export button on a given row, found by the row's visible name. */
function exportButtonNear(page, rowText) {
  return page.locator('tr', { hasText: rowText }).locator('button', { hasText: /Export|Exportar/i }).first();
}

async function walk({ browser, prefix, out }) {
  // ── the screen itself, and where the button lives ────────────────────────
  {
    const { ctx, page } = await stubbedPage(browser, (c) => installStubs(c, 'rows'));
    await page.goto(`${BASE}${prefix}/forms/form-manager`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    await shot(page, 'export-01-form-manager', out);
    await clip(page, 'table', 'export-02-export-buttons', out);
    await ctx.close();
  }

  // ── a form with no results yet: a 200 whose body is one newline ──────────
  {
    const { ctx, page } = await stubbedPage(browser, (c) => installStubs(c, 'empty'));
    await page.goto(`${BASE}${prefix}/forms/form-manager`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    const btn = exportButtonNear(page, 'Vitals');
    if (await btn.count()) {
      await btn.click();
      await page.waitForSelector('.Toastify__toast', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(900);
      await shot(page, 'export-03-no-records-yet', out);
    } else {
      console.log('  ! no Export button found for the empty case');
    }
    await ctx.close();
  }

  // ── the export that failed, which is NOT the same as having no data ──────
  {
    const { ctx, page } = await stubbedPage(browser, (c) => installStubs(c, 'fail'));
    await page.goto(`${BASE}${prefix}/forms/form-manager`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2500);

    const btn = exportButtonNear(page, 'Vitals');
    if (await btn.count()) {
      await btn.click();
      await page.waitForSelector('.Toastify__toast', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(900);
      await shot(page, 'export-04-export-failed', out);
    } else {
      console.log('  ! no Export button found for the failure case');
    }
    await ctx.close();
  }
}

captureBothLocales(ROOT, walk);
