import {
  missingKeyFieldsQuery,
  SURVEY_COMPLETENESS_FIELDS,
  unresolvedParentQuery,
} from 'app/modules/data-quality';

// Same idiom as __tests__/app/epics/DashboardTriage/loadTriage.test.js: chain
// methods return `this`, and every instance is recorded so the test can assert
// the query CONTRACT rather than hitting a server. Each condition is captured
// as a tuple so the assertion is about what the query asks for, not the order
// or the number of sub-queries used to ask it.
function makeParse() {
  const instances = [];
  const Query = function Query(cls) {
    const inst = {
      cls,
      _conditions: [],
      equalTo: jest.fn(function eq(k, v) { this._conditions.push(['equalTo', k, v]); return this; }),
      containedIn: jest.fn(function ci(k, v) { this._conditions.push(['containedIn', k, v]); return this; }),
      notEqualTo: jest.fn(function ne(k, v) { this._conditions.push(['notEqualTo', k, v]); return this; }),
      exists: jest.fn(function ex(k) { this._conditions.push(['exists', k]); return this; }),
      doesNotExist: jest.fn(function dne(k) { this._conditions.push(['doesNotExist', k]); return this; }),
      greaterThanOrEqualTo: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      count: jest.fn(() => Promise.resolve(0)),
      find: jest.fn(() => Promise.resolve([])),
    };
    instances.push(inst);
    return inst;
  };
  Query.or = jest.fn((...qs) => {
    const inst = {
      cls: 'or',
      _or: qs,
      _conditions: [],
      equalTo: jest.fn(function eq(k, v) { this._conditions.push(['equalTo', k, v]); return this; }),
      containedIn: jest.fn(function ci(k, v) { this._conditions.push(['containedIn', k, v]); return this; }),
      count: jest.fn(() => Promise.resolve(0)),
      find: jest.fn(() => Promise.resolve([])),
    };
    instances.push(inst);
    return inst;
  });
  return { Parse: { Query }, instances };
}

// Every condition the built query can match on, flattened across the OR tree.
const flattenConditions = (q) => (q.cls === 'or'
  ? q._or.reduce((acc, sub) => acc.concat(flattenConditions(sub)), [])
  : q._conditions.slice());

const asked = (conditions, tuple) => conditions
  .some((c) => c.length === tuple.length && c.every((part, i) => part === tuple[i]));

describe('missingKeyFieldsQuery', () => {
  it('treats a key field holding the empty string as missing, like an absent one', () => {
    const { Parse } = makeParse();

    const query = missingKeyFieldsQuery({ Parse, orgValues: ['Puente', 'Puentes'] });
    const conditions = flattenConditions(query);

    // A record with telephoneNumber: '' scores as incomplete in
    // computeSurveyCompleteness, so the server-side query must catch it too.
    SURVEY_COMPLETENESS_FIELDS.forEach((field) => {
      expect({ field, matchesAbsent: asked(conditions, ['doesNotExist', field]) })
        .toEqual({ field, matchesAbsent: true });
      expect({ field, matchesEmptyString: asked(conditions, ['equalTo', field, '']) })
        .toEqual({ field, matchesEmptyString: true });
    });
  });
});

describe('unresolvedParentQuery', () => {
  it('matches records whose offline household link never resolved, scoped to the org', () => {
    const { Parse } = makeParse();

    // A builder that isn't exported yet asks for nothing, which is the same
    // shape of failure as one that asks for the wrong thing — so the diff below
    // stays an assertion either way.
    const conditions = typeof unresolvedParentQuery === 'function'
      ? flattenConditions(unresolvedParentQuery({ Parse, orgValues: ['Puente', 'Puentes'] }))
      : [];

    // An orphan is a record the phone stamped with its own household ID that
    // the server never resolved: the offline link is present, the resolved
    // householdId is not. Scoping is on surveyingOrganization (which org
    // COLLECTED the record) — `organization` lives on _User and describes an
    // account, so it would scope nothing here.
    expect({
      hasOfflineLink: asked(conditions, ['exists', 'householdObjectIdOffline']),
      lacksResolvedParent: asked(conditions, ['doesNotExist', 'householdId']),
      // containedIn, not equalTo: an organization's records are spread across
      // every string it has been called, and equalTo hides the rest silently.
      scopedToOrg: conditions.some((c) => c[0] === 'containedIn'
        && c[1] === 'surveyingOrganization'
        && Array.isArray(c[2]) && c[2].includes('Puente') && c[2].includes('Puentes')),
    }).toEqual({
      hasOfflineLink: true,
      lacksResolvedParent: true,
      scopedToOrg: true,
    });
  });
});
