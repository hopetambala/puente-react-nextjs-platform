/**
 * Every page route in pages/, for the responsive a11y sweep and the capture
 * matrix. `__tests__/e2e/routes.test.js` fails when a page is added to pages/
 * without being listed here, so a new route cannot skip the gate.
 *
 * `signedIn: false` routes are visited as a signed-out visitor (the synthetic
 * world removes the stored user on those paths), which is how people meet them.
 */
export const ROUTES = [
  { path: '/', signedIn: false },
  { path: '/account/login', signedIn: false },
  { path: '/account/login/reset-login', signedIn: false },
  { path: '/account/register', signedIn: false },
  { path: '/account/reset', signedIn: false },
  { path: '/account/verify', signedIn: false },
  { path: '/account/verify/redirect', signedIn: false },
  { path: '/account/management', signedIn: true },
  { path: '/quick-start', signedIn: true },
  { path: '/data/data-curation', signedIn: true },
  { path: '/data/data-analysis', signedIn: true },
  { path: '/data/data-visualization', signedIn: true },
  { path: '/forms/form-manager', signedIn: true },
  { path: '/forms/form-creator', signedIn: true },
  { path: '/forms/form-marketplace', signedIn: true },
  { path: '/billing', signedIn: true },
  { path: '/organization-admin', signedIn: true },
];

export const SIGNED_OUT_PATHS = ROUTES.filter((r) => !r.signedIn).map((r) => r.path);
