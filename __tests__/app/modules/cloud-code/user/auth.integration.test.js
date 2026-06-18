/**
 * Integration tests for Parse.User authentication round-trip.
 *
 * Tests login, failed login, and logout against a real Parse Server
 * (started by globalSetup.js).
 *
 * Run with:
 *   yarn test:integration
 */

const { initParse, Parse } = require('../../../../integration/parseClient');

beforeAll(async () => {
  initParse();
  await Parse.User.signUp('auth_testuser', 'testpassword123', {
    email: 'authtest@example.com',
  });
});

afterAll(async () => {
  const query = new Parse.Query(Parse.User);
  query.equalTo('username', 'auth_testuser');
  const users = await query.find({ useMasterKey: true });
  await Parse.Object.destroyAll(users, { useMasterKey: true });
});

// ─── Parse.User.logIn ─────────────────────────────────────────────────────

describe('Parse.User.logIn', () => {
  it('returns the user and a session token for valid credentials', async () => {
    const user = await Parse.User.logIn('auth_testuser', 'testpassword123');
    expect(user.get('username')).toBe('auth_testuser');
    expect(user.getSessionToken()).toBeTruthy();
  });

  it('rejects with an error for wrong password', async () => {
    await expect(
      Parse.User.logIn('auth_testuser', 'wrongpassword'),
    ).rejects.toThrow();
  });
});

// ─── Parse.User.logOut ────────────────────────────────────────────────────

describe('Parse.User.logOut', () => {
  it('clears the current user after logout', async () => {
    await Parse.User.logIn('auth_testuser', 'testpassword123');
    await Parse.User.logOut();
    expect(Parse.User.current()).toBeNull();
  });
});
