import { isPublicPath, PUBLIC_PATHS } from 'app/modules/user/publicPaths';

// The auth guard in pages/_app.js lets these routes render signed out.
// Account settings is not one of them: it needs a session.
describe('Public paths', () => {
  it('lets the landing page and the sign-in flows through signed out', () => {
    ['/', '/account/login', '/account/register', '/account/login/reset-login']
      .forEach((path) => expect(isPublicPath(path)).toBe(true));
  });

  it('does not let account settings through signed out', () => {
    expect(PUBLIC_PATHS).not.toContain('/account/management');
    expect(isPublicPath('/account/management')).toBe(false);
    expect(isPublicPath('/account/management?tab=profile')).toBe(false);
    expect(isPublicPath('/spa/account/management?tab=profile')).toBe(false);
  });

  it('ignores the locale prefix and query string', () => {
    expect(isPublicPath('/hat/account/login?returnUrl=%2Fquick-start')).toBe(true);
  });

  it('keeps private routes private', () => {
    expect(isPublicPath('/quick-start')).toBe(false);
    expect(isPublicPath('/organization-admin')).toBe(false);
  });
});
