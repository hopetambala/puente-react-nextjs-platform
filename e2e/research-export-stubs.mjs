/**
 * The invented world the research-export captures run in: one organization,
 * two forms (one with research export on), and a backend that answers every
 * call without a network. Shared by capture-research-export-docs.mjs
 * (screenshots) and capture-research-export-gifs.mjs (animations).
 *
 * NEVER LOGS IN. The screen lists an organization's forms and the export is
 * patient data, so the interface is genuine and every backend answer is a stub.
 * Every form, person and organization here is invented.
 */
import { json } from './capture-lib.mjs';

export const FORMS = [
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

/** What the research route answers: invented patients, the real column set. */
export const RESEARCH_CSV = [
  'study_id,submission_id,visit_date,age_at_visit,age_as_reported,age_reported_date,sex,communityname,city,province,surveyingOrganization,Agudeza OD sin lentes (right without),Agudeza OD con lentes (right with)',
  'P-3fa9c01b2e,S-81d0c2aa47,2026-11-10,42,,2026-11-10,female,Comunidad Ejemplo,Constanza,La Vega,Example Eye Study,20/200,20/40',
  'P-77b2e90d13,S-0c55e1f9b2,2026-11-10,,67,2026-11-10,male,Comunidad Ejemplo,Constanza,La Vega,Example Eye Study,20/100,20/30',
].join('\n');

export async function installStubs(ctx) {
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
    // Form Manager's "Forms collected": a Parse count query on FormResults.
    if (url.includes('/classes/FormResults')) return json(route, { results: [], count: 37 });
    if (url.includes('/functions/postObjectsToClass') || url.includes('/functions/updateObject')) {
      return json(route, { result: { objectId: 'FSPr000003' } });
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

  // The export service, wherever NEXT_PUBLIC_PUENTE_DATA_EXPORTER_API_URL points.
  await ctx.route(
    (url) => url.pathname.includes('/v2/research/') || url.pathname.includes('records-custom-forms'),
    async (route) => {
      // Long enough for the button's loading state to be seen in an animation.
      await new Promise((r) => { setTimeout(r, 900); });
      return route.fulfill({ status: 200, contentType: 'text/csv', body: RESEARCH_CSV });
    },
  );
}
