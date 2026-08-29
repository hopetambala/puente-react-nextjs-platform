import '@testing-library/jest-dom';

import { organizationMatchValues } from 'app/modules/organization';

const DR = {
  objectId: 'o1',
  name: 'DR Missions',
  shortCode: 'dr-missions',
  aliases: ['DR Missions', 'DRMT'],
};

describe('organizationMatchValues', () => {
  it('returns every string the organization is known by', () => {
    // Records carry the string that was collected, and one organization's
    // records are spread across several. In production DR Missions has 11 rows
    // under "DR Missions" and 611 under "DRMT"; Rayjon has 185 under "Rayjon"
    // and 1196 under "Rayjon Eye Clinic". Filtering on one string shows a user
    // 1% and 13% of their own organization's data respectively.
    expect(organizationMatchValues('DR Missions', [DR]).sort())
      .toEqual(['DR Missions', 'DRMT']);
  });

  it('finds the whole set from any alias, not just the canonical name', () => {
    expect(organizationMatchValues('DRMT', [DR]).sort())
      .toEqual(['DR Missions', 'DRMT']);
  });

  it('falls back to the literal string when nothing resolves', () => {
    // An unrecognised organization must still see its own records. Returning an
    // empty set would blank the app for 123 of 792 production accounts.
    expect(organizationMatchValues('Peace Corps', [DR])).toEqual(['Peace Corps']);
  });

  it('falls back to the literal string when an alias is ambiguous', () => {
    // resolveOrganization throws on ambiguity by design. That is an ops problem
    // and must not blank someone's dashboard while it is being sorted out.
    const a = { objectId: 'a', name: 'A', shortCode: 'a', aliases: ['Shared'] };
    const b = { objectId: 'b', name: 'B', shortCode: 'b', aliases: ['Shared'] };

    expect(organizationMatchValues('Shared', [a, b])).toEqual(['Shared']);
  });
});

describe('loadOrganizationScope', () => {
  const { loadOrganizationScope } = require('app/modules/organization');

  const makeParse = (records, { fail = false } = {}) => ({
    Query: class {
      select() { return this; }

      limit() { return this; }

      async find() {
        if (fail) throw new Error('network');
        return records;
      }
    },
  });

  it('expands the viewer organization to every string its records may carry', async () => {
    const Parse = makeParse([{
      id: 'o1',
      get: (k) => ({ name: 'DR Missions', shortCode: 'dr-missions', aliases: ['DR Missions', 'DRMT'] }[k]),
    }]);

    expect((await loadOrganizationScope(Parse, 'DR Missions')).sort())
      .toEqual(['DR Missions', 'DRMT']);
  });

  it('narrows rather than blanks when the organization read fails', async () => {
    // A failed lookup must not empty someone's dashboard. Returning [] here
    // would show every user zero records whenever this one query is flaky.
    expect(await loadOrganizationScope(makeParse([], { fail: true }), 'Puente'))
      .toEqual(['Puente']);
  });
});

describe('loadOrganizationIdentity', () => {
  const { loadOrganizationIdentity } = require('app/modules/organization');

  const makeParse = (records) => ({
    Query: class {
      select() { return this; }

      limit() { return this; }

      async find() { return records; }
    },
  });

  const record = {
    id: 'o1',
    get: (k) => ({ name: 'DR Missions', shortCode: 'dr-missions', aliases: ['DR Missions', 'DRMT'] }[k]),
  };

  it('returns the shortCode alongside the match values', async () => {
    // The CSV exporter needs the shortCode: the aggregator keys its
    // alias-aware export path on it, because organization names contain commas
    // ("Beahan, Cole and Wolf") and cannot be a delimited path segment.
    const result = await loadOrganizationIdentity(makeParse([record]), 'DRMT');

    expect(result.shortCode).toBe('dr-missions');
    expect(result.values.sort()).toEqual(['DR Missions', 'DRMT']);
  });

  it('has no shortCode when the organization is unrecognised', async () => {
    // Callers fall back to the legacy single-string export path. 123 of 792
    // production accounts do not resolve; they must still be able to export.
    const result = await loadOrganizationIdentity(makeParse([record]), 'Peace Corps');

    expect(result.shortCode).toBeNull();
    expect(result.values).toEqual(['Peace Corps']);
  });
});

describe('a blank organization must not inherit the junk bucket', () => {
  // internal-test carries an EMPTY STRING among its aliases in production, and
  // normalizeOrganizationName('') returns '' rather than null — so a blank
  // account organization folded to '' and matched it, handing the 11 accounts
  // whose organization is blank the records of a bucket that is not theirs.
  const INTERNAL = {
    objectId: 'o9',
    name: 'Internal / test',
    shortCode: 'internal-test',
    aliases: ['', 'testORG', 'Company A'],
  };

  it.each(['', '   '])('does not resolve %p', (blank) => {
    expect(organizationMatchValues(blank, [INTERNAL])).toEqual([blank]);
  });
});
