/**
 * What to tell someone when Parse refuses a sign-in, sign-up or reset.
 *
 * Pages used to show `error.message`, Parse's own English, to every reader,
 * and a network failure read the same as a wrong password. Parse error codes
 * are a stable contract (Parse.Error), so each one a person can act on maps to
 * a catalog key, and anything else maps to a generic key, never the server's
 * text.
 */
const BY_CODE = {
  100: 'auth_error_offline', // CONNECTION_FAILED
  101: 'auth_error_invalid_credentials', // OBJECT_NOT_FOUND: wrong username or password
  125: 'auth_error_invalid_email', // INVALID_EMAIL_ADDRESS
  202: 'auth_error_username_taken', // USERNAME_TAKEN
  203: 'auth_error_email_taken', // EMAIL_TAKEN
  205: 'auth_error_email_not_found', // EMAIL_NOT_FOUND
  209: 'auth_error_session', // INVALID_SESSION_TOKEN
};

const GENERIC = 'auth_error_generic';

export const AUTH_ERROR_KEYS = [...new Set([...Object.values(BY_CODE), GENERIC])];

/**
 * @param {unknown} error  whatever the Parse call rejected with
 * @returns {string} a key in the `common` catalog
 */
export function authErrorKey(error) {
  if (error && typeof error.code === 'number' && BY_CODE[error.code]) return BY_CODE[error.code];
  // fetch() rejects with a TypeError and no code when there's no connection:
  // the field's usual failure, and not the person's fault.
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return BY_CODE[100];
  return GENERIC;
}
