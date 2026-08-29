import '@testing-library/jest-dom';

import { loadOrganizationAdmin } from 'app/epics/OrganizationAdmin/loadOrganizationAdmin';

// Parse.Query chain returns `this`; `find` is keyed by class so one mock serves
// both reads. Never mock `distinct` — the browser SDK has no Master Key and
// baking a false capability into the suite is how that rule quietly rots.
const makeParse = ({ orgs = [], users = [] } = {}) => {
  const obj = (attrs) => ({ id: attrs.objectId, get: (k) => attrs[k] });
  const byClass = {
    Organization: orgs.map(obj),
    User: users.map(obj),
  };
  return {
    Query: class {
      constructor(cls) { this.cls = cls; }

      select() { return this; }

      limit(n) { this.limitValue = n; return this; }

      ascending() { return this; }

      async find() { return byClass[this.cls] ?? []; }
    },
  };
};

const WOF = {
  objectId: 'o1', name: 'World Outreach Fund', shortCode: 'wof', aliases: ['WOF'], active: true,
};

describe('loadOrganizationAdmin', () => {
  it('surfaces accounts whose organization resolves to nothing', async () => {
    // This is the whole point of the screen. When a signup does not resolve, the
    // account is created, lands as a contributor, and shows an empty app with no
    // error anywhere — the only trace is a line in a server log nobody reads.
    const Parse = makeParse({
      orgs: [WOF],
      users: [
        { objectId: 'u1', username: 'ok@example.org', organization: 'WOF' },
        { objectId: 'u2', username: 'lost@example.org', organization: 'Wof Clinic' },
      ],
    });

    const result = await loadOrganizationAdmin({ Parse });

    expect(result.unresolved.map((u) => u.username)).toEqual(['lost@example.org']);
  });
});

describe('the queue has to be readable as a worklist', () => {
  it('reports how many accounts were checked, so a count has a denominator', async () => {
    // "3 unresolved" means nothing without "of 153 checked". A bare count of
    // problems is the same shape of lie as a sampled total presented as exact.
    const Parse = makeParse({
      orgs: [WOF],
      users: [
        { objectId: 'u1', username: 'a@example.org', organization: 'WOF' },
        { objectId: 'u2', username: 'b@example.org', organization: 'Nope' },
        { objectId: 'u3', username: 'c@example.org', organization: 'WOF' },
      ],
    });

    const result = await loadOrganizationAdmin({ Parse });

    expect(result.accountsChecked).toBe(3);
    expect(result.unresolved).toHaveLength(1);
  });

  it('puts the newest unresolved account first', async () => {
    // A worklist is worked from the top. Newest first means someone who just
    // failed to register is seen today rather than behind a years-old account
    // nobody is going to fix.
    const Parse = makeParse({
      orgs: [WOF],
      users: [
        { objectId: 'old', username: 'old@example.org', organization: 'Nope', createdAt: new Date('2024-01-01') },
        { objectId: 'new', username: 'new@example.org', organization: 'Nope', createdAt: new Date('2026-08-01') },
      ],
    });

    const result = await loadOrganizationAdmin({ Parse });

    expect(result.unresolved.map((u) => u.objectId)).toEqual(['new', 'old']);
  });
});
