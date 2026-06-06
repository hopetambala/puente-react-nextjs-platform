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

describe('retrieveSignUpFunction — user normalization', () => {
  it('stores a plain object in the subject so .organization is accessible directly', async () => {
    const { Parse } = require('parse');
    Parse.Cloud.run.mockResolvedValue(fakeParseUser);

    const { retrieveSignUpFunction, parseUserValue } = require('app/modules/user');
    await retrieveSignUpFunction({ username: 'TestCMM', organization: 'TestOrg' }, null);

    expect(parseUserValue().organization).toBe('TestOrg');
  });
});
