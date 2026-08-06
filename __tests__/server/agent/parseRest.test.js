import { orgScopedQuery } from 'server/agent/parseRest';

describe('orgScopedQuery', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_parseServerUrl = 'https://parse.example.com/parse';
    process.env.NEXT_PUBLIC_parseAppId = 'test-app-id';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], count: 0 }),
    });
  });

  const call = (options = {}) =>
    orgScopedQuery({
      className: 'SurveyData',
      organization: 'Puente-DR',
      sessionToken: 'tok-1',
      ...options,
    });

  const requestedUrl = () => new URL(global.fetch.mock.calls[0][0]);
  const requestedWhere = () => JSON.parse(requestedUrl().searchParams.get('where'));

  it('always filters by the caller organization', async () => {
    await call();
    expect(requestedWhere().surveyingOrganization).toBe('Puente-DR');
  });

  it('cannot have its organization filter overridden by where args', async () => {
    await call({ where: { surveyingOrganization: 'VictimOrg', communityname: 'Consuelo' } });
    const where = requestedWhere();
    expect(where.surveyingOrganization).toBe('Puente-DR');
    expect(where.communityname).toBe('Consuelo');
  });

  it('sends the session token — never a master key', async () => {
    await call();
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers['X-Parse-Session-Token']).toBe('tok-1');
    expect(Object.keys(headers).join()).not.toMatch(/master/i);
  });

  it('rejects class names outside the whitelist', async () => {
    await expect(call({ className: '_User' })).rejects.toThrow(/not allowed/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('passes count, limit, keys and order through as query params', async () => {
    await call({ count: true, limit: 0, keys: ['fname', 'createdAt'], order: '-createdAt' });
    const url = requestedUrl();
    expect(url.pathname).toBe('/parse/classes/SurveyData');
    expect(url.searchParams.get('count')).toBe('1');
    expect(url.searchParams.get('limit')).toBe('0');
    expect(url.searchParams.get('keys')).toBe('fname,createdAt');
    expect(url.searchParams.get('order')).toBe('-createdAt');
  });

  it('returns the parsed JSON body', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ results: [{ a: 1 }], count: 7 }) });
    const result = await call({ count: true });
    expect(result).toEqual({ results: [{ a: 1 }], count: 7 });
  });

  it('throws when Parse responds with an error', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: 'bad query' }) });
    await expect(call()).rejects.toThrow(/bad query/);
  });
});
