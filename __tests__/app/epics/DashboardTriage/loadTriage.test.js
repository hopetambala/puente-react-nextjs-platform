import { loadDashboardTriage, SAMPLE_SIZE } from 'app/epics/DashboardTriage/loadTriage';

const NOW = new Date('2026-08-21T12:00:00Z');

// Records a per-instance query so tests can assert the contract, not the order.
function makeParse({ counts = {}, finds = {}, failOn = null } = {}) {
  const instances = [];
  const Query = function Query(cls) {
    const inst = {
      cls,
      _select: [],
      _limit: null,
      _org: null,
      equalTo: jest.fn(function eq(k, v) { if (k === 'surveyingOrganization') this._org = v; return this; }),
      greaterThanOrEqualTo: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      exists: jest.fn().mockReturnThis(),
      doesNotExist: jest.fn().mockReturnThis(),
      select: jest.fn(function sel(...f) { this._select.push(...f); return this; }),
      limit: jest.fn(function lim(n) { this._limit = n; return this; }),
      count: jest.fn(() => (failOn === cls
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(counts[cls] ?? 0))),
      find: jest.fn(() => (failOn === cls
        ? Promise.reject(new Error('boom'))
        : Promise.resolve(finds[cls] ?? []))),
    };
    instances.push(inst);
    return inst;
  };
  Query.or = jest.fn((...qs) => {
    const inst = {
      cls: 'or',
      _or: qs,
      equalTo: jest.fn().mockReturnThis(),
      count: jest.fn(() => Promise.resolve(counts.or ?? 0)),
    };
    instances.push(inst);
    return inst;
  });
  return { Parse: { Query }, instances };
}

const surveyQueries = (instances) => instances.filter((i) => i.cls === 'SurveyData');

describe('loadDashboardTriage', () => {
  it('scopes every SurveyData query to the organization', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, org: 'Puente', now: NOW });

    surveyQueries(instances).forEach((q) => expect(q._org).toBe('Puente'));
  });

  it('never calls distinct — the browser SDK has no Master Key', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, org: 'Puente', now: NOW });

    instances.forEach((q) => expect(q.distinct).toBeUndefined());
  });

  it('applies select() to the sample query so it does not transfer 65 fields', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, org: 'Puente', now: NOW });

    // Target the sample by its cap — other queries also use select() (the
    // last-sync probe selects createdAt), so select alone is ambiguous.
    const sample = surveyQueries(instances).find((q) => q._limit === SAMPLE_SIZE);
    expect(sample).toBeDefined();
    expect(sample._select).toEqual(expect.arrayContaining(['communityname', 'householdId']));
    expect(sample._limit).toBe(SAMPLE_SIZE);
  });

  it('uses ONE shared sample for both duplicates and coverage', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, org: 'Puente', now: NOW });

    // Two sampled reads of the same rows would be a wasted round-trip.
    const samples = surveyQueries(instances).filter((q) => q._limit === SAMPLE_SIZE);
    expect(samples).toHaveLength(1);
  });

  it('returns a null signal when its query fails, rather than throwing', async () => {
    const { Parse } = makeParse({ failOn: 'SurveyData' });
    const data = await loadDashboardTriage({ Parse, org: 'Puente', now: NOW });

    expect(data).toBeDefined();
    expect(data.signals.unresolvedParent).toBeNull();
  });

  it('reports the sample size it used so callers can disclose saturation', async () => {
    const { Parse } = makeParse();
    const data = await loadDashboardTriage({ Parse, org: 'Puente', now: NOW });

    expect(data.coverage.sampleSize).toBe(SAMPLE_SIZE);
  });

  it('marks count-derived signals exact and sample-derived signals not', async () => {
    const { Parse } = makeParse({ counts: { or: 5, SurveyData: 2 } });
    const data = await loadDashboardTriage({ Parse, org: 'Puente', now: NOW });

    expect(data.signals.missingKeyFields.exact).toBe(true);
    expect(data.signals.possibleDuplicates.exact).toBe(false);
  });
});
