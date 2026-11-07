/**
 * An invented organization, signed in, with a backend that answers every call
 * without a network. Used by the responsive a11y sweep and the capture matrix.
 *
 * Why stubbed rather than a real login:
 *   - The sweep checks the INTERFACE at 5 widths × 2 languages × every route.
 *     Real data makes that nondeterministic (row counts change what overflows)
 *     and needs staging credentials, so it could never block CI.
 *   - Screenshots from the review loop are shared in PRs and Artifacts. Every
 *     person, organization and form here is invented, never a real partner.
 *
 * The user is staff and an org admin, so every route renders its full
 * interface rather than a redirect or a permissions notice.
 *
 * Signing in is simulated the same way the guide captures do it: the app reads
 * the user from localStorage. Nothing here ever reaches Parse, so no suite using
 * it can write to any database.
 */
import { BASE } from './harness.mjs';
import { SIGNED_OUT_PATHS } from './routes.mjs';

const iso = (d) => ({ __type: 'Date', iso: d });
const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

export const USER = {
  objectId: 'USRs000001',
  username: 'ada@example.org',
  firstname: 'Ada',
  lastname: 'Example',
  organization: 'Example Health Trust',
  role: 'administrator',
  adminVerified: true,
  email: 'ada@example.org',
};

const ORGS = [
  { objectId: 'ORGs000001', name: 'Example Health Trust', shortCode: 'example-health-trust', aliases: ['EHT'], active: true, createdAt: '2026-01-04T10:00:00.000Z', updatedAt: '2026-01-04T10:00:00.000Z' },
  { objectId: 'ORGs000002', name: 'Clínica Ejemplo', shortCode: 'clinica-ejemplo', aliases: [], active: true, createdAt: '2026-02-11T10:00:00.000Z', updatedAt: '2026-02-11T10:00:00.000Z' },
];

const MEMBERS = [
  { objectId: 'USRs000001', username: 'ada@example.org', firstname: 'Ada', lastname: 'Example', role: 'administrator', adminVerified: true, deactivated: false, isOrgAdmin: true },
  { objectId: 'USRs000002', username: 'beto@example.org', firstname: 'Beto', lastname: 'Muestra', role: 'contributor', adminVerified: true, deactivated: false, isOrgAdmin: false },
];

const FORMS = [
  {
    objectId: 'FSPs000001', name: 'Household visit (example)', description: 'Invented form for testing.',
    organizations: ['Example Health Trust'], active: 'true', customForm: true, fields: [],
    createdAt: '2026-10-20T10:00:00.000Z', updatedAt: '2026-10-23T10:00:00.000Z',
  },
  {
    objectId: 'FSPs000002', name: 'Clinic sign-in (example)', description: 'Invented form for testing.',
    organizations: ['Example Health Trust'], active: 'true', customForm: true, fields: [],
    createdAt: '2026-10-20T10:00:00.000Z', updatedAt: '2026-10-21T10:00:00.000Z',
  },
];

const PEOPLE = [
  { objectId: 'SIDs000001', fname: 'Ana', lname: 'Ejemplo', communityname: 'Comunidad Ejemplo', surveyingOrganization: 'Example Health Trust', surveyingUser: 'ada@example.org', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z' },
  { objectId: 'SIDs000002', fname: 'Luis', lname: 'Muestra', communityname: 'Barrio Prueba', surveyingOrganization: 'Example Health Trust', surveyingUser: 'beto@example.org', createdAt: '2026-10-02T10:00:00.000Z', updatedAt: '2026-10-02T10:00:00.000Z' },
];

/** The rows each Parse class holds in this world. */
const classRows = (url) => {
  if (url.includes('/classes/Organization')) return ORGS;
  if (url.includes('/classes/FormSpecificationsV2')) return FORMS;
  if (url.includes('/classes/SurveyData')) return PEOPLE;
  if (url.includes('/classes/_User') || url.includes('/users')) return [{ ...USER, createdAt: iso('2026-01-04T10:05:00.000Z') }];
  return [];
};

/**
 * Answer one Parse REST call. A count query (`"count":1`) gets
 * `{ results: [], count }`; a find gets `{ results }` and NO count, because
 * the SDK's find() returns `{ results, count }` instead of an array whenever
 * the response carries one, and the page then crashes on `records.forEach`.
 */
const parseAnswer = (url, body) => {
  if (url.includes('/functions/myOrganizationAccess')) return { result: { isStaff: true, orgAdminOf: ['example-health-trust'] } };
  if (url.includes('/functions/listOrganizationMembers')) return { result: MEMBERS };
  // Encoded as a Parse object, so the SDK decodes it and `.attributes` exists.
  if (url.includes('/functions/retrieveUserByObjectId')) return { result: { ...USER, __type: 'Object', className: '_User' } };
  if (url.includes('/functions/')) return { result: [] };
  const rows = classRows(url);
  return /"count"\s*:\s*(1|true)/.test(body) ? { results: [], count: rows.length } : { results: rows };
};

/**
 * Install the world on a browser context: `openSession({ beforePage: installWorld })`
 * or `installWorld(ctx)` directly.
 */
export async function installWorld(ctx) {
  // Signed in everywhere except the public pages (ROUTES' signedIn: false),
  // which a visitor meets signed out. Decided per navigation, so one context
  // can walk both.
  //
  // Two stores hold "who is signed in": the app's own `user` key, and the
  // Parse SDK's `Parse/<appId>/currentUser`, which Parse.User.current() reads
  // (data-curation, among others). The app id is baked into the bundle and
  // differs per environment, so the Parse key is answered by pattern.
  await ctx.addInitScript(({ user, signedOut }) => {
    const path = window.location.pathname.replace(/^\/spa(?=\/|$)/, '') || '/';
    const isSignedOut = signedOut.includes(path);
    if (isSignedOut) localStorage.removeItem('user');
    else localStorage.setItem('user', JSON.stringify(user));
    const parseSession = JSON.stringify({ ...user, className: '_User', sessionToken: 'r:synthetic-session' });
    const { getItem } = Storage.prototype;
    Storage.prototype.getItem = function getItemWithSyntheticSession(key) {
      if (/^Parse\/[^/]+\/currentUser$/.test(key)) return isSignedOut ? null : parseSession;
      return getItem.call(this, key);
    };
  }, { user: USER, signedOut: SIGNED_OUT_PATHS });
  const app = new URL(BASE).host;
  // Every request off the dev server is answered here. Fonts are let through,
  // because their metrics decide what wraps and what overflows.
  await ctx.route(
    (url) => url.host !== app && !/fonts\.(googleapis|gstatic)\.com$/.test(url.host),
    async (route) => {
      const url = route.request().url();
      if (/parseapi|back4app|\/parse\//.test(url)) return json(route, parseAnswer(url, route.request().postData() || ''));
      if (route.request().resourceType() === 'image') return route.fulfill({ status: 204, body: '' });
      // The analytics service (data-analysis) answers rows as a bare array.
      if (/\/fact\//.test(url)) return json(route, []);
      return json(route, {});
    },
  );
}
