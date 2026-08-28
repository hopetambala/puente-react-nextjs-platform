import { loadOrganizations } from 'app/modules/organization';

const rec = (id, name, shortCode, active = true) => ({
  id, get: (k) => ({ name, shortCode, active }[k]),
});

// Records the query so tests assert the contract, not call order.
function makeParse({ results = [], fail = false } = {}) {
  const instances = [];
  const Query = function Query(cls) {
    const inst = {
      cls,
      _select: [],
      _limit: null,
      equalTo: jest.fn().mockReturnThis(),
      select: jest.fn(function sel(...f) { this._select.push(...f); return this; }),
      limit: jest.fn(function lim(n) { this._limit = n; return this; }),
      find: jest.fn(() => (fail
        ? Promise.reject(new Error('network'))
        : Promise.resolve(results))),
    };
    instances.push(inst);
    return inst;
  };
  return { Parse: { Query }, instances };
}

describe('loadOrganizations', () => {
  it('returns picker options, sorted', async () => {
    const { Parse } = makeParse({
      results: [rec('b', 'Solea Water', 'solea'), rec('a', 'Cevicos', 'cevicos')],
    });

    const { options, unavailable } = await loadOrganizations(Parse);

    expect(unavailable).toBe(false);
    expect(options.map((o) => o.label)).toEqual(['Cevicos', 'Solea Water']);
  });

  it('transfers only the fields the picker needs', async () => {
    // Organization is small, but select() is the cheapest discipline there is
    // and this runs on the registration page, before anyone is signed in.
    const { Parse, instances } = makeParse({ results: [] });

    await loadOrganizations(Parse);

    expect(instances[0]._select).toEqual(
      expect.arrayContaining(['name', 'shortCode', 'active']),
    );
  });

  it('sets an explicit limit rather than relying on a default', async () => {
    const { Parse, instances } = makeParse({ results: [] });

    await loadOrganizations(Parse);

    expect(instances[0]._limit).toEqual(expect.any(Number));
  });

  it('reports a failed load as unavailable, NOT as an empty list', async () => {
    // The distinction is the whole point: "no organizations exist" and "we could
    // not reach the server" look identical in an empty dropdown, and the second
    // must not silently present as the first. Same rule the dashboard applies to
    // a check that could not run.
    const { Parse } = makeParse({ fail: true });

    const { options, unavailable } = await loadOrganizations(Parse);

    expect(unavailable).toBe(true);
    expect(options).toEqual([]);
  });

  it('an genuinely empty result is available, not unavailable', async () => {
    const { Parse } = makeParse({ results: [] });

    const { options, unavailable } = await loadOrganizations(Parse);

    expect(unavailable).toBe(false);
    expect(options).toEqual([]);
  });
});
