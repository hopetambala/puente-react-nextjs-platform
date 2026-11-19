import { applySearch, SEARCH_FIELDS } from 'app/epics/DataCurationManager/search';

// The Data Curation search box set filters.search, and nothing read it: the
// fetch and the visible-rows filter both ignored it, so typing a name changed
// nothing. Search runs in the query (not over the 50 fetched rows), so it finds
// matches on every page and count() agrees with what is shown.

function fakeParse() {
  const made = [];
  class Query {
    constructor(className) {
      this.className = className;
      this.calls = [];
      made.push(this);
    }

    matches(...args) { this.calls.push(['matches', ...args]); return this; }

    containedIn(...args) { this.calls.push(['containedIn', ...args]); return this; }

    matchesQuery(...args) { this.calls.push(['matchesQuery', ...args]); return this; }
  }
  Query.or = jest.fn((...arms) => ({ or: arms }));
  Query.and = jest.fn((...parts) => ({ and: parts }));
  return { Parse: { Query }, made };
}

describe('applySearch', () => {
  const orgValues = ['Puente', 'PUENTE'];

  it('leaves the query alone when the box is empty or blank', () => {
    const { Parse } = fakeParse();
    const q = new Parse.Query('SurveyData');
    expect(applySearch(q, { Parse, source: 'survey-data', search: '   ', orgValues })).toBe(q);
    expect(Parse.Query.and).not.toHaveBeenCalled();
  });

  it('matches SurveyData on name, community and household, case-insensitively', () => {
    const { Parse, made } = fakeParse();
    const q = new Parse.Query('SurveyData');
    const result = applySearch(q, { Parse, source: 'survey-data', search: ' maría ', orgValues });

    expect(Parse.Query.and).toHaveBeenCalledWith(q, expect.anything());
    expect(result).toEqual({ and: [q, { or: expect.any(Array) }] });
    const arms = made.slice(1);
    expect(arms.map((a) => a.calls[0])).toEqual(
      SEARCH_FIELDS.map((field) => ['matches', field, 'maría', 'i']),
    );
  });

  it('escapes regex characters so a typed "." or "(" is literal', () => {
    const { Parse, made } = fakeParse();
    applySearch(new Parse.Query('SurveyData'), { Parse, source: 'survey-data', search: 'a.b(', orgValues });
    expect(made[1].calls[0]).toEqual(['matches', SEARCH_FIELDS[0], 'a\\.b\\(', 'i']);
  });

  it('searches the person behind the client pointer for the other classes, scoped to the org', () => {
    const { Parse, made } = fakeParse();
    const q = new Parse.Query('Vitals');
    const result = applySearch(q, { Parse, source: 'vitals', search: 'Ana', orgValues });

    expect(result).toBe(q);
    const [call] = q.calls;
    expect(call[0]).toBe('matchesQuery');
    expect(call[1]).toBe('client');
    expect(Parse.Query.and).toHaveBeenCalledTimes(1);
    const scope = made.find((m) => m.calls.some((c) => c[0] === 'containedIn'));
    expect(scope.className).toBe('SurveyData');
    expect(scope.calls).toContainEqual(['containedIn', 'surveyingOrganization', orgValues]);
  });
});
