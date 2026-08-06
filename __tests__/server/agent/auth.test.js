import { resolveUserFromSessionToken } from 'server/agent/auth';

describe('resolveUserFromSessionToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_parseServerUrl: 'https://parse.example.com/parse',
      NEXT_PUBLIC_parseAppId: 'test-app-id',
    };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects with status 401 when the token is missing', async () => {
    await expect(resolveUserFromSessionToken(undefined)).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects with status 401 when Parse rejects the token', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: 209, error: 'invalid session token' }),
    });

    await expect(resolveUserFromSessionToken('bad-token')).rejects.toMatchObject({ status: 401 });
  });

  it('resolves user identity and organization from Parse /users/me', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        objectId: 'u123',
        username: 'maria',
        organization: 'Puente-DR',
      }),
    });

    const result = await resolveUserFromSessionToken('valid-token');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://parse.example.com/parse/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Parse-Application-Id': 'test-app-id',
          'X-Parse-Session-Token': 'valid-token',
        }),
      }),
    );
    expect(result).toEqual({ userId: 'u123', username: 'maria', organization: 'Puente-DR' });
  });

  it('rejects with status 403 when the user has no organization', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ objectId: 'u123', username: 'maria' }),
    });

    await expect(resolveUserFromSessionToken('valid-token')).rejects.toMatchObject({ status: 403 });
  });
});
