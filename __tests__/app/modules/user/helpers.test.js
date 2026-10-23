// ─── A stale session must never block signing in ───────────────────────────
// refreshSessionToken logs out whoever is cached before a new sign-in. When
// that cached session was already revoked on the server (deactivation, a
// password reset, an expired token), Parse rejects the logout with 209
// "Invalid session token" — and the rejection used to abort the sign-in before
// the password was ever checked. The user could not sign in at all until they
// cleared their browser's site data.
jest.mock('parse', () => ({
  Parse: { User: { current: jest.fn(), logOut: jest.fn() } },
}));

const { Parse } = require('parse');
const { refreshSessionToken } = require('app/modules/user/helpers');

beforeEach(() => jest.clearAllMocks());

it('does nothing when nobody is cached', async () => {
  Parse.User.current.mockReturnValue(null);
  await expect(refreshSessionToken()).resolves.toBeNull();
  expect(Parse.User.logOut).not.toHaveBeenCalled();
});

it('logs out a cached user', async () => {
  Parse.User.current.mockReturnValue({ id: 'u1' });
  Parse.User.logOut.mockResolvedValue(undefined);
  await refreshSessionToken();
  expect(Parse.User.logOut).toHaveBeenCalledTimes(1);
});

it('resolves even when the cached session was revoked on the server', async () => {
  Parse.User.current.mockReturnValue({ id: 'u1' });
  Parse.User.logOut.mockRejectedValue(Object.assign(new Error('Invalid session token'), { code: 209 }));
  await expect(refreshSessionToken()).resolves.toBeNull();
});
