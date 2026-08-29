import { loadDashboardTriage, SAMPLE_SIZE } from 'app/epics/DashboardTriage/loadTriage';
import { SURVEY_COMPLETENESS_FIELDS } from 'app/modules/data-quality';

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
      containedIn: jest.fn(function ci(k, v) { if (k === 'surveyingOrganization' || k === 'organizations') this._orgIn = v; return this; }),
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

// Every condition a built query can match on, flattened across the OR tree.
// Read off the jest.fn call records the mock above already keeps, so this asks
// what the query ASKS FOR rather than how many sub-queries it took to ask it.
const CONSTRAINTS = ['equalTo', 'doesNotExist', 'exists'];

const conditionsOf = (q) => (q.cls === 'or'
  ? q._or.reduce((acc, sub) => acc.concat(conditionsOf(sub)), [])
  : CONSTRAINTS.reduce(
    (acc, m) => acc.concat((q[m] && q[m].mock ? q[m].mock.calls : []).map((args) => [m].concat(args))),
    [],
  ));

const asked = (conditions, tuple) => conditions
  .some((c) => c.length === tuple.length && c.every((part, i) => part === tuple[i]));

describe('loadDashboardTriage', () => {
  it('scopes every SurveyData query to EVERY string the organization uses', async () => {
    // containedIn, not equalTo. Records carry the string that was collected and
    // one organization's are spread across several: measured in production,
    // DR Missions has 11 rows under "DR Missions" and 611 under "DRMT". Filtering
    // on one string showed that user 1% of their own data, with no error.
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    surveyQueries(instances).forEach((q) => {
      expect(q._orgIn).toEqual(['Puente', 'Puentes']);
      expect(q._org).toBeNull();
    });
  });

  it('never calls distinct — the browser SDK has no Master Key', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    instances.forEach((q) => expect(q.distinct).toBeUndefined());
  });

  it('applies select() to the sample query so it does not transfer 65 fields', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    // Target the sample by its cap — other queries also use select() (the
    // last-sync probe selects createdAt), so select alone is ambiguous.
    const sample = surveyQueries(instances).find((q) => q._limit === SAMPLE_SIZE);
    expect(sample).toBeDefined();
    expect(sample._select).toEqual(expect.arrayContaining(['communityname', 'householdId']));
    expect(sample._limit).toBe(SAMPLE_SIZE);
  });

  it('uses ONE shared sample for both duplicates and coverage', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    // Two sampled reads of the same rows would be a wasted round-trip.
    const samples = surveyQueries(instances).filter((q) => q._limit === SAMPLE_SIZE);
    expect(samples).toHaveLength(1);
  });

  it('returns a null signal when its query fails, rather than throwing', async () => {
    const { Parse } = makeParse({ failOn: 'SurveyData' });
    const data = await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    expect(data).toBeDefined();
    expect(data.signals.unresolvedParent).toBeNull();
  });

  it('reports the sample size it used so callers can disclose saturation', async () => {
    const { Parse } = makeParse();
    const data = await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    expect(data.coverage.sampleSize).toBe(SAMPLE_SIZE);
  });

  it('derives accounts-that-synced from the SHARED sample, with no extra read', async () => {
    const rows = [
      { get: (f) => ({ surveyingUser: 'a@x.org', communityname: 'C' }[f]), createdAt: NOW },
      { get: (f) => ({ surveyingUser: 'a@x.org', communityname: 'C' }[f]), createdAt: NOW },
      { get: (f) => ({ surveyingUser: 'b@x.org', communityname: 'C' }[f]), createdAt: NOW },
    ];
    const { Parse, instances } = makeParse({ finds: { SurveyData: rows } });
    const data = await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    expect(data.accountsSynced.count).toBe(2);
    // Sampled, because it is reduced client-side from a capped read.
    expect(data.accountsSynced.exact).toBe(false);
    // Still exactly one capped SurveyData read — no dedicated surveyor query.
    expect(surveyQueries(instances).filter((q) => q._limit === SAMPLE_SIZE)).toHaveLength(1);
  });

  it('selects surveyingUser on the shared sample so the reduction is possible', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    const sample = surveyQueries(instances).find((q) => q._limit === SAMPLE_SIZE);
    expect(sample._select).toEqual(expect.arrayContaining(['surveyingUser']));
  });

  it('marks count-derived signals exact and sample-derived signals not', async () => {
    const { Parse } = makeParse({ counts: { or: 5, SurveyData: 2 } });
    const data = await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    expect(data.signals.missingKeyFields.exact).toBe(true);
    expect(data.signals.possibleDuplicates.exact).toBe(false);
  });

  it('counts a key field holding the empty string as missing, like an absent one', async () => {
    const { Parse, instances } = makeParse();
    await loadDashboardTriage({ Parse, orgValues: ['Puente', 'Puentes'], now: NOW });

    // The missing-key-fields signal is the only OR the loader builds.
    const missingQ = instances.find((q) => q.cls === 'or');
    const conditions = missingQ ? conditionsOf(missingQ) : [];

    // computeSurveyCompleteness scores '' as unfilled, so a record with
    // telephoneNumber: '' is incomplete on the curation screen. The number the
    // dashboard triages from has to agree, or it under-reports silently.
    SURVEY_COMPLETENESS_FIELDS.forEach((field) => {
      expect({
        field,
        matchesAbsent: asked(conditions, ['doesNotExist', field]),
        matchesEmptyString: asked(conditions, ['equalTo', field, '']),
      }).toEqual({ field, matchesAbsent: true, matchesEmptyString: true });
    });
  });

  it('distinguishes a last-sync read that failed from one that found nothing', async () => {
    // Both cases leave lastSyncAt null, so the page cannot tell "no records yet"
    // apart from "we could not read". A separate flag says whether we KNOW.
    const empty = await loadDashboardTriage({
      Parse: makeParse().Parse, orgValues: ['Puente', 'Puentes'], now: NOW,
    });
    const failed = await loadDashboardTriage({
      Parse: makeParse({ failOn: 'SurveyData' }).Parse, orgValues: ['Puente', 'Puentes'], now: NOW,
    });

    expect({
      queryResolvedWithZeroRows: empty.sync.lastSyncAvailable,
      queryRejected: failed.sync.lastSyncAvailable,
    }).toEqual({ queryResolvedWithZeroRows: true, queryRejected: false });
  });

  it('reports a failed 24-hour count as unknown rather than as zero records', async () => {
    // The ribbon prints this number verbatim. If a rejected count is flattened
    // to 0, we assert "no records arrived in the last 24 hours" about the
    // organization's data on the strength of our own broken request. null is
    // this module's existing word for "this query did not run" — every signal
    // uses it that way — so a failure must say null, and only a real count of
    // nothing may say 0.
    const failed = await loadDashboardTriage({
      Parse: makeParse({ failOn: 'SurveyData' }).Parse, orgValues: ['Puente', 'Puentes'], now: NOW,
    });
    const genuinelyZero = await loadDashboardTriage({
      Parse: makeParse({ counts: { SurveyData: 0 } }).Parse, orgValues: ['Puente', 'Puentes'], now: NOW,
    });

    expect({
      countQueryRejected: failed.sync.recordsLast24h,
      countQueryReturnedZero: genuinelyZero.sync.recordsLast24h,
    }).toEqual({ countQueryRejected: null, countQueryReturnedZero: 0 });
  });
});
