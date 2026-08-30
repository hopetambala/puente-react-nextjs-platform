import {
  listOrganizationMembers,
  myOrganizationAccess,
  setOrgAdmin,
  setUserActive,
} from 'app/modules/cloud-code/organization-admin';

const makeParse = (impl) => {
  const calls = [];
  return {
    calls,
    Parse: {
      Cloud: {
        run: (name, params) => {
          calls.push({ name, params });
          return impl(name, params);
        },
      },
    },
  };
};

const resolving = (value) => () => Promise.resolve(value);
const rejecting = (message) => () => Promise.reject(new Error(message));

describe('myOrganizationAccess', () => {
  it('reports staff and the organizations the viewer administers', async () => {
    const { Parse } = makeParse(resolving({ isStaff: true, orgAdminOf: ['wof'] }));

    await expect(myOrganizationAccess({ Parse }))
      .resolves.toEqual({ isStaff: true, orgAdminOf: ['wof'] });
  });

  it('fails closed when the call fails, never throws into a route guard', async () => {
    // A rejected promise in a guard blanks the page. Denying access is the safe
    // direction: the server refuses the privileged calls anyway, so a false
    // negative costs a reload while a false positive renders a screen whose
    // every action fails.
    const { Parse } = makeParse(rejecting('network down'));

    await expect(myOrganizationAccess({ Parse }))
      .resolves.toEqual({ isStaff: false, orgAdminOf: [] });
  });

  it('tolerates a malformed payload rather than crashing the screen', async () => {
    const { Parse } = makeParse(resolving(null));

    await expect(myOrganizationAccess({ Parse }))
      .resolves.toEqual({ isStaff: false, orgAdminOf: [] });
  });
});

describe('listOrganizationMembers', () => {
  it('asks for one organization by shortCode', async () => {
    const { Parse, calls } = makeParse(resolving([{ objectId: 'u1' }]));

    await listOrganizationMembers({ shortCode: 'wof' }, { Parse });

    expect(calls).toEqual([{
      name: 'listOrganizationMembers', params: { shortCode: 'wof' },
    }]);
  });

  it('returns an array even when the server returns nothing', async () => {
    // An empty list and "the read failed" must not look identical downstream;
    // the caller distinguishes them, but this must never yield undefined.
    const { Parse } = makeParse(resolving(undefined));

    await expect(listOrganizationMembers({ shortCode: 'wof' }, { Parse })).resolves.toEqual([]);
  });
});

describe('setOrgAdmin', () => {
  it('forwards the target and the intended state', async () => {
    const { Parse, calls } = makeParse(resolving({}));

    await setOrgAdmin({ userId: 'u1', isAdmin: true }, { Parse });

    expect(calls).toEqual([{ name: 'setOrgAdmin', params: { userId: 'u1', isAdmin: true } }]);
  });

  it('propagates the last-admin refusal verbatim', async () => {
    // The server explains what to do about it ("appoint another admin first").
    // A generic failure would hide the only actionable part.
    const { Parse } = makeParse(rejecting('Cannot demote the last admin of an organization.'));

    await expect(setOrgAdmin({ userId: 'u1', isAdmin: false }, { Parse }))
      .rejects.toThrow(/last admin/i);
  });
});

describe('setUserActive', () => {
  it('forwards the target and the intended state', async () => {
    const { Parse, calls } = makeParse(resolving({}));

    await setUserActive({ userId: 'u1', active: false }, { Parse });

    expect(calls).toEqual([{ name: 'setUserActive', params: { userId: 'u1', active: false } }]);
  });

  it('propagates a refusal verbatim', async () => {
    const { Parse } = makeParse(rejecting('Cannot deactivate the last admin of an organization.'));

    await expect(setUserActive({ userId: 'u1', active: false }, { Parse }))
      .rejects.toThrow(/last admin/i);
  });
});
