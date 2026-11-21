import '@testing-library/jest-dom';

// ─── RED: Parse.User object stored directly in BehaviorSubject ───────────────
// retrieveSignInFunction and retrieveSignUpFunction call userSubject.next(user)
// where user is a raw Parse.User object. Parse.User stores custom attributes
// internally and exposes them via .get('organization'), NOT via direct property
// access. So parseUserValue().organization returns undefined during an active
// session, only working after a page refresh (when localStorage is read back as
// a plain JS object). These tests prove the bug exists.

jest.mock('parse', () => ({
  Parse: {
    User: {
      logIn: jest.fn(),
      logOut: jest.fn(),
      current: jest.fn(),
    },
    Cloud: {
      run: jest.fn(),
    },
  },
}));

jest.mock('app/modules/user/helpers', () => ({
  refreshSessionToken: jest.fn().mockResolvedValue(undefined),
  notificationTypeRestParams: jest.fn(() => null),
}));

const fakeParseUser = {
  get: (key) => (key === 'organization' ? 'TestOrg' : undefined),
  // NOTE: no .organization property — mimics real Parse.User behaviour
  toJSON: () => ({ objectId: 'u1', username: 'TestCMM', organization: 'TestOrg' }),
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.resetModules();
});

describe('retrieveSignInFunction — user normalization', () => {
  it('stores a plain object in the subject so .organization is accessible directly', async () => {
    const { Parse } = require('parse');
    Parse.User.logIn.mockResolvedValue(fakeParseUser);

    const { retrieveSignInFunction, parseUserValue } = require('app/modules/user');
    await retrieveSignInFunction('TestCMM', 'password');

    expect(parseUserValue().organization).toBe('TestOrg');
  });
});

// An account an administrator has deactivated is refused at sign-in, with no
// session left behind and nothing stored.
describe('retrieveSignInFunction — deactivated accounts', () => {
  const deactivatedUser = {
    get: (key) => ({ organization: 'TestOrg', deactivated: true }[key]),
    toJSON: () => ({ objectId: 'u2', username: 'gone', deactivated: true }),
  };

  it('refuses a deactivated account and signs it straight back out', async () => {
    const { Parse } = require('parse');
    Parse.User.logIn.mockResolvedValue(deactivatedUser);
    Parse.User.logOut.mockResolvedValue();

    const { retrieveSignInFunction, parseUserValue } = require('app/modules/user');
    await expect(retrieveSignInFunction('gone', 'pw')).rejects.toMatchObject({
      code: 'ACCOUNT_DEACTIVATED',
    });

    expect(Parse.User.logOut).toHaveBeenCalled();
    expect(parseUserValue()).toBeFalsy();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('lets an active account in', async () => {
    const { Parse } = require('parse');
    Parse.User.logIn.mockResolvedValue(fakeParseUser);

    const { retrieveSignInFunction } = require('app/modules/user');
    await expect(retrieveSignInFunction('TestCMM', 'pw')).resolves.toBe(fakeParseUser);
    expect(Parse.User.logOut).not.toHaveBeenCalled();
  });
});

describe('retrieveSignUpFunction — user normalization', () => {
  it('stores a plain object in the subject so .organization is accessible directly', async () => {
    const { Parse } = require('parse');
    Parse.Cloud.run.mockResolvedValue(fakeParseUser);

    const { retrieveSignUpFunction, parseUserValue } = require('app/modules/user');
    await retrieveSignUpFunction({ username: 'TestCMM', organization: 'TestOrg' }, null);

    expect(parseUserValue().organization).toBe('TestOrg');
  });
});
