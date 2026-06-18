/**
 * Integration tests for user management cloud functions.
 *
 * app/modules/user/index.js calls these five cloud functions that mirror
 * the real puente-node-cloudcode server:
 *
 *   signup             — create a new user via cloud function
 *   retrieveUserByObjectId — fetch a user by their objectId
 *   updateUser         — patch fields on an existing user
 *   queryUser          — find a user by username
 *   deleteUser         — destroy a user record
 *
 * Parse.User.logIn / logOut / signUp (SDK-level) are covered separately in
 * __tests__/app/modules/cloud-code/user/auth.integration.test.js.
 *
 * Run with:
 *   yarn test:integration
 */

const { initParse, Parse } = require('../../../integration/parseClient');

beforeAll(() => {
  initParse();
});

// Wipe all test users between suites so describes stay independent.
afterEach(async () => {
  const query = new Parse.Query(Parse.User);
  // Only destroy users created by these tests (prefix 'mgmt_')
  query.startsWith('username', 'mgmt_');
  const users = await query.find({ useMasterKey: true });
  if (users.length) await Parse.Object.destroyAll(users, { useMasterKey: true });
});

// ─── signup cloud function ────────────────────────────────────────────────────
// app/modules/user/index.js → Parse.Cloud.run('signup', signupParams)
// Creates a Parse User from plain params (not the SDK Parse.User.signUp).

describe('signup cloud function', () => {
  it('creates a user and returns a JSON representation with username', async () => {
    const result = await Parse.Cloud.run(
      'signup',
      {
        username: 'mgmt_alice',
        password: 'password123',
        email: 'mgmt_alice@example.com',
        name: 'Alice Test',
        organization: 'puente-dr',
      },
      { useMasterKey: true },
    );

    expect(result.username).toBe('mgmt_alice');
  });

  it('persists the user so they can subsequently log in', async () => {
    await Parse.Cloud.run(
      'signup',
      { username: 'mgmt_bob', password: 'bobpass456', email: 'mgmt_bob@example.com' },
      { useMasterKey: true },
    );

    const loggedIn = await Parse.User.logIn('mgmt_bob', 'bobpass456');
    expect(loggedIn.get('username')).toBe('mgmt_bob');
    await Parse.User.logOut();
  });

  it('stores optional fields (name, organization) on the user', async () => {
    const result = await Parse.Cloud.run(
      'signup',
      {
        username: 'mgmt_carol',
        password: 'carolpass',
        name: 'Carol Test',
        organization: 'test-org',
      },
      { useMasterKey: true },
    );

    expect(result.name).toBe('Carol Test');
    expect(result.organization).toBe('test-org');
  });
});

// ─── retrieveUserByObjectId cloud function ────────────────────────────────────
// app/modules/user/index.js → Parse.Cloud.run('retrieveUserByObjectId', { objectId })

describe('retrieveUserByObjectId cloud function', () => {
  it('returns the correct user JSON for a valid objectId', async () => {
    // Create a user to retrieve
    const created = await Parse.Cloud.run(
      'signup',
      { username: 'mgmt_retrieve', password: 'pass123', email: 'mgmt_r@example.com' },
      { useMasterKey: true },
    );

    const result = await Parse.Cloud.run(
      'retrieveUserByObjectId',
      { objectId: created.objectId },
      { useMasterKey: true },
    );

    expect(result.objectId).toBe(created.objectId);
    expect(result.username).toBe('mgmt_retrieve');
  });

  it('rejects when the objectId does not exist', async () => {
    await expect(
      Parse.Cloud.run(
        'retrieveUserByObjectId',
        { objectId: 'nonexistent-user-id-xyz' },
        { useMasterKey: true },
      ),
    ).rejects.toThrow();
  });
});

// ─── updateUser cloud function ────────────────────────────────────────────────
// app/modules/user/index.js → Parse.Cloud.run('updateUser', { objectId, userObject })

describe('updateUser cloud function', () => {
  it('patches the specified fields and returns updated user JSON', async () => {
    const created = await Parse.Cloud.run(
      'signup',
      { username: 'mgmt_update', password: 'pass123', name: 'Original Name' },
      { useMasterKey: true },
    );

    const result = await Parse.Cloud.run(
      'updateUser',
      {
        objectId: created.objectId,
        userObject: { name: 'Updated Name', organization: 'new-org' },
      },
      { useMasterKey: true },
    );

    expect(result.name).toBe('Updated Name');
    expect(result.organization).toBe('new-org');
  });

  it('preserves fields not included in the update', async () => {
    const created = await Parse.Cloud.run(
      'signup',
      { username: 'mgmt_preserve', password: 'pass123', name: 'Keep This', organization: 'keep-org' },
      { useMasterKey: true },
    );

    await Parse.Cloud.run(
      'updateUser',
      { objectId: created.objectId, userObject: { name: 'Changed' } },
      { useMasterKey: true },
    );

    // Read back directly to verify organization was not wiped
    const query = new Parse.Query(Parse.User);
    const user = await query.get(created.objectId, { useMasterKey: true });
    expect(user.get('name')).toBe('Changed');
    expect(user.get('organization')).toBe('keep-org');
  });
});

// ─── queryUser cloud function ─────────────────────────────────────────────────
// app/modules/user/index.js → Parse.Cloud.run('queryUser', { username })

describe('queryUser cloud function', () => {
  it('returns the user JSON for a matching username', async () => {
    await Parse.Cloud.run(
      'signup',
      { username: 'mgmt_query', password: 'pass123' },
      { useMasterKey: true },
    );

    const result = await Parse.Cloud.run(
      'queryUser',
      { username: 'mgmt_query' },
      { useMasterKey: true },
    );

    expect(result).not.toBeNull();
    expect(result.username).toBe('mgmt_query');
  });

  it('returns null when no user with that username exists', async () => {
    const result = await Parse.Cloud.run(
      'queryUser',
      { username: 'mgmt_does_not_exist' },
      { useMasterKey: true },
    );

    expect(result).toBeNull();
  });
});

// ─── deleteUser cloud function ────────────────────────────────────────────────
// app/modules/user/index.js → Parse.Cloud.run('deleteUser', { objectId })

describe('deleteUser cloud function', () => {
  it('returns { deleted: true } and the objectId', async () => {
    const created = await Parse.Cloud.run(
      'signup',
      { username: 'mgmt_delete', password: 'pass123' },
      { useMasterKey: true },
    );

    const result = await Parse.Cloud.run(
      'deleteUser',
      { objectId: created.objectId },
      { useMasterKey: true },
    );

    expect(result.deleted).toBe(true);
    expect(result.objectId).toBe(created.objectId);
  });

  it('the user is gone from Parse after deletion', async () => {
    const created = await Parse.Cloud.run(
      'signup',
      { username: 'mgmt_gone', password: 'pass123' },
      { useMasterKey: true },
    );

    await Parse.Cloud.run(
      'deleteUser',
      { objectId: created.objectId },
      { useMasterKey: true },
    );

    await expect(
      Parse.Cloud.run(
        'retrieveUserByObjectId',
        { objectId: created.objectId },
        { useMasterKey: true },
      ),
    ).rejects.toThrow();
  });

  it('rejects when the objectId does not exist', async () => {
    await expect(
      Parse.Cloud.run(
        'deleteUser',
        { objectId: 'no-such-user-xyz' },
        { useMasterKey: true },
      ),
    ).rejects.toThrow();
  });
});
