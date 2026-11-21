import { stripLocalePrefix } from 'app/modules/i18n/languages';

/**
 * Routes the auth guard in pages/_app.js renders without a session. Written
 * without locale prefixes; isPublicPath strips them (and the query string).
 *
 * /account/management is deliberately NOT here: account settings needs a
 * session. Collect's account link lands on sign-in and comes back through
 * returnUrl.
 */
const PUBLIC_PATHS = [
  '/',
  '/account/login',
  '/account/login/reset-login',
  '/account/verify',
  '/account/verify/redirect',
  '/account/register',
  '/account/reset',
];

const isPublicPath = (url) => PUBLIC_PATHS.includes(stripLocalePrefix(url));

export { isPublicPath, PUBLIC_PATHS };
