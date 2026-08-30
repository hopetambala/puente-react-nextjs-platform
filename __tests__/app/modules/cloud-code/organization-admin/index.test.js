import {
  createOrganization,
  editOrganizationAliases,
  isStaff,
} from 'app/modules/cloud-code/organization-admin';

/**
 * `Parse` is injected so the CONTRACT with Cloud Code is testable: which
 * function is called, with which params, and what happens when it throws.
 * Matches the pattern in app/modules/organization and loadOrganizationAdmin.
 */
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

describe('isStaff', () => {
  it('asks Cloud Code rather than querying _Role from the browser', async () => {
    // The puente_staff role is created with no public read, so a client-side
    // _Role query returns nothing and every staff member reads as non-staff.
    const { Parse, calls } = makeParse(resolving({ isStaff: true }));

    await expect(isStaff({ Parse })).resolves.toBe(true);
    expect(calls).toEqual([{ name: 'isStaff', params: {} }]);
  });

  it('returns false when the caller is not staff', async () => {
    const { Parse } = makeParse(resolving({ isStaff: false }));

    await expect(isStaff({ Parse })).resolves.toBe(false);
  });

  it('returns false when the call fails, never throws into a route guard', async () => {
    // This drives nav visibility and a redirect. A thrown error there would
    // blank the page; denying access is the safe direction to fail.
    const { Parse } = makeParse(rejecting('network down'));

    await expect(isStaff({ Parse })).resolves.toBe(false);
  });
});

describe('createOrganization', () => {
  it('forwards the organization fields to Cloud Code', async () => {
    const { Parse, calls } = makeParse(resolving({ objectId: 'org1' }));
    const params = {
      name: 'World Outreach Fund', shortCode: 'wof', aliases: ['WOF'], active: true,
    };

    await createOrganization(params, { Parse });

    expect(calls).toEqual([{ name: 'createOrganization', params }]);
  });

  it('propagates the server refusal so the form can show it verbatim', async () => {
    // The server names the offending value ("alias X already belongs to Y").
    // Swallowing it and showing a generic failure would hide the one fact the
    // operator needs to fix the input.
    const { Parse } = makeParse(rejecting('alias "WOF" already belongs to "wof"'));

    await expect(createOrganization({ name: 'x', shortCode: 'y' }, { Parse }))
      .rejects.toThrow(/already belongs/);
  });
});

describe('editOrganizationAliases', () => {
  it('forwards shortCode and the full replacement alias set', async () => {
    const { Parse, calls } = makeParse(resolving({ objectId: 'org1' }));

    await editOrganizationAliases({ shortCode: 'wof', aliases: ['WOF', 'W.O.F.'] }, { Parse });

    expect(calls).toEqual([{
      name: 'editOrganizationAliases',
      params: { shortCode: 'wof', aliases: ['WOF', 'W.O.F.'] },
    }]);
  });

  it('propagates the server refusal verbatim', async () => {
    const { Parse } = makeParse(rejecting('no organization with shortCode "nope"'));

    await expect(editOrganizationAliases({ shortCode: 'nope', aliases: [] }, { Parse }))
      .rejects.toThrow(/no organization/);
  });
});
