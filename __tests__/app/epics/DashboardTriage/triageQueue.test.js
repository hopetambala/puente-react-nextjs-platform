import { buildTriageQueue, findUnavailableSignals } from 'app/epics/DashboardTriage/triageQueue';

const exact = (count) => ({ count, exact: true });
const sampled = (count) => ({ count, exact: false });

const NONE = {
  missingKeyFields: exact(0),
  unresolvedParent: exact(0),
  possibleDuplicates: sampled(0),
  possibleFormDrift: sampled(0),
};

describe('buildTriageQueue', () => {
  it('returns nothing to do when every signal is zero', () => {
    expect(buildTriageQueue(NONE)).toEqual([]);
  });

  it('omits any signal with a zero count rather than showing an empty row', () => {
    const rows = buildTriageQueue({ ...NONE, missingKeyFields: exact(12) });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('missing-key-fields');
    expect(rows[0].count).toBe(12);
  });

  it('puts a form-drift warning above a much larger missing-fields count', () => {
    const rows = buildTriageQueue({
      ...NONE,
      missingKeyFields: exact(200),
      possibleFormDrift: sampled(1),
    });

    // Drift silently corrupts exports; volume does not outrank it.
    expect(rows.map((r) => r.id)).toEqual(['form-drift', 'missing-key-fields']);
  });

  it('orders by severity first, then by count descending', () => {
    const rows = buildTriageQueue({
      missingKeyFields: exact(5),
      unresolvedParent: exact(2),
      possibleDuplicates: sampled(30),
      possibleFormDrift: sampled(1),
    });

    expect(rows.map((r) => r.id)).toEqual([
      'form-drift', 'unresolved-parent', 'possible-duplicates', 'missing-key-fields',
    ]);
  });

  it('marks sampled signals approximate and exact signals not', () => {
    const rows = buildTriageQueue({
      ...NONE,
      missingKeyFields: exact(3),
      possibleDuplicates: sampled(4),
    });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

    expect(byId['missing-key-fields'].approximate).toBe(false);
    expect(byId['possible-duplicates'].approximate).toBe(true);
  });

  it('gives every row a translation key and no English display text', () => {
    const rows = buildTriageQueue({
      missingKeyFields: exact(1),
      unresolvedParent: exact(1),
      possibleDuplicates: sampled(1),
      possibleFormDrift: sampled(1),
    });

    rows.forEach((r) => {
      expect(r.labelKey).toMatch(/^triage_/);
      expect(r).not.toHaveProperty('label');
    });
  });

  it('links every row to a surface that can act on it', () => {
    const rows = buildTriageQueue({
      missingKeyFields: exact(1),
      unresolvedParent: exact(1),
      possibleDuplicates: sampled(1),
      possibleFormDrift: sampled(1),
    });

    rows.forEach((r) => expect(r.href).toMatch(/^\//));
    expect(rows.find((r) => r.id === 'form-drift').href).toContain('form');
  });

  it('tolerates a signal that failed to load, treating it as absent', () => {
    const rows = buildTriageQueue({ ...NONE, missingKeyFields: null });

    expect(rows).toEqual([]);
  });
});

describe('findUnavailableSignals', () => {
  // A check that could not run must never be indistinguishable from a check
  // that ran and found nothing. An all-clear that might be wrong is the worst
  // thing this screen can say.
  it('names the signals that failed to load', () => {
    const ids = findUnavailableSignals({
      ...NONE,
      possibleDuplicates: null,
      possibleFormDrift: null,
    });

    expect(ids).toEqual(['form-drift', 'possible-duplicates']);
  });

  it('returns nothing when every check ran', () => {
    expect(findUnavailableSignals(NONE)).toEqual([]);
  });

  it('treats a missing key as unavailable, not as zero', () => {
    expect(findUnavailableSignals({})).toHaveLength(4);
  });
});

describe('buildTriageQueue row destinations', () => {
  // The dashboard is a dispatcher: a row that counted 12 records must land the
  // user on those 12, not on a table of everything with 12 hidden in it. The
  // row's own signal id is what the destination filters by.
  //
  // But a row may only promise filtering the destination can actually deliver.
  // A link that carries a param the destination ignores drops the user on the
  // unfiltered table while looking like it worked, which is worse than a link
  // that promises nothing. So `possible-duplicates` — which has no exact
  // predicate, only two differently-scoped approximations — links to the
  // curation surface bare, and gains its param when the destination can honour
  // it.
  it('carries a signal query param only where the destination can honour it', () => {
    const rows = buildTriageQueue({
      missingKeyFields: exact(12),
      unresolvedParent: exact(3),
      possibleDuplicates: sampled(7),
      possibleFormDrift: sampled(0),
    });
    const hrefById = Object.fromEntries(rows.map((r) => [r.id, r.href]));

    expect(hrefById).toEqual({
      'missing-key-fields': '/data/data-curation?signal=missing-key-fields',
      'unresolved-parent': '/data/data-curation?signal=unresolved-parent',
      'possible-duplicates': '/data/data-curation',
    });
  });
});
