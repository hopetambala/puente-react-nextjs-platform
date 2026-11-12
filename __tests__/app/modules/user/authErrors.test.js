/**
 * authErrorKey: what a signed-out page tells someone when Parse refuses them.
 *
 * The pages used to toast `e.message`: Parse's raw English ("Invalid
 * username/password.") reached Spanish and Creole readers, and a network
 * failure read as a wrong password. Parse error codes are the stable contract
 * (Parse.Error), so each one we can explain maps to a catalog key, and
 * everything else to a generic key, never to the server's text.
 */
const { authErrorKey, AUTH_ERROR_KEYS } = require('app/modules/user/authErrors');

const parseError = (code, message = 'server English') => Object.assign(new Error(message), { code });

describe('authErrorKey', () => {
  it.each([
    [101, 'auth_error_invalid_credentials'], // OBJECT_NOT_FOUND: wrong username or password
    [100, 'auth_error_offline'], // CONNECTION_FAILED
    [125, 'auth_error_invalid_email'], // INVALID_EMAIL_ADDRESS
    [202, 'auth_error_username_taken'], // USERNAME_TAKEN
    [203, 'auth_error_email_taken'], // EMAIL_TAKEN
    [205, 'auth_error_email_not_found'], // EMAIL_NOT_FOUND
    [209, 'auth_error_session'], // INVALID_SESSION_TOKEN
  ])('maps Parse error %i to %s', (code, key) => {
    expect(authErrorKey(parseError(code))).toBe(key);
  });

  it('falls back to a generic key for any other code, never the server text', () => {
    expect(authErrorKey(parseError(141, 'Cloud function failed: something English'))).toBe('auth_error_generic');
  });

  it('treats a missing or code-less error as generic', () => {
    expect(authErrorKey(undefined)).toBe('auth_error_generic');
    expect(authErrorKey(new Error('TypeError: x is undefined'))).toBe('auth_error_generic');
  });

  it('reads a fetch failure with no code (offline in the field) as offline', () => {
    expect(authErrorKey(new TypeError('Failed to fetch'))).toBe('auth_error_offline');
  });

  it('only ever returns keys it declares, so the catalogs can be checked', () => {
    const returned = [101, 100, 125, 202, 203, 205, 209, 141].map((c) => authErrorKey(parseError(c)));
    returned.forEach((k) => expect(AUTH_ERROR_KEYS).toContain(k));
  });
});

describe('auth error catalog contract', () => {
  const fs = require('fs');
  const path = require('path');
  it.each(['eng', 'spa', 'hat'])('%s has a string for every auth error key', (lng) => {
    const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'public', 'locales', lng, 'common.json'), 'utf8'));
    AUTH_ERROR_KEYS.forEach((k) => expect(catalog[k]).toEqual(expect.any(String)));
  });
});
