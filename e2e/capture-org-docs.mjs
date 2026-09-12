/**
 * Screenshots for docs/organizations-explained.md and the public organizations
 * guide, using ENTIRELY SYNTHETIC data.
 *
 * Usage:  yarn dev    (in another shell)
 *         node e2e/capture-org-docs.mjs
 *
 * Why stubbed rather than a real login:
 *   1. The Organizations screen requires staff rights, which the shared test
 *      account does not have — a real login lands on the dashboard instead.
 *   2. Published screenshots must never contain real partner names, community
 *      names or household data. Not blurred, not "just for the demo". So the
 *      interface here is genuine and every backend answer is invented.
 *
 * BOTH LANGUAGES. Next serves Spanish under /spa, so the whole walk runs twice
 * and writes English to <OUT>/ and Spanish to <OUT>/es/. The guides pair the two
 * sets on each <img> and swap them with the language toggle; before this, the
 * Spanish page showed an English app to the reader least able to work around it.
 *
 * Capture only. It asserts nothing, so it is not the hand-rolled-Playwright
 * hazard that e2e/run-e2e.mjs exists to prevent; anything needing an assertion
 * belongs in a suite.
 */
import {
  BASE, captureBothLocales, clip, json, stubbedPage,
} from './capture-lib.mjs';

const ROOT = process.env.OUT
  || '/Users/hopetambala/Documents/development/puente/puente-react-nextjs-platform/docs/img/organizations';

const iso = (d) => ({ __type: 'Date', iso: d });

const ORGS = [
  { objectId: 'ORGa000001', name: 'Example Health Trust', shortCode: 'example-health-trust', aliases: ['EHT', 'Example Health'], active: true, createdAt: '2026-01-04T10:00:00.000Z', updatedAt: '2026-01-04T10:00:00.000Z' },
  { objectId: 'ORGa000002', name: 'Clínica Ejemplo', shortCode: 'clinica-ejemplo', aliases: ['Clinica Ejemplo Norte'], active: true, createdAt: '2026-02-11T10:00:00.000Z', updatedAt: '2026-02-11T10:00:00.000Z' },
  { objectId: 'ORGa000003', name: 'Sample Water Project', shortCode: 'sample-water-project', aliases: [], active: true, createdAt: '2026-03-19T10:00:00.000Z', updatedAt: '2026-03-19T10:00:00.000Z' },
  { objectId: 'ORGa000004', name: 'Demo Outreach', shortCode: 'demo-outreach', aliases: [], active: false, createdAt: '2025-09-02T10:00:00.000Z', updatedAt: '2026-04-01T10:00:00.000Z' },
];

const USERS = [
  { objectId: 'USRa000001', username: 'ada@example.org', organization: 'Example Health Trust', createdAt: iso('2026-01-04T10:05:00.000Z') },
  { objectId: 'USRa000002', username: 'beto@example.org', organization: 'EHT', createdAt: iso('2026-02-02T09:00:00.000Z') },
  { objectId: 'USRa000003', username: 'carla@example.org', organization: 'Clinica Ejemplo Norte', createdAt: iso('2026-03-03T09:00:00.000Z') },
  { objectId: 'USRa000004', username: 'dani@example.org', organization: 'Exampel Health Trust', createdAt: iso('2026-09-06T14:20:00.000Z') },
  { objectId: 'USRa000005', username: 'eli@example.org', organization: 'Water Project South', createdAt: iso('2026-09-07T08:40:00.000Z') },
];

// A different, plausible team per organization — one shared list across every
// org reads as a rendering bug in a guide.
const MEMBERS_BY_ORG = {
  'example-health-trust': [
    { objectId: 'USRa000001', username: 'ada@example.org', firstname: 'Ada', lastname: 'Example', role: 'administrator', adminVerified: true, deactivated: false, isOrgAdmin: true },
    { objectId: 'USRa000002', username: 'beto@example.org', firstname: 'Beto', lastname: 'Muestra', role: 'contributor', adminVerified: true, deactivated: false, isOrgAdmin: false },
    { objectId: 'USRa000006', username: 'fran@example.org', firstname: 'Fran', lastname: 'Prueba', role: 'contributor', adminVerified: false, deactivated: true, isOrgAdmin: false },
  ],
  'clinica-ejemplo': [
    { objectId: 'USRa000003', username: 'carla@example.org', firstname: 'Carla', lastname: 'Modelo', role: 'administrator', adminVerified: true, deactivated: false, isOrgAdmin: true },
    { objectId: 'USRa000007', username: 'gabo@example.org', firstname: 'Gabo', lastname: 'Testigo', role: 'contributor', adminVerified: true, deactivated: false, isOrgAdmin: false },
  ],
  'sample-water-project': [
    { objectId: 'USRa000008', username: 'hana@example.org', firstname: 'Hana', lastname: 'Sample', role: 'administrator', adminVerified: true, deactivated: false, isOrgAdmin: true },
  ],
  'demo-outreach': [],
};

async function installStubs(ctx, { isStaff }) {
  await ctx.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({
      objectId: 'USRa000001', username: 'ada@example.org', firstname: 'Ada',
      lastname: 'Example', organization: 'Example Health Trust', role: 'administrator',
    }));
  });
  await ctx.route('**/parseapi.back4app.com/**', async (route) => {
    const url = route.request().url();
    const body = route.request().postData() || '';
    if (url.includes('/functions/myOrganizationAccess')) {
      return json(route, { result: { isStaff, orgAdminOf: ['example-health-trust'] } });
    }
    if (url.includes('/functions/listOrganizationMembers')) {
      const m = body.match(/"shortCode"\s*:\s*"([^"]+)"/);
      const code = m ? m[1] : 'example-health-trust';
      return json(route, { result: MEMBERS_BY_ORG[code] ?? [] });
    }
    if (url.includes('/classes/Organization')) return json(route, { results: ORGS });
    if (url.includes('/classes/_User') || url.includes('/users')) return json(route, { results: USERS });
    return json(route, { results: [] });
  });
}

async function walk({ browser, prefix, out: OUT }) {
  const { ctx, page } = await stubbedPage(browser, (c) => installStubs(c, { isStaff: true }));
  await page.goto(`${BASE}${prefix}/organization-admin`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  // Expand every organization's people so the full-page shot shows the feature.
  const loaders = page.locator('[data-testid^="load-members-"] button');
  const n = await loaders.count();
  for (let i = 0; i < n; i += 1) {
    await loaders.nth(0).click().catch(() => {});
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/admin-01-organizations-screen.png`, fullPage: true });
  console.log('  ✓ admin-01-organizations-screen.png');

  await clip(page, '[class*="orgRow"]', 'admin-03-one-organization', OUT);
  await clip(page, '[class*="queue"]', 'admin-04-waiting-room', OUT);
  await clip(page, '[class*="createForm"]', 'admin-05-create-organization', OUT);

  const q = page.locator('[data-testid="unresolved-denominator"]');
  if (await q.count()) console.log(`  waiting room: ${JSON.stringify((await q.innerText()).trim())}`);

  // The register page's organization picker, which the guide shows beside the
  // admin screens. Same stubs, so every suggestion is one of the invented
  // organizations above and never a real partner.
  //
  // The picker is `react-select` v3, not an MUI field: its input is
  // `#react-select-N-input`, it carries no role, and — measured on the live
  // page 2026-09-11 — no accessible name at all, so `getByLabel` cannot reach
  // it. That is a real defect (every input on this form is unlabelled) and is
  // tracked separately; here it just means the selector has to be structural.
  //
  // "My organization isn't listed" is a BUTTON that toggles help, not
  // something you type into. Guessing both of those cost a run.
  await page.goto(`${BASE}${prefix}/account/register`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // react-select puts its input behind the placeholder, so the input itself is
  // not clickable — "<div class=...-placeholder>Please Select</div> intercepts
  // pointer events". Click the CONTROL and type with the keyboard, which is
  // also what a person does.
  const orgControl = page.locator('div[class*="-control"]').first();
  if (await orgControl.count()) {
    await orgControl.click();
    await page.keyboard.type('Exam');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/register-02-picker-synthetic.png` });
    console.log('  ✓ register-02-picker-synthetic.png');
  } else {
    console.log('  ! organization field not found — register-02 skipped');
  }

  // The path a surveyor takes when their organization is genuinely new.
  const notListed = page.getByRole('button', { name: /no aparece|isn't listed/i }).first();
  if (await notListed.count()) {
    await page.keyboard.press('Escape');          // close the suggestion popup
    await notListed.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/register-03-not-listed-synthetic.png` });
    console.log('  ✓ register-03-not-listed-synthetic.png');
  } else {
    console.log('  ! "not listed" button not found — register-03 skipped');
  }

  await ctx.close();
}

captureBothLocales(ROOT, walk);
